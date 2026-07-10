"""Generate a deterministic SHA-256 manifest for a release directory."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(root: Path, output_name: str, signature_name: str) -> dict:
    files = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name in {output_name, signature_name}:
            continue
        relative = path.relative_to(root).as_posix()
        files[relative] = {
            "sha256": sha256(path),
            "size": path.stat().st_size,
        }
    return {"version": 1, "algorithm": "sha256", "files": files}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("release_dir", type=Path)
    parser.add_argument("--output", default="integrity_manifest.json")
    parser.add_argument("--signature-output", default="integrity_manifest.sig")
    parser.add_argument("--private-key", default=os.environ.get("WANSHAN_MANIFEST_PRIVATE_KEY", ""))
    args = parser.parse_args()

    root = args.release_dir.resolve()
    if not root.is_dir():
        raise SystemExit(f"release directory not found: {root}")
    output = root / args.output
    if not args.private_key:
        raise SystemExit("manifest signing key is required via --private-key or WANSHAN_MANIFEST_PRIVATE_KEY")
    manifest = build_manifest(root, args.output, args.signature_output)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    try:
        raw_private = base64.urlsafe_b64decode(args.private_key + "=" * ((4 - len(args.private_key) % 4) % 4))
        private_key = Ed25519PrivateKey.from_private_bytes(raw_private)
    except (ValueError, TypeError) as exc:
        raise SystemExit(f"invalid Ed25519 manifest signing key: {exc}") from exc
    signature = private_key.sign(output.read_bytes())
    signature_path = root / args.signature_output
    signature_path.write_text(base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=") + "\n", encoding="ascii")
    print(f"manifest written: {output} ({len(manifest['files'])} files)")
    print(f"manifest signature written: {signature_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
