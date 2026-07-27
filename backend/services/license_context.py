"""持有当前客户端已激活的授权凭证,供 template_service 等请求 admin 时使用。

- electron 端激活/开机验证成功后调 /api/license/context/set 写入
- backend 内存保存,进程重启后消失(electron 重新推送)
- 仅服务于模板内容按需拉取接口,不参与授权本身的校验逻辑
"""
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

_current: Dict[str, Optional[str]] = {
    "license_key": None,
    "machine_id": None,
    "source": None,  # 'qianshan' / 'thirdparty'
    "authorized": False,
    "verified_envelope": False,
    "account_id": None,
    "product_id": None,
    "entitlement": None,
    "expires_at": None,
    "signed_until": None,
}


def set_verified_context(
    claims: Dict[str, Any],
    machine_id: str,
) -> None:
    """Write claims only after the backend has verified account-v1."""
    _current["license_key"] = str(claims["license_key"])
    _current["machine_id"] = machine_id
    _current["source"] = "account-v1"
    _current["authorized"] = True
    _current["verified_envelope"] = True
    _current["account_id"] = str(claims["account_id"])
    _current["product_id"] = str(claims["product_id"])
    _current["entitlement"] = str(claims["entitlement"])
    _current["expires_at"] = str(claims["expires_at"])
    _current["signed_until"] = int(claims["signed_until"])
    logger.info("[license_context] 已写入已验签 account-v1 上下文")


def get_context() -> Dict[str, Any]:
    return dict(_current)


def clear_context() -> None:
    _current["license_key"] = None
    _current["machine_id"] = None
    _current["source"] = None
    _current["authorized"] = False
    _current["verified_envelope"] = False
    _current["account_id"] = None
    _current["product_id"] = None
    _current["entitlement"] = None
    _current["expires_at"] = None
    _current["signed_until"] = None


def is_set() -> bool:
    return bool(_current.get("license_key"))
