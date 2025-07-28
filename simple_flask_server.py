#!/usr/bin/env python3
"""
Simple Flask server for GHOST 2.0 testing.
"""

from flask import Flask, request, jsonify
from datetime import datetime
import os

app = Flask(__name__)


@app.route('/health', methods=['GET'])
def health():
"""Health check endpoint."""
return jsonify(
{
'status': 'healthy',
'port': 5051,
'timestamp': datetime.now().isoformat(),
'service': 'ghost-runner-flask',
}
)


@app.route('/webhook', methods=['POST'])
def webhook():
"""Webhook endpoint."""
try:
data = request.get_json()
if not data:
return jsonify({'error': 'No JSON data received'}), 400

return jsonify(
{
'status': 'received',
'timestamp': datetime.now().isoformat(),
'data_size': len(str(data)),
}
)

except Exception as e:
return jsonify({'error': str(e)}), 500


@app.route('/api/status', methods=['GET'])
def api_status():
"""API status endpoint."""
return jsonify(
{
'status': 'operational',
'service': 'ghost-runner-api',
'timestamp': datetime.now().isoformat(),
}
)


if __name__ == '__main__':
port = int(os.environ.get('PORT', 5051))
print(f"🚀 Starting simple Flask server on port {port}")
app.run(host='0.0.0.0', port=port, debug=False)
