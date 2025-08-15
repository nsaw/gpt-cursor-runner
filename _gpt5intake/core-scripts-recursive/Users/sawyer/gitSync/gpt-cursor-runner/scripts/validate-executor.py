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
#!/usr/bin/env python3
import os
import sys
import time
import json
from datetime import datetime, timedelta
from pathlib import Path

ROOT_LOG = Path("/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log")
PATCH_DIR = Path("/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/")
ROOT_LOGS_DIR = Path("/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/")

sys.path.insert(0, "/Users/sawyer/gitSync/gpt-cursor-runner")
from patch_executor_daemon import EnhancedPatchExecutorDaemon, apply_patch_from_file  # type: ignore


def wlog(msg: str) -> None:
    ts = datetime.utcnow().isoformat() + "Z"
    with open(ROOT_LOG, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] {msg}\n")


def ensure_dirs():
    PATCH_DIR.mkdir(parents=True, exist_ok=True)
    ROOT_LOGS_DIR.mkdir(parents=True, exist_ok=True)


def test_queue_overflow_and_monitor():
    try:
        # create 12 dummy patch files
        created = []
        for i in range(12):
            p = PATCH_DIR / f"validation-queue-{i}.json"
            with open(p, "w", encoding="utf-8") as f:
                json.dump({"test": True}, f)
            created.append(p)
        d = EnhancedPatchExecutorDaemon(str(PATCH_DIR), check_interval=1)
        d.monitor_queue_health()
        if d.queue_depth >= 12:
            wlog("PASS: Queue overflow monitored (>=12)")
        else:
            wlog("FAIL: Queue overflow not detected")
        # cleanup
        for p in created:
            try:
                p.unlink()
            except Exception:
                pass
    except Exception as e:
        wlog(f"FAIL: Queue overflow test error - {e}")


def test_stale_detection():
    try:
        stale = PATCH_DIR / "validation-stale-executor.json"
        with open(stale, "w", encoding="utf-8") as f:
            json.dump({"test": True}, f)
        old = datetime.utcnow() - timedelta(minutes=16)
        atime = mtime = time.mktime(old.timetuple())
        os.utime(stale, (atime, mtime))
        d = EnhancedPatchExecutorDaemon(str(PATCH_DIR), check_interval=1)
        d.check_stale_patches()
        if d.stale_patches and any(x["file"] == stale.name for x in d.stale_patches):
            wlog("PASS: Stale patch detection (executor)")
        else:
            wlog("FAIL: Stale patch not detected (executor)")
        stale.unlink(missing_ok=True)
    except Exception as e:
        wlog(f"FAIL: Stale detection test error - {e}")


def test_atomic_summary_creation():
    try:
        d = EnhancedPatchExecutorDaemon(str(PATCH_DIR), check_interval=1)
        dummy_patch = PATCH_DIR / "validation-summary.json"
        with open(dummy_patch, "w", encoding="utf-8") as f:
            json.dump({"test": True}, f)
        summary = d.create_atomic_summary(
            dummy_patch, True, {"processing_time": "0.01s"}
        )
        if summary and summary.exists():
            backup = ROOT_LOGS_DIR / ".backup" / f"{dummy_patch.stem}.summary.md.backup"
            if backup.exists():
                wlog("PASS: Atomic summary + backup")
            else:
                wlog("FAIL: Summary backup missing")
        else:
            wlog("FAIL: Atomic summary creation failed")
        dummy_patch.unlink(missing_ok=True)
        if summary and summary.exists():
            summary.unlink()
    except Exception as e:
        wlog(f"FAIL: Atomic summary test error - {e}")


def test_apply_patch_path():
    try:
        target = Path(
            "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-target.txt"
        )
        patch_file = ROOT_LOGS_DIR / "validation-apply.json"
        with open(patch_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "id": "validation-apply",
                    "target_file": str(target),
                    "patch": {"content": "hello world"},
                },
                f,
            )
        res = apply_patch_from_file(str(patch_file))
        if res.get("status") == "success" and target.exists():
            wlog("PASS: apply_patch_from_file basic path")
        else:
            wlog("FAIL: apply_patch_from_file failed")
        patch_file.unlink(missing_ok=True)
        target.unlink(missing_ok=True)
    except Exception as e:
        wlog(f"FAIL: apply_patch path test error - {e}")


if __name__ == "__main__":
    ensure_dirs()
    wlog("=== VALIDATION: Executor start ===")
    test_queue_overflow_and_monitor()
    test_stale_detection()
    test_atomic_summary_creation()
    test_apply_patch_path()
    wlog("=== VALIDATION: Executor complete ===")
