"""v3.61.249: 视频尾帧"多帧抽样 + 选最清晰"。
从视频末尾一段抽多张候选帧,用 cv2 拉普拉斯方差选最清晰的一帧,
避开尾帧常见的动作残影/收尾变形/压缩预测帧/渐黑/过曝。
任何失败返回 False,由调用方回退原"取最后一帧"逻辑。cv2/numpy 已随包。
"""
import os
import asyncio
import shutil
import glob
import tempfile
import logging

logger = logging.getLogger(__name__)


def score_candidate_frames(paths):
    """对候选帧打分,选最清晰一帧。返回 (best_path, score, count)。
    清晰度 = 拉普拉斯方差(越大越清);黑场/过曝(平均亮度过低/过高)重罚。"""
    try:
        import cv2
    except Exception as e:
        logger.warning(f"[best-last-frame] cv2 不可用,放弃智能选帧: {e}")
        return (None, 0.0, 0)
    best, best_score, n = None, -1.0, 0
    for p in paths:
        try:
            img = cv2.imread(p)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            sharp = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            bright = float(gray.mean())
            score = sharp * (0.1 if (bright < 20 or bright > 240) else 1.0)
            n += 1
            if score > best_score:
                best, best_score = p, score
        except Exception:
            continue
    return (best, best_score, n)


async def extract_best_last_frame(ffmpeg: str, video_path: str, output_path: str,
                                  window_seconds: float = 1.2, cap_fps: int = 15,
                                  timeout: int = 30) -> bool:
    """从末尾 window_seconds 秒抽多帧,选最清晰一帧写到 output_path。
    成功 True;无候选/全不可读 False(交由上层回退)。"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    tmpdir = tempfile.mkdtemp(prefix="lastframe_")
    process = None
    try:
        pat = os.path.join(tmpdir, "cand_%03d.jpg")
        # -sseof 放 -i 前精确定位末尾;fps 过滤把候选压到 ~window*cap_fps 张
        args = ["-y", "-sseof", f"-{window_seconds}", "-i", video_path,
                "-vf", f"fps={cap_fps}", "-q:v", "2", pat]
        logger.info(f"[best-last-frame] {ffmpeg} {' '.join(args)}")
        process = await asyncio.create_subprocess_exec(
            ffmpeg, *args,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        _, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        cands = sorted(glob.glob(os.path.join(tmpdir, "cand_*.jpg")))
        if not cands:
            err = (stderr or b"").decode("utf-8", "replace")[:300]
            logger.info(f"[best-last-frame] 无候选帧(rc={getattr(process,'returncode',None)}): {err}")
            return False
        best, score, n = await asyncio.to_thread(score_candidate_frames, cands)
        if not best:
            return False
        shutil.copyfile(best, output_path)
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            return False
        logger.info(f"[best-last-frame] 选最清晰帧 {os.path.basename(best)} "
                    f"(清晰度={score:.1f}, 候选 {n} 张) -> {output_path}")
        return True
    except asyncio.TimeoutError:
        logger.warning(f"[best-last-frame] 超时({timeout}s),回退")
        try:
            if process:
                process.kill()
        except Exception:
            pass
        return False
    except Exception as e:
        logger.warning(f"[best-last-frame] 异常,回退: {e}")
        return False
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
