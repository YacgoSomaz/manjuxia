import asyncio
import json
import math
import os
import shutil
import logging
import re
import sys
import subprocess
import copy
import time
from urllib.parse import urlsplit

from utils.paths import is_frozen
from utils.unicode_utils import sanitize_unicode

logger = logging.getLogger(__name__)


class VideoService:
    _dreamina_cli_lock = None
    _dreamina_warmup_lock = None
    _dreamina_submit_warmed = False
    # OAuth 登录成功、能查询 user_credit，并不代表当前账号一定获准调用
    # dreamina_cli 生成接口。平台会对未开放账号返回固定权限错误；记住该状态，
    # 让 UI 不再把“已授权但无 CLI 权限”误显示成“已登录 | 余额 0”。
    _dreamina_cli_permission_denied_reason = ""
    _dreamina_oauth_registry_path = r"Software\BytedAuthClient\keychain\dreamina"

    def __init__(self):
        self._dreamina_path = None
        self._ffmpeg_path = None
        # user_credit 在打包环境通常需要 10~20 秒，并且会占用全局 CLI 锁。
        # 页面切换/重新挂载时短时间内会重复探活，因此只缓存已确认结果；
        # 真正的提交仍由 CLI 自身校验登录态，缓存仅用于 UI/提交前的轻量探活。
        self._login_cache_result = None
        self._login_cache_expires_at = 0.0
        self._login_check_lock = None

    def _get_login_check_lock(self):
        if self._login_check_lock is None:
            self._login_check_lock = asyncio.Lock()
        return self._login_check_lock

    def invalidate_login_cache(self) -> None:
        """登录/切换账号前清除旧探活结果，避免把旧账号状态带到新流程。"""
        self._login_cache_result = None
        self._login_cache_expires_at = 0.0

    @staticmethod
    def _is_oauth_refresh_failure(value) -> bool:
        """识别即梦 OAuth 本地旧凭证无法刷新的固定错误。

        CLI 的 ``login`` 会优先尝试刷新已有 token；旧 refresh token 被平台撤销时，
        它会直接以 code=10046 退出，甚至不会进入新的 Device Flow。v1.4.15 在
        少数机器上连 ``logout`` 都会在删除本地状态前被同一错误中断，因此还需
        精确移除 AuthSDK 在当前 Windows 用户注册表中的 ``dreamina`` OAuth 项，
        再启动新的 Device Flow。
        """
        text = str(value or "").strip().lower()
        return (
            ("authsdk" in text and "refresh failed" in text)
            or "protocol server: code=10046" in text
            or "protocol server: code = 10046" in text
        )

    @classmethod
    def _clear_dreamina_oauth_state(cls) -> dict:
        """只清除 AuthSDK 的 Dreamina OAuth 注册表项。

        v1.4.15 的 OAuth token 实际保存在当前 Windows 用户的
        ``HKCU\\Software\\BytedAuthClient\\keychain\\dreamina``。此前把
        ``~/.dreamina_cli/credential.json`` 误当成 OAuth token 会破坏 CLI 的
        本地签名配置，却无法清掉 10046。这里绝不再触碰 ``.dreamina_cli`` 下的
        credential、任务数据库、日志或生成记录。
        """
        if sys.platform != "win32":
            return {"success": True, "removed": False, "error": ""}

        try:
            import winreg

            def _delete_tree(path: str) -> bool:
                try:
                    with winreg.OpenKey(
                        winreg.HKEY_CURRENT_USER,
                        path,
                        0,
                        winreg.KEY_READ | winreg.KEY_WRITE,
                    ) as key:
                        children = []
                        index = 0
                        while True:
                            try:
                                children.append(winreg.EnumKey(key, index))
                                index += 1
                            except OSError:
                                break
                    for child in children:
                        _delete_tree(path + "\\" + child)
                    winreg.DeleteKey(winreg.HKEY_CURRENT_USER, path)
                    return True
                except FileNotFoundError:
                    return False

            removed = _delete_tree(cls._dreamina_oauth_registry_path)
            logger.info(
                "[dreamina-cli] AuthSDK OAuth 注册表状态已清理（dreamina=%s；CLI 本地配置保留）",
                "已删除" if removed else "原本不存在",
            )
            return {"success": True, "removed": removed, "error": ""}
        except Exception as exc:
            logger.error(
                "[dreamina-cli] 无法清除 AuthSDK OAuth 注册表状态: %s: %s",
                type(exc).__name__,
                exc,
            )
            return {
                "success": False,
                "removed": False,
                "error": "无法重置即梦 OAuth 登录状态，请关闭其他正在运行的造梦工坊后重试",
            }

    @staticmethod
    def _credit_total(data: dict) -> float:
        try:
            return float(data.get("total_credit") or 0)
        except (TypeError, ValueError):
            return 0.0

    @classmethod
    def _has_valid_cli_account_identity(cls, data) -> bool:
        """判断 user_credit 是否代表一个真实账号，而不是 CLI 的零值占位对象。"""
        if not isinstance(data, dict):
            return False
        raw_user_id = data.get("user_id")
        if raw_user_id not in (None, ""):
            try:
                return int(raw_user_id) > 0
            except (TypeError, ValueError):
                return False

        # 兼容旧版 CLI 未返回 user_id 的真实账号；零余额且无任何身份信息时
        # 必须 fail closed，不能再显示成“已授权”。
        return (
            cls._credit_total(data) > 0
            or bool(str(data.get("user_name") or "").strip())
            or bool(str(data.get("vip_level") or "").strip())
        )

    @classmethod
    def _is_incomplete_cli_account_result(cls, result: dict) -> bool:
        if not result or not result.get("success"):
            return False
        data = result.get("data")
        if not isinstance(data, dict):
            return False
        has_credit_shape = any(
            key in data
            for key in ("total_credit", "vip_credit", "gift_credit", "purchase_credit")
        )
        return has_credit_shape and not cls._has_valid_cli_account_identity(data)

    @staticmethod
    def _is_oauth_identity_failure(value) -> bool:
        text = str(value or "").strip().lower()
        return (
            "user_id is required" in text
            or "获取账户信息失败" in text
            or "failed to get user" in text
        )

    @classmethod
    def _is_cli_permission_denied_error(cls, value) -> bool:
        text = str(value or "").strip()
        low = text.lower()
        return (
            "current account is not allowed to use dreamina_cli" in low
            or "not allowed to use dreamina_cli" in low
            or "dreamina_cli permission" in low
            or ("dreamina_cli" in low and "permission denied" in low)
            or ("dreamina_cli" in low and "没有权限" in text)
            or "未开通即梦 cli 生成权限" in text.lower()
        )

    @classmethod
    def _mark_cli_permission_denied(cls, reason) -> None:
        if not cls._is_cli_permission_denied_error(reason):
            return
        cls._dreamina_cli_permission_denied_reason = str(reason or "")[:500]
        logger.warning("[dreamina-cli] 当前 OAuth 账号未开放 CLI 生成权限")

    @classmethod
    def _clear_cli_permission_denied(cls) -> None:
        cls._dreamina_cli_permission_denied_reason = ""

    @classmethod
    def _decorate_login_result(cls, result: dict) -> dict:
        """在不改 CLI 原始返回语义的前提下附加账号可用性状态。"""
        decorated = copy.deepcopy(result or {})
        data = decorated.get("data")
        if cls._is_incomplete_cli_account_result(decorated):
            # v1.4.15 在少数 Windows 机器上会出现：OAuth Device Flow 已明确
            # 成功，但紧随其后的 user_credit 只返回 user_id=0 的零值对象。
            # 官方 CLI 的登录契约以 login/relogin 的退出结果为准，user_credit
            # 只是余额查询；因此这里不能再把“账号信息未同步”硬判成未登录，
            # 否则会阻断本可由生成命令正常提交的账号。
            data["_identity_unverified"] = True
            data["_identity_unverified_message"] = (
                "网页授权已完成，但本机 CLI 未取得有效账号身份（user_id=0），"
                "因此无法读取真实余额；页面上的 0 不是账号实际余额。"
                "可尝试提交生成，最终以官方 CLI 的生成结果为准"
            )
            data["_cli_permission"] = "unknown"
            data["_cli_permission_message"] = data["_identity_unverified_message"]
            return decorated
        if not cls._is_logged_in_credit_result(decorated):
            return decorated
        if not isinstance(data, dict):
            return decorated
        if cls._dreamina_cli_permission_denied_reason:
            data["_cli_permission"] = "denied"
            data["_cli_permission_message"] = (
                "当前账号已完成网页授权，但即梦平台未给该账号开放 dreamina_cli 生成权限"
            )
        else:
            total_credit = cls._credit_total(data)
            # 余额为 0 只能证明 CLI 返回了授权账号，不能据此宣称生成权限可用。
            data["_cli_permission"] = "available" if total_credit > 0 else "unknown"
            if total_credit <= 0:
                data["_cli_permission_message"] = (
                    "已完成网页授权，但 CLI 返回余额为 0；生成权限尚未验证"
                )
        return decorated

    @classmethod
    def _get_cli_lock(cls):
        if cls._dreamina_cli_lock is None:
            cls._dreamina_cli_lock = asyncio.Lock()
        return cls._dreamina_cli_lock

    @classmethod
    def _get_warmup_lock(cls):
        if cls._dreamina_warmup_lock is None:
            cls._dreamina_warmup_lock = asyncio.Lock()
        return cls._dreamina_warmup_lock

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

    async def extract_frame_at(self, video_path: str, output_path: str,
                               seconds: float,
                               timeout: int = 30) -> bool:
        """Extract one frame at an explicit timestamp for user-selected frames."""
        if not os.path.exists(video_path):
            logger.warning(f"[extract_frame_at] 视频文件不存在: {video_path}")
            return False
        try:
            target_seconds = float(seconds)
            if not math.isfinite(target_seconds) or target_seconds < 0:
                raise ValueError("timestamp must be non-negative")
        except (TypeError, ValueError):
            logger.warning(f"[extract_frame_at] 非法时间点: {seconds!r}")
            return False

        ffmpeg = self._get_ffmpeg_path()
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        args = [
            "-y",
            "-ss", f"{target_seconds:.3f}",
            "-i", video_path,
            "-map", "0:v:0",
            "-frames:v", "1",
            "-q:v", "2",
            output_path,
        ]
        logger.info(f"[extract_frame_at] {ffmpeg} {' '.join(args)}")
        process = None
        try:
            process = await asyncio.create_subprocess_exec(
                ffmpeg, *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
            if process.returncode != 0:
                err_text = (stderr or b"").decode("utf-8", errors="replace")[:500]
                logger.warning(
                    f"[extract_frame_at] ffmpeg 返回码 {process.returncode}: {err_text}"
                )
                return False
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                logger.warning(f"[extract_frame_at] 输出文件不存在或为空: {output_path}")
                return False
            logger.info(
                f"[extract_frame_at] 成功: t={target_seconds:.3f}s {output_path} "
                f"({os.path.getsize(output_path)} bytes)"
            )
            return True
        except asyncio.TimeoutError:
            logger.error(f"[extract_frame_at] ffmpeg 超时({timeout}s): {video_path}")
            if process is not None:
                try:
                    process.kill()
                    await process.communicate()
                except Exception:
                    pass
            return False
        except FileNotFoundError:
            logger.error(f"[extract_frame_at] ffmpeg 二进制不存在: {ffmpeg}")
            return False
        except Exception as exc:
            logger.exception(f"[extract_frame_at] 抽帧异常: {exc}")
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
        lock = self._get_cli_lock()
        if lock.locked():
            logger.debug(f"[dreamina-cli] 等待上一条 CLI 命令完成: {args[0] if args else ''}")
        async with lock:
            return await self._run_command_unlocked(*args, timeout=timeout)

    async def _run_command_unlocked(self, *args, timeout=120) -> dict:
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
                    self._mark_cli_permission_denied(
                        _rc_obj.get("fail_reason") or _rc_obj.get("guidance") or ""
                    )
                    logger.warning(
                        f"[dreamina-cli] cmd={args[0]} returncode={process.returncode} 但 stdout 含 submit_id="
                        f"{_rc_obj.get('submit_id')} gen_status={_rc_obj.get('gen_status')!r} "
                        f"→ 视为已受理,交上层轮询(避免误判失败+重复提交)"
                    )
                    return {"success": True, "data": _rc_obj}
                command_error = err_text or output
                self._mark_cli_permission_denied(command_error)
                return {"success": False, "error": command_error}

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
                        self._mark_cli_permission_denied(
                            result.get("fail_reason") or result.get("guidance") or ""
                        )
                        logger.warning(
                            f"[dreamina-cli] cmd={args[0]} 提交即失败 gen_status=fail "
                            f"fail_reason={result.get('fail_reason')!r} "
                            f"guidance={result.get('guidance')!r}"
                        )
                    elif gs:
                        logger.info(f"[dreamina-cli] cmd={args[0]} gen_status={gs} submit_id={result.get('submit_id')}")
                    if result.get("submit_id") and gs != "fail":
                        # 同一进程内账号若已能成功提交，清掉此前账号留下的拒绝快照。
                        self._clear_cli_permission_denied()
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

    async def check_login(self, force: bool = False) -> dict:
        """检查登录状态并返回余额信息。

        成功登录缓存 90 秒，明确未登录缓存 5 秒；命令超时/异常不覆盖最近一次
        已确认结果。这样路由切换不会反复排队执行 user_credit，也不会因为一次
        临时 CLI 错误把界面误判成退出登录。
        """
        now = time.monotonic()
        if (
            not force
            and self._login_cache_result is not None
            and now < self._login_cache_expires_at
        ):
            return self._decorate_login_result(self._login_cache_result)

        async with self._get_login_check_lock():
            now = time.monotonic()
            if (
                not force
                and self._login_cache_result is not None
                and now < self._login_cache_expires_at
            ):
                return self._decorate_login_result(self._login_cache_result)

            result = await self._run_command("user_credit")
            if self._is_logged_in_credit_result(result):
                self._login_cache_result = copy.deepcopy(result)
                self._login_cache_expires_at = time.monotonic() + 90.0
            elif result.get("success"):
                # CLI 正常返回但没有积分字段，可短暂视为已确认未登录；不要长缓存，
                # 用户刚在浏览器完成授权时应很快能重新检测到。
                self._login_cache_result = copy.deepcopy(result)
                self._login_cache_expires_at = time.monotonic() + 5.0
            # 执行失败属于瞬态错误：返回错误给本次调用方，但保留旧缓存快照，
            # 避免网络抖动/CLI 锁等待导致 UI 从“已登录”跳成“未登录”。
            return self._decorate_login_result(result)

    @classmethod
    def _is_logged_in_credit_result(cls, result: dict) -> bool:
        """service 层 check_login 返回 CLI 原始结构,不是 API 层的 logged_in 包装。"""
        if not result or not result.get("success"):
            return False
        data = result.get("data")
        return (
            isinstance(data, dict)
            and any(
                key in data
                for key in ("total_credit", "vip_credit", "gift_credit", "purchase_credit")
            )
            and cls._has_valid_cli_account_identity(data)
        )

    async def _ensure_submit_warmed(self) -> None:
        """首次真正提交视频前预热 dreamina CLI。

        工具启动后前端会自动查登录/余额;用户也可能立刻提交视频。旧逻辑允许
        多个 dreamina.exe 并发触碰同一套本地登录/任务缓存,首个视频提交偶发
        拿到 submit_id/querying,但即梦后台没有真实任务。提交前
        串行跑一次轻量命令,让 CLI 登录态和任务列表初始化完成。
        """
        cls = type(self)
        if cls._dreamina_submit_warmed:
            return
        async with self._get_warmup_lock():
            if cls._dreamina_submit_warmed:
                return
            logger.info("[dreamina-cli] 首次视频提交前预热: user_credit + list_task")
            credit = await self._run_command("user_credit", timeout=60)
            if not credit.get("success"):
                logger.warning(f"[dreamina-cli] 预热 user_credit 失败,仍继续提交: {credit.get('error')}")
            tasks = await self._run_command("list_task", "--limit=1", timeout=60)
            if not tasks.get("success"):
                logger.warning(f"[dreamina-cli] 预热 list_task 失败,仍继续提交: {tasks.get('error')}")
            cls._dreamina_submit_warmed = True

    @staticmethod
    def _extract_jimeng_oauth_url(text: str) -> str:
        """从 CLI Device Flow 输出中提取官方授权地址，不记录临时 code。"""
        if not text:
            return ""
        clean = re.sub(r"\x1b\[[0-9;]*m", "", text).strip()
        patterns = (
            r"verification_uri\s*[:=]\s*(https://[^\s\"'<>]+)",
            r"(https://jimeng\.jianying\.com/ai_tool/cli-auth[^\s\"'<>]*)",
        )
        for pattern in patterns:
            match = re.search(pattern, clean, flags=re.IGNORECASE)
            if not match:
                continue
            url = match.group(1).rstrip(".,;，。")
            try:
                parsed = urlsplit(url)
            except ValueError:
                continue
            hostname = (parsed.hostname or "").lower()
            if parsed.scheme == "https" and (
                hostname == "jimeng.jianying.com"
                or hostname.endswith(".jimeng.jianying.com")
            ):
                return url
        return ""

    @staticmethod
    def _safe_oauth_cli_line(text: str) -> str:
        """过滤 OAuth 临时凭证，避免 user/device code 进入应用日志。"""
        clean = re.sub(r"\x1b\[[0-9;]*m", "", text or "").strip()
        lowered = clean.lower()
        sensitive_markers = (
            "verification_uri",
            "user_code",
            "device_code",
            "access_token",
            "refresh_token",
        )
        if any(marker in lowered for marker in sensitive_markers):
            return ""
        return clean[:500]

    @staticmethod
    def _private_browser_args(executable: str, url: str) -> list:
        """为常见 Windows 浏览器构造独立隐私窗口参数，避免沿用旧账号 Cookie。"""
        browser = os.path.basename(str(executable or "")).lower()
        if browser in {"msedge.exe", "msedge"}:
            return [executable, "--inprivate", "--new-window", url]
        if browser in {"chrome.exe", "chrome", "brave.exe", "brave", "vivaldi.exe", "vivaldi"}:
            return [executable, "--incognito", "--new-window", url]
        if browser in {"firefox.exe", "firefox"}:
            return [executable, "-private-window", url]
        if browser in {"opera.exe", "opera"}:
            return [executable, "--private", url]
        return []

    @staticmethod
    def _windows_browser_candidates() -> list:
        """返回默认浏览器优先的可执行文件候选，不执行任何外部命令。"""
        candidates = []
        if sys.platform != "win32":
            return candidates
        try:
            import winreg

            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice",
            ) as key:
                prog_id = winreg.QueryValueEx(key, "ProgId")[0]
            with winreg.OpenKey(
                winreg.HKEY_CLASSES_ROOT,
                rf"{prog_id}\shell\open\command",
            ) as key:
                command = os.path.expandvars(str(winreg.QueryValue(key, None) or ""))
            quoted = re.match(r'^\s*"([^"]+\.exe)"', command, flags=re.IGNORECASE)
            plain = re.match(r"^\s*([^\s]+\.exe)", command, flags=re.IGNORECASE)
            executable = (quoted or plain).group(1) if (quoted or plain) else ""
            if executable:
                candidates.append(executable)
        except Exception:
            pass

        # Edge 是 Windows 10/11 的稳定兜底；其次才找其他常见 Chromium/Firefox。
        env_roots = [
            os.environ.get("PROGRAMFILES(X86)"),
            os.environ.get("PROGRAMFILES"),
            os.environ.get("LOCALAPPDATA"),
        ]
        relative_paths = [
            r"Microsoft\Edge\Application\msedge.exe",
            r"Google\Chrome\Application\chrome.exe",
            r"BraveSoftware\Brave-Browser\Application\brave.exe",
            r"Mozilla Firefox\firefox.exe",
        ]
        for root in env_roots:
            if not root:
                continue
            for relative in relative_paths:
                candidates.append(os.path.join(root, relative))

        unique = []
        seen = set()
        for candidate in candidates:
            normalized = os.path.normcase(os.path.abspath(str(candidate)))
            if normalized in seen or not os.path.isfile(candidate):
                continue
            seen.add(normalized)
            unique.append(candidate)
        return unique

    @staticmethod
    def _open_jimeng_oauth_url(url: str, force_fresh_account: bool = False) -> bool:
        """打开经过域名白名单校验的即梦授权页。

        普通登录复用系统默认浏览器；切换账号改用隐私窗口，避免浏览器旧 Cookie
        让 OAuth 页面直接授权原账号、用户却没有任何切换入口。
        """
        if not VideoService._extract_jimeng_oauth_url(
            f"verification_uri: {url}"
        ):
            raise ValueError("即梦授权地址未通过安全校验")
        if force_fresh_account and sys.platform == "win32":
            for executable in VideoService._windows_browser_candidates():
                args = VideoService._private_browser_args(executable, url)
                if not args:
                    continue
                try:
                    subprocess.Popen(
                        args,
                        stdin=subprocess.DEVNULL,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                    )
                    logger.info("[dreamina-cli] 已用浏览器隐私窗口打开切换账号授权页")
                    return True
                except Exception as exc:
                    logger.warning(
                        "[dreamina-cli] 浏览器隐私窗口启动失败(%s): %s",
                        os.path.basename(executable),
                        type(exc).__name__,
                    )
        if sys.platform == "win32" and hasattr(os, "startfile"):
            os.startfile(url)  # type: ignore[attr-defined]
            return True
        import webbrowser
        return bool(webbrowser.open(url, new=2))

    async def _run_jimeng_oauth_command(
        self,
        command: str,
        timeout: int = 300,
        force_fresh_account: bool = False,
    ) -> dict:
        """后台运行 OAuth Device Flow，并自动打开浏览器，不显示命令行窗口。"""
        cmd = self._get_dreamina_path()
        process = None
        reader_task = None
        browser_opened = False
        browser_open_error = ""
        safe_output = []

        async with self._get_cli_lock():
            try:
                creationflags = 0
                if sys.platform == "win32":
                    creationflags = subprocess.CREATE_NO_WINDOW
                process = await asyncio.create_subprocess_exec(
                    cmd,
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    stdin=asyncio.subprocess.DEVNULL,
                    creationflags=creationflags,
                )

                async def _consume_output() -> None:
                    nonlocal browser_opened, browser_open_error
                    if process is None or process.stdout is None:
                        return
                    while True:
                        raw_line = await process.stdout.readline()
                        if not raw_line:
                            break
                        line = raw_line.decode("utf-8", errors="replace").strip()
                        oauth_url = self._extract_jimeng_oauth_url(line)
                        if oauth_url and not browser_opened:
                            try:
                                browser_opened = self._open_jimeng_oauth_url(
                                    oauth_url,
                                    force_fresh_account=force_fresh_account,
                                )
                                if browser_opened:
                                    logger.info("[dreamina-cli] 已自动打开即梦 OAuth 授权页")
                            except Exception as exc:
                                # 异常文本可能回显含临时 user_code 的 URL，不写入日志/接口。
                                browser_open_error = (
                                    f"{type(exc).__name__}: 无法调用系统默认浏览器"
                                )
                                logger.warning(
                                    "[dreamina-cli] 自动打开 OAuth 授权页失败: %s",
                                    browser_open_error,
                                )
                        safe_line = self._safe_oauth_cli_line(line)
                        if safe_line:
                            safe_output.append(safe_line)
                            if len(safe_output) > 20:
                                del safe_output[:-20]

                reader_task = asyncio.create_task(_consume_output())
                return_code = await asyncio.wait_for(process.wait(), timeout=timeout)
                await asyncio.wait_for(reader_task, timeout=5)
                return {
                    "return_code": return_code,
                    "browser_opened": browser_opened,
                    "browser_open_error": browser_open_error,
                    "safe_output": "\n".join(safe_output[-5:]),
                }
            except asyncio.TimeoutError:
                if process is not None and process.returncode is None:
                    try:
                        process.kill()
                        await process.wait()
                    except Exception:
                        pass
                if reader_task is not None and not reader_task.done():
                    reader_task.cancel()
                    await asyncio.gather(reader_task, return_exceptions=True)
                return {
                    "return_code": None,
                    "browser_opened": browser_opened,
                    "browser_open_error": browser_open_error,
                    "safe_output": "\n".join(safe_output[-5:]),
                    "timed_out": True,
                }
            except Exception as exc:
                if reader_task is not None and not reader_task.done():
                    reader_task.cancel()
                    await asyncio.gather(reader_task, return_exceptions=True)
                return {
                    "return_code": None,
                    "browser_opened": browser_opened,
                    "browser_open_error": browser_open_error,
                    "safe_output": "\n".join(safe_output[-5:]),
                    "error": f"{type(exc).__name__}: {exc}",
                }

    async def _confirm_completed_oauth_account(self, oauth_result: dict) -> dict:
        """OAuth 页面成功后，再以 user_credit 的真实账号身份做最终确认。"""
        status = await self.check_login(force=True)
        if self._is_logged_in_credit_result(status):
            return {"success": True, "status": status}

        detail = oauth_result.get("safe_output") or oauth_result.get("error") or ""
        if (
            self._is_oauth_identity_failure(detail)
            or self._is_incomplete_cli_account_result(status)
        ):
            return {
                "success": True,
                "identity_unverified": True,
                "message": (
                    "即梦网页授权成功，但本机 CLI 未取得有效账号身份（user_id=0），"
                    "真实余额未知；可尝试提交生成，最终以官方 CLI 的生成结果为准"
                ),
            }

        status_error = str(status.get("error") or "").strip()
        if status_error:
            return {
                "success": False,
                "transient": True,
                "message": f"网页授权完成，但账号状态校验失败：{status_error}",
            }
        return {
            "success": True,
            "identity_unverified": True,
            "message": (
                "网页授权完成，但本机 CLI 未返回可识别的账号身份，真实余额未知；"
                "可尝试提交生成"
            ),
        }

    async def relogin(self) -> dict:
        """切换即梦账号：官方 logout + 重置 AuthSDK OAuth + 隐私窗口授权。

        dreamina v1.4.15 在少数机器的损坏/过期 refresh token 上，直接执行
        ``relogin`` 仍会先触发 refresh 并报 code=10046，导致它声称会清理凭证
        却根本进不了 Device Flow。即使拆成 ``logout`` + ``login``，失败的 logout
        也可能留下注册表 token；所以必须在两条命令之间精确移除 AuthSDK 的
        dreamina OAuth 项，同时保留 ``.dreamina_cli/credential.json``。
        """
        self.invalidate_login_cache()
        self._clear_cli_permission_denied()
        type(self)._dreamina_submit_warmed = False
        logout_result = await self._run_jimeng_oauth_command("logout", timeout=60)
        logout_detail = logout_result.get("safe_output") or logout_result.get("error") or ""
        if logout_result.get("return_code") != 0:
            logger.warning(
                "[dreamina-cli] 切换账号时 logout 未正常返回，将直接重置 AuthSDK OAuth 状态: %s",
                logout_detail[:300],
            )
        clear_result = self._clear_dreamina_oauth_state()
        if not clear_result.get("success"):
            return {
                "success": False,
                "message": clear_result.get("error") or "无法清除旧的即梦登录凭据",
            }
        result = await self._run_jimeng_oauth_command(
            "login",
            force_fresh_account=True,
        )
        if result.get("timed_out"):
            return {"success": False, "message": "切换账号超时（5分钟）"}
        if result.get("error"):
            return {"success": False, "message": result["error"]}
        return_code = result.get("return_code")
        if return_code == 0:
            confirmed = await self._confirm_completed_oauth_account(result)
            if confirmed.get("success"):
                if confirmed.get("identity_unverified"):
                    return confirmed
                return {"success": True, "message": "切换账号成功，账号身份校验通过"}
            return confirmed
        status = await self.check_login(force=True)
        if self._is_logged_in_credit_result(status):
            return {"success": True, "message": "切换账号已完成，登录状态检查通过"}
        if self._is_incomplete_cli_account_result(status):
            return {
                "success": False,
                "auth_incomplete": True,
                "needs_relogin": True,
                "message": "网页授权完成，但 CLI 返回了 user_id=0，当前登录态不可用",
            }
        detail = result.get("safe_output") or result.get("browser_open_error") or ""
        suffix = f"：{detail}" if detail else ""
        return {"success": False, "message": f"切换账号命令返回错误码: {return_code}{suffix}"}

    async def login(self) -> dict:
        """后台启动即梦 CLI OAuth，并自动打开系统默认浏览器。"""
        self.invalidate_login_cache()
        self._clear_cli_permission_denied()
        type(self)._dreamina_submit_warmed = False
        result = await self._run_jimeng_oauth_command("login")
        auto_reset_stale_token = False
        first_detail = result.get("safe_output") or result.get("error") or ""
        if self._is_oauth_refresh_failure(first_detail):
            # login 会优先刷新旧 token；10046 表示该 token 已被平台拒绝。
            # 不能只调用 relogin/logout：v1.4.15 在少数机器上会在删除本地文件前
            # 再次 refresh 并报 10046。必须精确删除 AuthSDK 注册表 OAuth 项后
            # 再 login；不能删除 .dreamina_cli/credential.json。
            logger.warning(
                "[dreamina-cli] 旧 OAuth refresh token 已失效(code=10046)，自动重置并重新授权"
            )
            self.invalidate_login_cache()
            logout_result = await self._run_jimeng_oauth_command("logout", timeout=60)
            logout_detail = logout_result.get("safe_output") or logout_result.get("error") or ""
            if logout_result.get("return_code") != 0:
                logger.warning(
                    "[dreamina-cli] 10046 自愈 logout 未正常返回，将直接重置 AuthSDK OAuth 状态: %s",
                    logout_detail[:300],
                )
            clear_result = self._clear_dreamina_oauth_state()
            if not clear_result.get("success"):
                return {
                    "success": False,
                    "message": clear_result.get("error") or "无法清除失效的即梦登录凭据",
                }
            result = await self._run_jimeng_oauth_command("login")
            auto_reset_stale_token = True
        if result.get("timed_out"):
            message = (
                "旧 OAuth 状态已自动清除，但重新授权超时(5 分钟)，请再次点击登录"
                if auto_reset_stale_token
                else "登录超时(5 分钟),请重试"
            )
            return {"success": False, "message": message}
        if result.get("error"):
            prefix = "旧 OAuth 状态已自动清除，但重新授权失败：" if auto_reset_stale_token else ""
            return {"success": False, "message": f"{prefix}{result['error']}"}
        return_code = result.get("return_code")
        if return_code == 0:
            confirmed = await self._confirm_completed_oauth_account(result)
            if not confirmed.get("success"):
                return confirmed
            if confirmed.get("identity_unverified"):
                return confirmed
            return {
                "success": True,
                "message": (
                    "旧登录状态已自动重置，登录成功且账号身份校验通过"
                    if auto_reset_stale_token
                    else "登录成功，账号身份校验通过"
                ),
            }
        status = await self.check_login(force=True)
        if self._is_logged_in_credit_result(status):
            return {"success": True, "message": "登录已完成，登录状态检查通过"}
        if self._is_incomplete_cli_account_result(status):
            return {
                "success": False,
                "auth_incomplete": True,
                "needs_relogin": True,
                "message": "网页授权完成，但 CLI 返回了 user_id=0，当前登录态不可用",
            }
        detail = result.get("safe_output") or result.get("browser_open_error") or ""
        suffix = f"：{detail}" if detail else ""
        prefix = "旧 OAuth 状态已自动清除，但重新授权仍失败；" if auto_reset_stale_token else ""
        return {
            "success": False,
            "message": f"{prefix}登录命令返回错误码: {return_code}{suffix}",
        }

    @staticmethod
    def _normalize_jimeng_video_params(
        model_version: str,
        duration: int,
        resolution: str,
    ) -> tuple[str, int, str]:
        """Normalize the strict Dreamina CLI v1.4.15 video enums.

        The CLI no longer silently accepts legacy resolution spellings or
        out-of-range durations. Keep the compatibility fallback here so old
        localStorage/config rows cannot break a paid submit after upgrading the
        bundled binary.
        """
        from services.video_model_capabilities import (
            canonical_video_model_name,
            get_video_model_capabilities,
        )

        canonical_model = canonical_video_model_name(model_version, "jimeng")
        capabilities = get_video_model_capabilities(canonical_model, "jimeng")
        min_duration = int(capabilities.get("min_duration_seconds") or 4)
        max_duration = int(capabilities.get("max_duration_seconds") or 15)
        try:
            normalized_duration = int(round(float(duration)))
        except (TypeError, ValueError):
            normalized_duration = min_duration
        normalized_duration = min(max_duration, max(min_duration, normalized_duration))

        normalized_resolution = str(resolution or "720p").strip().lower()
        model_key = str(canonical_model or "").strip().lower()
        if model_key == "seedance2.5":
            allowed_resolutions = ("480p", "720p")
        elif model_key == "seedance2.0_vip":
            allowed_resolutions = ("720p", "1080p", "4k")
        else:
            allowed_resolutions = ("720p",)
        if normalized_resolution not in allowed_resolutions:
            logger.warning(
                "[dreamina-cli] model=%s resolution=%s unsupported; using 720p",
                canonical_model,
                resolution,
            )
            normalized_resolution = "720p"
        return canonical_model, normalized_duration, normalized_resolution

    async def generate_video(self, prompt: str, duration: int = 5,
                            ratio: str = "16:9", resolution: str = "720P",
                            model_version: str = "seedance2.0fast",
                            poll: int = 0) -> dict:
        """文生视频 - 调用 dreamina text2video

        CLI 支持的 model_version:
        - seedance2.5          (2.5, 4-30秒,480p/720p)
        - seedance2.0_vip      (VIP标准版)
        - seedance2.0fast_vip  (VIP快速版)
        - seedance2.0fast      (快速版)
        - seedance2.0          (标准版)
        """
        if poll == 0:
            await self._ensure_submit_warmed()
        model_version, duration, resolution = self._normalize_jimeng_video_params(
            model_version,
            duration,
            resolution,
        )
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
        if poll == 0:
            await self._ensure_submit_warmed()
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
                          resolution: str = "720p",
                          model_version: str = "seedance2.0fast", poll: int = 0) -> dict:
        """图生视频（新版）"""
        if poll == 0:
            await self._ensure_submit_warmed()
        model_version, duration, resolution = self._normalize_jimeng_video_params(
            model_version,
            duration,
            resolution,
        )
        # 清理 prompt 中的特殊 Unicode 字符，避免 Windows GBK 编码错误
        prompt = sanitize_unicode(prompt)
        args = [
            "image2video",
            f"--image={image}",
            f"--prompt={prompt}",
            f"--duration={duration}",
            f"--video_resolution={resolution}",
            f"--model_version={model_version}",
            f"--poll={poll}"
        ]
        # ★ v3.59.56:提交单图要上传 1 张图,30s 太紧,给 120s
        timeout = 120 if poll == 0 else poll + 30
        return await self._run_command(*args, timeout=timeout)

    async def frames2video(self, first: str, last: str, prompt: str,
                           duration: int = 5, resolution: str = "720p",
                           model_version: str = "seedance2.0_vip",
                           poll: int = 0) -> dict:
        """首尾帧视频 - 调用 Dreamina CLI frames2video。"""
        if poll == 0:
            await self._ensure_submit_warmed()
        model_version, duration, resolution = self._normalize_jimeng_video_params(
            model_version,
            duration,
            resolution,
        )
        prompt = sanitize_unicode(prompt)
        args = [
            "frames2video",
            f"--first={first}",
            f"--last={last}",
            f"--prompt={prompt}",
            f"--duration={duration}",
            f"--video_resolution={resolution}",
            f"--model_version={model_version}",
            f"--poll={poll}",
        ]
        timeout = 150 if poll == 0 else poll + 60
        return await self._run_command(*args, timeout=timeout)

    async def multimodal2video(self, prompt: str, images: list = None,
                               audios: list = None, videos: list = None, duration: int = 5,
                               ratio: str = "16:9", resolution: str = "720p",
                               model_version: str = "seedance2.0fast",
                               poll: int = 0) -> dict:
        """多模态视频生成"""
        if poll == 0:
            await self._ensure_submit_warmed()
        model_version, duration, video_resolution = self._normalize_jimeng_video_params(
            model_version,
            duration,
            resolution,
        )
        # 清理 prompt 中的特殊 Unicode 字符，避免 Windows GBK 编码错误
        prompt = sanitize_unicode(prompt)
        args = ["multimodal2video"]
        # 多个 --image 参数
        for img in (images or []):
            args.append(f"--image={img}")
        # 多个 --video 参数
        for video in (videos or []):
            args.append(f"--video={video}")
        # 多个 --audio 参数
        for audio in (audios or []):
            args.append(f"--audio={audio}")
        if prompt:
            args.append(f"--prompt={prompt}")
        args.extend([
            f"--duration={duration}",
            f"--ratio={ratio}",
            f"--video_resolution={video_resolution}",
            f"--model_version={model_version}",
            f"--poll={poll}"
        ])
        # ★ v3.59.56:多模态提交时间随素材数量线性增长
        # v1.4.15:2.0 最多总计 12 个素材;2.5 最多 50 个素材。
        media_count = len(images or []) + len(videos or []) + len(audios or [])
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

    async def list_tasks(
        self,
        status: str = None,
        submit_id: str = None,
        limit: int = None,
        offset: int = None,
    ) -> dict:
        """查看历史任务"""
        args = ["list_task"]
        if status:
            args.append(f"--gen_status={status}")
        if submit_id:
            args.append(f"--submit_id={submit_id}")
        if limit is not None:
            args.append(f"--limit={int(limit)}")
        if offset is not None:
            args.append(f"--offset={int(offset)}")
        return await self._run_command(*args)
