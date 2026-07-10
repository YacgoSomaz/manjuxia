import json
import re
import logging
from typing import Dict, Any, Optional, List
from database.db import get_db
from services.llm_service import LLMService
from services.template_service import get_by_id as get_template_by_id

logger = logging.getLogger(__name__)


def _repair_unbalanced_delimiters(text: str) -> Optional[str]:
    """Repair only missing JSON object/array closers; leave other syntax untouched."""
    pairs = {"{": "}", "[": "]"}
    stack = []
    output = []
    in_string = False
    escaped = False

    for index, char in enumerate(text):
        if in_string:
            if char == "”" and re.match(r"\s*[,}\]]", text[index + 1:]):
                output.append('"')
                in_string = False
                continue
            if char == "\n":
                output.append("\\n")
                continue
            if char == "\r":
                output.append("\\n")
                continue
            if char == "\t":
                output.append("\\t")
                continue
            output.append(char)
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            output.append(char)
            continue
        if char in pairs:
            stack.append(char)
            output.append(char)
            continue
        if char in ("}", "]"):
            opener = "{" if char == "}" else "["
            if not stack or opener not in stack:
                return None
            while stack and pairs[stack[-1]] != char:
                output.append(pairs[stack.pop()])
            stack.pop()
            output.append(char)
            continue
        output.append(char)

    if in_string:
        return None
    while stack:
        output.append(pairs[stack.pop()])
    return "".join(output)


def _loads_json_with_repair(candidate: str) -> Optional[dict]:
    try:
        value = json.loads(candidate)
        return value if isinstance(value, dict) else None
    except json.JSONDecodeError:
        repaired = _repair_unbalanced_delimiters(candidate)
        if not repaired or repaired == candidate:
            return None
        try:
            value = json.loads(repaired)
            return value if isinstance(value, dict) else None
        except json.JSONDecodeError:
            return None


def _extract_json(text: str) -> Optional[dict]:
    """从 LLM 返回的文本中提取 JSON，容错处理"""
    if not text:
        return None
    # 1. 尝试提取 ```json ... ``` 代码块
    match = re.search(r'```json\s*([\s\S]*?)```', text)
    if match:
        json_str = match.group(1).strip()
        parsed = _loads_json_with_repair(json_str)
        if parsed is not None:
            return parsed
        else:
            logger.warning("从代码块提取的 JSON 解析失败")
    # 2. 尝试提取 ``` ... ``` 代码块
    match = re.search(r'```\s*([\s\S]*?)```', text)
    if match:
        json_str = match.group(1).strip()
        parsed = _loads_json_with_repair(json_str)
        if parsed is not None:
            return parsed
    # 3. 尝试直接解析整个文本
    parsed = _loads_json_with_repair(text.strip())
    if parsed is not None:
        return parsed
    # 4. 尝试提取第一个 { ... } 块
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        parsed = _loads_json_with_repair(match.group())
        if parsed is not None:
            return parsed
    logger.error("无法从 LLM 返回中解析 JSON")
    return None


