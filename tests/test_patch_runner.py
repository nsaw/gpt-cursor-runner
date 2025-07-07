import os
import fnmatch
import json
import subprocess
from gpt_cursor_runner.patch_runner import apply_patch, load_latest_patch, log_patch_entry, run_tests

def test_apply_patch_success(dummy_patch, dummy_target_path, mock_cursor_project_path):
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    result = apply_patch(dummy_patch, dry_run=False)
    assert result is True
    with open(dummy_target_path) as f:
        content = f.read()
    assert "✅ PATCHED" in content

def test_apply_patch_dry_run(dummy_patch, dummy_target_path, mock_cursor_project_path):
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    with open(dummy_target_path) as f:
        original_content = f.read()
    result = apply_patch(dummy_patch, dry_run=True)
    assert result is True
    with open(dummy_target_path) as f:
        current_content = f.read()
    assert current_content == original_content

def test_apply_patch_missing_target_file(dummy_patch, mock_cursor_project_path):
    dummy_patch["target_file"] = "non_existent_file.tsx"
    result = apply_patch(dummy_patch, dry_run=False)
    assert result is False

def test_apply_patch_missing_pattern(dummy_patch, dummy_target_path, mock_cursor_project_path):
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    dummy_patch["patch"]["pattern"] = None
    result = apply_patch(dummy_patch, dry_run=False)
    assert result is False

def test_apply_patch_missing_replacement(dummy_patch, dummy_target_path, mock_cursor_project_path):
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    dummy_patch["patch"]["replacement"] = None
    result = apply_patch(dummy_patch, dry_run=False)
    assert result is False

def test_apply_patch_no_match(dummy_patch, dummy_target_path, mock_cursor_project_path):
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    dummy_patch["patch"]["pattern"] = r"<NonExistentComponent>.*?</NonExistentComponent>"
    result = apply_patch(dummy_patch, dry_run=False)
    assert result is False

def test_apply_patch_backup_creation(dummy_patch, dummy_target_path, mock_cursor_project_path):
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    pattern = os.path.basename(dummy_target_path) + ".bak_*"
    for f in fnmatch.filter(os.listdir("."), pattern):
        os.remove(f)
    backup_files_before = len(fnmatch.filter(os.listdir("."), pattern))
    result = apply_patch(dummy_patch, dry_run=False)
    assert result is True
    backup_files_after = len(fnmatch.filter(os.listdir("."), pattern))
    assert backup_files_after == backup_files_before + 1
    for f in fnmatch.filter(os.listdir("."), pattern):
        os.remove(f)

def test_load_latest_patch_no_patches(temp_patches_dir):
    patch, patch_file = load_latest_patch(patches_dir=temp_patches_dir)
    assert patch is None
    assert patch_file is None

def test_load_latest_patch_with_patches(temp_patches_dir):
    patch_file_path = os.path.join(temp_patches_dir, "test_patch.json")
    with open(patch_file_path, "w") as f:
        f.write('{"id": "test", "role": "ui_patch", "target_file": "test.tsx", "patch": {"pattern": "test", "replacement": "replaced"}}')
    patch, patch_file = load_latest_patch(patches_dir=temp_patches_dir)
    assert patch is not None
    assert patch_file is not None
    assert patch["id"] == "test"

def test_apply_patch_complex_pattern(dummy_target_path, mock_cursor_project_path):
    complex_patch = {
        "id": "complex-test",
        "role": "ui_patch",
        "target_file": os.path.basename(dummy_target_path),
        "patch": {
            "pattern": r"<View>.*?</View>",
            "replacement": "<View>\n      <Text>✅ COMPLEX PATCH</Text>\n    </View>"
        }
    }
    result = apply_patch(complex_patch, dry_run=False)
    assert result is True
    with open(dummy_target_path) as f:
        content = f.read()
    assert "✅ COMPLEX PATCH" in content

def test_apply_patch_multiple_replacements(dummy_target_path, mock_cursor_project_path):
    multi_text_content = '''import React from "react";
import { Text, View } from "react-native";

export default function MultiTextScreen() {
  return (
    <View>
      <Text>First text</Text>
      <Text>Second text</Text>
      <Text>Third text</Text>
    </View>
  );
}'''
    with open(dummy_target_path, "w") as f:
        f.write(multi_text_content)
    multi_patch = {
        "id": "multi-test",
        "role": "ui_patch",
        "target_file": os.path.basename(dummy_target_path),
        "patch": {
            "pattern": r"<Text>.*?</Text>",
            "replacement": "<Text>✅ MULTI PATCH</Text>"
        }
    }
    result = apply_patch(multi_patch, dry_run=False)
    assert result is True
    with open(dummy_target_path) as f:
        content = f.read()
    assert content.count("✅ MULTI PATCH") == 3

def test_log_patch_entry(tmp_path):
    log_file = tmp_path / "patch-log.json"
    entry = {"foo": "bar"}
    import gpt_cursor_runner.patch_runner as pr
    pr.PATCH_LOG = str(log_file)
    log_patch_entry(entry)
    with open(log_file) as f:
        data = json.load(f)
    assert data[-1] == entry

def test_run_tests_handles_failure(monkeypatch):
    def fake_run(*a, **kw):
        raise subprocess.CalledProcessError(1, "npm test")
    monkeypatch.setattr(subprocess, "run", fake_run)
    run_tests()  # Should not raise

def test_cli_entrypoint_help():
    result = subprocess.run(
        ["python3", "-m", "gpt_cursor_runner.patch_runner", "--help"],
        capture_output=True, text=True
    )
    assert result.returncode == 0 or "Usage" in result.stdout 