# Pipeline Failure: file_not_found

**Event Type:** fail
**Timestamp:** 2025-07-18T10:48:16.575309
**Context:** file_validation


## Pipeline Failure

The GPT-Cursor Runner pipeline encountered an error and has stopped.

**Error Type:** file_not_found
**Error Message:** Target file not found: /Users/sawyer/gitSync/tm-mobile-cursor/tmp_test_target.tsx

### Error Details
- Type: file_not_found
- Message: Target file not found: /Users/sawyer/gitSync/tm-mobile-cursor/tmp_test_target.tsx
- Context: file_validation
- Timestamp: 2025-07-18T10:48:16.575287

### Recovery Steps
1. Review the error details above
2. Check logs for additional information
3. Fix the underlying issue
4. Restart the pipeline



## Metadata

```json
{
  "error_type": "file_not_found",
  "error_message": "Target file not found: /Users/sawyer/gitSync/tm-mobile-cursor/tmp_test_target.tsx",
  "context": "file_validation",
  "patch_data": {
    "id": "multi-test",
    "role": "ui_patch",
    "target_file": "tmp_test_target.tsx",
    "patch": {
      "pattern": "<Text>.*?</Text>",
      "replacement": "<Text>\u2705 MULTI PATCH</Text>"
    }
  }
}
```
