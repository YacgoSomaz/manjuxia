"""
从成功的日志中恢复缺失的分镜数据
只处理最新的几条日志（ID >= 323）
"""
import sqlite3
import json
import re
from datetime import datetime

DB_PATH = "data/app.db"

def normalize_scene_title(title):
    """标准化场景标题：去除【】括号，规范化空格"""
    if not title:
        return title
    title = title.replace('【', '').replace('】', '')
    title = re.sub(r'\s+', ' ', title)
    title = title.strip()
    return title

def parse_script_scenes(script_content):
    """解析剧本内容，提取场景列表"""
    pattern = re.compile(r'【(?:外|内|外/内|内/外|黑屏)[^】]+】', re.MULTILINE)
    matches = pattern.findall(script_content)
    
    scenes = []
    seen = set()
    for match in matches:
        normalized = normalize_scene_title(match)
        if normalized not in seen:
            scenes.append(normalized)
            seen.add(normalized)
    return scenes

def parse_log_output(output_content):
    """解析日志的 output_content，提取小节信息"""
    if not output_content:
        return []
    
    sections = []
    # 按小节分割
    pattern = r'(?:^|\n)(?:#{0,3}\s*)?小节\s*(\d+)\s*[:：]?'
    matches = list(re.finditer(pattern, output_content, re.MULTILINE))
    
    if not matches:
        # 没有小节标记，整个作为一个
        return [{
            "section_number": 1,
            "full_text": output_content.strip(),
            "scene": "",
            "characters": ""
        }]
    
    for i, match in enumerate(matches):
        section_number = int(match.group(1))
        start_pos = match.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(output_content)
        
        section_text = output_content[start_pos:end_pos].strip()
        
        # 提取场景和人物
        scene = ""
        characters = ""
        
        scene_match = re.search(r'场景[：:]\s*([^\n]+)', section_text)
        if scene_match:
            scene = scene_match.group(1).strip()
        
        char_match = re.search(r'人物[：:]\s*([^\n]+)', section_text)
        if char_match:
            characters = char_match.group(1).strip()
        
        sections.append({
            "section_number": section_number,
            "full_text": section_text,
            "scene": scene,
            "characters": characters
        })
    
    return sections

def match_scene_index(scene_name, scene_list):
    """匹配场景名到场景索引"""
    if not scene_name:
        return None
    
    normalized = normalize_scene_title(scene_name)
    
    # 精确匹配
    for i, s in enumerate(scene_list):
        if s == normalized:
            return i
    
    # 模糊匹配（去掉空格后比较）
    normalized_no_space = normalized.replace(' ', '')
    for i, s in enumerate(scene_list):
        if s.replace(' ', '') == normalized_no_space:
            return i
    
    # 包含匹配
    for i, s in enumerate(scene_list):
        if normalized_no_space in s.replace(' ', '') or s.replace(' ', '') in normalized_no_space:
            return i
    
    return None

def normalize_characters(characters_str):
    """标准化人物列表"""
    if not characters_str:
        return []
    parts = re.split(r'[，,、]', characters_str)
    return list(dict.fromkeys([p.strip() for p in parts if p.strip()]))

