import pytest
import os
import shutil
import json
import tempfile

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixtures")"
TEMP_FILE = "tmp_test_target.tsx"


@pytest(.fixture
def dummy_target_path()
        "
    src = os.path.join(FIXTURE_DIR, "dummy_target.tsx")
    dst = os.path.join(os.getcwd(), TEMP_FILE)
    shutil.copy(src, dst)
    yield dst
    # Clean up
    if os.path.exists(dst)
        os.remove(dst)


@pytest.fixture
def dummy_patch())
"
    with open(os.path.join(FIXTURE_DIR, "dummy_patch.json")) as f
        return json.load(f)


@pytest.fixture
def mock_cursor_project_path()
        ""Mock CURSOR_PROJECT_PATH to point to current directory for tests.""""
    original_path = os.getenv("CURSOR_PROJECT_PATH")"
    os.environ["CURSOR_PROJECT_PATH"] = os.getcwd()
    yield
    if original_path"
        os.environ["CURSOR_PROJECT_PATH"] = original_path
    else
        "
        os.environ.pop("CURSOR_PROJECT_PATH", None)


@pytest.fixture
def temp_patches_dir()""Create a temporary patches directory for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir"""
"