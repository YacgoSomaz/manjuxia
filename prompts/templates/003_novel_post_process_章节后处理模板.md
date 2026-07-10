---
name: "章节后处理模板"
category: "novel_post_process"
description: "分析章节内容，生成摘要并更新角色/场景/道具状态"
variables: "[\"chapter_content\", \"characters\", \"scenes\", \"props\", \"plot_threads\"]"
genres: "[]"
is_preset: 1
source: "app.db.bak_deakins_20260602_093455"
source_id: 30
sha256: "27ce93e136a7752bf3b3eade3568d6949d449e0bc656ce0986c910fe0f7d31c0"
length: 669
---

请分析以下小说章节内容，提取关键信息。

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
3. 摘要要包含关键情节点，便于后续章节参考
