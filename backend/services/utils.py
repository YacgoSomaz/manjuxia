import json
import re
from typing import List, Dict, Any


def parse_llm_json_response(response_text: str) -> List[Dict[str, Any]]:
    """
    从大模型返回的文本中提取 JSON 数据
    支持多种格式：纯 JSON、markdown 代码块、混合内容等
    """
    if not response_text:
        return []
    
    text = response_text.strip()
    
    # 尝试1：直接解析为 JSON
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            # 尝试从常见的键中提取列表
            for key in ['storyboards', 'scenes', 'data', 'results', 'list', 'items', 'elements']:
                if key in result and isinstance(result[key], list):
                    return result[key]
            return [result]  # 单个对象包装为列表
    except json.JSONDecodeError:
        pass
    
    # 尝试2：提取 markdown 代码块中的 JSON
    code_block_patterns = [
        r'```json\s*\n?(.*?)\n?\s*```',
        r'```\s*\n?(.*?)\n?\s*```',
    ]
    for pattern in code_block_patterns:
        matches = re.findall(pattern, text, re.DOTALL)
        for match in matches:
            try:
                result = json.loads(match.strip())
                if isinstance(result, list):
                    return result
                if isinstance(result, dict):
                    for key in ['storyboards', 'scenes', 'data', 'results', 'list', 'items', 'elements']:
                        if key in result and isinstance(result[key], list):
                            return result[key]
                    return [result]
            except json.JSONDecodeError:
                continue
    
    # 尝试3：找到文本中第一个 [ 和最后一个 ] 之间的内容
    first_bracket = text.find('[')
    last_bracket = text.rfind(']')
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        try:
            result = json.loads(text[first_bracket:last_bracket + 1])
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass
    
    # 尝试4：找到文本中第一个 { 和最后一个 } 之间的内容
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            result = json.loads(text[first_brace:last_brace + 1])
            if isinstance(result, dict):
                for key in ['storyboards', 'scenes', 'data', 'results', 'list', 'items', 'elements']:
                    if key in result and isinstance(result[key], list):
                        return result[key]
                return [result]
        except json.JSONDecodeError:
            pass
    
    # 尝试5：如果完全无法解析，将整个响应作为单个项目的描述
    return [{
        "name": "提取结果",
        "description": text
    }]


def _parse_text_format_storyboards(text: str) -> List[Dict[str, Any]]:
    """
    解析纯文本格式的分镜内容
    支持格式：
    ### 小节1：
    场景：xxx
    人物：xxx
    镜号1：【镜头语言】描述内容
    镜号2：【镜头语言】描述内容
    """
    sections = []
    current_section = None
    current_shots = []
    
    lines = text.split('\n')
    i = 0
    section_number = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        # 识别小节标记：### 小节X 或 小节X：
        section_match = re.match(r'^[#\s]*小节\s*(\d+)\s*[:：]', line)
        if not section_match:
            section_match = re.match(r'^###\s*小节\s*(\d+)', line)
        
        if section_match:
            # 保存上一个section
            if current_section is not None and current_shots:
                current_section['shots'] = current_shots
                sections.append(current_section)
            
            section_number = int(section_match.group(1))
            current_section = {
                'section_number': section_number,
                'scene': '',
                'characters': '',
                'shots': []
            }
            current_shots = []
            i += 1
            continue
        
        # 识别场景行
        if line.startswith('场景：') or line.startswith('场景:'):
            if current_section is not None:
                current_section['scene'] = line.split('：', 1)[1].strip() if '：' in line else line.split(':', 1)[1].strip()
            i += 1
            continue
        
        # 识别人物行
        if line.startswith('人物：') or line.startswith('人物:'):
            if current_section is not None:
                current_section['characters'] = line.split('：', 1)[1].strip() if '：' in line else line.split(':', 1)[1].strip()
            i += 1
            continue
        
        # 识别镜号行：镜号X：【镜头语言】描述内容
        shot_match = re.match(r'^镜号\s*(\d+)\s*[:：]\s*(.+)', line)
        if shot_match:
            shot_number = int(shot_match.group(1))
            content = shot_match.group(2).strip()
            
            # 解析镜头语言和描述
            camera = ''
            description = content
            
            # 匹配【镜头语言】格式
            camera_match = re.match(r'^【([^】]+)】\s*(.+)', content)
            if camera_match:
                camera = camera_match.group(1)
                description = camera_match.group(2)
            
            shot = {
                'shot_number': shot_number,
                'scene_number': shot_number,
                'description': description,
                'camera': camera,
                'prompt': content,
                'dialogue': '',
                'characters': [],
                'scenes': [],
                'props': []
            }
            current_shots.append(shot)
            i += 1
            continue
        
        i += 1
    
    # 保存最后一个section
    if current_section is not None and current_shots:
        current_section['shots'] = current_shots
        sections.append(current_section)
    
    return sections if sections else []


