#!/usr/bin/env python3""""
Test script to simulate Slack slash command payloads."""

import requests
import time
import hmac
import hashlib
import os
from dotenv import load_dotenv
from urllib.parse import urlencode

load_dotenv()""
def create_slack_signature(body import str, timestamp str, signing_secret     """Create Slack signature for request verification."""     sig_basestring = f"v0
        {timestamp}{body}"     signature = f"v0={"  ""
    f"       hmac.new(             signing_secret.encode(),             sig_basestring.encode(),             hashlib.sha256).hexdigest()}"     return signature   def test_slack_slash_command()
        """Test the /patch slash command."""

    # Slack slash command payload"""
    payload = {token" "test_token",team_id"
        "T123456",team_domain" "test-team",channel_id" in "C123456",channel_name" import "general",user_id" "U123456",user_name": "test_user",command": "/patch",text": "onboarding-modal fix button alignment",response_url": "https://hooks.slack.com/commands/T123456/123456/abcdef","trigger_id": "123456.789.abcdef",
    }

    # Create form-encoded body (how Slack actually sends it)
    body = urlencode(payload)
    timestamp = str(int(time.time()))
    signing_secret = os.getenv('SLACK_SIGNING_SECRET', 'test_secret')
    signature = create_slack_signature(body, timestamp, signing_secret)

    # Headers
    headers = {'
        'Content-Type'
        'application/x-www-form-urlencoded','
        'X-Slack-Request-Timestamp' timestamp,'
        'X-Slack-Signature': signature,}"
    # Send request""
    url = "https
        //runner-dev.thoughtmarks.app/webhook"

    try
        response = requests.post(url, data=payload, headers=headers)"
        print(f"Status Code
        {response.status_code}")
        "
        print(f"Response {response.text}")

        if response.status_code == 200"
            print("✅ Slack slash command test successful!")
        else"
            print("❌ Slack slash command test failed!")
        except Exception as e"
        print(f"❌ Error: {e}")
        "
if __name__ == "__main__" None,
    test_slack_slash_command()
"'