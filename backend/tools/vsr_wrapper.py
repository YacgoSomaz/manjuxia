"""
VSR Wrapper - 通过子进程调用 Video Subtitle Remover
用法: python vsr_wrapper.py --config '{"video_path": "...", "algorithm": "STTN", "output_dir": "..."}'
"""
import sys
import os
import json
import argparse

# 将 VSR 源码目录加入 sys.path
VSR_DIR = r"e:\tools\vsr\repo"
sys.path.insert(0, VSR_DIR)
os.chdir(VSR_DIR)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=str, required=True)
    args = parser.parse_args()
    
    config = json.loads(args.config)
    video_path = config['video_path']
    algorithm = config.get('algorithm', 'STTN')
    output_dir = config.get('output_dir', '')
    subtitle_area = config.get('subtitle_area', 'auto')
    
    try:
        from backend.main import SubtitleRemover
        import backend.config as cfg
        import cv2
        
        # 解析 subtitle_area
        sub_area = None
        if isinstance(subtitle_area, str):
            if subtitle_area.startswith('{'):
                try:
                    subtitle_area = json.loads(subtitle_area)
                except:
                    pass
        
        if isinstance(subtitle_area, dict):
            y1 = subtitle_area.get('y1', 0)
            y2 = subtitle_area.get('y2', 0)
            x1 = subtitle_area.get('x1', 0)
            x2 = subtitle_area.get('x2', 0)
            if y1 != y2:
                sub_area = (y1, y2, x1, x2)
        
        # 设置算法
        if algorithm == 'STTN':
            cfg.MODE = cfg.InpaintMode.STTN
            # 始终使用OCR检测字幕位置，sub_area作为检测范围提示
            # 跳过检测只会粗暴模糊整个区域，效果很差
            cfg.STTN_SKIP_DETECTION = False
            # 提高修复质量参数
            cfg.STTN_REFERENCE_LENGTH = 15  # 更多参考帧（默认10）
            cfg.STTN_NEIGHBOR_STRIDE = 3   # 更密的参考间距（默认5）
        elif algorithm == 'LAMA':
            cfg.MODE = cfg.InpaintMode.LAMA
        elif algorithm == 'PROPAINTER':
            cfg.MODE = cfg.InpaintMode.PROPAINTER
        
        # 获取视频总帧数用于进度计算
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        print(f"===PROGRESS===5", flush=True)  # 初始化完成
        
        remover = SubtitleRemover(video_path, sub_area=sub_area)
        
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            base_name = os.path.splitext(os.path.basename(video_path))[0]
            remover.video_out_name = os.path.join(output_dir, f"{base_name}_no_sub.mp4")
        
        print(f"===PROGRESS===10", flush=True)  # 开始处理
        
        # 使用后台线程定时报告进度（基于时间估算）
        import threading
        _stop_progress = threading.Event()
        def _progress_reporter():
            import time
            # OCR检测+修复，约每秒处理2-5帧
            est_seconds = max(15, total_frames / 3)
            start = time.time()
            while not _stop_progress.is_set():
                elapsed = time.time() - start
                pct = 10 + int((elapsed / est_seconds) * 80)
                pct = min(pct, 90)
                print(f"===PROGRESS==={pct}", flush=True)
                time.sleep(3)
        
        t = threading.Thread(target=_progress_reporter, daemon=True)
        t.start()
        
        remover.run()
        
        _stop_progress.set()
        t.join(timeout=2)
        
        print(f"===PROGRESS===98", flush=True)
        result = {"status": "success", "output_path": remover.video_out_name}
    except Exception as e:
        import traceback
        result = {"status": "error", "error": str(e), "traceback": traceback.format_exc()}
    
    print("===RESULT===")
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
