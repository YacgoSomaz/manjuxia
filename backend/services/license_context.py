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
}


def set_context(license_key: str, machine_id: str, source: Optional[str] = None) -> None:
    _current["license_key"] = license_key
    _current["machine_id"] = machine_id
    _current["source"] = source or "qianshan"
    logger.info(f"[license_context] 已写入: license_key=***{license_key[-4:] if license_key and len(license_key) >= 4 else ''}, source={source}")


def get_context() -> Dict[str, Any]:
    return dict(_current)


def clear_context() -> None:
    _current["license_key"] = None
    _current["machine_id"] = None
    _current["source"] = None


def is_set() -> bool:
    return bool(_current.get("license_key"))
