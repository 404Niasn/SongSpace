"""Package a prebuilt frontend plus Linux/Python 3.12 backend dependencies."""

import hashlib
import json
import shutil
import subprocess
import sys
import tarfile
import tomllib
from datetime import datetime, timedelta, timezone
from importlib.metadata import distribution
from pathlib import Path

from packaging.markers import default_environment
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

ROOT = Path(__file__).resolve().parent.parent


def sha256(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def production_pins():
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    pending = project["project"]["dependencies"] + ["setuptools", "wheel"]
    environment = {
        **default_environment(),
        "sys_platform": "linux",
        "os_name": "posix",
        "platform_system": "Linux",
        "platform_machine": "x86_64",
        "python_version": "3.12",
        "python_full_version": "3.12.0",
    }
    pins, visited = {}, set()
    while pending:
        requirement = Requirement(pending.pop())
        name = canonicalize_name(requirement.name)
        context = (name, tuple(sorted(requirement.extras)))
        if context in visited:
            continue
        visited.add(context)
        installed = distribution(name)
        if not requirement.specifier.contains(installed.version):
            raise ValueError(f"Installed {name} does not satisfy {requirement.specifier}")
        pins[name] = installed.version
        for raw in installed.requires or []:
            dependency = Requirement(raw)
            if not dependency.marker or any(
                dependency.marker.evaluate({**environment, "extra": extra})
                for extra in {"", *requirement.extras}
            ):
                pending.append(raw)
    return "\n".join(f"{name}=={version}" for name, version in sorted(pins.items())) + "\n"


def main():
    if not (ROOT / "songspace-web/dist/index.html").is_file():
        raise SystemExit("Run npm run build in songspace-web first")
    stamp = datetime.now(timezone(timedelta(hours=8))).strftime("%Y%m%d-%H%M%S")
    output = ROOT / ".runtime/releases" / f"songspace-demo-{stamp}"
    stage = output / "songspace"
    stage.mkdir(parents=True)
    for directory in ("app", "alembic", "deploy", "docs/deploy", "songspace-web/dist"):
        shutil.copytree(
            ROOT / directory,
            stage / directory,
            ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
        )
    for filename in (
        "pyproject.toml",
        "alembic.ini",
        "README.md",
        ".env.example",
        "requirements.lock.txt",
    ):
        shutil.copy2(ROOT / filename, stage / filename)
    # Windows checkouts may use CRLF; Linux shell/configuration files use LF.
    for path in (stage / "deploy").rglob("*"):
        if path.is_file():
            path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
    lock = stage / "deploy/requirements-production.txt"
    lock.write_text(production_pins(), encoding="utf-8", newline="\n")
    wheels = stage / "wheels"
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "download",
            "--only-binary=:all:",
            "--platform",
            "manylinux2014_x86_64",
            "--platform",
            "manylinux_2_28_x86_64",
            "--python-version",
            "3.12",
            "--implementation",
            "cp",
            "--abi",
            "cp312",
            "--no-deps",
            "--dest",
            str(wheels),
            "-r",
            str(lock),
        ],
        check=True,
    )
    metadata = {
        "created_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
        "target": "Linux x86_64 / CPython 3.12",
        "git_head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT)
        .decode()
        .strip(),
        "working_tree_status": subprocess.check_output(
            ["git", "status", "--short"],
            cwd=ROOT,
        ).decode("utf-8"),
        "frontend_bytes": sum(
            p.stat().st_size for p in (stage / "songspace-web/dist").rglob("*") if p.is_file()
        ),
        "dependencies": lock.read_text(encoding="utf-8").splitlines(),
    }
    (stage / "RELEASE.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    files = sorted(p for p in stage.rglob("*") if p.is_file())
    (stage / "SHA256SUMS").write_text(
        "".join(f"{sha256(p)}  {p.relative_to(stage).as_posix()}\n" for p in files),
        encoding="utf-8",
        newline="\n",
    )
    archive = output.with_suffix(".tar.gz")

    def permissions(info):
        info.uid = info.gid = 0
        info.uname = info.gname = "root"
        info.mode = 0o755 if info.isdir() or info.name.endswith(".sh") else 0o644
        return info

    with tarfile.open(archive, "w:gz") as bundle:
        bundle.add(stage, arcname="songspace", filter=permissions)
    archive.with_suffix(archive.suffix + ".sha256").write_text(
        f"{sha256(archive)}  {archive.name}\n",
        encoding="ascii",
    )
    with tarfile.open(archive, "r:gz") as bundle:
        expected = {
            f"songspace/{p.relative_to(stage).as_posix()}": sha256(p)
            for p in stage.rglob("*")
            if p.is_file()
        }
        for member in bundle.getmembers():
            if member.isfile():
                actual = hashlib.sha256(bundle.extractfile(member).read()).hexdigest()
                assert expected.pop(member.name) == actual, member.name
        assert not expected
    print(
        json.dumps(
            {
                "archive": str(archive),
                "bytes": archive.stat().st_size,
                "sha256": sha256(archive),
                "files": len(files) + 1,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
