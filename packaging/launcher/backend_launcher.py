from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    backend = Path(sys.executable).resolve().with_name("backend-server.exe")
    if not backend.is_file():
        print(f"backend executable missing: {backend}", file=sys.stderr)
        return 2
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    process = subprocess.Popen(
        [str(backend)],
        cwd=str(backend.parent),
        env=os.environ.copy(),
        creationflags=creationflags,
    )
    try:
        return process.wait()
    except KeyboardInterrupt:
        process.terminate()
        return process.wait(timeout=10)


if __name__ == "__main__":
    raise SystemExit(main())
