import requests
import json
import os
from dotenv import load_dotenv

load_dotenv(override=True)

endpoint_url = os.getenv("ENDPOINT_URL")

# If ENDPOINT_URL is not set, try to get the ngrok public URL
if not endpoint_url:
    try:
        tunnels = requests.get("http://127.0.0.1:4040/api/tunnels").json().get("tunnels", [])
        for tunnel in tunnels:
            if tunnel.get("proto") == "https":
                endpoint_url = tunnel["public_url"] + "/webhook"
                break
    except Exception as e:
        print(f"❌ Could not get ngrok public URL: {e}")

if not endpoint_url:
    print("❌ Error: ENDPOINT_URL not found in environment variables or ngrok API")
    exit(1)

# Sample hybrid block (can be anything Cursor-style)
hybrid_block = {
    "id": "onboarding-modal-fix",
    "role": "ui_patch",
    "description": "Fix onboarding modal image cropping",
    "target_file": "src/screens/OnboardingModal.tsx",
    "patch": {
        "pattern": ".*",
        "replacement": "<View style={{ paddingTop: 30 }}>\n  <Image source={...} style={{ resizeMode: 'contain' }} />\n</View>"
    },
    "metadata": {
        "author": "gpt-4",
        "timestamp": "auto"
    }
}

print(f"🚀 Sending GPT block to: {endpoint_url}")
res = requests.post(endpoint_url, json=hybrid_block)
print(f"📡 Status: {res.status_code}")
try:
    print(res.json())
except Exception:
    print(res.text)
