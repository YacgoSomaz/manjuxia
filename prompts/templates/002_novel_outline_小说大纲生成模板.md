---
name: "小说大纲生成模板"
category: "novel_outline"
description: "根据一句话概念生成完整的小说大纲"
variables: "[\"concept\"]"
genres: "[]"
is_preset: 1
source: "app.db.bak_deakins_20260602_093455"
source_id: 28
sha256: "fa4ad6115817ba629ca3ef89583f7c279148e04b5c40ffdb32907182e1bde989"
length: 609
---

请根据以下概念，生成一部完整的小说大纲。

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
4. 场景描写要有画面感，适合视觉化呈现
