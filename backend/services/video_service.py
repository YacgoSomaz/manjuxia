import asyncio
import json
import os
import shutil
import logging
import sys
import subprocess

from utils.paths import is_frozen
from utils.unicode_utils import sanitize_unicode

logger = logging.getLogger(__name__)


class VideoService:
    def __init__(self):
        self._dreamina_path = None
        self._ffmpeg_path = None

    def _get_ffmpeg_path(self) -> str:
        """定位 ffmpeg.exe(用于视频抽帧/转码等)。

        优先级:
          1. 环境变量 FFMPEG_PATH(测试/调试覆盖)
          2. 打包环境: extraResources/build/ffmpeg.exe
             (electron-builder 配置里把 build/ffmpeg.exe 打进资源目录)
             资源目录的解析:打包后 backend-server.exe 在 resources/backend-dist/backend-server/
             ffmpeg.exe 在 resources/build/ffmpeg.exe
          3. 系统 PATH 里的 ffmpeg(开发机或全局安装的)
        找不到时返回 'ffmpeg' 字符串,调用方应做异常处理。
        """
        if self._ffmpeg_path:
            return self._ffmpeg_path

        # 1. 环境变量
        env_path = os.environ.get("FFMPEG_PATH")
        if env_path and os.path.exists(env_path):
            self._ffmpeg_path = env_path
            logger.info(f"[ffmpeg] 使用环境变量路径: {env_path}")
            return env_path

        # 2. 打包环境:从 backend-server.exe 倒推到 resources/build/ffmpeg.exe
        if is_frozen():
            exe_dir = os.path.dirname(sys.executable)  # resources/backend-dist/backend-server/
            backend_dist_dir = os.path.dirname(exe_dir)  # resources/backend-dist/
            resources_dir = os.path.dirname(backend_dist_dir)  # resources/
            ffmpeg_path = os.path.join(resources_dir, "build", "ffmpeg.exe")
            if os.path.exists(ffmpeg_path):
                self._ffmpeg_path = ffmpeg_path
                logger.info(f"[ffmpeg] 打包环境检测到路径: {ffmpeg_path}")
                return ffmpeg_path
            logger.warning(f"[ffmpeg] 打包环境但未找到: {ffmpeg_path}")

        # 3. PATH 兜底
        path = shutil.which("ffmpeg")
        if path:
            self._ffmpeg_path = path
            logger.info(f"[ffmpeg] PATH 中找到: {path}")
            return path

        # 实在找不到,返回字符串让 subprocess 报错以便日志看清
        logger.warning("[ffmpeg] 未在任何位置找到 ffmpeg.exe,抽帧功能将失败")
        self._ffmpeg_path = "ffmpeg"
        return "ffmpeg"

    async def extract_last_frame(self, video_path: str, output_path: str,
                                 sseof_seconds: float = 0.5,
                                 timeout: int = 30) -> bool:
        """从视频末尾抽 1 帧保存为 jpg。
        - sseof_seconds: 末尾倒数多少秒处取帧(默认 0.5s,避开渐黑过场)
        - 成功返回 True;失败(ffmpeg 不存在/视频损坏/超时)返回 False,不抛异常
        """
        if not os.path.exists(video_path):
            logger.warning(f"[extract_last_frame] 视频文件不存在: {video_path}")
            return False

        ffmpeg = self._get_ffmpeg_path()
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # v3.61.249: 先试"多帧抽样 + 选最清晰",失败再走原"取最后一帧"
        try:
            from services.last_frame_picker import extract_best_last_frame
            if await extract_best_last_frame(ffmpeg, video_path, output_path, timeout=timeout):
                return True
            logger.info("[extract_last_frame] 智能选帧未得合格帧,回退取最后一帧")
        except Exception as _e:
            logger.warning(f"[extract_last_frame] 智能选帧异常,回退: {_e}")

        # ffmpeg -y -sseof -0.5 -i video.mp4 -vframes 1 -q:v 2 frame.jpg
        # -sseof 必须放在 -i 前面才能精确定位到末尾(放后面无效)
        args = [
            "-y",
            "-sseof", f"-{sseof_seconds}",
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path,
        ]
        logger.info(f"[extract_last_frame] {ffmpeg} {' '.join(args)}")
        try:
            process = await asyncio.create_subprocess_exec(
                ffmpeg, *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
            if process.returncode != 0:
                err_text = (stderr or b"").decode("utf-8", errors="replace")[:500]
                logger.warning(f"[extract_last_frame] ffmpeg 返回码 {process.returncode}: {err_text}")
                return False
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                logger.warning(f"[extract_last_frame] 输出文件不存在或为空: {output_path}")
                return False
            logger.info(f"[extract_last_frame] 成功: {output_path} ({os.path.getsize(output_path)} bytes)")
            return True
        except asyncio.TimeoutError:
            logger.error(f"[extract_last_frame] ffmpeg 超时({timeout}s): {video_path}")
            try:
                process.kill()
            except Exception:
                pass
            return False
        except FileNotFoundError:
            logger.error(f"[extract_last_frame] ffmpeg 二进制不存在: {ffmpeg}")
            return False
        except Exception as e:
            logger.exception(f"[extract_last_frame] 抽帧异常: {e}")
            return False

    def _get_dreamina_path(self) -> str:
        """获取dreamina可执行文件路径
            
        优先级：
        1. 打包环境：从 backend-server.exe 所在目录推算
        2. PATH 环境变量查找
        3. 回退到用户 ~/bin/dreamina.exe
        """
        if self._dreamina_path:
            return self._dreamina_path
            
        # 打包环境：从 backend-server.exe 所在目录推算
        if is_frozen():
            exe_dir = os.path.dirname(sys.executable)  # backend-dist/backend-server/
            backend_dist_dir = os.path.dirname(exe_dir)  # backend-dist/
            dreamina_path = os.path.join(backend_dist_dir, 'dreamina', 'dreamina.exe')
            if os.path.exists(dreamina_path):
                self._dreamina_path = dreamina_path
                logger.info(f"[dreamina-cli] 打包环境检测到路径: {dreamina_path}")
                return dreamina_path
            logger.warning(f"[dreamina-cli] 打包环境但未找到dreamina: {dreamina_path}")
            
        # PATH 环境变量查找
        path = shutil.which("dreamina")
        if not path:
            # 回退到当前用户目录下的 bin/dreamina.exe
            user_home = os.path.expanduser("~")
            path = os.path.join(user_home, "bin", "dreamina.exe")
        self._dreamina_path = path
        return path

    @staticmethod
    def _extract_json_object(text: str):
        """从混杂输出(CLI 调试日志 + JSON)里提取 dreamina 的 JSON 结果。

        dreamina CLI 偶尔把带 ANSI 颜色码的 SQL 调试日志混进 stdout。
        不能简单取"最后一个 JSON",因为调试日志后面也可能带 SQL 参数 JSON。
        策略:
          1. 扫描 stdout 中所有可解析的 JSON object;
          2. 优先返回含 submit_id / gen_status / fail_reason / guidance 的对象;
          3. 没有业务对象时,才返回最后一个 dict。
        """
        if not text:
            return None
        import json as _json
        # 去掉 ANSI 转义码,避免干扰
        import re as _re
        clean = _re.sub(r'\x1b\[[0-9;]*m', '', text)
        decoder = _json.JSONDecoder()
        candidates = []
        idx = 0
        while True:
            start = clean.find('{', idx)
            if start < 0:
                break
            try:
                obj, end = decoder.raw_decode(clean[start:])
                if isinstance(obj, dict):
                    candidates.append(obj)
                idx = start + max(end, 1)
            except Exception:
                idx = start + 1

        if not candidates:
            return None

        business_keys = {"submit_id", "gen_status", "fail_reason", "guidance"}
        for obj in reversed(candidates):
            if any(k in obj for k in business_keys):
                return obj
        return candidates[-1]

    async def _run_command(self, *args, timeout=120) -> dict:
        """执行dreamina CLI命令并解析JSON输出。
        失败时记完整 stderr + stdout,便于排查"提交即失败"等问题。
        """
        cmd = self._get_dreamina_path()
        full_cmd = f"{cmd} {' '.join(args)}"
        logger.info(f"[dreamina-cli] 执行命令: {full_cmd}")
        try:
            process = await asyncio.create_subprocess_exec(
                cmd, *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=timeout
            )
            output = stdout.decode('utf-8', errors='replace').strip()
            err_text = stderr.decode('utf-8', errors='replace').strip()

            if process.returncode != 0:
                # ⚠️ 关键日志:CLI 退出码非 0,完整记 stderr + stdout 帮助排查
                logger.error(
                    f"[dreamina-cli] returncode={process.returncode} cmd={args[0]}\n"
                    f"  stderr: {err_text[:1000]}\n"
                    f"  stdout: {output[:1000]}"
                )
                # v3.61.254 修复①:returncode!=0 不代表任务没受理。
                #   即梦撞 1310 等情况,CLI 可能非 0 退出但 stdout 里其实已带 submit_id(任务已建在生成)。
                #   旧逻辑直接丢 stdout → submit_id 丢失 → 误判失败 + 上层重复提交撞自己并发。
                #   故:非 0 退出时也尝试提取 JSON,只要含 submit_id 就当"已受理"返回 success,交给上层轮询判终态。
                _rc_obj = None
                try:
                    _rc_obj = json.loads(output)
                except Exception:
                    _rc_obj = self._extract_json_object(output)
                if isinstance(_rc_obj, dict) and _rc_obj.get("submit_id"):
                    logger.warning(
                        f"[dreamina-cli] cmd={args[0]} returncode={process.returncode} 但 stdout 含 submit_id="
                        f"{_rc_obj.get('submit_id')} gen_status={_rc_obj.get('gen_status')!r} "
                        f"→ 视为已受理,交上层轮询(避免误判失败+重复提交)"
                    )
                    return {"success": True, "data": _rc_obj}
                return {"success": False, "error": err_text or output}

            # 尝试解析JSON
            # v3.61.x:dreamina CLI 偶尔会把内部调试日志(带 ANSI 颜色码的 SLOW SQL /
            #   INSERT INTO aigc_task 等)混进 stdout,导致整体 json.loads 失败 →
            #   误判"提交成功但未返回 submit_id"(实际任务已提交,用户白扣额度还显示失败)。
            #   故:整体解析失败时,从混杂输出里【提取最后一个完整 {...} JSON 块】再解析。
            result = None
            try:
                result = json.loads(output)
            except json.JSONDecodeError:
                extracted = self._extract_json_object(output)
                if extracted is not None:
                    result = extracted
                    logger.warning(
                        f"[dreamina-cli] cmd={args[0]} stdout 混入非 JSON 日志,"
                        f"已从混杂输出提取到 JSON(submit_id={result.get('submit_id') if isinstance(result,dict) else None})"
                    )
            if result is not None:
                # 即使 returncode=0,业务层也可能返回 gen_status='fail'(提交即失败的场景)
                if isinstance(result, dict):
                    gs = result.get("gen_status")
                    if gs == "fail":
                        logger.warning(
                            f"[dreamina-cli] cmd={args[0]} 提交即失败 gen_status=fail "
                            f"fail_reason={result.get('fail_reason')!r} "
                            f"guidance={result.get('guidance')!r}"
                        )
                    elif gs:
                        logger.info(f"[dreamina-cli] cmd={args[0]} gen_status={gs} submit_id={result.get('submit_id')}")
                return {"success": True, "data": result}
            # 真的没有任何 JSON(login/help 等命令)→ raw_output
            logger.info(f"[dreamina-cli] cmd={args[0]} 非 JSON 输出: {output[:500]}")
            return {"success": True, "data": {"raw_output": output}}
        except asyncio.TimeoutError:
            logger.error(f"[dreamina-cli] cmd={args[0]} 超时({timeout}秒)")
            return {"success": False, "error": f"命令执行超时({timeout}秒)"}
        except Exception as e:
            logger.error(f"[dreamina-cli] cmd={args[0]} 异常: {type(e).__name__}: {e}")
            return {"success": False, "error": str(e)}

    async def check_login(self) -> dict:
        """检查登录状态并返回余额信息"""
        return await self._run_command("user_credit")

    async def relogin(self) -> dict:
        """切换即梦账号:清旧凭证 + 启动新浏览器登录(等同于 logout + login)"""
        cmd = self._get_dreamina_path()
        try:
            process = await asyncio.create_subprocess_exec(
                cmd, "relogin",
                stdout=None, stderr=None, stdin=None
            )
            return_code = await asyncio.wait_for(
                process.wait(), timeout=300
            )
            if return_code == 0:
                return {"success": True, "message": "切换账号成功"}
            else:
                return {"success": False, "message": f"切换账号命令返回错误码: {return_code}"}
        except asyncio.TimeoutError:
            return {"success": False, "message": "切换账号超时（5分钟）"}
        except Exception as e:
            return {"success": False, "message": f"{type(e).__name__}: {e}"}

    async def login(self) -> dict:
        """启动即梦CLI登录流程(会打开浏览器)。
        v3.59.75 修复:打包后 Electron 是 GUI 进程,没有 stdout/stdin 终端,
        子进程继承空 IO → dreamina login 等不到用户输入卡死(用户实测一直转圈)。
        Windows 上用 CREATE_NEW_CONSOLE 弹出独立 cmd 窗口让 dreamina 在里面跑,
        用户能看到 device code 提示 + 完成浏览器授权,关窗口或登录完成进程退出。
        """
        cmd = self._get_dreamina_path()
        try:
            # Windows 弹独立 cmd 窗口(CREATE_NEW_CONSOLE = 0x00000010)
            # 这样 dreamina 的交互式输出能显示给用户,stdin 也能输入
            creationflags = 0
            if sys.platform == "win32":
                creationflags = subprocess.CREATE_NEW_CONSOLE
            process = await asyncio.create_subprocess_exec(
                cmd, "login",
                stdout=None,  # 让 dreamina 直接打到新建的 cmd 窗口
                stderr=None,
                stdin=None,
                creationflags=creationflags,
            )
            # 等待进程完成,设置较长超时(5分钟)
            return_code = await asyncio.wait_for(
                process.wait(), timeout=300
            )
            if return_code == 0:
                return {"success": True, "message": "登录成功"}
            else:
                return {"success": False, "message": f"登录命令返回错误码: {return_code}(可能是用户主动关闭了登录窗口)"}
        except asyncio.TimeoutError:
            return {"success": False, "message": "登录超时(5 分钟),请重试"}
        except Exception as e:
            return {"success": False, "message": f"{type(e).__name__}: {e}"}

    async def generate_video(self, prompt: str, duration: int = 5,
                            ratio: str = "16:9", resolution: str = "720P",
                            model_version: str = "seedance2.0fast",
                            poll: int = 0) -> dict:
        """文生视频 - 调用 dreamina text2video

        CLI 支持的 model_version:
        - seedance2.0_vip      (VIP标准版)
        - seedance2.0fast_vip  (VIP快速版)
        - seedance2.0fast      (快速版)
        - seedance2.0          (标准版)
        """
        # 清理 prompt 中的特殊 Unicode 字符，避免 Windows GBK 编码错误
        prompt = sanitize_unicode(prompt)
        args = [
            "text2video",
            f"--prompt={prompt}",
            f"--duration={duration}",
            f"--ratio={ratio}",
            f"--video_resolution={resolution}",
            f"--model_version={model_version}",
            f"--poll={poll}"
        ]
        # poll=0 提交不等待生成,但还是要给提交本身留足时间(网络登录/参数校验等)
        # ★ v3.59.56 修:之前 30s 太紧,网慢就 timeout → 用户已扣额度但本地报失败
        timeout = 90 if poll == 0 else poll + 30
        return await self._run_command(*args, timeout=timeout)

    async def generate_video_from_image(self, image_path: str, prompt: str,
                                         duration: int = 5, poll: int = 120) -> dict:
        """图生视频 - 调用 dreamina image2video"""
        # 清理 prompt 中的特殊 Unicode 字符，避免 Windows GBK 编码错误
        prompt = sanitize_unicode(prompt)
        args = [
            "image2video",
            f"--image={image_path}",
            f"--prompt={prompt}",
            f"--duration={duration}",
            f"--poll={poll}"
        ]
        return await self._run_command(*args, timeout=poll + 30)

    async def image2video(self, image: str, prompt: str, duration: int = 5,
                          model_version: str = "seedance2.0fast", poll: int = 0) -> dict:
        """图生视频（新版）"""
        # 清理 prompt 中的特殊 Unicode 字符，避免 Windows GBK 编码错误
        prompt = sanitize_unicode(prompt)
        args = [
            "image2video",
            f"--image={image}",
            f"--prompt={prompt}",
            f"--duration={duration}",
            f"--model_version={model_version}",
            f"--poll={poll}"
        ]
        # ★ v3.59.56:提交单图要上传 1 张图,30s 太紧,给 120s
        timeout = 120 if poll == 0 else poll + 30
        return await self._run_command(*args, timeout=timeout)

    async def multimodal2video(self, prompt: str, images: list = None,
                               audios: list = None, duration: int = 5,
                               ratio: str = "16:9", model_version: str = "seedance2.0fast",
                               poll: int = 0) -> dict:
        """多模态视频生成"""
        # 清理 prompt 中的特殊 Unicode 字符，避免 Windows GBK 编码错误
        prompt = sanitize_unicode(prompt)
        args = ["multimodal2video"]
        # 多个 --image 参数
        for img in (images or []):
            args.append(f"--image={img}")
        # 多个 --audio 参数
        for audio in (audios or []):
            args.append(f"--audio={audio}")
        if prompt:
            args.append(f"--prompt={prompt}")
        args.extend([
            f"--duration={duration}",
            f"--ratio={ratio}",
            f"--model_version={model_version}",
            f"--poll={poll}"
        ])
        # ★ v3.59.56:多模态最多上传 10 张图 + 3 段音频,提交时间随素材数量线性增长
        # 基础 90s + 每个素材 +20s = 单镜上限约 90+13×20=350s,够用了
        media_count = len(images or []) + len(audios or [])
        if poll == 0:
            timeout = 90 + media_count * 20
        else:
            timeout = poll + 30 + media_count * 20
        return await self._run_command(*args, timeout=timeout)

    async def query_result(self, submit_id: str, download_dir: str = None) -> dict:
        """查询异步任务结果"""
        args = ["query_result", f"--submit_id={submit_id}"]
        if download_dir:
            args.append(f"--download_dir={download_dir}")
        return await self._run_command(*args)

    async def list_tasks(self, status: str = None, submit_id: str = None) -> dict:
        """查看历史任务"""
        args = ["list_task"]
        if status:
            args.append(f"--gen_status={status}")
        if submit_id:
            args.append(f"--submit_id={submit_id}")
        return await self._run_command(*args)
