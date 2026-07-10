import cv2
import os

video_path = r"E:\真人测试素材2\视频2\第2章\3.mp4"
out_dir = r"E:\workspace\xiaoshuotool\backend\data\images"

cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print(f"分辨率: {w}x{h}, FPS: {fps}, 总帧数: {total}, 时长: {total/fps:.1f}s")

# 截取3帧: 第1秒、中间、倒数第2秒
frames_to_capture = [int(fps), total//2, total - int(fps*2)]
for i, frame_no in enumerate(frames_to_capture):
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ret, frame = cap.read()
    if ret:
        path = os.path.join(out_dir, f"subtitle_frame{i+1}.png")
        cv2.imwrite(path, frame)
        print(f"已保存帧 {frame_no} -> {path}")

cap.release()