def recover_storyboards():
    """主恢复函数"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # 1. 获取 novel_id=3 的剧本（使用 script_id=19，因为现有分镜用的是这个）
    script_id = 19
    c.execute("SELECT id, content FROM scripts WHERE id = ?", (script_id,))
    script_row = c.fetchone()
    if not script_row:
        print("ERROR: No script found with id=19")
        conn.close()
        return
    
    script_content = script_row['content']
    print("Script ID: {}".format(script_id))
    
    # 2. 解析场景列表
    scene_list = parse_script_scenes(script_content)
    print(f"Found {len(scene_list)} scenes:")
    for i, s in enumerate(scene_list):
        print(f"  [{i}] {s}")
    
    # 3. 获取现有分镜
    c.execute("SELECT scene_index, section_number FROM storyboards WHERE novel_id = 3 AND script_id = ?", (script_id,))
    existing = {}
    for row in c.fetchall():
        si = row['scene_index']
        sn = row['section_number']
        if si not in existing:
            existing[si] = set()
        existing[si].add(sn)
    
    print(f"\nExisting storyboards: {existing}")
    
    # 4. 获取需要恢复的日志（只处理 ID >= 323）
    c.execute("""
        SELECT id, output_content, created_at
        FROM llm_logs 
        WHERE id >= 323
          AND task_type = 'storyboard_generate' 
          AND status = 'success'
          AND output_content IS NOT NULL
          AND LENGTH(output_content) > 10
        ORDER BY id DESC
    """)
    logs = c.fetchall()
    print(f"\nFound {len(logs)} logs to process")
    
    # 5. 处理每条日志
    recovered_count = 0
    skipped_count = 0
    
    for log in logs:
        log_id = log['id']
        output = log['output_content']
        created_at = log['created_at']
        
        print(f"\n--- Processing log {log_id} ---")
        
        # 解析日志输出
        sections = parse_log_output(output)
        print(f"  Parsed {len(sections)} sections")
        
        for section in sections:
            scene_name = section['scene']
            section_number = section['section_number']
            full_text = section['full_text']
            characters = section['characters']
            
            if not scene_name:
                print(f"  Section {section_number}: No scene name, skipping")
                continue
            
            # 匹配场景索引
            scene_index = match_scene_index(scene_name, scene_list)
            if scene_index is None:
                print(f"  Section {section_number}: Scene '{scene_name}' not matched, skipping")
                continue
            
            print(f"  Section {section_number}: Scene '{scene_name}' -> index {scene_index}")
            
            # 检查是否已存在
            # 注意：由于 section_number 现在是场景内递增，我们需要检查是否有该场景的分镜
            # 如果该场景已有分镜，则跳过（因为日志没有告诉我们是场景内的第几个小节）
            
            # 实际上我们应该检查：
            # 1. 是否已有该 scene_index 的分镜
            # 2. 如果有，比较 section_number
            
            # 简化处理：如果该场景已有分镜，检查数量
            c.execute("SELECT COUNT(*) FROM storyboards WHERE novel_id = 3 AND script_id = ? AND scene_index = ?", (script_id, scene_index))
            count = c.fetchone()[0]
            
            if count > 0:
                print(f"  Scene index {scene_index} already has {count} storyboards, checking if need to add...")
                # 检查这条日志的小节是否已经存在（通过内容匹配）
                c.execute("SELECT id FROM storyboards WHERE novel_id = 3 AND script_id = ? AND scene_index = ? AND description = ?", (script_id, scene_index, full_text[:200]))
                if c.fetchone():
                    print(f"  Already exists (content matched), skipping")
                    skipped_count += 1
                    continue
            
            # 插入新分镜
            chars_list = normalize_characters(characters)
            chars_json = json.dumps(chars_list, ensure_ascii=False)
            scenes_json = json.dumps([scene_name], ensure_ascii=False)
            props_json = json.dumps([], ensure_ascii=False)
            section_info = {"scene": scene_name, "characters": characters}
            section_info_json = json.dumps(section_info, ensure_ascii=False)
            
            # section_number 在场景内递增
            c.execute("SELECT MAX(section_number) FROM storyboards WHERE novel_id = 3 AND script_id = ? AND scene_index = ?", (script_id, scene_index))
            max_sn = c.fetchone()[0]
            new_section_number = (max_sn or 0) + 1
            
            c.execute("""
                INSERT INTO storyboards
                (novel_id, script_id, scene_number, description, prompt,
                 characters, scenes, props, sort_order, section_number, section_info, scene_index, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (3, script_id, 1, full_text, full_text,
                  chars_json, scenes_json, props_json, 0, new_section_number, section_info_json, scene_index, created_at))
            
            print(f"  INSERTED: scene_index={scene_index}, section_number={new_section_number}")
            recovered_count += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n=== Recovery complete ===")
    print(f"Recovered: {recovered_count}")
    print(f"Skipped: {skipped_count}")

if __name__ == "__main__":
    recover_storyboards()
