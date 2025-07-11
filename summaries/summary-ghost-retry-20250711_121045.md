# GHOST Patch Retry Summary

**Timestamp:** 2025-07-11 19:11:03 UTC
**Script:** retry-stalled-patches.sh
**Status:** PARTIAL_FAILURE

## Details

**Total patches scanned:** 21\n**Stalled patches found:** 21\n**Successful retries:** 0\n**Failed retries:** 21\n**Escalated to GitHub:** 0\n\n## Patch Details\n\n

## Actions Taken

- Scanned patches directory for stalled patches
- Attempted retry with patch_runner.py
- Escalated to GitHub fallback on 3rd failure
- Logged all attempts to logs/retry/

## Next Steps

- Monitor logs/retry/ for retry attempts
- Check GitHub for fallback patches
- Review failed patches in patches/failed/
