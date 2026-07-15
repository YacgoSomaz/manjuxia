import json
import logging
import re
from typing import List, Dict, Any, Optional
from database.db import get_db

logger = logging.getLogger(__name__)
from services.llm_service import LLMService
from services.template_service import get_by_id as get_template_by_id
from services.novel_service import NovelService
from services.utils import parse_llm_json_response
from utils.timezone import now_beijing_str


# Sentinel value to distinguish "not provided" from "provided as None"
_UNSET = object()


class ExtractionService:
    """信息提取服务"""

    @staticmethod
    def _parse_llm_response(response: str) -> List[Dict[str, Any]]:
        """解析大模型返回的结果，提取JSON数组"""
        result = parse_llm_json_response(response)
        # 确保返回的每个项目都有 name 和 description 字段
        normalized = []
        for item in result:
            if isinstance(item, dict):
                normalized.append({
                    "name": item.get("name", "").strip(),
                    "description": item.get("description", "").strip(),
                    "attributes": item.get("attributes", {}),
                })
        return normalized if normalized else [{"name": "提取结果", "description": response.strip() if response else ""}]

    @staticmethod
    def _normalize_element_name(name: str) -> str:
        """标准化元素名称用于去重比较"""
        return name.strip().lower().replace(' ', '')

    @staticmethod
    async def extract_from_chapter(
        novel_id: int,
        chapter_id: int,
        element_type: str,
        template_id: int,
        llm_config_id: int
    ) -> List[Dict[str, Any]]:
        """从单个章节的剧本内容提取信息"""
        # 获取章节信息
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM chapters WHERE id = ? AND novel_id = ?",
                (chapter_id, novel_id)
            )
            row = await cursor.fetchone()
            if not row:
                raise ValueError(f"章节不存在: {chapter_id}")
            chapter = dict(row)
            
            # 查找该章节对应的剧本
            cursor = await db.execute(
                "SELECT * FROM scripts WHERE chapter_id = ? AND novel_id = ?",
                (chapter_id, novel_id)
            )
            script_row = await cursor.fetchone()
        finally:
            await db.close()
        
        # 检查剧本是否存在
        if not script_row:
            raise ValueError(f"章节 {chapter.get('title', chapter_id)} 尚未转换为剧本，请先进行剧本转换")
        
        script = dict(script_row)
        
        # 获取模板
        template = await get_template_by_id(template_id)
        if not template:
            raise ValueError(f"模板不存在: {template_id}")

        # 上报模板使用计数(异步、失败静默,不影响主流程)
        try:
            from services.template_service import report_usage as _report_template_usage
            await _report_template_usage(template)
        except Exception:
            pass
        
        # 获取小说信息
        novel = await NovelService.get_by_id(novel_id)
        if not novel:
            raise ValueError(f"小说不存在: {novel_id}")
        
        # 替换模板变量 - 使用剧本内容而非小说原文
        template_content = template["content"]
        script_content = script.get("content", "")
        chapter_title = chapter.get("title", "")
        
        # 构建变量映射 - 支持多种常见变量名（使用剧本内容）
        variables = {
            "novel_content": novel.get("raw_content", ""),
            "chapter_content": script_content,
            "content": script_content,
            "chapter": script_content,
            "text": script_content,
            "script_content": script_content,
            "script": script_content,
            "chapter_title": chapter_title,
            "title": chapter_title,
            "novel": novel.get("name", ""),
            "novel_name": novel.get("name", ""),
        }
        
        # 替换模板中的变量占位符（支持 {var} 和 {{var}} 两种格式）
        prompt_content = template_content
        has_replacement = False
        
        for var_name, var_value in variables.items():
            # 支持 {{var_name}} 格式（双花括号）
            placeholder1 = f"{{{{{var_name}}}}}"
            if placeholder1 in prompt_content:
                prompt_content = prompt_content.replace(placeholder1, var_value)
                has_replacement = True
            # 支持 {var_name} 格式（单花括号）
            placeholder2 = f"{{{var_name}}}"
            if placeholder2 in prompt_content:
                prompt_content = prompt_content.replace(placeholder2, var_value)
                has_replacement = True
        
        # 如果仍然没有替换任何内容（模板中没有变量占位符），则将剧本内容追加到模板后面
        if prompt_content == template_content or not has_replacement:
            prompt_content = f"{template_content}\n\n以下是需要分析的剧本内容：\n\n章节标题：{chapter_title}\n\n{script_content}"
        
        # 调用大模型
        messages = [
            {"role": "system", "content": "你是一个专业的小说分析助手，擅长从小说文本中提取结构化信息。请确保返回有效的JSON格式数据。"},
            {"role": "user", "content": prompt_content}
        ]
        
        response = await LLMService.call_llm(
            llm_config_id,
            messages,
            timeout=300,
            task_type="extraction",
            novel_id=novel_id,
            chapter_title=chapter_title
        )
        
        # 解析响应
        elements = ExtractionService._parse_llm_response(response)
        
        # 标准化元素数据
        normalized_elements = []
        for elem in elements:
            if isinstance(elem, dict):
                normalized_elements.append({
                    "name": elem.get("name", "").strip(),
                    "description": elem.get("description", "").strip(),
                    "attributes": elem.get("attributes", {}),
                })
        
        return normalized_elements

    @staticmethod
    async def extract_all(
        novel_id: int,
        element_type: str,
        template_id: int,
        llm_config_id: int,
        chapter_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """批量提取并合并去重"""
        # 获取要处理的章节
        if chapter_ids:
            chapters_to_process = chapter_ids
        else:
            chapters = await NovelService.get_chapters(novel_id)
            chapters_to_process = [c["id"] for c in chapters]
        
        if not chapters_to_process:
            return {"success": False, "message": "没有可处理的章节", "count": 0}
        
        # 存储所有提取的元素（按名称去重）
        elements_map: Dict[str, Dict[str, Any]] = {}
        errors = []
        
        for chapter_id in chapters_to_process:
            try:
                extracted = await ExtractionService.extract_from_chapter(
                    novel_id, chapter_id, element_type, template_id, llm_config_id
                )
                
                for elem in extracted:
                    name = elem.get("name", "").strip()
                    if not name:
                        continue
                    
                    normalized_name = ExtractionService._normalize_element_name(name)
                    
                    if normalized_name in elements_map:
                        # 合并:章节 ID 累加;描述只保留最长那一条(避免多章 LLM 重复输出
                        # 同一角色的不同情境下描述被无限拼接,导致档案越来越长)。
                        # 最长 = 通常最完整(包含完整外貌/服装/性格三段);若新描述是旧的严格子串
                        # 跳过;若旧的是新的严格子串,则用新替换;否则按字数比较取长者。
                        existing = elements_map[normalized_name]
                        new_desc = (elem.get("description") or "").strip()
                        old_desc = (existing.get("description") or "").strip()
                        if new_desc:
                            if not old_desc:
                                existing["description"] = new_desc
                            elif new_desc == old_desc or new_desc in old_desc:
                                pass  # 旧的已包含新的,不动
                            elif old_desc in new_desc:
                                existing["description"] = new_desc  # 新的更全
                            elif len(new_desc) > len(old_desc):
                                existing["description"] = new_desc  # 新的更长
                            # else: 旧的更长,保留旧的
                        if chapter_id not in existing.get("chapter_ids", []):
                            existing["chapter_ids"].append(chapter_id)
                        # 合并属性
                        if elem.get("attributes"):
                            existing["attributes"].update(elem["attributes"])
                    else:
                        # 新元素
                        elements_map[normalized_name] = {
                            "name": name,
                            "description": elem.get("description", ""),
                            "attributes": elem.get("attributes", {}),
                            "chapter_ids": [chapter_id]
                        }
                        
            except Exception as e:
                errors.append(f"章节 {chapter_id}: {str(e)}")

        missing_script_errors = [
            err for err in errors
            if "尚未转换为剧本" in err or "请先进行剧本转换" in err
        ]
        if not elements_map and errors and len(missing_script_errors) == len(errors):
            return {
                "success": False,
                "code": "SCRIPT_REQUIRED",
                "count": 0,
                "skipped": 0,
                "total_unique": 0,
                "message": "所选章节尚未生成剧本，请先到「剧本转换」生成剧本后，再提取人物、场景或道具。",
                "errors": errors,
            }
        if not elements_map and errors:
            return {
                "success": False,
                "code": "EXTRACTION_EMPTY",
                "count": 0,
                "skipped": 0,
                "total_unique": 0,
                "message": "没有提取到可保存的内容，请检查章节剧本、提示词模板或模型返回结果。",
                "errors": errors,
            }
        
        # 保存到数据库
        saved_count = 0
        skipped_count = 0
        db = await get_db()
        try:
            # 先查询该 novel_id 下已存在的同类型元素名称列表
            cursor = await db.execute(
                """SELECT name FROM extracted_elements 
                   WHERE novel_id = ? AND element_type = ?""",
                (novel_id, element_type)
            )
            existing_rows = await cursor.fetchall()
            existing_names = {row["name"] for row in existing_rows}
            
            for elem_data in elements_map.values():
                # 如果 name 已存在则跳过
                if elem_data["name"] in existing_names:
                    skipped_count += 1
                    continue
                
                attributes_json = json.dumps(elem_data.get("attributes", {}))
                chapter_ids_json = json.dumps(elem_data.get("chapter_ids", []))
                aliases_json = json.dumps(elem_data.get("aliases", []))
                
                # 插入新记录
                await db.execute(
                    """INSERT INTO extracted_elements 
                       (novel_id, element_type, name, description, attributes, chapter_ids, aliases, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (novel_id, element_type, elem_data["name"], 
                     elem_data["description"], attributes_json, chapter_ids_json, aliases_json, now_beijing_str(), now_beijing_str())
                )
                saved_count += 1
            
            await db.commit()
        finally:
            await db.close()
        
        return {
            "success": True,
            "count": saved_count,
            "skipped": skipped_count,
            "total_unique": len(elements_map),
            "message": f"新增 {saved_count} 个元素，跳过 {skipped_count} 个已存在元素" if skipped_count > 0 else None,
            "errors": errors if errors else None
        }

    @staticmethod
    async def get_elements(novel_id: int, element_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取提取结果，可按类型筛选。
        v3.59.88:排序改为 id DESC(新生成的排前面),用户手动添加 / 重新提取的元素一眼可见。
        v3.61.140:**改成按首次出现章节 ASC + 同章节 id DESC**。
                  chapter_ids 是 JSON 数组,取首个 → JOIN chapters 拿 sort_order;
                  没有 chapter_ids(老数据/手动建)排到最后(sort_order = +inf 替身用 9999999)。
        v3.61.158 round8:用户反馈章节排序意义不大(同章节出场顺序难判别且不稳定),
                          改回纯 id DESC = 创建时间倒序(新建/重提的排前面,贴近 v3.59.88)。
        """
        # 用 LEFT JOIN + json_extract 一步拿到首次出现章节的 sort_order
        # SQLite 的 json_extract(col, '$[0]') 拿数组第一个;chapter_ids 是 TEXT 存的 JSON
        common_cols = """e.id, e.novel_id, e.element_type, e.name, e.description, e.attributes, e.chapter_ids, e.aliases,
                         e.image_url, e.image_prompt, e.image_status, e.reference_image, e.finished_image, e.grid_image,
                         e.panorama_url,
                         e.audio_file, e.volc_asset_id, e.volc_asset_uri, e.volc_asset_status, e.volc_asset_group_id,
                         e.active_variant_id,
                         e.remote_source,
                         e.created_at, e.updated_at,
                         av.variant_name AS active_variant_name,
                         (SELECT COUNT(*) FROM character_variants cv WHERE cv.element_id = e.id) AS variant_count"""
        # 创建时间倒序(id DESC 等价于 created_at DESC,因为 id 是 autoincrement)
        sort_expr = "e.id DESC"
        # v3.61.158: LEFT JOIN character_variants 拿当前 active 名字,防前端逐人请求 N+1
        variant_join = "LEFT JOIN character_variants av ON av.id = e.active_variant_id"
        db = await get_db()
        try:
            if element_type:
                cursor = await db.execute(
                    f"""SELECT {common_cols}
                       FROM extracted_elements e
                       LEFT JOIN chapters c
                         ON c.id = CAST(json_extract(e.chapter_ids, '$[0]') AS INTEGER)
                        AND c.novel_id = e.novel_id
                       {variant_join}
                       WHERE e.novel_id = ? AND e.element_type = ?
                       ORDER BY {sort_expr}""",
                    (novel_id, element_type)
                )
            else:
                cursor = await db.execute(
                    f"""SELECT {common_cols}
                       FROM extracted_elements e
                       LEFT JOIN chapters c
                         ON c.id = CAST(json_extract(e.chapter_ids, '$[0]') AS INTEGER)
                        AND c.novel_id = e.novel_id
                       {variant_join}
                       WHERE e.novel_id = ?
                       ORDER BY e.element_type, {sort_expr}""",
                    (novel_id,)
                )
            
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                row_dict = dict(row)
                # 解析JSON字段（使用 or 兜底，因为 .get() 在值为 None 时不会返回默认值）
                try:
                    row_dict["attributes"] = json.loads(row_dict.get("attributes") or "{}")
                except:
                    row_dict["attributes"] = {}
                try:
                    row_dict["chapter_ids"] = json.loads(row_dict.get("chapter_ids") or "[]")
                except:
                    row_dict["chapter_ids"] = []
                try:
                    row_dict["aliases"] = json.loads(row_dict.get("aliases") or "[]")
                except:
                    row_dict["aliases"] = []
                # 兜底 description 为 None 的情况
                if row_dict.get("description") is None:
                    row_dict["description"] = ""
                result.append(row_dict)
            return result
        finally:
            await db.close()

    @staticmethod
    async def get_element(element_id: int) -> Optional[Dict[str, Any]]:
        """获取单个元素"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM extracted_elements WHERE id = ?",
                (element_id,)
            )
            row = await cursor.fetchone()
            if row:
                row_dict = dict(row)
                try:
                    row_dict["attributes"] = json.loads(row_dict.get("attributes") or "{}")
                except:
                    row_dict["attributes"] = {}
                try:
                    row_dict["chapter_ids"] = json.loads(row_dict.get("chapter_ids") or "[]")
                except:
                    row_dict["chapter_ids"] = []
                try:
                    row_dict["aliases"] = json.loads(row_dict.get("aliases") or "[]")
                except:
                    row_dict["aliases"] = []
                if row_dict.get("description") is None:
                    row_dict["description"] = ""
                return row_dict
            return None
        finally:
            await db.close()

    @staticmethod
    async def create_element(data: Dict[str, Any]) -> Dict[str, Any]:
        """手动添加元素"""
        db = await get_db()
        try:
            attributes_json = json.dumps(data.get("attributes", {}))
            chapter_ids_json = json.dumps(data.get("chapter_ids", []))
            aliases_json = json.dumps(data.get("aliases", []))
            
            cursor = await db.execute(
                """INSERT INTO extracted_elements 
                   (novel_id, element_type, name, description, attributes, chapter_ids, aliases, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (data["novel_id"], data["element_type"], data["name"],
                 data.get("description", ""), attributes_json, chapter_ids_json, aliases_json, now_beijing_str(), now_beijing_str())
            )
            await db.commit()
            element_id = cursor.lastrowid
            return await ExtractionService.get_element(element_id)
        finally:
            await db.close()

    @staticmethod
    async def update_element(element_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """更新元素"""
        db = await get_db()
        try:
            # 获取现有数据
            existing = await ExtractionService.get_element(element_id)
            if not existing:
                return None
            
            # 构建更新字段
            updates = []
            params = []
            
            if "name" in data:
                updates.append("name = ?")
                params.append(data["name"])
            if "description" in data:
                updates.append("description = ?")
                params.append(data["description"])
            if "attributes" in data:
                updates.append("attributes = ?")
                params.append(json.dumps(data["attributes"]))
            if "chapter_ids" in data:
                updates.append("chapter_ids = ?")
                params.append(json.dumps(data["chapter_ids"]))
            if "aliases" in data:
                updates.append("aliases = ?")
                params.append(json.dumps(data["aliases"]))
            
            if not updates:
                return existing
            
            params.append(element_id)
            
            await db.execute(
                f"UPDATE extracted_elements SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()
            
            return await ExtractionService.get_element(element_id)
        finally:
            await db.close()

    @staticmethod
    async def delete_element(element_id: int) -> bool:
        """删除元素"""
        db = await get_db()
        try:
            # 清理关联的 llm_logs
            await db.execute(
                "DELETE FROM llm_logs WHERE source_type = 'extraction' AND source_id = ?",
                (element_id,)
            )
            logger.info(f"[extraction] 已清理元素 {element_id} 的 llm_logs")
            cursor = await db.execute(
                "DELETE FROM extracted_elements WHERE id = ?",
                (element_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    @staticmethod
    async def delete_elements_by_novel(novel_id: int, element_type: Optional[str] = None) -> int:
        """批量删除某小说的提取结果"""
        db = await get_db()
        try:
            # 先查出要删除的元素ID列表
            if element_type:
                cursor = await db.execute(
                    "SELECT id FROM extracted_elements WHERE novel_id = ? AND element_type = ?",
                    (novel_id, element_type)
                )
            else:
                cursor = await db.execute(
                    "SELECT id FROM extracted_elements WHERE novel_id = ?",
                    (novel_id,)
                )
            rows = await cursor.fetchall()
            element_ids = [r[0] if isinstance(r, tuple) else r['id'] for r in rows]
            
            # 清理关联的 llm_logs
            if element_ids:
                placeholders = ','.join(['?' for _ in element_ids])
                await db.execute(
                    f"DELETE FROM llm_logs WHERE source_type = 'extraction' AND source_id IN ({placeholders})",
                    element_ids
                )
                logger.info(f"[extraction] 已清理小说 {novel_id} 的 {len(element_ids)} 个提取元素的 llm_logs")
            
            if element_type:
                cursor = await db.execute(
                    "DELETE FROM extracted_elements WHERE novel_id = ? AND element_type = ?",
                    (novel_id, element_type)
                )
            else:
                cursor = await db.execute(
                    "DELETE FROM extracted_elements WHERE novel_id = ?",
                    (novel_id,)
                )
            await db.commit()
            return cursor.rowcount
        finally:
            await db.close()

    @staticmethod
    async def update_element_image(
        element_id: int,
        image_url=_UNSET,
        image_prompt=_UNSET,
        image_status=_UNSET,
        reference_image=_UNSET,
        finished_image=_UNSET,
        grid_image=_UNSET,
        panorama_url=_UNSET,  # v3.61.147:VR 720° 全景图
        volc_asset_id=_UNSET,
        volc_asset_uri=_UNSET,
        volc_asset_status=_UNSET,
        volc_asset_group_id=_UNSET,
    ) -> Optional[Dict[str, Any]]:
        """更新元素图片信息(含 v3.61.99 火山方舟素材库 4 字段)

        v3.61.127:加 retry 重试 — 高并发 generate-image 场景下偶发"database is locked"。
        WAL 模式 + busy_timeout 30s 仍卡时,主动 sleep 重试 3 次,每次间隔指数退避。
        """
        import asyncio
        import sqlite3
        _MAX_RETRIES = 3
        for _attempt in range(_MAX_RETRIES + 1):
            try:
                db = await get_db()
                try:
                    # 获取现有数据
                    existing = await ExtractionService.get_element(element_id)
                    if not existing:
                        return None

                    # 构建更新字段
                    updates = []
                    params = []

                    if image_url is not _UNSET:
                        updates.append("image_url = ?")
                        params.append(image_url)
                    if image_prompt is not _UNSET:
                        updates.append("image_prompt = ?")
                        params.append(image_prompt)
                    if image_status is not _UNSET:
                        updates.append("image_status = ?")
                        params.append(image_status)
                    if reference_image is not _UNSET:
                        updates.append("reference_image = ?")
                        params.append(reference_image)
                    if finished_image is not _UNSET:
                        updates.append("finished_image = ?")
                        params.append(finished_image)
                    if grid_image is not _UNSET:
                        updates.append("grid_image = ?")
                        params.append(grid_image)
                    if panorama_url is not _UNSET:
                        updates.append("panorama_url = ?")
                        params.append(panorama_url)
                    if volc_asset_id is not _UNSET:
                        updates.append("volc_asset_id = ?")
                        params.append(volc_asset_id)
                    if volc_asset_uri is not _UNSET:
                        updates.append("volc_asset_uri = ?")
                        params.append(volc_asset_uri)
                    if volc_asset_status is not _UNSET:
                        updates.append("volc_asset_status = ?")
                        params.append(volc_asset_status)
                    if volc_asset_group_id is not _UNSET:
                        updates.append("volc_asset_group_id = ?")
                        params.append(volc_asset_group_id)

                    if not updates:
                        return existing

                    # v3.61.220: 任何图片字段更新都 bump updated_at,给前端 cache-buster 一个"内容已变"信号。
                    #   元素图是「同名覆盖」(_build_image_filename 不带 id/uuid),重新生成后 URL 不变,
                    #   前端必须靠 updated_at 跳变才能破浏览器缓存;否则一直显示缓存的旧图(废稿)。
                    updates.append("updated_at = datetime('now', '+8 hours')")

                    params.append(element_id)

                    await db.execute(
                        f"UPDATE extracted_elements SET {', '.join(updates)} WHERE id = ?",
                        params
                    )
                    await db.commit()

                    return await ExtractionService.get_element(element_id)
                finally:
                    await db.close()
            except sqlite3.OperationalError as e:
                msg = str(e).lower()
                if "database is locked" in msg and _attempt < _MAX_RETRIES:
                    _wait = 0.5 * (2 ** _attempt)  # 0.5s / 1.0s / 2.0s
                    logger.warning(f"[update_element_image] sb=? 撞 'database is locked',{_wait}s 后第 {_attempt+1} 次重试")
                    await asyncio.sleep(_wait)
                    continue
                raise

    @staticmethod
    async def update_element_audio(
        element_id: int,
        audio_file: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """更新元素音频文件信息"""
        db = await get_db()
        try:
            # 获取现有数据
            existing = await ExtractionService.get_element(element_id)
            if not existing:
                return None
            
            await db.execute(
                "UPDATE extracted_elements SET audio_file = ? WHERE id = ?",
                (audio_file, element_id)
            )
            await db.commit()
            
            return await ExtractionService.get_element(element_id)
        finally:
            await db.close()

    # ============================================================
    # v3.61.158: 人物马甲(variants)— CRUD + 字段级 fallback merge helper
    # ============================================================

    _VARIANT_MERGE_FIELDS = (
        "finished_image", "image_url", "reference_image",
        "audio_file", "description", "image_prompt", "image_status",
        "volc_asset_id", "volc_asset_uri", "volc_asset_status", "volc_asset_group_id",
    )

    @staticmethod
    def _merge_variant_into_element(element: Dict[str, Any], variant: Dict[str, Any]) -> Dict[str, Any]:
        """字段级 fallback:variant 字段为空(None / '' / [])→ 用 element 同字段。
        返回新 dict,不污染原 element。
        """
        merged = dict(element)
        for k in ExtractionService._VARIANT_MERGE_FIELDS:
            v = variant.get(k)
            if v not in (None, "", []):
                merged[k] = v
        merged["__active_variant_id"] = variant.get("id")
        merged["__active_variant_name"] = variant.get("variant_name")
        # Used by callers that render the resolved asset image. Only use the
        # variant timestamp when the displayed image actually comes from the
        # variant; otherwise the body element timestamp must drive cache busting.
        if variant.get("finished_image") not in (None, "", []) or variant.get("image_url") not in (None, "", []):
            merged["__asset_updated_at"] = variant.get("updated_at") or element.get("updated_at")
        else:
            merged["__asset_updated_at"] = element.get("updated_at")
        return merged

    @staticmethod
    async def resolve_active_character_asset(element: Dict[str, Any]) -> Dict[str, Any]:
        """根据 element.active_variant_id 把 variant 字段合并进 element 返回。
        所有视频生成 / 队列 worker / 分镜素材预览取角色素材都必须走这个 helper。
        - 非 character → 原样返回
        - active_variant_id 空 / 找不到 → 原样返回(degrade gracefully)
        - 找到 → 字段级 merge(variant 字段为空时 fallback element 同字段)
        """
        if not element or element.get("element_type") != "character":
            return element
        _nm = element.get("name")
        _eid = element.get("id")
        vid = element.get("active_variant_id")
        if not vid:
            logger.info(f"[马甲诊断] 角色「{_nm}」(id={_eid}) active_variant_id=空 → 用本体")
            return element
        variant = await ExtractionService.get_variant(int(vid))
        if not variant:
            logger.warning(f"[马甲诊断] 角色「{_nm}」(id={_eid}) active_variant_id={vid} 但 variant 不存在 → 回退本体")
            return element
        # variant 必须真属于这个 element,防御坏引用
        if variant.get("element_id") != element.get("id"):
            logger.warning(
                f"[马甲诊断] 角色「{_nm}」(id={_eid}) active_variant_id={vid} 指向的马甲 element_id="
                f"{variant.get('element_id')} 不属于本角色 → 回退本体(数据不同步)"
            )
            return element
        merged = ExtractionService._merge_variant_into_element(element, variant)
        # 诊断:马甲是否真有图(都为空时 merge 会回退本体图 → 看起来"没换起")
        _has = lambda k: "有" if (variant.get(k) not in (None, "", [])) else "无"
        logger.info(
            f"[马甲诊断] 角色「{_nm}」(id={_eid}) 切马甲「{variant.get('variant_name')}」(vid={vid});"
            f"马甲图: finished={_has('finished_image')} image_url={_has('image_url')} reference={_has('reference_image')} audio={_has('audio_file')}"
            + ("  ⚠️ 马甲无任何图,实际仍用本体图" if all(variant.get(k) in (None, '', []) for k in ('finished_image', 'image_url', 'reference_image')) else "")
        )
        return merged

    @staticmethod
    async def list_variants(element_id: int) -> List[Dict[str, Any]]:
        """列出 element 的所有 variants,按 sort_order 升序 + id 升序"""
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT * FROM character_variants WHERE element_id = ? ORDER BY sort_order, id",
                (element_id,),
            )
            rows = await cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    @staticmethod
    async def get_variant(variant_id: int) -> Optional[Dict[str, Any]]:
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT * FROM character_variants WHERE id = ?", (variant_id,),
            )
            row = await cur.fetchone()
            return dict(row) if row else None
        finally:
            await db.close()

    @staticmethod
    async def get_variant_by_name(element_id: int, variant_name: str) -> Optional[Dict[str, Any]]:
        """按 element_id + 马甲名查马甲(v3.61.264:自由生图关联马甲时查重用)"""
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT * FROM character_variants WHERE element_id = ? AND variant_name = ? LIMIT 1",
                (element_id, (variant_name or "").strip()),
            )
            row = await cur.fetchone()
            return dict(row) if row else None
        finally:
            await db.close()

    @staticmethod
    async def create_variant(element_id: int, variant_name: str, description: str = "") -> Optional[Dict[str, Any]]:
        # 校验 element 存在且 type=character
        el = await ExtractionService.get_element(element_id)
        if not el:
            return None
        if el.get("element_type") != "character":
            raise ValueError("马甲只支持人物类型")
        db = await get_db()
        try:
            cur = await db.execute(
                """INSERT INTO character_variants (element_id, variant_name, description)
                   VALUES (?, ?, ?)""",
                (element_id, variant_name.strip(), (description or "").strip()),
            )
            new_id = cur.lastrowid
            await db.commit()
        finally:
            await db.close()
        return await ExtractionService.get_variant(new_id)

    @staticmethod
    async def update_variant(variant_id: int, **fields) -> Optional[Dict[str, Any]]:
        """通用 update — 接 variant_name / description / image_url / image_prompt /
        image_status / finished_image / reference_image / audio_file / volc_asset_* / sort_order
        """
        allowed = {
            "variant_name", "description",
            "image_url", "image_prompt", "image_status",
            "finished_image", "reference_image", "audio_file",
            "volc_asset_id", "volc_asset_uri", "volc_asset_status", "volc_asset_group_id",
            "sort_order",
        }
        updates = []
        params = []
        for k, v in fields.items():
            if k in allowed:
                updates.append(f"{k} = ?")
                params.append(v)
        if not updates:
            return await ExtractionService.get_variant(variant_id)
        from utils.timezone import now_beijing_str
        updates.append("updated_at = ?")
        params.append(now_beijing_str())
        params.append(variant_id)
        db = await get_db()
        try:
            await db.execute(
                f"UPDATE character_variants SET {', '.join(updates)} WHERE id = ?",
                params,
            )
            await db.commit()
        finally:
            await db.close()
        return await ExtractionService.get_variant(variant_id)

    @staticmethod
    async def delete_variant(variant_id: int) -> bool:
        """删 variant,如果该 variant 是某个 element 的 active_variant_id,顺手清空(防坏引用)"""
        db = await get_db()
        try:
            cur = await db.execute(
                "SELECT element_id FROM character_variants WHERE id = ?", (variant_id,),
            )
            row = await cur.fetchone()
            if not row:
                return False
            element_id = row["element_id"]
            # 同事务清 active_variant_id
            await db.execute(
                "UPDATE extracted_elements SET active_variant_id = NULL "
                "WHERE id = ? AND active_variant_id = ?",
                (element_id, variant_id),
            )
            await db.execute("DELETE FROM character_variants WHERE id = ?", (variant_id,))
            await db.commit()
            return True
        finally:
            await db.close()

    @staticmethod
    async def set_active_variant(element_id: int, variant_id: Optional[int]) -> bool:
        """切换 element.active_variant_id;variant_id=None → 回归本体"""
        # 校验:variant 必须真属于这个 element
        if variant_id is not None:
            v = await ExtractionService.get_variant(variant_id)
            if not v or v.get("element_id") != element_id:
                raise ValueError("该马甲不属于此人物,拒绝设默认")
        db = await get_db()
        try:
            await db.execute(
                "UPDATE extracted_elements SET active_variant_id = ? WHERE id = ?",
                (variant_id, element_id),
            )
            await db.commit()
            return True
        finally:
            await db.close()

    @staticmethod
    async def get_image_style(novel_id: int, element_type: str) -> Dict[str, str]:
        """获取图片风格设置"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """SELECT prefix_prompt, suffix_prompt FROM image_style_settings 
                   WHERE novel_id = ? AND element_type = ?""",
                (novel_id, element_type)
            )
            row = await cursor.fetchone()
            if row:
                return {
                    "prefix_prompt": row["prefix_prompt"] or "",
                    "suffix_prompt": row["suffix_prompt"] or ""
                }
            return {"prefix_prompt": "", "suffix_prompt": ""}
        finally:
            await db.close()

    @staticmethod
    async def save_image_style(
        novel_id: int,
        element_type: str,
        prefix_prompt: str,
        suffix_prompt: str
    ) -> Dict[str, str]:
        """保存图片风格设置（upsert）"""
        db = await get_db()
        try:
            # 检查是否已存在
            cursor = await db.execute(
                """SELECT id FROM image_style_settings 
                   WHERE novel_id = ? AND element_type = ?""",
                (novel_id, element_type)
            )
            existing = await cursor.fetchone()
            
            if existing:
                # 更新
                await db.execute(
                    """UPDATE image_style_settings 
                       SET prefix_prompt = ?, suffix_prompt = ?, updated_at = (datetime('now', '+8 hours'))
                       WHERE novel_id = ? AND element_type = ?""",
                    (prefix_prompt, suffix_prompt, novel_id, element_type)
                )
            else:
                # 插入
                await db.execute(
                    """INSERT INTO image_style_settings 
                       (novel_id, element_type, prefix_prompt, suffix_prompt, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (novel_id, element_type, prefix_prompt, suffix_prompt, now_beijing_str(), now_beijing_str())
                )
            
            await db.commit()
            return {"prefix_prompt": prefix_prompt, "suffix_prompt": suffix_prompt}
        finally:
            await db.close()


