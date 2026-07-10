import json
import logging
import asyncio
import re
from typing import Optional, List, Dict, Any
import aiohttp
from utils.ssl_helper import get_aiohttp_connector
from database.db import get_db
from models.templates import TemplateCreate, TemplateUpdate
from utils.timezone import now_beijing_str
from services.offline_guard import require_cloud

logger = logging.getLogger(__name__)
ADMIN_SERVER = "https://xiaoshuo.qianshanai.cn"

# 受保护模板类别:这些预置模板的 content 是核心 IP,绝不落本地库 / 绝不下发客户端,
# 生成时走 admin 服务端 assemble。目前只保护分镜生成模板(风格提示词暂不保护)。
_PROTECTED_CATEGORIES = {"storyboard_generation"}


def _is_protected_template(category: Optional[str], is_preset) -> bool:
    return (category in _PROTECTED_CATEGORIES) and (str(is_preset) == "1" or is_preset == 1)


def _extract_timestamp_skew_offset(body: str) -> Optional[int]:
    """从 admin 403 body 里提取 timestamp_skew(diff=Ns),用于错误机器时间的签名重试。"""
    if not body:
        return None
    m = re.search(r"timestamp_skew\s*\(\s*diff\s*=\s*(-?\d+)s\s*\)", body)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def _extract_description(content: str, max_len: int = 80) -> str:
    """从模板内容中提取前几行有意义的文字作为描述摘要"""
    if not content:
        return ""
    # 逐行扫描，跳过空行和纯占位符/JSON行，取第一行有意义的文字
    import re
    for line in content.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        # 跳过 JSON 结构行、纯变量占位符行、代码块标记
        if line.startswith(('{', '}', '[', ']', '```', '---')):
            continue
        if re.match(r'^\{\{?\w+\}\}?$', line):
            continue
        # 找到有意义的文字行
        if len(line) > max_len:
            return line[:max_len] + '...'
        return line
    return ""

# 本地预置模板（当无法从 admin-server 同步时使用）
LOCAL_PRESET_TEMPLATES = [
    {
        "name": "小说大纲生成模板",
        "category": "novel_outline",
        "description": "根据一句话概念生成完整的小说大纲",
        "variables": ["concept"],
        "content": """请根据以下概念，生成一部完整的小说大纲。

创作概念：
{concept}

请严格按照以下JSON格式输出（不要添加其他内容）：
```json
{
  "story_summary": "故事梗概（200-300字）",
  "characters": [
    {"name": "角色名", "identity": "身份背景", "personality": "性格特点", "relationships": "与其他角色的关系"}
  ],
  "scenes": [
    {"name": "场景名称", "description": "场景描述"}
  ],
  "props": [
    {"name": "道具名", "description": "外观描述", "significance": "在故事中的作用"}
  ],
  "world_setting": "世界观和时代背景设定（100-200字）",
  "chapters": [
    {"title": "第1章: 章节标题", "summary": "本章概要（150-200字，包含主要情节、冲突和转折）"}
  ]
}
```

要求：
1. 角色要有鲜明性格和清晰的关系网
2. 章节数量10-20章，每章概要包含核心冲突和发展
3. 情节要有起承转合，伏笔要前后呼应
4. 场景描写要有画面感，适合视觉化呈现"""
    },
    {
        "name": "小说章节创作模板",
        "category": "novel_creation",
        "description": "根据大纲和上下文逐章创作小说正文",
        "variables": ["outline", "chapter_outline", "characters_state", "scenes_state", "props_state", "prev_summaries", "plot_threads"],
        "content": """你是一位专业小说作家，请根据以下信息撰写指定章节的完整正文。

【全书大纲】
{outline}

【本章规划】
{chapter_outline}

【角色当前状态】
{characters_state}

【场景当前状态】
{scenes_state}

【道具当前状态】
{props_state}

【前文内容摘要】
{prev_summaries}

【未解决的伏笔线索】
{plot_threads}

创作要求：
1. 严格按照本章规划的情节发展撰写
2. 人物言行要符合其性格设定和当前状态
3. 场景描写要与场景设定一致
4. 道具使用要合理，已消耗的不能再出现
5. 与前文内容保持连贯，不能出现逻辑矛盾
6. 适当推进或回收伏笔线索
7. 每章字数2000-4000字
8. 直接输出小说正文，不要添加任何元数据或说明"""
    },
    {
        "name": "章节后处理模板",
        "category": "novel_post_process",
        "description": "分析章节内容，生成摘要并更新角色/场景/道具状态",
        "variables": ["chapter_content", "characters", "scenes", "props", "plot_threads"],
        "content": """请分析以下小说章节内容，提取关键信息。

【章节内容】
{chapter_content}

【当前已知角色】
{characters}

【当前已知场景】
{scenes}

【当前已知道具】
{props}

【当前伏笔线索】
{plot_threads}

请严格按照以下JSON格式输出：
```json
{
  "summary": "本章摘要（300-500字，概括主要情节发展、人物行动和关键转折）",
  "character_updates": [
    {"name": "角色名", "state": "该角色在本章结束时的最新状态（位置、身体状况、情感变化、获得的信息等）"}
  ],
  "scene_updates": [
    {"name": "场景名", "state": "场景在本章中的变化（如被破坏、发现新区域等）"}
  ],
  "prop_updates": [
    {"name": "道具名", "state": "道具状态变化（如被使用、被损坏、转手等）"}
  ],
  "new_plot_threads": [
    {"name": "伏笔名称", "content": "新出现的伏笔或悬念描述"}
  ],
  "resolved_plot_threads": ["已在本章解决或揭示的伏笔名称"]
}
```

注意：
1. 只报告本章中实际发生变化的角色/场景/道具
2. 如果出现了新角色/场景/道具，也要列出
3. 摘要要包含关键情节点，便于后续章节参考"""
    }
]