def parse_storyboard_response(response_text: str) -> List[Dict[str, Any]]:
    """
    专门用于解析分镜生成的大模型返回结果
    返回标准的分镜数据结构列表
    支持：1) JSON格式 2) 纯文本格式（小节分组格式）
    """
    if not response_text:
        return []
    
    text = response_text.strip()
    
    # 打印调试信息
    print(f"[DEBUG] LLM 返回原始内容 (前500字符):\n{text[:500]}", flush=True)
    
    # 尝试1：直接解析为 JSON
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict):
            # 尝试从常见的键中提取列表（包括分镜生成的 sections）
            for key in ['sections', 'storyboards', 'scenes', 'data', 'results', 'list', 'items', 'shots']:
                if key in result and isinstance(result[key], list):
                    return result[key]
            return [result]  # 单个对象包装为列表
    except json.JSONDecodeError:
        pass
    
    # 尝试2：提取 markdown 代码块中的 JSON
    # 改进的正则表达式，更灵活地处理各种代码块格式
    code_block_patterns = [
        r'```json\s*\n?(.*?)\n?\s*```',  # ```json ... ```
        r'```\s*\n?(.*?)\n?\s*```',       # ``` ... ```
        r'```json\s+(.*?)\s+```',          # ```json ... ``` (单行，带空格)
    ]
    
    for pattern_idx, pattern in enumerate(code_block_patterns):
        matches = re.findall(pattern, text, re.DOTALL)
        print(f"[DEBUG] 代码块模式 {pattern_idx + 1} 找到 {len(matches)} 个匹配", flush=True)
        for match_idx, match in enumerate(matches):
            stripped_match = match.strip()
            print(f"[DEBUG] 尝试解析匹配 {match_idx + 1}, 长度: {len(stripped_match)}", flush=True)
            try:
                result = json.loads(stripped_match)
                print(f"[DEBUG] 代码块解析成功", flush=True)
                if isinstance(result, list):
                    return result
                if isinstance(result, dict):
                    for key in ['sections', 'storyboards', 'scenes', 'data', 'results', 'list', 'items', 'shots']:
                        if key in result and isinstance(result[key], list):
                            return result[key]
                    return [result]
            except json.JSONDecodeError as e:
                print(f"[DEBUG] 匹配 {match_idx + 1} 解析失败: {e}", flush=True)
                continue
    
    # 尝试3：找到文本中第一个 [ 和最后一个 ] 之间的内容
    first_bracket = text.find('[')
    last_bracket = text.rfind(']')
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        try:
            bracket_content = text[first_bracket:last_bracket + 1]
            print(f"[DEBUG] 尝试从方括号解析, 长度: {len(bracket_content)}", flush=True)
            result = json.loads(bracket_content)
            if isinstance(result, list):
                print(f"[DEBUG] 方括号解析成功, 共 {len(result)} 项", flush=True)
                return result
        except json.JSONDecodeError as e:
            print(f"[DEBUG] 方括号解析失败: {e}", flush=True)
            pass
    
    # 尝试4：找到文本中第一个 { 和最后一个 } 之间的内容
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            brace_content = text[first_brace:last_brace + 1]
            print(f"[DEBUG] 尝试从花括号解析, 长度: {len(brace_content)}", flush=True)
            result = json.loads(brace_content)
            if isinstance(result, dict):
                for key in ['sections', 'storyboards', 'scenes', 'data', 'results', 'list', 'items', 'shots']:
                    if key in result and isinstance(result[key], list):
                        print(f"[DEBUG] 从花括号 dict['{key}'] 提取列表, 共 {len(result[key])} 项", flush=True)
                        return result[key]
                print(f"[DEBUG] 花括号解析成功, 单个对象", flush=True)
                return [result]
        except json.JSONDecodeError as e:
            print(f"[DEBUG] 花括号解析失败: {e}", flush=True)
            pass
    
    # 尝试5：解析纯文本格式（小节分组格式）
    text_sections = _parse_text_format_storyboards(text)
    if text_sections:
        print(f"[DEBUG] 成功解析为纯文本小节格式，共 {len(text_sections)} 个小节", flush=True)
        return text_sections
    
    # 尝试6：如果完全无法解析，将整个响应作为单个分镜的描述
    print(f"[DEBUG] 无法解析为结构化数据，将原始内容作为单个分镜处理", flush=True)
    return [{
        "scene_number": 1,
        "description": text,
        "prompt": text,
        "characters": [],
        "scenes": [],
        "props": []
    }]
