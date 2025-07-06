from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
from .webhook_handler import process_hybrid_block

load_dotenv()

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json
    print("📬 Incoming GPT block:")
    print(data)

    saved_path = process_hybrid_block(data)
    return jsonify({"status": "ok", "saved": saved_path}), 200

def run_server():
    """CLI entry point for running the Flask server."""
    port = int(os.getenv("NGROK_PORT", 5050))
    print(f"🚀 Starting GPT-Cursor Runner on port {port}")
    print(f"📡 Webhook endpoint: http://localhost:{port}/webhook")
    app.run(debug=True, port=port)

if __name__ == "__main__":
    run_server()