class NovelCreationService:

    @staticmethod
    async def generate_outline(
        novel_id: int,
        concept: str,
        config_id: int,
        template_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """生成小说大纲"""
        # 构建 prompt
        if template_id:
            template = await get_template_by_id(template_id)
            if template:
                prompt = template["content"]
                # 替换变量
                prompt = prompt.replace("{concept}", concept)
            else:
                logger.warning(f"模板 {template_id} 不存在，使用默认 prompt")
                prompt = None
        else:
            prompt = None

        if not prompt or (template_id and not await get_template_by_id(template_id)):
            prompt = f"""请根据以下概念，生成一部完整的小说大纲。

创作概念：
{concept}

请严格按照以下JSON格式输出（不要添加其他内容）：
```json
{{
  "story_summary": "故事梗概（200-300字）",
  "characters": [
    {{"name": "角色名", "identity": "身份背景", "personality": "性格特点", "relationships": "与其他角色的关系"}}
  ],
  "scenes": [
    {{"name": "场景名称", "description": "场景描述"}}
  ],
  "props": [
    {{"name": "道具名", "description": "外观描述", "significance": "在故事中的作用"}}
  ],
  "world_setting": "世界观和时代背景设定（100-200字）",
  "chapters": [
    {{"title": "第1章: 章节标题", "summary": "本章概要（150-200字，包含主要情节、冲突和转折）"}}
  ]
}}
```

要求：
1. 角色要有鲜明性格和清晰的关系网
2. 章节数量10-20章，每章概要包含核心冲突和发展
3. 情节要有起承转合，伏笔要前后呼应
4. 场景描写要有画面感，适合视觉化呈现"""

        messages = [
            {"role": "system", "content": "你是一位专业的小说策划编辑，擅长构建完整的小说大纲。"},
            {"role": "user", "content": prompt}
        ]

        logger.info(f"开始生成大纲: novel_id={novel_id}")
        llm_result = await LLMService.call_llm(
            config_id=config_id,
            messages=messages,
            timeout=600,
            task_type="novel_outline",
            novel_id=novel_id
        )

        # 解析 JSON
        outline_data = _extract_json(llm_result)
        if not outline_data:
            logger.error(f"大纲 JSON 解析失败，保存原始文本: novel_id={novel_id}")
            # 即使解析失败也保存原始文本
            db = await get_db()
            try:
                await db.execute(
                    "UPDATE novels SET outline = ? WHERE id = ?",
                    (llm_result, novel_id)
                )
                await db.commit()
            finally:
                await db.close()
            return {"raw_text": llm_result, "parse_error": True}

        # 保存大纲到 novels 表
        db = await get_db()
        try:
            outline_json = json.dumps(outline_data, ensure_ascii=False)
            await db.execute(
                "UPDATE novels SET outline = ? WHERE id = ?",
                (outline_json, novel_id)
            )

            # 保存 characters 到 novel_writing_context
            for char in outline_data.get("characters", []):
                await db.execute(
                    """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state)
                       VALUES (?, 'character', ?, ?, '')""",
                    (novel_id, char.get("name", ""),
                     json.dumps(char, ensure_ascii=False))
                )

            # 保存 scenes
            for scene in outline_data.get("scenes", []):
                await db.execute(
                    """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state)
                       VALUES (?, 'scene', ?, ?, '')""",
                    (novel_id, scene.get("name", ""),
                     json.dumps(scene, ensure_ascii=False))
                )

            # 保存 props
            for prop in outline_data.get("props", []):
                await db.execute(
                    """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state)
                       VALUES (?, 'prop', ?, ?, '')""",
                    (novel_id, prop.get("name", ""),
                     json.dumps(prop, ensure_ascii=False))
                )

            # 保存 world_setting
            world_setting = outline_data.get("world_setting", "")
            if world_setting:
                await db.execute(
                    """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state)
                       VALUES (?, 'world_setting', '世界观设定', ?, '')""",
                    (novel_id, world_setting if isinstance(world_setting, str) else json.dumps(world_setting, ensure_ascii=False))
                )

            await db.commit()
            logger.info(f"大纲生成完成: novel_id={novel_id}, chapters={len(outline_data.get('chapters', []))}")
        finally:
            await db.close()

        return outline_data

    @staticmethod
    async def generate_chapter(
        novel_id: int,
        chapter_index: int,
        config_id: int,
        template_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """生成单个章节"""
        db = await get_db()
        try:
            # 1. 读取大纲
            cursor = await db.execute(
                "SELECT outline FROM novels WHERE id = ?", (novel_id,)
            )
            novel_row = await cursor.fetchone()
            if not novel_row or not novel_row["outline"]:
                raise ValueError(f"小说 {novel_id} 没有大纲，请先生成大纲")

            outline_raw = novel_row["outline"]
            try:
                outline_data = json.loads(outline_raw)
            except json.JSONDecodeError:
                outline_data = {"chapters": []}

            chapters_outline = outline_data.get("chapters", [])
            if chapter_index < 0 or chapter_index >= len(chapters_outline):
                raise ValueError(f"章节索引 {chapter_index} 超出范围，大纲共 {len(chapters_outline)} 章")

            chapter_outline = chapters_outline[chapter_index]
            chapter_title = chapter_outline.get("title", f"第{chapter_index + 1}章")

            # 2. 读取创作上下文
            cursor = await db.execute(
                "SELECT * FROM novel_writing_context WHERE novel_id = ?",
                (novel_id,)
            )
            ctx_rows = await cursor.fetchall()

            characters_state = ""
            scenes_state = ""
            props_state = ""
            plot_threads = ""

            for row in ctx_rows:
                ctx_type = row["context_type"]
                name = row["name"]
                content = row["content"]
                state = row["dynamic_state"] or ""
                display = f"- {name}: {content}"
                if state:
                    display += f" | 当前状态: {state}"

                if ctx_type == "character":
                    characters_state += display + "\n"
                elif ctx_type == "scene":
                    scenes_state += display + "\n"
                elif ctx_type == "prop":
                    props_state += display + "\n"
                elif ctx_type == "plot_thread":
                    plot_threads += display + "\n"

            # 3. 构建前文摘要
            cursor = await db.execute(
                "SELECT id, title, content, summary, sort_order FROM chapters WHERE novel_id = ? ORDER BY sort_order, id",
                (novel_id,)
            )
            existing_chapters = await cursor.fetchall()

            prev_summaries = ""
            for ch in existing_chapters:
                ch_order = ch["sort_order"]
                if ch_order >= chapter_index:
                    continue
                # 最近2章用全文，更早的用摘要
                if ch_order >= chapter_index - 2:
                    prev_summaries += f"\n【{ch['title']}（全文）】\n{ch['content']}\n"
                else:
                    summary = ch["summary"] or "（暂无摘要）"
                    prev_summaries += f"\n【{ch['title']}（摘要）】\n{summary}\n"

            if not prev_summaries:
                prev_summaries = "（这是第一章，没有前文）"

        finally:
            await db.close()

        # 4. 构建 prompt
        outline_text = json.dumps(outline_data, ensure_ascii=False, indent=2)
        chapter_outline_text = json.dumps(chapter_outline, ensure_ascii=False)

        if template_id:
            template = await get_template_by_id(template_id)
            if template:
                prompt = template["content"]
                var_map = {
                    "outline": outline_text,
                    "chapter_outline": chapter_outline_text,
                    "characters_state": characters_state or "（暂无）",
                    "scenes_state": scenes_state or "（暂无）",
                    "props_state": props_state or "（暂无）",
                    "prev_summaries": prev_summaries,
                    "plot_threads": plot_threads or "（暂无）",
                }
                for var_name, var_value in var_map.items():
                    prompt = prompt.replace(f"{{{var_name}}}", var_value)
            else:
                template_id = None  # fallback to default

        if not template_id:
            prompt = f"""【全书大纲】
{outline_text}

【本章规划】
{chapter_outline_text}

【角色当前状态】
{characters_state or '（暂无）'}

【场景当前状态】
{scenes_state or '（暂无）'}

【道具当前状态】
{props_state or '（暂无）'}

【前文内容摘要】
{prev_summaries}

【未解决的伏笔线索】
{plot_threads or '（暂无）'}

创作要求：
1. 严格按照本章规划的情节发展撰写
2. 人物言行要符合其性格设定和当前状态
3. 场景描写要与场景设定一致
4. 与前文内容保持连贯，不能出现逻辑矛盾
5. 适当推进或回收伏笔线索
6. 每章字数2000-4000字
7. 直接输出小说正文，不要添加任何元数据或说明

请撰写"{chapter_title}"的完整正文。"""

        messages = [
            {"role": "system", "content": "你是一位专业小说作家，请根据提供的大纲和上下文信息，撰写指定章节的正文内容。要求情节连贯、人物性格一致、场景描写生动。"},
            {"role": "user", "content": prompt}
        ]

        logger.info(f"开始生成章节: novel_id={novel_id}, chapter_index={chapter_index}, title={chapter_title}")
        content = await LLMService.call_llm(
            config_id=config_id,
            messages=messages,
            timeout=600,
            max_tokens=16384,
            task_type="novel_creation",
            novel_id=novel_id,
            chapter_title=chapter_title
        )

        if not content or not content.strip():
            raise ValueError("大模型返回空内容")

        # 5. 存入 chapters 表
        db = await get_db()
        try:
            # 检查是否已存在该排序位置的章节
            cursor = await db.execute(
                "SELECT id FROM chapters WHERE novel_id = ? AND sort_order = ?",
                (novel_id, chapter_index)
            )
            existing = await cursor.fetchone()

            if existing:
                await db.execute(
                    "UPDATE chapters SET title = ?, content = ? WHERE id = ?",
                    (chapter_title, content, existing["id"])
                )
                chapter_id = existing["id"]
            else:
                cursor = await db.execute(
                    "INSERT INTO chapters (novel_id, title, content, sort_order) VALUES (?, ?, ?, ?)",
                    (novel_id, chapter_title, content, chapter_index)
                )
                chapter_id = cursor.lastrowid

            await db.commit()
            logger.info(f"章节生成完成: novel_id={novel_id}, chapter_id={chapter_id}, title={chapter_title}")
        finally:
            await db.close()

        return {
            "chapter_id": chapter_id,
            "title": chapter_title,
            "content": content
        }

    @staticmethod
    async def post_chapter_process(
        novel_id: int,
        chapter_id: int,
        config_id: int
    ) -> Dict[str, Any]:
        """章节后处理 - 生成摘要并更新角色/场景/道具状态"""
        db = await get_db()
        try:
            # 读取章节内容
            cursor = await db.execute(
                "SELECT title, content FROM chapters WHERE id = ? AND novel_id = ?",
                (chapter_id, novel_id)
            )
            chapter = await cursor.fetchone()
            if not chapter:
                raise ValueError(f"章节不存在: chapter_id={chapter_id}")

            chapter_content = chapter["content"]
            chapter_title = chapter["title"]

            # 读取当前上下文
            cursor = await db.execute(
                "SELECT * FROM novel_writing_context WHERE novel_id = ?",
                (novel_id,)
            )
            ctx_rows = await cursor.fetchall()

            characters = ""
            scenes = ""
            props = ""
            plot_threads = ""
            for row in ctx_rows:
                ctx_type = row["context_type"]
                name = row["name"]
                content = row["content"]
                state = row["dynamic_state"] or ""
                display = f"- {name}: {content}"
                if state:
                    display += f" | 状态: {state}"

                if ctx_type == "character":
                    characters += display + "\n"
                elif ctx_type == "scene":
                    scenes += display + "\n"
                elif ctx_type == "prop":
                    props += display + "\n"
                elif ctx_type == "plot_thread":
                    plot_threads += display + "\n"
        finally:
            await db.close()

        prompt = f"""请分析以下小说章节内容，提取关键信息。

【章节内容】
{chapter_content}

【当前已知角色】
{characters or '（暂无）'}

【当前已知场景】
{scenes or '（暂无）'}

【当前已知道具】
{props or '（暂无）'}

【当前伏笔线索】
{plot_threads or '（暂无）'}

请严格按照以下JSON格式输出：
```json
{{
  "summary": "本章摘要（300-500字，概括主要情节发展、人物行动和关键转折）",
  "character_updates": [
    {{"name": "角色名", "state": "该角色在本章结束时的最新状态"}}
  ],
  "scene_updates": [
    {{"name": "场景名", "state": "场景在本章中的变化"}}
  ],
  "prop_updates": [
    {{"name": "道具名", "state": "道具状态变化"}}
  ],
  "new_plot_threads": [
    {{"name": "伏笔名称", "content": "新出现的伏笔或悬念描述"}}
  ],
  "resolved_plot_threads": ["已在本章解决或揭示的伏笔名称"]
}}
```

注意：
1. 只报告本章中实际发生变化的角色/场景/道具
2. 如果出现了新角色/场景/道具，也要列出
3. 摘要要包含关键情节点，便于后续章节参考"""

        messages = [
            {"role": "system", "content": "你是一位专业的小说编辑分析师，擅长分析章节内容并提取关键信息变化。"},
            {"role": "user", "content": prompt}
        ]

        logger.info(f"开始章节后处理: novel_id={novel_id}, chapter_id={chapter_id}")
        llm_result = await LLMService.call_llm(
            config_id=config_id,
            messages=messages,
            timeout=600,
            max_tokens=4096,
            task_type="novel_post_process",
            novel_id=novel_id,
            chapter_title=chapter_title
        )

        result_data = _extract_json(llm_result)
        if not result_data:
            logger.error(f"后处理 JSON 解析失败: novel_id={novel_id}, chapter_id={chapter_id}")
            return {"raw_text": llm_result, "parse_error": True}

        # 应用结果
        db = await get_db()
        try:
            # 更新章节摘要
            summary = result_data.get("summary", "")
            if summary:
                await db.execute(
                    "UPDATE chapters SET summary = ? WHERE id = ?",
                    (summary, chapter_id)
                )

            # 更新角色状态
            for char_update in result_data.get("character_updates", []):
                name = char_update.get("name", "")
                state = char_update.get("state", "")
                if not name:
                    continue
                # 尝试更新已有记录
                cursor = await db.execute(
                    "SELECT id FROM novel_writing_context WHERE novel_id = ? AND context_type = 'character' AND name = ?",
                    (novel_id, name)
                )
                existing = await cursor.fetchone()
                if existing:
                    await db.execute(
                        "UPDATE novel_writing_context SET dynamic_state = ?, last_chapter_id = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?",
                        (state, chapter_id, existing["id"])
                    )
                else:
                    await db.execute(
                        """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state, last_chapter_id)
                           VALUES (?, 'character', ?, '', ?, ?)""",
                        (novel_id, name, state, chapter_id)
                    )

            # 更新场景状态
            for scene_update in result_data.get("scene_updates", []):
                name = scene_update.get("name", "")
                state = scene_update.get("state", "")
                if not name:
                    continue
                cursor = await db.execute(
                    "SELECT id FROM novel_writing_context WHERE novel_id = ? AND context_type = 'scene' AND name = ?",
                    (novel_id, name)
                )
                existing = await cursor.fetchone()
                if existing:
                    await db.execute(
                        "UPDATE novel_writing_context SET dynamic_state = ?, last_chapter_id = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?",
                        (state, chapter_id, existing["id"])
                    )
                else:
                    await db.execute(
                        """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state, last_chapter_id)
                           VALUES (?, 'scene', ?, '', ?, ?)""",
                        (novel_id, name, state, chapter_id)
                    )

            # 更新道具状态
            for prop_update in result_data.get("prop_updates", []):
                name = prop_update.get("name", "")
                state = prop_update.get("state", "")
                if not name:
                    continue
                cursor = await db.execute(
                    "SELECT id FROM novel_writing_context WHERE novel_id = ? AND context_type = 'prop' AND name = ?",
                    (novel_id, name)
                )
                existing = await cursor.fetchone()
                if existing:
                    await db.execute(
                        "UPDATE novel_writing_context SET dynamic_state = ?, last_chapter_id = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?",
                        (state, chapter_id, existing["id"])
                    )
                else:
                    await db.execute(
                        """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state, last_chapter_id)
                           VALUES (?, 'prop', ?, '', ?, ?)""",
                        (novel_id, name, state, chapter_id)
                    )

            # 新增伏笔
            for thread in result_data.get("new_plot_threads", []):
                name = thread.get("name", "")
                content = thread.get("content", "")
                if not name:
                    continue
                await db.execute(
                    """INSERT INTO novel_writing_context (novel_id, context_type, name, content, dynamic_state, last_chapter_id)
                       VALUES (?, 'plot_thread', ?, ?, '', ?)""",
                    (novel_id, name, content, chapter_id)
                )

            # 删除已解决的伏笔
            for resolved_name in result_data.get("resolved_plot_threads", []):
                if resolved_name:
                    await db.execute(
                        "DELETE FROM novel_writing_context WHERE novel_id = ? AND context_type = 'plot_thread' AND name = ?",
                        (novel_id, resolved_name)
                    )

            await db.commit()
            logger.info(f"章节后处理完成: novel_id={novel_id}, chapter_id={chapter_id}")
        finally:
            await db.close()

        return result_data

    @staticmethod
    async def generate_all_chapters(
        novel_id: int,
        config_id: int,
        template_id: Optional[int] = None,
        start_from: int = 0
    ) -> Dict[str, Any]:
        """全自动生成所有章节"""
        # 读取大纲获取章节总数
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT outline FROM novels WHERE id = ?", (novel_id,)
            )
            novel_row = await cursor.fetchone()
            if not novel_row or not novel_row["outline"]:
                raise ValueError(f"小说 {novel_id} 没有大纲，请先生成大纲")

            try:
                outline_data = json.loads(novel_row["outline"])
            except json.JSONDecodeError:
                raise ValueError("大纲格式错误，无法解析")

            total = len(outline_data.get("chapters", []))
            if total == 0:
                raise ValueError("大纲中没有章节规划")
        finally:
            await db.close()

        logger.info(f"开始全自动生成: novel_id={novel_id}, total={total}, start_from={start_from}")
        chapters_result = []
        completed = 0

        for i in range(start_from, total):
            try:
                # 生成章节
                chapter_result = await NovelCreationService.generate_chapter(
                    novel_id=novel_id,
                    chapter_index=i,
                    config_id=config_id,
                    template_id=template_id
                )
                # 后处理
                post_result = await NovelCreationService.post_chapter_process(
                    novel_id=novel_id,
                    chapter_id=chapter_result["chapter_id"],
                    config_id=config_id
                )
                chapters_result.append({
                    "chapter_index": i,
                    "chapter_id": chapter_result["chapter_id"],
                    "title": chapter_result["title"],
                    "success": True,
                    "summary": post_result.get("summary", "")
                })
                completed += 1
                logger.info(f"全自动生成进度: {completed}/{total - start_from}")
            except Exception as e:
                logger.error(f"章节 {i} 生成失败: {str(e)}")
                chapters_result.append({
                    "chapter_index": i,
                    "success": False,
                    "error": str(e)
                })

        return {
            "total": total,
            "completed": completed,
            "start_from": start_from,
            "chapters": chapters_result
        }

    @staticmethod
    async def get_writing_context(novel_id: int) -> Dict[str, Any]:
        """查询创作上下文，按类型分组返回"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM novel_writing_context WHERE novel_id = ? ORDER BY context_type, id",
                (novel_id,)
            )
            rows = await cursor.fetchall()

            result = {
                "characters": [],
                "scenes": [],
                "props": [],
                "world_settings": [],
                "plot_threads": []
            }

            # 映射 context_type 到复数 key
            type_to_key = {
                "character": "characters",
                "scene": "scenes",
                "prop": "props",
                "world_setting": "world_settings",
                "plot_thread": "plot_threads"
            }

            for row in rows:
                item = {
                    "id": row["id"],
                    "name": row["name"],
                    "content": row["content"],
                    "dynamic_state": row["dynamic_state"],
                    "last_chapter_id": row["last_chapter_id"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"]
                }
                ctx_type = row["context_type"]
                key = type_to_key.get(ctx_type)
                if key:
                    result[key].append(item)
                else:
                    # 未知类型也保留，使用原始 type 名
                    result.setdefault(ctx_type, []).append(item)

            return result
        finally:
            await db.close()

    @staticmethod
    async def update_writing_context(
        context_id: int,
        content: Optional[str] = None,
        dynamic_state: Optional[str] = None
    ) -> Dict[str, Any]:
        """更新指定上下文记录"""
        db = await get_db()
        try:
            updates = []
            params = []
            if content is not None:
                updates.append("content = ?")
                params.append(content)
            if dynamic_state is not None:
                updates.append("dynamic_state = ?")
                params.append(dynamic_state)

            if not updates:
                raise ValueError("没有需要更新的字段")

            updates.append("updated_at = datetime('now', '+8 hours')")
            params.append(context_id)

            await db.execute(
                f"UPDATE novel_writing_context SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()

            cursor = await db.execute(
                "SELECT * FROM novel_writing_context WHERE id = ?",
                (context_id,)
            )
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return {"id": context_id, "message": "更新成功"}
        finally:
            await db.close()