async def clear_local_preset_content():
    """C 方案:启动时把所有预置模板的 content 字段清空。
    运行时需要再按需从 admin 拉取,模板明文不再落在本地 SQLite。
    (只清 is_preset=1 的,用户自己创建的模板不动)
    """
    db = await get_db()
    try:
        cur = await db.execute(
            "UPDATE prompt_templates SET content = '' WHERE is_preset = 1 AND content != ''"
        )
        n = cur.rowcount if hasattr(cur, 'rowcount') else 0
        await db.commit()
        if n > 0:
            logger.info(f"[template_service] 已清空 {n} 条预置模板的本地 content(C 方案)")
    except Exception as e:
        logger.warning(f"[template_service] 清空本地预置 content 失败: {e}")
    finally:
        await db.close()


async def purge_protected_template_content() -> int:
    """护模板迁移:把本地库中受保护分镜模板的历史缓存 content 一律清空。
    每次启动跑一次,防老库残留(meta_only/同步改空只覆盖新写入,残留需主动清)。
    返回清理条数。"""
    try:
        db = await get_db()
        try:
            cats = ",".join("?" for _ in _PROTECTED_CATEGORIES)
            cur = await db.execute(
                f"UPDATE prompt_templates SET content='' "
                f"WHERE is_preset=1 AND category IN ({cats}) "
                f"AND content IS NOT NULL AND content!=''",
                tuple(_PROTECTED_CATEGORIES),
            )
            await db.commit()
            n = cur.rowcount if cur.rowcount is not None else 0
            if n:
                logger.info(f"[护模板] 清理本地残留受保护模板 content: {n} 条")
            return n
        finally:
            await db.close()
    except Exception as e:
        logger.warning(f"[护模板] 清理残留 content 失败(忽略): {e}")
        return 0


