"""Generate a deterministic SHA-256 manifest for a release directory."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(root: Path, output_name: str) -> dict:
    files = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name == output_name:
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
    args = parser.parse_args()

    root = args.release_dir.resolve()
    if not root.is_dir():
        raise SystemExit(f"release directory not found: {root}")
    output = root / args.output
    manifest = build_manifest(root, args.output)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"manifest written: {output} ({len(manifest['files'])} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
