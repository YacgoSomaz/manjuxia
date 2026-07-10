"""
ProPainter Wrapper - 通过子进程调用 ProPainter
用法: python propainter_wrapper.py --config '{"video_path": "...", "output_dir": "...", "subtitle_area": "center"}'
"""
import sys
import os
import json
import argparse
import cv2
import numpy as np
import shutil
import subprocess

PROPAINTER_DIR = r"e:\tools\propainter\repo"

def generate_masks(video_path, mask_dir, subtitle_area="center"):
    """根据字幕位置生成 mask 序列"""
    cap = cv2.VideoCapture(video_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    os.makedirs(mask_dir, exist_ok=True)
    
    # 默认 x 范围为全宽
    x1, x2 = 0, w
    
    if subtitle_area == "bottom":
        y1, y2 = int(h * 0.85), h
    elif subtitle_area == "center":
        y1, y2 = int(h * 0.60), int(h * 0.80)
    elif subtitle_area == "top":
        y1, y2 = 0, int(h * 0.15)
    elif isinstance(subtitle_area, dict):
        y1 = subtitle_area.get('y1', int(h * 0.7))
        y2 = subtitle_area.get('y2', h)
        x1 = subtitle_area.get('x1', 0)
        x2 = subtitle_area.get('x2', w)
    else:
        y1, y2 = int(h * 0.65), int(h * 0.85)
    
    for i in range(total):
        mask = np.zeros((h, w), dtype=np.uint8)
        mask[y1:y2, x1:x2] = 255  # 使用精确的 x, y 坐标
        cv2.imwrite(os.path.join(mask_dir, f"{i:05d}.png"), mask)
    
    cap.release()
    return total

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=str, required=True)
    args = parser.parse_args()
    
    config = json.loads(args.config)
    video_path = config['video_path']
    output_dir = config.get('output_dir', os.path.join(PROPAINTER_DIR, 'results'))
    subtitle_area = config.get('subtitle_area', 'center')
    
    # 如果是 JSON 字符串，解析为字典
    if isinstance(subtitle_area, str) and subtitle_area.startswith('{'):
        try:
            subtitle_area = json.loads(subtitle_area)
        except:
            pass
    
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        print("===PROGRESS===5", flush=True)  # 开始生成 mask
        mask_dir = os.path.join(output_dir, "temp_masks")
        total_frames = generate_masks(video_path, mask_dir, subtitle_area)
        print("===PROGRESS===15", flush=True)  # mask 生成完成
        
        cmd = [
            sys.executable,
            os.path.join(PROPAINTER_DIR, "inference_propainter.py"),
            "--video", video_path,
            "--mask", mask_dir,
            "--height", "480",
            "--width", "640",
            "--fp16",
            "--neighbor_length", "8",
            "--ref_stride", "15",
            "--subvideo_length", "50",
            "--output", output_dir
        ]
        
        print("===PROGRESS===20", flush=True)  # 开始推理
        
        # 使用 Popen 逐行读取输出来追踪进度
        # 指定 encoding='utf-8' 避免 Windows GBK 编码错误
        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            encoding='utf-8', errors='replace', cwd=PROPAINTER_DIR
        )
        
        stderr_lines = []
        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            stderr_lines.append(line)
            # ProPainter 输出类似 "Processing: xxx/total" 或含有百分比
            # 尝试从输出中解析进度
            if 'Processing' in line or '%' in line or '/' in line:
                import re
                # 匹配 x/total 或 x% 格式
                m = re.search(r'(\d+)/(\d+)', line)
                if m:
                    curr, tot = int(m.group(1)), int(m.group(2))
                    if tot > 0:
                        pct = 20 + int((curr / tot) * 75)  # 20% ~ 95%
                        pct = min(pct, 95)
                        print(f"===PROGRESS==={pct}", flush=True)
        
        proc.wait()
        
        if proc.returncode != 0:
            raise RuntimeError(f"ProPainter failed: {''.join(stderr_lines[-20:])}")
        
        print("===PROGRESS===96", flush=True)
        
        # 查找输出文件
        output_path = None
        for f in os.listdir(output_dir):
            if f.endswith('.mp4') and f != os.path.basename(video_path):
                output_path = os.path.join(output_dir, f)
                break
        
        shutil.rmtree(mask_dir, ignore_errors=True)
        
        print("===PROGRESS===98", flush=True)
        result = {"status": "success", "output_path": output_path or ""}
    except Exception as e:
        import traceback
        result = {"status": "error", "error": str(e), "traceback": traceback.format_exc()}
    
    print("===RESULT===")
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
