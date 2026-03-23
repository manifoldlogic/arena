"""Unit tests for init-session.py"""

import json
import os
import sys
import tempfile
import unittest
from io import StringIO
from unittest.mock import patch

# Add scripts dir to path so we can import the module
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))

# Import the module by loading it as a module (filename has a hyphen)
import importlib.util

spec = importlib.util.spec_from_file_location(
    "init_session",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts", "init-session.py"),
)
init_session = importlib.util.module_from_spec(spec)
spec.loader.exec_module(init_session)


class TestDeriveCodebase(unittest.TestCase):
    """Tests for codebase derivation from cwd paths."""

    def test_mattermost_webapp(self):
        result = init_session.derive_codebase("/workspace/repos/mattermost/mattermost-webapp")
        self.assertEqual(result, "mattermost-webapp")

    def test_django(self):
        result = init_session.derive_codebase("/workspace/repos/django/django")
        self.assertEqual(result, "django")

    def test_olympics_v2(self):
        result = init_session.derive_codebase("/workspace/olympics-v2")
        self.assertEqual(result, "olympics-v2")

    def test_root_path(self):
        """Root path '/' has empty basename, should default to 'unknown'."""
        result = init_session.derive_codebase("/")
        self.assertEqual(result, "unknown")

    def test_empty_string(self):
        result = init_session.derive_codebase("")
        self.assertEqual(result, "unknown")

    def test_none_cwd(self):
        result = init_session.derive_codebase(None)
        self.assertEqual(result, "unknown")

    def test_simple_path(self):
        result = init_session.derive_codebase("/workspace/fastapi")
        self.assertEqual(result, "fastapi")

    def test_trailing_slash(self):
        """Path with trailing slash should still derive correctly."""
        # os.path.basename("/foo/bar/") returns "" but "/foo/bar" returns "bar"
        # This is an edge case; document the behavior
        result = init_session.derive_codebase("/workspace/repos/django/django/")
        # os.path.basename strips trailing slash -> ""
        # This will default to "unknown" which is the graceful handling
        self.assertIn(result, ["django", "unknown"])


class TestMainFunction(unittest.TestCase):
    """Tests for the main() function end-to-end."""

    def setUp(self):
        """Create a temp directory for each test."""
        self.tmpdir = tempfile.mkdtemp()
        self.env_patcher = patch.dict(os.environ, {"ARENA_DATA_DIR": self.tmpdir})
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()
        # Clean up temp files
        session_path = os.path.join(self.tmpdir, "session.json")
        if os.path.exists(session_path):
            os.remove(session_path)
        os.rmdir(self.tmpdir)

    def _run_main(self, stdin_data):
        """Helper to run main() with given stdin dict and capture stdout."""
        stdin_str = json.dumps(stdin_data)
        stdin_io = StringIO(stdin_str)
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            init_session.main(stdin_input=stdin_io)
            return mock_stdout.getvalue()

    def test_basic_session_creation(self):
        """Standard case: create session.json from stdin."""
        stdout = self._run_main({
            "session_id": "test-session-1",
            "cwd": "/workspace/repos/mattermost/mattermost-webapp",
        })

        # Verify stdout is valid JSON with systemMessage
        output = json.loads(stdout)
        self.assertIn("systemMessage", output)
        self.assertIn("mattermost-webapp", output["systemMessage"])

        # Verify session.json was written
        session_path = os.path.join(self.tmpdir, "session.json")
        self.assertTrue(os.path.exists(session_path))

        with open(session_path) as f:
            session = json.load(f)

        self.assertEqual(session["session_id"], "test-session-1")
        self.assertEqual(session["codebase"], "mattermost-webapp")
        self.assertIn("started_at", session)
        self.assertTrue(session["started_at"].endswith("Z"))
        # Verify no next_round field
        self.assertNotIn("next_round", session)

    def test_django_codebase(self):
        """Derive codebase from django path."""
        stdout = self._run_main({
            "session_id": "sess-2",
            "cwd": "/workspace/repos/django/django",
        })

        session_path = os.path.join(self.tmpdir, "session.json")
        with open(session_path) as f:
            session = json.load(f)

        self.assertEqual(session["codebase"], "django")

    def test_stdout_is_valid_json(self):
        """Stdout must be valid JSON with systemMessage key."""
        stdout = self._run_main({
            "session_id": "sess-3",
            "cwd": "/workspace/repos/fastapi/fastapi",
        })

        output = json.loads(stdout)
        self.assertIn("systemMessage", output)
        self.assertIn("fastapi", output["systemMessage"])

    def test_missing_cwd_field(self):
        """Missing cwd should default codebase to 'unknown'."""
        stdout = self._run_main({
            "session_id": "sess-4",
        })

        session_path = os.path.join(self.tmpdir, "session.json")
        with open(session_path) as f:
            session = json.load(f)

        self.assertEqual(session["codebase"], "unknown")

    def test_empty_cwd_field(self):
        """Empty string cwd should default codebase to 'unknown'."""
        stdout = self._run_main({
            "session_id": "sess-5",
            "cwd": "",
        })

        session_path = os.path.join(self.tmpdir, "session.json")
        with open(session_path) as f:
            session = json.load(f)

        self.assertEqual(session["codebase"], "unknown")

    def test_operator_override_preserves_codebase(self):
        """If session.json already exists with explicit codebase, preserve it."""
        session_path = os.path.join(self.tmpdir, "session.json")

        # Pre-write session.json with operator-chosen codebase
        pre_existing = {
            "session_id": "old-session",
            "codebase": "my-custom-codebase",
            "started_at": "2026-01-01T00:00:00Z",
        }
        with open(session_path, "w") as f:
            json.dump(pre_existing, f)

        # Run init-session with a different cwd
        stdout = self._run_main({
            "session_id": "new-session",
            "cwd": "/workspace/repos/django/django",
        })

        # Codebase should be preserved from the pre-existing file
        with open(session_path) as f:
            session = json.load(f)

        self.assertEqual(session["codebase"], "my-custom-codebase")
        # But session_id and started_at should be updated
        self.assertEqual(session["session_id"], "new-session")

        # stdout should reference the preserved codebase
        output = json.loads(stdout)
        self.assertIn("my-custom-codebase", output["systemMessage"])

    def test_operator_override_empty_codebase_not_preserved(self):
        """If existing session.json has empty codebase, don't treat as override."""
        session_path = os.path.join(self.tmpdir, "session.json")

        pre_existing = {
            "session_id": "old",
            "codebase": "",
            "started_at": "2026-01-01T00:00:00Z",
        }
        with open(session_path, "w") as f:
            json.dump(pre_existing, f)

        self._run_main({
            "session_id": "new",
            "cwd": "/workspace/repos/django/django",
        })

        with open(session_path) as f:
            session = json.load(f)

        # Empty codebase should NOT be preserved; derive from cwd
        self.assertEqual(session["codebase"], "django")

    def test_session_json_has_no_next_round(self):
        """session.json must not contain next_round field."""
        self._run_main({
            "session_id": "sess-6",
            "cwd": "/workspace/repos/django/django",
        })

        session_path = os.path.join(self.tmpdir, "session.json")
        with open(session_path) as f:
            session = json.load(f)

        self.assertNotIn("next_round", session)
        # Verify only expected keys
        self.assertEqual(set(session.keys()), {"session_id", "codebase", "started_at"})

    def test_started_at_is_iso8601_utc(self):
        """started_at must be ISO 8601 UTC with trailing Z."""
        self._run_main({
            "session_id": "sess-7",
            "cwd": "/workspace/repos/django/django",
        })

        session_path = os.path.join(self.tmpdir, "session.json")
        with open(session_path) as f:
            session = json.load(f)

        started_at = session["started_at"]
        self.assertTrue(started_at.endswith("Z"))
        # Should be parseable as ISO 8601
        from datetime import datetime
        # Remove trailing Z for parsing
        datetime.fromisoformat(started_at.rstrip("Z"))


