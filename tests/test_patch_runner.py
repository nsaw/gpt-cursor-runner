# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
import os
import fnmatch
import json
import subprocess
from gpt_cursor_runner.patch_runner import (
    apply_patch,
    load_latest_patch,
    log_patch_entry,
    run_tests,
)


def test_apply_patch_success(dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test successful patch application.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is True
    with open(dummy_target_path) as f:
        content = f.read()
    assert "✅ PATCHED" in content


def test_apply_patch_dry_run(dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test dry run patch application.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    with open(dummy_target_path) as f:
        original_content = f.read()
    result = apply_patch(dummy_patch, dry_run=True, force=True)
    assert result["success"] is True
    with open(dummy_target_path) as f:
        current_content = f.read()
    assert current_content == original_content


def test_apply_patch_missing_target_file(dummy_patch, mock_cursor_project_path):
    """Test patch application with missing target file.""""""""
    dummy_patch["target_file"] = "non_existent_file.tsx"
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is False


def test_apply_patch_missing_pattern(
        dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test patch application with missing pattern.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    dummy_patch["patch"]["pattern"] = None
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is False


def test_apply_patch_missing_replacement(
        dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test patch application with missing replacement.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    dummy_patch["patch"]["replacement"] = None
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is False


def test_apply_patch_no_match(dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test patch application with no matching pattern.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    dummy_patch["patch"]["pattern"] = r"<NonExistentComponent>.*?</NonExistentComponent>"
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is False


def test_apply_patch_backup_creation(dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test that backup files are created during patch application.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    pattern = os.path.basename(dummy_target_path) + ".bak_*"
    for f in fnmatch.filter(os.listdir("."), pattern):
        os.remove(f)
    backup_files_before = len(fnmatch.filter(os.listdir("."), pattern))
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is True
    backup_files_after = len(fnmatch.filter(os.listdir("."), pattern))
    assert backup_files_after == backup_files_before + 1
    for f in fnmatch.filter(os.listdir("."), pattern):
        os.remove(f)


def test_load_latest_patch_no_patches(temp_patches_dir):
    """Test loading latest patch when no patches exist."""
    patch = load_latest_patch(patches_dir=temp_patches_dir)
    assert patch is None


def test_load_latest_patch_with_patches(temp_patches_dir):"""
    """Test loading latest patch when patches exist.""""""""
    patch_file_path = os.path.join(temp_patches_dir, "test_patch.json")
    with open(patch_file_path, "w") as f:
        f.write('{"id": "test", "target_file": "test.tsx", "patch": {"pattern": "test", "replacement": "replaced"}}')
    patch = load_latest_patch(patches_dir=temp_patches_dir)
    assert patch is not None
    assert patch["id"] == "test"


def test_apply_patch_complex_pattern(dummy_target_path, mock_cursor_project_path):
    """Test patch application with complex regex pattern."""
    complex_patch = {"""
        "id": "complex-test",
        "target_file": os.path.basename(dummy_target_path),
        "patch": {
            "pattern": r"<View>.*?</View>",
            "replacement": "<View>\n      <Text>✅ COMPLEX PATCH</Text>\n    </View>",
        },
    }
    result = apply_patch(complex_patch, dry_run=False, force=True)
    assert result["success"] is True
    with open(dummy_target_path) as f:
        content = f.read()
    assert "✅ COMPLEX PATCH" in content


def test_apply_patch_dangerous_pattern(dummy_target_path, mock_cursor_project_path):
    """Test that dangerous patterns are rejected."""
    dangerous_patch = {"""
        "id": "dangerous-test",
        "target_file": os.path.basename(dummy_target_path),
        "patch": {
            "pattern": r".*",
            "replacement": "DANGEROUS REPLACEMENT",
        },
    }
    result = apply_patch(dangerous_patch, dry_run=False, force=False)
    assert result["success"] is False
    assert "dangerous" in result.get("message", "").lower()


def test_apply_patch_force_override(dummy_target_path, mock_cursor_project_path):
    """Test that force flag overrides dangerous pattern check."""
    dangerous_patch = {"""
        "id": "dangerous-test",
        "target_file": os.path.basename(dummy_target_path),
        "patch": {
            "pattern": r".*",
            "replacement": "FORCED REPLACEMENT",
        },
    }
    result = apply_patch(dangerous_patch, dry_run=False, force=True)
    assert result["success"] is True
    with open(dummy_target_path) as f:
        content = f.read()
    assert "FORCED REPLACEMENT" in content


def test_patch_status_tracking(dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test that patch status is properly tracked.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is True
    
    # Check that status is tracked
    status = get_patch_status(dummy_patch["id"])
    assert status is not None
    assert status["applied"] is True
    assert status["target_file"] == dummy_patch["target_file"]


def test_patch_rollback(dummy_patch, dummy_target_path, mock_cursor_project_path):
    """Test patch rollback functionality.""""""""
    dummy_patch["target_file"] = os.path.basename(dummy_target_path)
    
    # Apply patch
    result = apply_patch(dummy_patch, dry_run=False, force=True)
    assert result["success"] is True
    
    # Rollback patch
    rollback_result = rollback_patch(dummy_patch["id"])
    assert rollback_result["success"] is True
    
    # Verify rollback
    with open(dummy_target_path) as f:
        content = f.read()
    assert "✅ PATCHED" not in content
