"""Local SQLite + uploads snapshots. Restore only into a new directory."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sqlite3
import tempfile
from contextlib import closing
from datetime import datetime
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
PHOTO = re.compile(r"[a-f0-9-]{36}\.webp")
DB = Path("prisma/demo.db")


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def connect(path, mode):
    return sqlite3.connect(path.resolve().as_uri() + "?mode=" + mode, uri=True, timeout=10)


def inventory(folder):
    uploads = folder / "uploads"
    files = [DB]
    if uploads.exists():
        if uploads.is_symlink() or uploads.resolve() != uploads.absolute():
            raise ValueError("Linked uploads directory")
        for path in uploads.iterdir():
            if path.suffix == ".part" and PHOTO.fullmatch(path.stem):
                continue
            if not path.is_file() or path.is_symlink() or not PHOTO.fullmatch(path.name):
                raise ValueError("Unexpected entry in uploads: " + path.name)
            files.append(path.relative_to(folder))
    return files


def verify(folder):
    actual = {p.as_posix(): digest(folder / p) for p in inventory(folder)}
    if actual != json.loads((folder / "manifest.json").read_text()):
        raise ValueError("Snapshot checksum mismatch")
    with closing(connect(folder / DB, "ro")) as db:
        if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)] or db.execute("PRAGMA foreign_key_check").fetchone():
            raise ValueError("Invalid SQLite snapshot")
        refs = db.execute("SELECT filename FROM ReportPhoto UNION SELECT photo FROM Tree WHERE photo IS NOT NULL UNION SELECT photo FROM ServiceEvent WHERE photo IS NOT NULL UNION SELECT image FROM ReviewDecision WHERE image IS NOT NULL")
        for name, in refs:
            if "uploads/" + name not in actual:
                raise ValueError("Missing referenced photograph: " + name)


def publish(destination, populate):
    if destination.exists():
        raise FileExistsError("Destination already exists: " + str(destination))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as tmp:
        stage = Path(tmp) / "snapshot"
        stage.mkdir()
        populate(stage)
        verify(stage)
        stage.rename(destination)
    print(destination.relative_to(ROOT) if destination.is_relative_to(ROOT) else destination)


def backup(source, destination):
    def populate(stage):
        (stage / "prisma").mkdir()
        (stage / "uploads").mkdir()
        # Freeze DB writers while Online Backup API snapshots committed WAL pages.
        with closing(connect(source / DB, "rw")) as lock, closing(connect(source / DB, "ro")) as reader:
            lock.execute("BEGIN IMMEDIATE")
            with closing(sqlite3.connect(stage / DB)) as target:
                reader.backup(target)
                target.execute("PRAGMA journal_mode=DELETE")
            for relative in inventory(source):
                if relative != DB:
                    shutil.copy2(source / relative, stage / relative)
        hashes = {p.as_posix(): digest(stage / p) for p in inventory(stage)}
        (stage / "manifest.json").write_text(json.dumps(hashes, indent=2))
    publish(destination, populate)


def restore(snapshot, destination):
    verify(snapshot)
    def populate(stage):
        (stage / "uploads").mkdir()
        (stage / "prisma").mkdir()
        for relative in [*inventory(snapshot), Path("manifest.json")]:
            shutil.copy2(snapshot / relative, stage / relative)
    publish(destination, populate)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--restore", type=Path, metavar="SNAPSHOT")
    parser.add_argument("--to", type=Path)
    args = parser.parse_args()
    if args.restore:
        if not args.to:
            parser.error("--restore requires --to NEW_DIRECTORY")
        restore(args.restore.resolve(), args.to.resolve())
    else:
        name = datetime.now().strftime("%Y%m%d-%H%M%S-") + uuid4().hex[:8]
        backup(ROOT, (args.to or ROOT / ".tools" / "backups" / name).resolve())
