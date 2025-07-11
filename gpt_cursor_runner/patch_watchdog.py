from .patch_runner import apply_patch_with_retry, patch_runner_health_check

def watchdog_apply_patch(patch_data):
    result = apply_patch_with_retry(patch_data, dry_run=False)
    if not result.get('success'):
        # Escalate to Slack or dashboard
        if slack_proxy:
            slack_proxy.notify_error(f"Patch failed after retries: {result.get('message')}", context=patch_data.get('target_file', ''))
    return result


def watchdog_health_check():
    health = patch_runner_health_check()
    if health['status'] != 'ok':
        # Escalate to Slack or dashboard
        if slack_proxy:
            slack_proxy.notify_error(f"Patch Watchdog Health Check Failed: {health['message']}", context='patch_watchdog')
    return health 