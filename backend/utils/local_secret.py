"""v3.61.70 本机签名 + sqlite 加密 的密钥派生
- session_secret: 32 字节随机,backend 进程启动时写文件,Electron 读了通过 IPC 给前端
- device_key: 跟机器绑死的 AES key,基于 machine fingerprint 派生,用来加密 sqlite content
"""
import os
import secrets
import hashlib
import logging
from utils.paths import get_data_dir, get_runtime_file_override


logger = logging.getLogger(__name__)

_SESSION_SECRET_CACHE: bytes | None = None
_DEVICE_KEY_CACHE: bytes | None = None


def _session_secret_file() -> str:
    override = get_runtime_file_override(
        "WANSHAN_SESSION_SECRET_FILE",
        "--wanshan-session-secret-file",
    )
    if override:
        return override
    return os.path.join(get_data_dir(), "backend.session")


def get_or_create_session_secret() -> bytes:
    """启动时生成 32 字节 secret,写文件。
    后续 IPC / 前端拉的就是这个 secret(hex 字符串形式)。
    每次 backend 重启换一次 → 老 token 自动失效。
    """
    global _SESSION_SECRET_CACHE
    if _SESSION_SECRET_CACHE is not None:
        return _SESSION_SECRET_CACHE

    secret = secrets.token_bytes(32)
    path = _session_secret_file()
    try:
        with open(path, "wb") as f:
            f.write(secret)
        # Windows 上 chmod 0600 不强,但留着;Linux/Mac 严格生效
        try:
            os.chmod(path, 0o600)
        except Exception:
            pass
        logger.info(f"[local-secret] session secret 已写入 {path} ({len(secret)}B)")
    except Exception as e:
        logger.warning(f"[local-secret] 写 session secret 文件失败: {e},仅内存模式")

    _SESSION_SECRET_CACHE = secret
    return secret


def get_session_secret_hex() -> str:
    """Electron / 前端要的 hex 形式"""
    return get_or_create_session_secret().hex()


def _machine_fingerprint() -> str:
    """获取机器指纹用于派生 device_key
    Windows: 用 motherboard UUID(wmic) 或者 MachineGuid(注册表)
    Linux: /etc/machine-id
    Mac: ioreg
    都失败 → fallback 用 hostname + 数据目录路径(不绑死,但好歹有点 ID)
    """
    import platform
    sys_name = platform.system()
    try:
        if sys_name == "Windows":
            # 注册表 MachineGuid 最稳
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as key:
                guid, _ = winreg.QueryValueEx(key, "MachineGuid")
                return f"win:{guid}"
        elif sys_name == "Linux":
            with open("/etc/machine-id", "r") as f:
                return f"linux:{f.read().strip()}"
        elif sys_name == "Darwin":
            import subprocess
            out = subprocess.check_output(["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"], timeout=5).decode()
            for line in out.split("\n"):
                if "IOPlatformUUID" in line:
                    return f"mac:{line.split('=')[1].strip().strip('\"')}"
    except Exception as e:
        logger.warning(f"[local-secret] 取 machine fingerprint 失败({sys_name}): {e}")

    # Fallback
    import socket
    return f"fallback:{socket.gethostname()}:{get_data_dir()}"


def get_device_key() -> bytes:
    """派生 device_key(32 字节,用于 AES-GCM 加密 sqlite content)
    HKDF-SHA256: 输入 = machine_fingerprint + 固定盐
    机器变 → key 变 → 拷 db 到别人电脑解不开
    """
    global _DEVICE_KEY_CACHE
    if _DEVICE_KEY_CACHE is not None:
        return _DEVICE_KEY_CACHE

    fp = _machine_fingerprint()
    salt = b"wanshan-template-store-v1"
    # 用 PBKDF2 派生(轻量,不需要 cryptography 的 HKDF)
    key = hashlib.pbkdf2_hmac("sha256", fp.encode("utf-8"), salt, 100_000, dklen=32)
    _DEVICE_KEY_CACHE = key
    logger.info(f"[local-secret] device key 已派生(fingerprint 来源: {fp.split(':')[0]})")
    return key
