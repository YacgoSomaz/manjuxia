"""v3.61.70 prompt_templates.content AES-GCM 加密
- enc:v1:<b64(nonce 12B || ciphertext || tag 16B)>
- key 来自 utils.local_secret.get_device_key()
- 无前缀 → 老明文(自动迁移)
"""
import base64
import os
import logging
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


logger = logging.getLogger(__name__)

ENC_PREFIX = "enc:v1:"


def encrypt_content(plaintext: str) -> str:
    """加密 content,返回 'enc:v1:<base64>' 字符串"""
    if not plaintext:
        return plaintext
    if plaintext.startswith(ENC_PREFIX):
        # 已经加密了,别重复加
        return plaintext
    from utils.local_secret import get_device_key
    key = get_device_key()
    aes = AESGCM(key)
    nonce = os.urandom(12)
    ct = aes.encrypt(nonce, plaintext.encode("utf-8"), None)  # ct 已经包含 tag
    blob = nonce + ct
    return ENC_PREFIX + base64.b64encode(blob).decode("ascii")


def decrypt_content(stored: Optional[str]) -> Optional[str]:
    """读出 content。如果是 enc:v1: 开头 → 解密;否则 → 当老明文直接返回。
    解密失败 → 返回空字符串(并写日志),不抛异常,主流程容错
    """
    if not stored:
        return stored
    if not stored.startswith(ENC_PREFIX):
        return stored  # 老明文
    try:
        from utils.local_secret import get_device_key
        key = get_device_key()
        aes = AESGCM(key)
        blob = base64.b64decode(stored[len(ENC_PREFIX):])
        nonce = blob[:12]
        ct = blob[12:]
        return aes.decrypt(nonce, ct, None).decode("utf-8")
    except Exception as e:
        logger.warning(f"[content-crypto] 解密失败(可能机器变了 / db 拷自别处): {type(e).__name__}: {e}")
        return ""


def is_encrypted(stored: Optional[str]) -> bool:
    return bool(stored) and stored.startswith(ENC_PREFIX)
