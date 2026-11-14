"""Exercise backup and restore with committed data still in a WAL."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from backup import DB, ROOT, backup, restore


class Recovery(unittest.TestCase):
    def test_wal_restore_and_tamper(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source"
            backup(ROOT, source)
            writer = sqlite3.connect(source / DB)
            try:
                writer.execute("PRAGMA journal_mode=WAL")
                writer.execute("PRAGMA wal_autocheckpoint=0")
                writer.execute("CREATE TABLE audit_marker(value TEXT)")
                writer.execute("INSERT INTO audit_marker VALUES ('committed')")
                writer.commit()
                self.assertGreater(Path(str(source / DB) + "-wal").stat().st_size, 0)
                snapshot = root / "copy"
                backup(source, snapshot)
                restored = root / "restored"
                restore(snapshot, restored)
                conn = sqlite3.connect(restored / DB)
                try:
                    self.assertEqual(conn.execute("SELECT value FROM audit_marker").fetchone(), ("committed",))
                finally:
                    conn.close()
                with self.assertRaises(FileExistsError):
                    restore(snapshot, restored)
                with (snapshot / DB).open("ab") as db:
                    db.write(b"tampered")
                with self.assertRaises(ValueError):
                    restore(snapshot, root / "bad")
                self.assertFalse((root / "bad").exists())
            finally:
                writer.close()


if __name__ == "__main__":
    unittest.main()
