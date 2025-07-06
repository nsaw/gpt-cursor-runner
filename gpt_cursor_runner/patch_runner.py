import os
import json
import re
import glob
import subprocess
import shutil
from datetime import datetime

PATCH_LOG = "patch-log.json"
CURSOR_PROJECT_PATH = os.getenv("CURSOR_PROJECT_PATH")  # Optional

def log_patch_entry(entry):
    log = []
    if os.path.exists(PATCH_LOG):
        with open(PATCH_LOG, "r") as f:
            try:
                log = json.load(f)
            except json.JSONDecodeError:
                log = []

    log.append(entry)

    with open(PATCH_LOG, "w") as f:
        json.dump(log, f, indent=2)

def load_latest_patch(patches_dir="patches"):
    patch_files = sorted(glob.glob(os.path.join(patches_dir, "*.json")), key=os.path.getmtime, reverse=True)
    if not patch_files:
        print("❌ No patch files found.")
        return None, None
    with open(patch_files[0], "r") as f:
        return json.load(f), patch_files[0]

def apply_patch(patch, dry_run=False):
    target_file = patch.get("target_file")
    patch_data = patch.get("patch", {})
    pattern = patch_data.get("pattern")
    replacement = patch_data.get("replacement")

    if not (target_file and pattern and replacement):
        print("❌ Patch missing required fields.")
        return False

    cursor_root = os.getenv("CURSOR_PROJECT_PATH", "")
    abs_target = os.path.join(cursor_root, target_file)

    if not os.path.exists(abs_target):
        print(f"❌ Target file not found: {abs_target}")
        return False

    # Backup original
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{abs_target}.bak_{timestamp}"
    shutil.copy(abs_target, backup_path)
    print(f"📦 Backup created: {backup_path}")

    with open(abs_target, "r") as f:
        content = f.read()

    # Show preview
    preview = re.findall(pattern, content, flags=re.MULTILINE | re.DOTALL)
    if preview:
        print("🧪 Match Preview:")
        for i, match in enumerate(preview):
            print(f"\n--- Match {i+1} ---\n{match}\n")
    else:
        print("⚠️  No match found for preview.")

    if dry_run:
        print("🧪 Dry run: patch not written.")
        return True

    new_content, count = re.subn(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

    if count == 0:
        print("⚠️  Pattern not found in target file. No changes made.")
        return False

    with open(abs_target, "w") as f:
        f.write(new_content)

    print(f"✅ Patch applied to {abs_target} ({count} replacements)")

    if CURSOR_PROJECT_PATH:
        # Optional: copy patched file to Cursor project
        cursor_target = os.path.join(CURSOR_PROJECT_PATH, os.path.basename(target_file))
        shutil.copy(abs_target, cursor_target)
        print(f"📤 Synced patched file to Cursor path: {cursor_target}")

    return True

    target_file = patch.get("target_file")
    patch_data = patch.get("patch", {})
    pattern = patch_data.get("pattern")
    replacement = patch_data.get("replacement")

    if not (target_file and pattern and replacement):
        print("❌ Patch missing required fields.")
        return False

    # Resolve full path relative to Cursor project root
    cursor_root = os.getenv("CURSOR_PROJECT_PATH", "")
    abs_target = os.path.join(cursor_root, target_file)

    if not os.path.exists(abs_target):
        print(f"❌ Target file not found: {abs_target}")
        return False


    # Backup original
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{target_file}.bak_{timestamp}"
    shutil.copy(target_file, backup_path)
    print(f"📦 Backup created: {backup_path}")

    with open(target_file, "r") as f:
        content = f.read()

    # Show preview
    preview = re.findall(pattern, content, flags=re.MULTILINE | re.DOTALL)
    if preview:
        print("🧪 Match Preview:")
        for i, match in enumerate(preview):
            print(f"\n--- Match {i+1} ---\n{match}\n")
    else:
        print("⚠️  No match found for preview.")

    if dry_run:
        print("🧪 Dry run: patch not written.")
        return True

    new_content, count = re.subn(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

    if count == 0:
        print("⚠️  Pattern not found in target file. No changes made.")
        return False

    with open(target_file, "w") as f:
        f.write(new_content)

    print(f"✅ Patch applied to {target_file} ({count} replacements)")

    if CURSOR_PROJECT_PATH:
        # Optional: copy patched file to Cursor project
        cursor_target = os.path.join(CURSOR_PROJECT_PATH, os.path.basename(target_file))
        shutil.copy(target_file, cursor_target)
        print(f"📤 Synced patched file to Cursor path: {cursor_target}")

    return True

def run_tests():
    try:
        subprocess.run(["npm", "test"], check=True)
        print("✅ Test suite ran successfully.")
    except Exception as e:
        print(f"⚠️  Test suite failed or not available: {e}")

def git_commit(target_file, patch_file):
    try:
        subprocess.run(["git", "add", target_file], check=True)
        subprocess.run(["git", "commit", "-m", f"Apply patch from {os.path.basename(patch_file)}"], check=True)
        print("✅ Changes committed to git.")
    except Exception as e:
        print(f"⚠️  Git commit failed: {e}")

def main():
    patch, patch_file = load_latest_patch()
    if not patch:
        return

    dry_run = input("🧪 Run in dry mode (no file write)? (y/n): ").strip().lower() == "y"

    success = apply_patch(patch, dry_run=dry_run)

    log_patch_entry({
        "timestamp": datetime.utcnow().isoformat(),
        "patch_file": patch_file,
        "target": patch.get("target_file"),
        "success": success,
        "dry_run": dry_run
    })

    if success and not dry_run:
        run_tests()
        do_commit = input("💾 Commit changes to git? (y/n): ").strip().lower()
        if do_commit == "y":
            git_commit(patch["target_file"], patch_file)

if __name__ == "__main__":
    main()
