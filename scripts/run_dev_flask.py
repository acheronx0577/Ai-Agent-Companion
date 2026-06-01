#!/usr/bin/env python3
"""Start Flask for `npm run dev` with a clear error if dependencies are missing."""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    os.chdir(ROOT)
    root_str = str(ROOT)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)
    if importlib.util.find_spec("dotenv") is None:
        print(
            "Python dependencies are missing.\n"
            "Install them with:\n"
            "  pip install -r requirements.txt\n"
            "Then run: npm run dev",
            file=sys.stderr,
        )
        return 1

    from app import app  # pylint: disable=import-outside-toplevel

    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes")
    app.run(host="0.0.0.0", port=port, debug=debug)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
