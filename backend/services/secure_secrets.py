"""Windows DPAPI protection for locally stored provider credentials."""

import base64
import ctypes
import os
from ctypes import wintypes


_PREFIX = "dpapi:"
_CRYPTPROTECT_UI_FORBIDDEN = 0x1


class _DataBlob(ctypes.Structure):
    _fields_ = [
        ("cbData", wintypes.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_byte)),
    ]


def _require_windows() -> None:
    if os.name != "nt":
        raise RuntimeError("万山密钥保护当前仅支持 Windows DPAPI")


def _blob_from_bytes(value: bytes) -> tuple[_DataBlob, ctypes.Array]:
    buffer = ctypes.create_string_buffer(value)
    return (
        _DataBlob(len(value), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte))),
        buffer,
    )


def _crypt_protect(data: bytes) -> bytes:
    _require_windows()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    crypt32.CryptProtectData.argtypes = [
        ctypes.POINTER(_DataBlob), wintypes.LPCWSTR, ctypes.c_void_p,
        ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(_DataBlob),
    ]
    crypt32.CryptProtectData.restype = wintypes.BOOL

    source, source_buffer = _blob_from_bytes(data)
    target = _DataBlob()
    if not crypt32.CryptProtectData(
        ctypes.byref(source), "WanShan provider credential", None, None, None,
        _CRYPTPROTECT_UI_FORBIDDEN, ctypes.byref(target),
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(target.pbData, target.cbData)
    finally:
        kernel32.LocalFree(target.pbData)
        del source_buffer


def _crypt_unprotect(data: bytes) -> bytes:
    _require_windows()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    crypt32.CryptUnprotectData.argtypes = [
        ctypes.POINTER(_DataBlob), ctypes.c_void_p, ctypes.c_void_p,
        ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(_DataBlob),
    ]
    crypt32.CryptUnprotectData.restype = wintypes.BOOL

    source, source_buffer = _blob_from_bytes(data)
    target = _DataBlob()
    if not crypt32.CryptUnprotectData(
        ctypes.byref(source), None, None, None, None,
        _CRYPTPROTECT_UI_FORBIDDEN, ctypes.byref(target),
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(target.pbData, target.cbData)
    finally:
        kernel32.LocalFree(target.pbData)
        del source_buffer


def is_encrypted_secret(value: str) -> bool:
    return isinstance(value, str) and value.startswith(_PREFIX)


def encrypt_secret(value: str) -> str:
    if not value:
        return ""
    if is_encrypted_secret(value):
        return value
    protected = _crypt_protect(value.encode("utf-8"))
    return _PREFIX + base64.urlsafe_b64encode(protected).decode("ascii")


def decrypt_secret(value: str) -> str:
    if not value or not is_encrypted_secret(value):
        return value or ""
    try:
        protected = base64.urlsafe_b64decode(value[len(_PREFIX):].encode("ascii"))
        return _crypt_unprotect(protected).decode("utf-8")
    except Exception as exc:
        raise RuntimeError("本机密钥无法解密，请重新保存模型配置") from exc