async def sync_preset_templates():
    """从 admin-server 同步预置模板"""
    require_cloud("远端预置模板同步")
    # 护模板:每次同步前先清掉本地受保护模板的历史缓存 content
    await purge_protected_template_content()
    try:
        # v3.61.68: 加客户端签名 header(preset 列表接口默认只下发元数据,但加签证防扒)
        # v3.61.71 修:启动时 license 还没设置,但 admin 严格模式下没签名直接 403,
        #            导致 sync_preset_templates 永远 403 同步失败。空 license 也照样签名,
        #            admin 端接受空 license(只验签名格式)
        from services import license_context as _lc
        from utils.client_signature import sign_request
        _ctx = _lc.get_context()
        _lic = _ctx.get("license_key") or ""
        _mid = _ctx.get("machine_id") or ""
        # GET 请求 body 为空,签名时 body_hash 用空字节
        async def _fetch_preset_list(time_offset_sec: int = 0) -> tuple[int, Any]:
            sig_headers = sign_request(_lic, _mid, b"", time_offset_sec=time_offset_sec)
            async with aiohttp.ClientSession(connector=get_aiohttp_connector()) as session:
                async with session.get(
                    f"{ADMIN_SERVER}/api/templates/preset",
                    headers=sig_headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        return 200, await resp.json()
                    return resp.status, await resp.text()

        status, data = await _fetch_preset_list()
        if status == 403 and isinstance(data, str):
            skew = _extract_timestamp_skew_offset(data)
            if skew is not None:
                logger.warning(f"[template_service] 模板同步签名时间偏移 {skew}s,按云端 diff 重签重试")
                status, data = await _fetch_preset_list(skew)

        if status != 200:
            logger.warning(f"同步预置模板失败：HTTP {status}")
            return False

        remote_templates = data.get("templates", [])
        
        if not remote_templates:
            logger.info("远程无预置模板")
            return True
        
        db = await get_db()
        try:
            # 获取本地所有预置模板
            async with db.execute(
                "SELECT id, name, category, content FROM prompt_templates WHERE is_preset = 1"
            ) as cursor:
                local_rows = await cursor.fetchall()
            
            # 构建本地模板索引：(name, category) -> (id, name, category, content)
            local_index = {}
            for row in local_rows:
                key = (row["name"], row["category"])
                local_index[key] = dict(row)
            
            # 远程模板名称+分类集合
            remote_keys = set()
            
            # 处理远程模板：更新或新增
            for remote in remote_templates:
                key = (remote["name"], remote["category"])
                remote_keys.add(key)

                # 远程 genres 序列化(admin 返回的是数组,本地存 JSON 字符串)
                remote_genres_raw = remote.get("genres") or []
                if isinstance(remote_genres_raw, str):
                    remote_genres_json = remote_genres_raw
                else:
                    remote_genres_json = json.dumps(remote_genres_raw, ensure_ascii=False)

                # ★ 护模板:受保护分镜模板(storyboard_generation)content 绝不落本地库,
                #   只存元数据(admin_id/variables/description/genres);生成时走 admin assemble。
                _content_to_store = "" if _is_protected_template(remote.get("category"), 1) \
                    else (remote.get("content") or "")

                if key in local_index:
                    # 更新现有模板(同时回填 admin_id,这样后续使用计数能精确锁定)
                    local_content_len = len(local_index[key].get("content", "") or "")
                    remote_content_len = len(remote.get("content", ""))
                    logger.info(f"更新预置模板 [{remote['category']}] {remote['name']}: {local_content_len} -> {remote_content_len} 字符 admin_id={remote.get('id')}")

                    await db.execute("""
                        UPDATE prompt_templates
                        SET content = ?, variables = ?, description = ?, genres = ?, admin_id = ?, updated_at = (datetime('now', '+8 hours'))
                        WHERE id = ?
                    """, (
                        _content_to_store,
                        json.dumps(remote.get("variables", [])),
                        remote.get("description", ""),
                        remote_genres_json,
                        remote.get("id"),
                        local_index[key]["id"]
                    ))
                else:
                    # 新增模板(直接带 admin_id)
                    logger.info(f"新增预置模板 [{remote['category']}] {remote['name']}: {len(remote.get('content', ''))} 字符 admin_id={remote.get('id')}")
                    await db.execute("""
                        INSERT INTO prompt_templates (name, category, content, variables, description, genres, admin_id, is_preset, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """, (
                        remote["name"],
                        remote["category"],
                        _content_to_store,
                        json.dumps(remote.get("variables", [])),
                        remote.get("description", ""),
                        remote_genres_json,
                        remote.get("id"),
                        now_beijing_str(),
                        now_beijing_str()
                    ))
            
            # 删除本地有但远程没有的预置模板（排除 LOCAL_PRESET_TEMPLATES 中的）
            # 删除前做引用迁移:admin 改名场景下,把引用旧 id 的 novels/storyboards
            # 迁移到新 id(同 category 下 name 前缀/包含关系匹配)
            local_preset_keys = {(p["name"], p["category"]) for p in LOCAL_PRESET_TEMPLATES}
            # 建立 remote name-by-category 索引,便于 fuzzy 匹配
            remote_by_cat: Dict[str, List[Dict[str, Any]]] = {}
            for r in remote_templates:
                remote_by_cat.setdefault(r["category"], []).append(r)

            async def _find_new_local_id(old_name: str, cat: str) -> Optional[int]:
                """找 admin 现有同 category 下 name 是旧 name 前缀/超集的候选"""
                candidates_remote = remote_by_cat.get(cat, [])
                best_name = None
                for r in candidates_remote:
                    rn = r.get("name") or ""
                    if rn == old_name:
                        continue
                    if rn.startswith(old_name) or old_name.startswith(rn):
                        if best_name is None or abs(len(rn) - len(old_name)) < abs(len(best_name) - len(old_name)):
                            best_name = rn
                if not best_name:
                    return None
                # 查本地新 id (sync 这一轮已经 insert 了新模板)
                async with db.execute(
                    "SELECT id FROM prompt_templates WHERE name=? AND category=? AND is_preset=1",
                    (best_name, cat)
                ) as cur:
                    row = await cur.fetchone()
                    return row["id"] if row else None

            for key, local_data in local_index.items():
                if key not in remote_keys and key not in local_preset_keys:
                    old_id = local_data["id"]
                    old_name = local_data["name"]
                    old_cat = local_data["category"]
                    # 尝试找新 id 做引用迁移
                    new_id = await _find_new_local_id(old_name, old_cat)
                    if new_id:
                        try:
                            # novels.template_id / script_to_novel_template_id
                            await db.execute(
                                "UPDATE novels SET template_id=? WHERE template_id=?",
                                (new_id, old_id)
                            )
                            # storyboards.template_id
                            await db.execute(
                                "UPDATE storyboards SET template_id=? WHERE template_id=?",
                                (new_id, old_id)
                            )
                            # scripts.template_id (如有)
                            try:
                                await db.execute(
                                    "UPDATE scripts SET template_id=? WHERE template_id=?",
                                    (new_id, old_id)
                                )
                            except Exception:
                                pass  # 字段可能不存在,忽略
                            logger.info(f"[template_sync] 迁移引用 id={old_id}→{new_id} ({old_name} → admin 新名)")
                        except Exception as e:
                            logger.warning(f"[template_sync] 引用迁移失败 {old_name}: {e}")
                    await db.execute(
                        "DELETE FROM prompt_templates WHERE id = ?",
                        (old_id,)
                    )
                    logger.info(f"删除预置模板: {old_name} (id={old_id})")

            # Legacy 清理:早期脚本用 is_preset=0 直接写入的 V2 模板,
            # 若已不在 remote,也要清掉(否则用户在 admin 删除后本地残留)
            LEGACY_ORPHAN_NAMES = [
                '视频工程分镜 V2 Pro · 结构化版',
                '视频工程分镜 V2 · 紧凑兼容版',
            ]
            remote_names = {r["name"] for r in remote_templates}
            for legacy_name in LEGACY_ORPHAN_NAMES:
                if legacy_name not in remote_names:
                    cur = await db.execute(
                        "DELETE FROM prompt_templates WHERE name = ? AND is_preset = 0",
                        (legacy_name,)
                    )
                    if cur.rowcount > 0:
                        logger.info(f"清理 legacy 残留模板: {legacy_name} ({cur.rowcount} 条)")
            
            # 同步本地预置模板（补充远程没有的）
            for preset in LOCAL_PRESET_TEMPLATES:
                key = (preset["name"], preset["category"])
                if key not in remote_keys:
                    if key in local_index:
                        # 更新现有本地模板
                        await db.execute("""
                            UPDATE prompt_templates 
                            SET content = ?, variables = ?, description = ?, updated_at = (datetime('now', '+8 hours'))
                            WHERE id = ?
                        """, (
                            preset["content"],
                            json.dumps(preset.get("variables", [])),
                            preset.get("description", ""),
                            local_index[key]["id"]
                        ))
                        logger.info(f"更新本地预置模板 [{preset['category']}] {preset['name']}")
                    else:
                        # 新增本地模板
                        await db.execute("""
                            INSERT INTO prompt_templates (name, category, content, variables, description, is_preset, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                        """, (
                            preset["name"],
                            preset["category"],
                            preset["content"],
                            json.dumps(preset.get("variables", [])),
                            preset.get("description", ""),
                            now_beijing_str(),
                            now_beijing_str()
                        ))
                        logger.info(f"新增本地预置模板 [{preset['category']}] {preset['name']}")
            
            await db.commit()
            logger.info(f"同步预置模板成功：{len(remote_templates)} 个远程模板 + {len(LOCAL_PRESET_TEMPLATES)} 个本地模板")
            return True
        finally:
            await db.close()
    except asyncio.TimeoutError:
        logger.warning("同步预置模板超时（使用本地预置模板）")
        await _sync_local_preset_templates()
        return False
    except Exception as e:
        logger.warning(f"同步预置模板失败（使用本地预置模板）: {e}")
        await _sync_local_preset_templates()
        return False


async def _sync_local_preset_templates():
    """同步本地预置模板到数据库"""
    db = await get_db()
    try:
        # 获取本地所有预置模板
        async with db.execute(
            "SELECT id, name, category, content FROM prompt_templates WHERE is_preset = 1"
        ) as cursor:
            local_rows = await cursor.fetchall()
        
        # 构建本地模板索引
        local_index = {}
        for row in local_rows:
            key = (row["name"], row["category"])
            local_index[key] = dict(row)
        
        # 处理本地预置模板
        for preset in LOCAL_PRESET_TEMPLATES:
            key = (preset["name"], preset["category"])
            
            if key in local_index:
                # 更新现有模板
                await db.execute("""
                    UPDATE prompt_templates 
                    SET content = ?, variables = ?, description = ?, updated_at = (datetime('now', '+8 hours'))
                    WHERE id = ?
                """, (
                    preset["content"],
                    json.dumps(preset.get("variables", [])),
                    preset.get("description", ""),
                    local_index[key]["id"]
                ))
                logger.info(f"更新本地预置模板 [{preset['category']}] {preset['name']}")
            else:
                # 新增模板
                await db.execute("""
                    INSERT INTO prompt_templates (name, category, content, variables, description, is_preset, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                """, (
                    preset["name"],
                    preset["category"],
                    preset["content"],
                    json.dumps(preset.get("variables", [])),
                    preset.get("description", ""),
                    now_beijing_str(),
                    now_beijing_str()
                ))
                logger.info(f"新增本地预置模板 [{preset['category']}] {preset['name']}")
        
        await db.commit()
        logger.info(f"本地预置模板同步完成：{len(LOCAL_PRESET_TEMPLATES)} 个")
    finally:
        await db.close()


async def get_all(category_filter: Optional[str] = None):
    """获取所有模板，可按类别筛选"""
    db = await get_db()
    try:
        if category_filter:
            async with db.execute(
                "SELECT * FROM prompt_templates WHERE category = ? ORDER BY updated_at DESC",
                (category_filter,)
            ) as cursor:
                rows = await cursor.fetchall()
        else:
            async with db.execute(
                "SELECT * FROM prompt_templates ORDER BY updated_at DESC"
            ) as cursor:
                rows = await cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            # 如果描述为空，自动从模板内容中提取摘要作为描述
            if not d.get("description"):
                content = d.get("content", "") or ""
                d["description"] = _extract_description(content)
            # 风格提示词模板需要返回完整内容供前端选择使用
            if d.get("is_preset") == 1 and d.get("category") != "style_prompt":
                d["content"] = ""
            result.append(d)
        return result
    finally:
        await db.close()


async def get_by_id(template_id: int, meta_only: bool = False):
    """获取单个模板。
    meta_only=True: 只返回本地元数据(name/category/variables/admin_id/is_preset),
                    绝不从 admin 拉 content —— 用于预置分镜模板 assemble(模板明文不下客户端)。
    meta_only=False(默认): 预置模板 content 为空时按需从 admin 拉取(旧行为)。"""
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM prompt_templates WHERE id = ?",
            (template_id,)
        ) as cursor:
            row = await cursor.fetchone()
    finally:
        await db.close()
    if not row:
        return None
    tpl = dict(row)
    # ★ 云端受保护模板的 content 绝不返回(防历史缓存残留)。
    # 万山离线发行版会把没有 admin_id 的本地预置模板随应用打包,这类模板必须保留
    # 本地内容,否则离线分镜既不能服务端 assemble 也不能走 legacy 本地拼装。
    is_protected = _is_protected_template(tpl.get("category"), tpl.get("is_preset"))
    is_local_bundled = is_protected and not tpl.get("admin_id") and bool((tpl.get("content") or "").strip())
    if is_protected and not is_local_bundled:
        tpl["content"] = ""
        return tpl
    if meta_only:
        # 非受保护模板的 meta_only:不触发 admin 拉取,直接返回本地行
        return tpl
    # C 方案:预置模板的 content 不存本地,只在运行时按需从 admin 拉取
    if (tpl.get("is_preset") == 1) and not (tpl.get("content") or "").strip():
        try:
            # admin 和本地 id 可能不同(因为独立自增),必须按 name+category 匹配
            fetched_id, fetched_content = await _fetch_content_from_admin(tpl.get("name"), tpl.get("category"))
            if fetched_content:
                tpl["content"] = fetched_content
            # 顺手回填 admin_id (老库可能没存)
            if fetched_id and not tpl.get("admin_id"):
                tpl["admin_id"] = fetched_id
                try:
                    db2 = await get_db()
                    try:
                        await db2.execute(
                            "UPDATE prompt_templates SET admin_id = ? WHERE id = ?",
                            (fetched_id, template_id)
                        )
                        await db2.commit()
                    finally:
                        await db2.close()
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"[template_service] 按需拉取 content 失败 name={tpl.get('name')}: {e}")
    return tpl


