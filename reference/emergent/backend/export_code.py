import os
import platform
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

EXCLUDE_DIRS = {"node_modules", ".git", "build", "dist", "__pycache__", ".venv", "venv", ".emergent", "cache", "coverage", "test_reports", ".pytest_cache", ".ruff_cache", ".mypy_cache", "plan"}
EXCLUDE_SUFFIXES = (".log", ".pyc", ".db", ".sqlite", ".dump", ".bson")
ENV_NAMES = ["MONGO_URL", "DB_NAME", "CORS_ORIGINS", "PUBLIC_SITE_URL", "REACT_APP_BACKEND_URL"]


def _skip(rel: Path) -> bool:
    if any(part in EXCLUDE_DIRS for part in rel.parts):
        return True
    name = rel.name
    if name == ".env" or name.startswith(".env."):
        return True
    return name.endswith(EXCLUDE_SUFFIXES)


def _versions() -> str:
    def pkg(name):
        try:
            from importlib.metadata import version
            return version(name)
        except Exception:
            return "unknown"

    def node():
        try:
            return subprocess.run(["node", "-v"], capture_output=True, text=True, timeout=5).stdout.strip()
        except Exception:
            return "unknown"

    return "\n".join([
        f"Exported: {datetime.now(timezone.utc).isoformat()}",
        f"Python: {platform.python_version()}",
        f"FastAPI: {pkg('fastapi')}", f"Motor: {pkg('motor')}", f"PyMongo: {pkg('pymongo')}", f"Pillow: {pkg('pillow')}",
        f"Node: {node()}", "React: 19.0.0", "React Router: 7.18.4", "Tailwind CSS: 3.4.17", "TypeScript: 5.x",
    ]) + "\n"


def build_code_zip(root: Path) -> str:
    fd, tmp = tempfile.mkstemp(suffix=".zip")
    os.close(fd)
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            if _skip(rel):
                continue
            zf.write(path, str(rel))
        zf.writestr("ENV_EXAMPLE.txt", "".join(f"{n}=\n" for n in ENV_NAMES))
        zf.writestr("EXPORT_INFO.txt", _versions())
    return tmp
