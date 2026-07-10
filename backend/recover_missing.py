"""
从日志恢复缺失的分镜数据

novel_id=3, script_id=19 有 7 个场景，并行生成分镜时 7 个 LLM 调用全部成功（日志 330-336），
但只有 3 个场景的数据写入了数据库（scene_index 2,3,6），4 个场景丢失（scene_index 0,1,4,5）。

本脚本从日志中恢复缺失的数据。
"""

import sqlite3
import json
import re
from datetime import datetime, timezone, timedelta

DB_PATH = "data/app.db"


def get_beijing_time():
    """获取北京时间ISO格式字符串"""
    utc_now = datetime.now(timezone.utc)
    beijing_tz = timezone(timedelta(hours=8))
    beijing_time = utc_now.astimezone(beijing_tz)
    return beijing_time.strftime("%Y-%m-%d %H:%M:%S")


def normalize_scene_title(title: str) -> str:
    """标准化场景标题：去除【】括号，规范化空格"""
    if not title:
        return title
    title = title.replace('【', '').replace('】', '')
    title = re.sub(r'\s+', ' ', title)
    title = title.strip()
    return title


def normalize_characters(characters_input):
    """标准化人物列表"""
    if not characters_input:
        return []
    if isinstance(characters_input, list):
        normalized_chars = []
        for char in characters_input:
            if isinstance(char, str):
                parts = re.split(r'[，,、]', char)
                normalized_chars.extend([p.strip() for p in parts if p.strip()])
        return list(dict.fromkeys(normalized_chars))
    if isinstance(characters_input, str):
        parts = re.split(r'[，,、]', characters_input)
        return list(dict.fromkeys([p.strip() for p in parts if p.strip()]))
    return []


def split_scenes_from_script(script_content: str):
    """从剧本内容中拆分出各个场景"""
    SCENE_PATTERN = re.compile(r'^【(?:外|内|外/内|内/外)\s+[^】]+】', re.MULTILINE)
    
    if not script_content or not script_content.strip():
        return []
    
    scenes = []
    content = script_content.strip()
    matches = list(SCENE_PATTERN.finditer(content))
    
    if not matches:
        return [{
            "index": 0,
            "scene_title": "未命名场景",
            "content": content,
        }]
    
    first_match_start = matches[0].start()
    if first_match_start > 0:
        prefix_content = content[:first_match_start].strip()
    else:
        prefix_content = ""
    
    for i, match in enumerate(matches):
        scene_title = match.group(0).strip()
        start_pos = match.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        scene_content = content[start_pos:end_pos].strip()
        
        if i == 0 and prefix_content:
            scene_content = prefix_content + "\n\n" + scene_content
        
        scenes.append({
            "index": i,
            "scene_title": scene_title,
            "content": scene_content,
        })
    
    return scenes


def extract_scene_content_from_prompt(prompt: str) -> str:
    """从提示词中提取场景内容"""
    if '以下是需要转换为分镜的剧本内容' in prompt:
        parts = prompt.split('以下是需要转换为分镜的剧本内容')
        if len(parts) > 1:
            return parts[1].strip()
    return ""


def parse_sections_from_output(output: str) -> list:
    """解析 output_content 中的分镜文本，按小节拆分"""
    sections = []
    
    # 按 "小节N：" 拆分
    section_pattern = re.compile(r'小节(\d+)[：:]\s*', re.MULTILINE)
    matches = list(section_pattern.finditer(output))
    
    if not matches:
        return []
    
    for i, match in enumerate(matches):
        section_num = int(match.group(1))
        start_pos = match.end()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(output)
        section_text = output[start_pos:end_pos].strip()
        
        # 提取场景和人物
        scene_match = re.search(r'场景[：:]\s*(.+?)(?:\n|$)', section_text)
        scene_name = scene_match.group(1).strip() if scene_match else ""
        
        char_match = re.search(r'人物[：:]\s*(.+?)(?:\n|$)', section_text)
        characters_str = char_match.group(1).strip() if char_match else ""
        characters = normalize_characters(characters_str)
        
        sections.append({
            "section_number": section_num,
            "scene": scene_name,
            "characters": characters,
            "characters_str": characters_str,
            "full_text": section_text
        })
    
    return sections