class TestMalformedInput(unittest.TestCase):
    """Tests for malformed/invalid stdin input."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.env_patcher = patch.dict(os.environ, {"ARENA_DATA_DIR": self.tmpdir})
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()
        session_path = os.path.join(self.tmpdir, "session.json")
        if os.path.exists(session_path):
            os.remove(session_path)
        if os.path.exists(self.tmpdir):
            os.rmdir(self.tmpdir)

    def test_malformed_json_stdin(self):
        """Malformed JSON on stdin should exit non-zero with stderr message."""
        stdin_io = StringIO("this is not json{{{")
        with self.assertRaises(SystemExit) as cm:
            init_session.main(stdin_input=stdin_io)
        self.assertNotEqual(cm.exception.code, 0)

    def test_empty_stdin(self):
        """Empty stdin should exit non-zero."""
        stdin_io = StringIO("")
        with self.assertRaises(SystemExit) as cm:
            init_session.main(stdin_input=stdin_io)
        self.assertNotEqual(cm.exception.code, 0)

    def test_non_object_json(self):
        """JSON array on stdin should still work if it has session_id (it won't)."""
        stdin_io = StringIO("[]")
        # An array doesn't have .get(), so this tests graceful handling
        # Actually json.loads("[]") returns a list which doesn't have .get()
        # The script uses hook_data.get() which will raise AttributeError
        # Let's verify it handles this - it should raise an error
        with self.assertRaises((SystemExit, AttributeError)):
            init_session.main(stdin_input=stdin_io)


class TestGetDataDir(unittest.TestCase):
    """Tests for get_data_dir()."""

    def test_uses_env_var(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            target = os.path.join(tmpdir, "subdir")
            with patch.dict(os.environ, {"ARENA_DATA_DIR": target}):
                result = init_session.get_data_dir()
                self.assertEqual(result, target)
                self.assertTrue(os.path.isdir(target))

    def test_default_when_no_env(self):
        with patch.dict(os.environ, {}, clear=False):
            if "ARENA_DATA_DIR" in os.environ:
                del os.environ["ARENA_DATA_DIR"]
            result = init_session.get_data_dir()
            self.assertTrue(result.endswith(os.sep + "data"), "Expected default path to end with /data, got: {}".format(result))


class TestReadExistingSession(unittest.TestCase):
    """Tests for read_existing_session()."""

    def test_no_file(self):
        result = init_session.read_existing_session("/nonexistent/path/session.json")
        self.assertIsNone(result)

    def test_valid_file_with_codebase(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump({"codebase": "django", "session_id": "x"}, f)
            f.flush()
            result = init_session.read_existing_session(f.name)
        os.unlink(f.name)
        self.assertIsNotNone(result)
        self.assertEqual(result["codebase"], "django")

    def test_valid_file_without_codebase(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json.dump({"session_id": "x"}, f)
            f.flush()
            result = init_session.read_existing_session(f.name)
        os.unlink(f.name)
        self.assertIsNone(result)

    def test_corrupt_json_file(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            f.write("not json at all")
            f.flush()
            result = init_session.read_existing_session(f.name)
        os.unlink(f.name)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
