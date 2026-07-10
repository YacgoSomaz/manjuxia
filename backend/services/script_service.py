import json
import logging
from typing import List, Optional, Dict, Any
from database.db import get_db

logger = logging.getLogger(__name__)
from services.llm_service import LLMService
from services.template_service import get_by_id as get_template_by_id
from utils.timezone import now_beijing_str


class ScriptService:
    @staticmethod
    async def convert_chapter(
        novel_id: int,
        chapter_id: int,
        template_id: int,
        llm_config_id: int,
        inject_prev_context: bool = True
    ) -> Dict[str, Any]:
        """
        转换单个章节为剧本

        Args:
            inject_prev_context: 是否注入上一章结尾场景做跨集衔接(默认 True)。
                v3.61.252: 剧本转剧本走逐集忠实格式化,应传 False,避免上一集内容影响本集格式化。

        Returns:
            {
                "success": bool,
                "script_id": int or None,
                "message": str,
                "chapter_title": str
            }
        """
        db = await get_db()
        try:
            # 1. 获取章节内容
            cursor = await db.execute(
                "SELECT id, title, content FROM chapters WHERE id = ? AND novel_id = ?",
                (chapter_id, novel_id)
            )
            chapter = await cursor.fetchone()
            if not chapter:
                return {
                    "success": False,
                    "script_id": None,
                    "message": f"章节不存在: chapter_id={chapter_id}",
                    "chapter_title": ""
                }
            
            chapter_title = chapter["title"]
            chapter_content = chapter["content"]
            
            # 2. 获取提示词模板
            template = await get_template_by_id(template_id)
            if not template:
                return {
                    "success": False,
                    "script_id": None,
                    "message": f"模板不存在: template_id={template_id}",
                    "chapter_title": chapter_title
                }

            # 上报使用计数(预置模板才计,异步失败静默)
            try:
                from services.template_service import report_usage as _report_template_usage
                await _report_template_usage(template)
            except Exception:
                pass

            # 3. 解析模板变量并填充内容
            template_content = template["content"]
            variables = json.loads(template.get("variables", "[]"))
            
            # 构建变量映射 - 支持多种常见变量名
            variable_map = {
                "novel_content": chapter_content,
                "chapter_content": chapter_content,
                "content": chapter_content,
                "chapter": chapter_content,
                "text": chapter_content,
                "chapter_title": chapter_title,
                "title": chapter_title,
                "chapter_id": str(chapter_id),
            }
            
            # 替换模板中的变量占位符（支持 {var} 和 {{var}} 两种格式）
            prompt = template_content
            has_replacement = False
            
            # 首先尝试根据模板定义的变量进行替换
            for var_name in variables:
                # 支持 {var_name} 格式
                placeholder1 = f"{{{var_name}}}"
                if placeholder1 in prompt:
                    prompt = prompt.replace(placeholder1, variable_map.get(var_name, ""))
                    has_replacement = True
                # 支持 {{var_name}} 格式
                placeholder2 = f"{{{{{var_name}}}}}"
                if placeholder2 in prompt:
                    prompt = prompt.replace(placeholder2, variable_map.get(var_name, ""))
                    has_replacement = True
            
            # 如果没有匹配到任何变量定义，尝试直接替换常见变量名
            if not has_replacement:
                for var_name, var_value in variable_map.items():
                    placeholder1 = f"{{{var_name}}}"
                    if placeholder1 in prompt:
                        prompt = prompt.replace(placeholder1, var_value)
                        has_replacement = True
                    placeholder2 = f"{{{{{var_name}}}}}"
                    if placeholder2 in prompt:
                        prompt = prompt.replace(placeholder2, var_value)
                        has_replacement = True
            
            # 如果仍然没有替换任何内容（模板中没有变量占位符），则将章节内容追加到模板后面
            if prompt == template_content or not has_replacement:
                prompt = f"{template_content}\n\n以下是需要转换的小说章节内容：\n\n章节标题：{chapter_title}\n\n{chapter_content}"

            # 3.5 跨章节场景衔接:查上一章剧本的最后一个场景,作为上下文注入
            # 解决"上一集在场景 A,下一集开头没写场景,LLM 就跳到场景 B"的问题
            # v3.61.252: 剧本转剧本逐集忠实格式化时关闭(inject_prev_context=False),防上一集内容串味
            try:
                prev_info = await ScriptService._get_prev_chapter_last_scene(novel_id, chapter_id) if inject_prev_context else None
                if prev_info:
                    prev_scene_title = prev_info.get("scene_title") or ""
                    prev_tail = (prev_info.get("scene_content") or "")[-600:]  # 只取最后 600 字
                    inject = (
                        f"\n\n---\n\n"
                        f"【上一章剧本结尾场景·重要衔接参考】\n"
                        f"上一章最后一个场景标头: {prev_scene_title}\n"
                        f"上一章最后一个场景结尾内容:\n"
                        f"{prev_tail}\n\n"
                        f"【衔接规则】\n"
                        f"1. 若当前章节开头的小说文本没有明确切换场景,请延续上一章最后场景(保留地点/时间/人物位置连续)\n"
                        f"2. 若当前文本显式切换场景(有『次日』『换到 xxx』『另一边』等),按新场景拆分\n"
                        f"3. 人物状态(姿势/伤势/情绪/所持道具)默认延续,除非文本里明确写了变化\n"
                    )
                    prompt = prompt + inject
                    logger.info(f"[script-chain] 章节 {chapter_id} 注入上一章结尾场景 '{prev_scene_title}'")
            except Exception as _e:
                logger.warning(f"[script-chain] 查询上一章结尾场景失败,跳过: {_e}")

            # 4. 调用大模型进行转换
            try:
                # v3.61.89: system prompt 加强 — 防 reasoning 模型(Gemini-3.1-pro/Claude)输出英文思考链
                # v3.61.252: 补齐云端团队版 FORMAT_OUTPUT_GUARD 强约束(禁导演意图/节奏位/秒数节拍标/分隔线/代码块)
                messages = [
                    {"role": "system", "content": (
                        "你是一位专业的剧本编写助手，请将内容转换为视频剧本格式。"
                        "\n\n【输出硬约束(最高优先级,必须遵守)】"
                        "\n1. 只输出剧本正文本身。第一个字符必须是剧本场景标头(如 【外 xxx 日】/【内 xxx 夜】/【黑屏字卡:xxx】),不允许任何前言。"
                        "\n2. 直接输出中文剧本内容,严禁输出任何英文思考过程(如 **Refining Novel to Script**、I'm processing... 等)。"
                        "\n3. 严禁在剧本前加任何元描述(如 'Here is the script:' / '以下是剧本:' / '我来转换:')。"
                        "\n4. 严禁输出以下任何内容:导演意图、关键事件、节奏位、剧情梗概/简介、字数或时长预估(如「1046 字 · 约 1 分 24 秒」)、"
                        "秒数节拍标(如「(0-10秒 · 钩子)」「(11-30秒)」)、分隔线(———/---)。"
                        "\n5. 严禁任何解释、总结、思考链、markdown 代码块包裹。场景之间最多一个空行。"
                    )},
                    {"role": "user", "content": prompt}
                ]
                
                # v3.61.78: 改用 call_llm_with_retry,上游 502/503/upstream 瞬时错自动重试 3 次
                #            (用户截图:灵芽 Gemini-3.1-pro 上游 503 三连,转换失败)
                script_content = await LLMService.call_llm_with_retry(
                    max_retries=3,
                    retry_delay=8.0,
                    config_id=llm_config_id,
                    messages=messages,
                    timeout=300,
                    task_type="script_convert",
                    novel_id=novel_id,
                    chapter_title=chapter_title
                )
                
                if not script_content or not script_content.strip():
                    return {
                        "success": False,
                        "script_id": None,
                        "message": "大模型返回空内容",
                        "chapter_title": chapter_title
                    }

                # v3.61.89: 剥离 reasoning 模型(Gemini-3.1-pro / Claude)输出的思考链
                # 现象(2026-05-15 起):Gemini 3.1 Pro 服务端把 thinking 默认从隐藏改成附带输出,
                #       LLM 把"思考过程"也写进 content,前半段是 **Refining Novel to Script** /
                #       **剧本转化思考** 等(英中混合),后面才是真正的剧本。
                # 修法:开头是 `**xxx**` 思考标记的,找第一个真正剧本场景标头,前面思考链全部丢掉
                _stripped = script_content.lstrip()
                # 判定为思考链开头的特征(英中通杀):
                #   1) 开头是 **xxx** 加粗段
                #   2) 前 1000 字内含"思考/思路/思绪/梳理/转化/I'm/I have/Refining/Translating/Processing/Mapping"等元描述词
                _looks_like_thinking = _stripped.startswith('**')
                if _looks_like_thinking:
                    _head = _stripped[:1500]
                    _meta_keywords = (
                        '思考', '思路', '思绪', '梳理', '转化', '转换', '处理', '分析',
                        'I\'m', 'I have', 'Refining', 'Translating', 'Processing',
                        'Mapping', 'Adapting', 'Visualizing', 'Converting', 'Structuring',
                    )
                    if any(k in _head for k in _meta_keywords):
                        import re as _re_strip
                        # 找第一个真正剧本标头:【内 xxx】/【外 xxx】/【场景 N】/【黑屏字卡】/【序幕】/【片头】/【片尾】
                        m = _re_strip.search(r'【\s*(内|外|场景\s*\d+|黑屏|序幕|片头|片尾)', script_content)
                        if m:
                            dropped = script_content[:m.start()]
                            script_content = script_content[m.start():]
                            logger.info(
                                f"[script-convert] 剥离 reasoning 思考链 {len(dropped)} 字符,"
                                f"保留剧本 {len(script_content)} 字符 "
                                f"(开头被剥:{dropped[:60]!r}...)"
                            )
                
            except Exception as e:
                return {
                    "success": False,
                    "script_id": None,
                    "message": f"大模型调用失败: {str(e)}",
                    "chapter_title": chapter_title
                }
            
            # 5. 检查是否已存在该章节的剧本，如果存在则更新
            cursor = await db.execute(
                "SELECT id FROM scripts WHERE novel_id = ? AND chapter_id = ?",
                (novel_id, chapter_id)
            )
            existing = await cursor.fetchone()

            # 防御性清理:删除同 chapter 下"非当前 script_id"的所有旧 storyboards
            # 历史上有 bug 在某些时期为同 chapter 创建了多个 script(2026-04 之前),
            # 残留的旧 script storyboards 会让 grouped 接口在不传 script_id 时
            # 串到当前 chapter 的视图,UI 展示错乱(2026-04 用户报"本节结尾状态显示别节内容")
            cursor = await db.execute(
                "SELECT id FROM scripts WHERE novel_id = ? AND chapter_id = ?",
                (novel_id, chapter_id)
            )
            same_chapter_scripts = [r["id"] for r in await cursor.fetchall()]
            if existing and existing["id"] in same_chapter_scripts:
                same_chapter_scripts = [s for s in same_chapter_scripts if s != existing["id"]]
            if same_chapter_scripts:
                placeholders = ",".join("?" * len(same_chapter_scripts))
                cursor = await db.execute(
                    f"SELECT COUNT(*) FROM storyboards WHERE novel_id = ? AND script_id IN ({placeholders})",
                    (novel_id, *same_chapter_scripts)
                )
                stale_count = (await cursor.fetchone())[0]
                if stale_count > 0:
                    await db.execute(
                        f"DELETE FROM storyboards WHERE novel_id = ? AND script_id IN ({placeholders})",
                        (novel_id, *same_chapter_scripts)
                    )
                    logger.info(
                        f"[script] 清理同 chapter={chapter_id} 下旧 script(ids={same_chapter_scripts}) "
                        f"的残留 storyboards: {stale_count} 条"
                    )

            if existing:
                # 重新生成剧本时清空当前 script 的旧分镜数据
                await db.execute(
                    "DELETE FROM storyboards WHERE novel_id = ? AND script_id = ?",
                    (novel_id, existing["id"])
                )
                logger.info(f"[script] 剧本重新生成，已清空 script_id={existing['id']} 的旧分镜数据")

                # 更新现有剧本(同时更新 template_id 为本次用的)
                # v3.61.142:LLM 重新生成也算"本地版本",打 dirty 标记防被短剧同步覆盖
                await db.execute(
                    "UPDATE scripts SET content = ?, template_id = ?, remote_version = -1 WHERE id = ?",
                    (script_content, template_id, existing["id"])
                )
                await db.commit()
                script_id = existing["id"]
            else:
                # 创建新剧本
                # v3.61.142:LLM 新建也算"本地版本",打 dirty 标记防被短剧同步覆盖
                cursor = await db.execute(
                    "INSERT INTO scripts (novel_id, chapter_id, content, template_id, remote_version, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (novel_id, chapter_id, script_content, template_id, -1, now_beijing_str())
                )
                await db.commit()
                script_id = cursor.lastrowid
            
            return {
                "success": True,
                "script_id": script_id,
                "message": "转换成功",
                "chapter_title": chapter_title
            }
            
        finally:
            await db.close()

    @staticmethod
    async def _get_prev_chapter_last_scene(novel_id: int, chapter_id: int) -> Optional[Dict[str, Any]]:
        """查找上一章(chapter_id-1 或按 id 排序的前一个)剧本的最后一个场景.

        返回 {scene_title, scene_content} 或 None(没有上一章/没剧本)
        """
        import re as _re
        db = await get_db()
        try:
            # 按 chapter_id 找前一个有剧本的章节
            async with db.execute(
                "SELECT c.id as cid, s.content FROM chapters c "
                "JOIN scripts s ON s.chapter_id = c.id AND s.novel_id = c.novel_id "
                "WHERE c.novel_id = ? AND c.id < ? "
                "AND s.content IS NOT NULL AND LENGTH(s.content) > 0 "
                "ORDER BY c.id DESC LIMIT 1",
                (novel_id, chapter_id)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return None
                content = row["content"] or ""
        finally:
            await db.close()

        if not content:
            return None

        # 找最后一个场景标头(【...】开头独占一行)
        # 支持 【外 xxx】/【内 xxx】/【现实 · xxx】等格式
        scene_heads = list(_re.finditer(r'^[^\n]*【[^】\n]+】[^\n]{0,60}', content, _re.MULTILINE))
        if not scene_heads:
            # 整个 content 最后 500 字作为 fallback
            return {"scene_title": "", "scene_content": content[-500:]}

        last = scene_heads[-1]
        start = last.start()
        return {
            "scene_title": last.group(0).strip(),
            "scene_content": content[start:],
        }

    @staticmethod
    async def convert_all_chapters(
        novel_id: int,
        template_id: int,
        llm_config_id: int,
        chapter_ids: Optional[List[int]] = None,
        inject_prev_context: bool = True
    ) -> Dict[str, Any]:
        """
        批量转换章节
        
        Args:
            novel_id: 小说ID
            template_id: 模板ID
            llm_config_id: LLM配置ID
            chapter_ids: 指定要转换的章节ID列表，为None则转换所有章节
        
        Returns:
            {
                "novel_id": int,
                "results": List[Dict],
                "total": int,
                "success_count": int,
                "failed_count": int
            }
        """
        db = await get_db()
        try:
            # 获取要转换的章节列表
            if chapter_ids:
                # 使用指定的章节ID列表
                placeholders = ",".join(["?" for _ in chapter_ids])
                cursor = await db.execute(
                    f"SELECT id, title FROM chapters WHERE novel_id = ? AND id IN ({placeholders}) ORDER BY sort_order, id",
                    (novel_id, *chapter_ids)
                )
            else:
                # 获取所有章节
                cursor = await db.execute(
                    "SELECT id, title FROM chapters WHERE novel_id = ? ORDER BY sort_order, id",
                    (novel_id,)
                )
            
            chapters = await cursor.fetchall()
            
            if not chapters:
                return {
                    "novel_id": novel_id,
                    "results": [],
                    "total": 0,
                    "success_count": 0,
                    "failed_count": 0
                }
            
            results = []
            success_count = 0
            failed_count = 0
            
            # 逐个转换章节
            for chapter in chapters:
                result = await ScriptService.convert_chapter(
                    novel_id=novel_id,
                    chapter_id=chapter["id"],
                    template_id=template_id,
                    llm_config_id=llm_config_id,
                    inject_prev_context=inject_prev_context
                )
                
                results.append({
                    "chapter_id": chapter["id"],
                    "chapter_title": result["chapter_title"],
                    "success": result["success"],
                    "script_id": result["script_id"],
                    "message": result["message"]
                })
                
                if result["success"]:
                    success_count += 1
                else:
                    failed_count += 1
            
            return {
                "novel_id": novel_id,
                "results": results,
                "total": len(chapters),
                "success_count": success_count,
                "failed_count": failed_count
            }
            
        finally:
            await db.close()
    
    @staticmethod
    async def get_scripts(novel_id: int) -> Dict[str, Any]:
        """获取某小说的所有剧本"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT s.*, c.title as chapter_title 
                FROM scripts s
                LEFT JOIN chapters c ON s.chapter_id = c.id
                WHERE s.novel_id = ?
                ORDER BY s.created_at DESC
                """,
                (novel_id,)
            )
            rows = await cursor.fetchall()
            
            scripts = []
            for row in rows:
                scripts.append({
                    "id": row["id"],
                    "novel_id": row["novel_id"],
                    "chapter_id": row["chapter_id"],
                    "content": row["content"],
                    "created_at": row["created_at"],
                    "chapter_title": row["chapter_title"]
                })
            
            return {
                "scripts": scripts,
                "total": len(scripts),
                "novel_id": novel_id
            }
            
        finally:
            await db.close()
    
    @staticmethod
    async def get_script(script_id: int) -> Optional[Dict[str, Any]]:
        """获取单个剧本"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT s.*, c.title as chapter_title 
                FROM scripts s
                LEFT JOIN chapters c ON s.chapter_id = c.id
                WHERE s.id = ?
                """,
                (script_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                return {
                    "id": row["id"],
                    "novel_id": row["novel_id"],
                    "chapter_id": row["chapter_id"],
                    "content": row["content"],
                    "created_at": row["created_at"],
                    "chapter_title": row["chapter_title"]
                }
            return None
            
        finally:
            await db.close()
    
    @staticmethod
    async def get_script_by_chapter(chapter_id: int) -> Optional[Dict[str, Any]]:
        """根据章节ID获取剧本"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT s.*, c.title as chapter_title, c.content as chapter_content
                FROM scripts s
                LEFT JOIN chapters c ON s.chapter_id = c.id
                WHERE s.chapter_id = ?
                """,
                (chapter_id,)
            )
            row = await cursor.fetchone()
            
            if row:
                return {
                    "id": row["id"],
                    "novel_id": row["novel_id"],
                    "chapter_id": row["chapter_id"],
                    "content": row["content"],
                    "created_at": row["created_at"],
                    "chapter_title": row["chapter_title"],
                    "chapter_content": row["chapter_content"]
                }
            return None
            
        finally:
            await db.close()
    
    @staticmethod
    async def update_script(script_id: int, content: str) -> Optional[Dict[str, Any]]:
        """更新剧本内容。
        v3.61.142:用户保存动作 → remote_version=-1(dirty 标记),
                  下次短剧工坊同步时本脚本不被远端覆盖。
        """
        db = await get_db()
        try:
            # 检查剧本是否存在
            cursor = await db.execute(
                "SELECT id FROM scripts WHERE id = ?",
                (script_id,)
            )
            if not await cursor.fetchone():
                return None

            await db.execute(
                "UPDATE scripts SET content = ?, remote_version = -1 WHERE id = ?",
                (content, script_id)
            )
            await db.commit()

            return await ScriptService.get_script(script_id)

        finally:
            await db.close()
    
    @staticmethod
    async def delete_script(script_id: int) -> bool:
        """删除剧本"""
        db = await get_db()
        try:
            # 删除脚本关联的llm_logs（包括script_convert和storyboard类型）
            await db.execute(
                "DELETE FROM llm_logs WHERE source_type IN ('script_convert', 'storyboard') AND source_id = ?",
                (script_id,)
            )
            logger.info(f"[script] 已清理脚本 {script_id} 的 llm_logs")
            cursor = await db.execute(
                "DELETE FROM scripts WHERE id = ?",
                (script_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
            
        finally:
            await db.close()
    
    @staticmethod
    async def delete_scripts_by_novel(novel_id: int) -> int:
        """删除小说的所有剧本，返回删除数量"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM scripts WHERE novel_id = ?",
                (novel_id,)
            )
            await db.commit()
            return cursor.rowcount
            
        finally:
            await db.close()