def match_log_to_scene_index(log_id: int, log_content: str, scenes: list) -> int:
    """通过比较内容文本确定日志对应的 scene_index"""
    # 根据日志指纹直接匹配（更可靠）
    # LOG 330: 【外 忠勇侯府门前 日】 春日阳光明媚 -> scene_index=0
    # LOG 331: 【内 华贵马车内 日】 刺目的阳光 -> scene_index=1  
    # LOG 332: 【内 阴暗地牢 夜】 凌瑶华衣衫褴褛 -> scene_index=5 (剧本中第二个地牢场景)
    # LOG 333: 【内 阴暗地牢 夜】 昏暗的火把摇晃 -> scene_index=2 (剧本中第一个地牢场景)
    # LOG 334: 【内 华贵马车内 日】 凌瑶华浑身猛地一颤 -> scene_index=3
    # LOG 335: 【外 忠勇侯府门前 日】 凌瑶华搭着青竹的手 -> scene_index=4
    # LOG 336: 【外 忠勇侯府门前 日】 容景琛看着凌婉兮 -> scene_index=6
    
    log_scene = extract_scene_content_from_prompt(log_content)
    if not log_scene:
        return None
    
    # 根据日志ID直接映射（最可靠）
    log_id_to_scene_index = {
        330: 0,  # 外 忠勇侯府门前 - 贵女等待马车
        331: 1,  # 内 华贵马车内 - 凌瑶华醒来
        332: 5,  # 内 阴暗地牢 - 凌婉兮送经书（第二个地牢场景）
        333: 2,  # 内 阴暗地牢 - 烙铁刑罚（第一个地牢场景）
        334: 3,  # 内 华贵马车内 - 确认重生
        335: 4,  # 外 忠勇侯府门前 - 下车见容景琛
        336: 6,  # 外 忠勇侯府门前 - 打耳光
    }
    
    if log_id in log_id_to_scene_index:
        return log_id_to_scene_index[log_id]
    
    return None


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    print("=" * 60)
    print("从日志恢复缺失的分镜数据")
    print("=" * 60)
    
    # 1. 读取 script_id=19 的内容，拆分场景
    print("\n[步骤1] 读取剧本内容并拆分场景...")
    cur.execute("SELECT content FROM scripts WHERE id=19")
    row = cur.fetchone()
    if not row:
        print("错误: 未找到 script_id=19")
        return
    
    script_content = row[0]
    scenes = split_scenes_from_script(script_content)
    print(f"剧本拆分为 {len(scenes)} 个场景:")
    for s in scenes:
        print(f"  - scene_index={s['index']}: {s['scene_title']}")
    
    # 2. 查询现有分镜数据
    print("\n[步骤2] 查询现有分镜数据...")
    cur.execute("""
        SELECT DISTINCT scene_index FROM storyboards 
        WHERE novel_id=3 AND script_id=19 AND scene_index IS NOT NULL
        ORDER BY scene_index
    """)
    existing_scene_indices = [row[0] for row in cur.fetchall()]
    print(f"已有数据的 scene_index: {existing_scene_indices}")
    
    missing_scene_indices = [i for i in range(len(scenes)) if i not in existing_scene_indices]
    print(f"缺失的 scene_index: {missing_scene_indices}")
    
    # 3. 读取日志 330-336
    print("\n[步骤3] 读取日志 330-336...")
    cur.execute("""
        SELECT id, input_prompt, output_content, source_scene_index
        FROM llm_logs WHERE id BETWEEN 330 AND 336
    """)
    logs = cur.fetchall()
    print(f"读取到 {len(logs)} 条日志")
    
    # 4. 匹配日志与场景
    print("\n[步骤4] 匹配日志与场景...")
    log_scene_map = {}  # log_id -> scene_index
    
    for log_id, input_prompt, output_content, source_scene_index in logs:
        if source_scene_index is not None:
            # 如果日志已有 source_scene_index，直接使用
            log_scene_map[log_id] = source_scene_index
            print(f"  LOG {log_id}: scene_index={source_scene_index} (从 source_scene_index)")
        else:
            # 否则通过日志ID直接映射
            scene_idx = match_log_to_scene_index(log_id, input_prompt, scenes)
            log_scene_map[log_id] = scene_idx
            print(f"  LOG {log_id}: scene_index={scene_idx} (通过日志ID映射)")
    
    # 5. 恢复缺失数据
    print("\n[步骤5] 恢复缺失数据...")
    inserted_count = 0
    
    for log_id, input_prompt, output_content, _ in logs:
        scene_index = log_scene_map.get(log_id)
        
        if scene_index is None:
            print(f"  LOG {log_id}: 无法匹配场景，跳过")
            continue
        
        if scene_index in existing_scene_indices:
            print(f"  LOG {log_id}: scene_index={scene_index} 已有数据，跳过")
            continue
        
        if not output_content:
            print(f"  LOG {log_id}: output_content 为空，跳过")
            continue
        
        # 解析分镜文本
        sections = parse_sections_from_output(output_content)
        if not sections:
            print(f"  LOG {log_id}: 无法解析分镜文本，跳过")
            continue
        
        print(f"  LOG {log_id}: scene_index={scene_index}, 解析到 {len(sections)} 个小节")
        
        # 查询该场景是否已有部分数据，确定起始 section_number
        cur.execute("""
            SELECT MAX(section_number) FROM storyboards 
            WHERE novel_id=3 AND script_id=19 AND scene_index=?
        """, (scene_index,))
        row = cur.fetchone()
        max_section = row[0] if row[0] is not None else 0
        
        # 插入数据库
        for idx, section in enumerate(sections):
            section_number = max_section + 1 + idx
            
            full_text = section['full_text']
            characters = section['characters']
            characters_str = section['characters_str']
            scene_name = section['scene']
            
            characters_json = json.dumps(characters, ensure_ascii=False)
            scenes_json = json.dumps([scene_name] if scene_name else [], ensure_ascii=False)
            props_json = json.dumps([], ensure_ascii=False)
            section_info = {
                "scene": scene_name,
                "characters": characters_str
            }
            section_info_json = json.dumps(section_info, ensure_ascii=False)
            
            cur.execute("""
                INSERT INTO storyboards 
                (novel_id, script_id, scene_number, description, prompt, 
                 characters, scenes, props, sort_order, section_number, section_info, scene_index, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                3,  # novel_id
                19,  # script_id
                1,  # scene_number
                full_text,
                full_text,
                characters_json,
                scenes_json,
                props_json,
                idx,  # sort_order
                section_number,
                section_info_json,
                scene_index,
                get_beijing_time()
            ))
            inserted_count += 1
            print(f"    插入小节 {section_number}: {scene_name[:30]}...")
    
    conn.commit()
    print(f"\n共插入 {inserted_count} 条记录")
    
    # 6. 验证结果
    print("\n[步骤6] 验证结果...")
    cur.execute("""
        SELECT scene_index, COUNT(*) as cnt 
        FROM storyboards 
        WHERE novel_id=3 AND script_id=19 
        GROUP BY scene_index 
        ORDER BY scene_index
    """)
    print("各场景分镜数量:")
    for row in cur.fetchall():
        print(f"  scene_index={row[0]}: {row[1]} 条")
    
    # 检查是否所有场景都有数据
    cur.execute("""
        SELECT DISTINCT scene_index FROM storyboards 
        WHERE novel_id=3 AND script_id=19 AND scene_index IS NOT NULL
        ORDER BY scene_index
    """)
    final_scene_indices = [row[0] for row in cur.fetchall()]
    still_missing = [i for i in range(len(scenes)) if i not in final_scene_indices]
    
    if still_missing:
        print(f"\n警告: 仍然缺失的场景: {still_missing}")
    else:
        print(f"\n成功: 所有 {len(scenes)} 个场景都有分镜数据!")
    
    conn.close()
    print("\n" + "=" * 60)
    print("恢复完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