def _fire_and_forget_report(admin_id: Optional[int], name: Optional[str], category: Optional[str]) -> None:
    """异步上报模板使用计数到 admin-server。失败静默,不阻塞主流程。
    设计成同步入口 + 内部 create_task,调用方不需要 await。
    """
    if not admin_id and not (name and category):
        return
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(_do_report_usage(admin_id, name, category))
    except Exception:
        pass  # 拿不到 loop 直接放弃,不影响主流程


async def _do_report_usage(admin_id: Optional[int], name: Optional[str], category: Optional[str]) -> None:
    """实际的上报 HTTP 调用,所有异常吞掉。"""
    try:
        payload: Dict[str, Any] = {}
        if admin_id:
            payload["admin_id"] = int(admin_id)
        if name:
            payload["name"] = name
        if category:
            payload["category"] = category
        async with aiohttp.ClientSession(connector=get_aiohttp_connector()) as session:
            async with session.post(
                f"{ADMIN_SERVER}/api/templates/usage",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status != 200:
                    logger.debug(f"[template_usage] 上报非 200: {resp.status}")
    except Exception as e:
        logger.debug(f"[template_usage] 上报失败(已忽略): {e}")


async def report_usage(template: Dict[str, Any]) -> None:
    """对外接口:在使用模板的位置调用,告诉 admin 这个模板被用了一次。
    template 是 get_by_id 返回的字典,要求至少有 admin_id 或 (name + category)。
    只对 is_preset=1 的预置模板上报,自建模板不上报。
    """
    if not template:
        return
    if int(template.get("is_preset") or 0) != 1:
        return  # 用户自建模板不计数
    _fire_and_forget_report(
        template.get("admin_id"),
        template.get("name"),
        template.get("category"),
    )


async def _fetch_content_from_admin(name: str, category: str) -> tuple[Optional[int], Optional[str]]:
    """按 name+category 向 admin 请求模板 content(C 方案)。
    404 时做一次 fuzzy 匹配:去掉括号后缀再查(admin 可能把 name 改成 xxx（新品）)。
    返回 (admin_template_id, content),失败返回 (None, None)。
    """
    require_cloud("远端模板内容拉取")
    from services import license_context as _lc
    ctx = _lc.get_context()
    license_key = ctx.get("license_key")
    machine_id = ctx.get("machine_id")
    if not license_key:
        logger.warning("[template_service] 本地无 license 凭证,无法向 admin 拉取模板 content")
        return (None, None)

    async def _do_fetch(n: str, c: str, time_offset_sec: int = 0) -> tuple[int, Optional[int], Optional[str]]:
        # v3.61.68: 加客户端签名 — 防 AI 工具 / curl / postman 拿 license 直接调
        from utils.client_signature import sign_request
        import json as _json
        body_bytes = _json.dumps(
            {"name": n, "category": c, "license_key": license_key, "machine_id": machine_id},
            ensure_ascii=False
        ).encode("utf-8")
        sig_headers = sign_request(license_key, machine_id or "", body_bytes, time_offset_sec=time_offset_sec)
        sig_headers["Content-Type"] = "application/json"
        try:
            async with aiohttp.ClientSession(connector=get_aiohttp_connector()) as session:
                async with session.post(
                    f"{ADMIN_SERVER}/api/templates/fetch",
                    data=body_bytes,  # 用 data 而非 json,确保字节级一致(签名跟它对齐)
                    headers=sig_headers,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return 200, data.get("template_id"), (data.get("content") or "")
                    body = await resp.text()
                    return resp.status, None, body[:200]
        except Exception as e:
            return -1, None, str(e)

    # 1) 精确 name 匹配
    status, admin_id, body = await _do_fetch(name, category)
    if status == 403 and isinstance(body, str):
        skew = _extract_timestamp_skew_offset(body)
        if skew is not None:
            logger.warning(f"[template_service] 模板内容拉取签名时间偏移 {skew}s,按云端 diff 重签重试 name={name}")
            status, admin_id, body = await _do_fetch(name, category, skew)
    if status == 200:
        return (admin_id, body)

    # 2) 404: 尝试 fuzzy 匹配 - 通过 /api/templates/preset 列表找前缀匹配的 name
    if status == 404:
        try:
            # v3.61.68: 同样加客户端签名
            from utils.client_signature import sign_request as _sign_req

            async def _fetch_presets_for_fuzzy(time_offset_sec: int = 0) -> tuple[int, Any]:
                _sig_h = _sign_req(license_key, machine_id or "", b"", time_offset_sec=time_offset_sec)
                async with aiohttp.ClientSession(connector=get_aiohttp_connector()) as session:
                    async with session.get(
                        f"{ADMIN_SERVER}/api/templates/preset",
                        headers=_sig_h,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as resp:
                        if resp.status == 200:
                            return 200, await resp.json()
                        return resp.status, await resp.text()

            preset_status, preset_data = await _fetch_presets_for_fuzzy()
            if preset_status == 403 and isinstance(preset_data, str):
                skew = _extract_timestamp_skew_offset(preset_data)
                if skew is not None:
                    logger.warning(f"[template_service] fuzzy 模板列表签名时间偏移 {skew}s,按云端 diff 重签重试")
                    preset_status, preset_data = await _fetch_presets_for_fuzzy(skew)

            if preset_status == 200:
                remotes = preset_data.get("templates") or []
                candidates = []
                for r in remotes:
                    if r.get("category") != category:
                        continue
                    rname = r.get("name") or ""
                    if rname == name:
                        continue
                    if rname.startswith(name) or name.startswith(rname):
                        candidates.append(rname)
                if candidates:
                    best = min(candidates, key=lambda x: abs(len(x) - len(name)))
                    logger.info(f"[template_service] fuzzy 匹配: 本地 '{name}' -> admin '{best}'")
                    status2, admin_id2, body2 = await _do_fetch(best, category)
                    if status2 == 403 and isinstance(body2, str):
                        skew2 = _extract_timestamp_skew_offset(body2)
                        if skew2 is not None:
                            logger.warning(f"[template_service] fuzzy content 签名时间偏移 {skew2}s,按云端 diff 重签重试")
                            status2, admin_id2, body2 = await _do_fetch(best, category, skew2)
                    if status2 == 200:
                        return (admin_id2, body2)
        except Exception as e:
            logger.warning(f"[template_service] fuzzy 匹配失败: {e}")

    logger.warning(f"[template_service] fetch content HTTP {status}: {body if isinstance(body, str) else ''}")
    return (None, None)


async def create(template: TemplateCreate):
    """创建模板"""
    db = await get_db()
    try:
        variables_json = json.dumps(template.variables or [])
        now = now_beijing_str()
        async with db.execute(
            """
            INSERT INTO prompt_templates (name, category, content, variables, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (template.name, template.category, template.content, variables_json, template.description or '', now, now)
        ) as cursor:
            await db.commit()
            template_id = cursor.lastrowid
            return await get_by_id(template_id)
    finally:
        await db.close()


async def update(template_id: int, template: TemplateUpdate):
    """更新模板"""
    db = await get_db()
    try:
        # 获取现有数据
        existing = await get_by_id(template_id)
        if not existing:
            return None
        
        # 预置模板不允许编辑
        if existing.get("is_preset") == 1:
            return None

        # 构建更新字段
        updates = []
        params = []
        
        if template.name is not None:
            updates.append("name = ?")
            params.append(template.name)
        if template.category is not None:
            updates.append("category = ?")
            params.append(template.category)
        if template.content is not None:
            updates.append("content = ?")
            params.append(template.content)
        if template.variables is not None:
            updates.append("variables = ?")
            params.append(json.dumps(template.variables))
        if template.description is not None:
            updates.append("description = ?")
            params.append(template.description)
        
        updates.append("updated_at = (datetime('now', '+8 hours'))")
        
        if not updates:
            return existing
        
        params.append(template_id)
        
        await db.execute(
            f"UPDATE prompt_templates SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await db.commit()
        return await get_by_id(template_id)
    finally:
        await db.close()


async def delete(template_id: int):
    """删除模板"""
    db = await get_db()
    try:
        existing = await get_by_id(template_id)
        if not existing:
            return False
        
        # 预置模板不允许删除
        if existing.get("is_preset") == 1:
            return False
        
        await db.execute(
            "DELETE FROM prompt_templates WHERE id = ?",
            (template_id,)
        )
        await db.commit()
        return True
    finally:
        await db.close()
