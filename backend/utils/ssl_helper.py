"""SSL helper - v3.61.37
打包后(PyInstaller frozen)的 Python 找不到系统根证书 → aiohttp/requests 调 https 全部
SSL_CERTIFICATE_VERIFY_FAILED。这里强制用 certifi 自带的 Mozilla CA bundle。

用法:
    from utils.ssl_helper import get_ssl_context, get_aiohttp_connector
    async with aiohttp.ClientSession(connector=get_aiohttp_connector()) as session:
        ...

为什么不直接 ssl=False:那等于关掉证书验证,被中间人劫持了也察觉不到 — 走 certifi 才安全。
"""
import os
import ssl
import sys
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_ca_bundle_path() -> str:
    """找一份可用的 CA bundle,优先级:
    1) 环境变量 SSL_CERT_FILE / REQUESTS_CA_BUNDLE(用户/运维显式指定)
    2) certifi 包里的 cacert.pem(打包后通常也在 _MEIPASS/certifi/cacert.pem)
    3) 系统证书(linux /etc/ssl/certs/ca-certificates.crt 等)
    都找不到 → 返回空字符串,让 ssl 走默认行为(可能失败,我们至少 log 出来)
    """
    # 1. 用户环境变量优先
    for env_key in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE"):
        v = os.environ.get(env_key)
        if v and os.path.exists(v):
            logger.info(f"[ssl] 用环境变量 {env_key} = {v}")
            return v

    # 2. certifi
    try:
        import certifi
        path = certifi.where()
        if path and os.path.exists(path):
            logger.info(f"[ssl] 用 certifi CA bundle: {path}")
            return path
    except Exception as e:
        logger.warning(f"[ssl] certifi 不可用: {e}")

    # 3. PyInstaller _MEIPASS 兜底(certifi 应该被 hook 自动收进去,这里多查一层)
    if hasattr(sys, "_MEIPASS"):
        cand = os.path.join(sys._MEIPASS, "certifi", "cacert.pem")
        if os.path.exists(cand):
            logger.info(f"[ssl] 用 _MEIPASS certifi: {cand}")
            return cand

    # 4. 系统常见位置
    for cand in (
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/tls/certs/ca-bundle.crt",
        "/usr/local/share/certs/ca-root-nss.crt",
    ):
        if os.path.exists(cand):
            logger.info(f"[ssl] 用系统 CA bundle: {cand}")
            return cand

    logger.error("[ssl] 找不到任何 CA bundle — HTTPS 调用可能 SSL 验证失败")
    return ""


@lru_cache(maxsize=1)
def get_ssl_context() -> ssl.SSLContext:
    """返回带 certifi CA bundle 的 SSLContext,所有 https 调用共用一个"""
    ctx = ssl.create_default_context()
    cafile = _get_ca_bundle_path()
    if cafile:
        try:
            ctx.load_verify_locations(cafile=cafile)
        except Exception as e:
            logger.warning(f"[ssl] 加载 CA bundle 失败: {cafile} {e}")
    return ctx


def get_aiohttp_connector(**kwargs):
    """返回带 certifi SSLContext 的 aiohttp.TCPConnector
    用法: aiohttp.ClientSession(connector=get_aiohttp_connector(), ...)
    注意:Connector 实例会被 ClientSession 持有,session 关闭后 connector 也关,
    所以每次新建 session 都要新建 connector
    """
    import aiohttp
    return aiohttp.TCPConnector(ssl=get_ssl_context(), **kwargs)
