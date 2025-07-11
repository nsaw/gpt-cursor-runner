#!/usr/bin/env python3
"""
Admin Dashboard Configuration.

Handles authentication, remote access settings, and security configurations.
"""

import os
import hashlib
import hmac
import time
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify, session, redirect, url_for, render_template_string

class AdminConfig:
    """Configuration for admin dashboard."""
    
    def __init__(self):
        self.admin_username = os.getenv('ADMIN_USERNAME', 'admin')
        self.admin_password_hash = os.getenv('ADMIN_PASSWORD_HASH')
        self.admin_secret_key = os.getenv('ADMIN_SECRET_KEY', 'your-secret-key-change-this')
        self.remote_access_enabled = os.getenv('REMOTE_ACCESS_ENABLED', 'true').lower() == 'true'
        self.allowed_ips = os.getenv('ALLOWED_IPS', '').split(',') if os.getenv('ALLOWED_IPS') else []
        self.session_timeout = int(os.getenv('ADMIN_SESSION_TIMEOUT', '3600'))  # 1 hour
        self.rate_limit_enabled = os.getenv('ADMIN_RATE_LIMIT_ENABLED', 'true').lower() == 'true'
        self.rate_limit_requests = int(os.getenv('ADMIN_RATE_LIMIT_REQUESTS', '100'))  # requests per hour
        
        # Initialize session storage
        self.active_sessions = {}
        self.rate_limit_store = {}
    
    def hash_password(self, password: str) -> str:
        """Hash a password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str) -> bool:
        """Verify a password against the stored hash."""
        if not self.admin_password_hash:
            return False
        return hmac.compare_digest(self.hash_password(password), self.admin_password_hash)
    
    def generate_session_token(self) -> str:
        """Generate a secure session token."""
        timestamp = str(int(time.time()))
        data = f"{self.admin_username}:{timestamp}"
        signature = hmac.new(
            self.admin_secret_key.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{data}:{signature}"
    
    def verify_session_token(self, token: str) -> bool:
        """Verify a session token."""
        try:
            parts = token.split(':')
            if len(parts) != 3:
                return False
            
            username, timestamp, signature = parts
            if username != self.admin_username:
                return False
            
            # Check if session is expired
            if int(time.time()) - int(timestamp) > self.session_timeout:
                return False
            
            # Verify signature
            data = f"{username}:{timestamp}"
            expected_signature = hmac.new(
                self.admin_secret_key.encode(),
                data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except:
            return False
    
    def check_rate_limit(self, ip: str) -> bool:
        """Check if IP is within rate limits."""
        if not self.rate_limit_enabled:
            return True
        
        current_time = int(time.time())
        hour_ago = current_time - 3600
        
        # Clean old entries
        if ip in self.rate_limit_store:
            self.rate_limit_store[ip] = [t for t in self.rate_limit_store[ip] if t > hour_ago]
        else:
            self.rate_limit_store[ip] = []
        
        # Check if limit exceeded
        if len(self.rate_limit_store[ip]) >= self.rate_limit_requests:
            return False
        
        # Add current request
        self.rate_limit_store[ip].append(current_time)
        return True
    
    def check_ip_allowed(self, ip: str) -> bool:
        """Check if IP is allowed to access admin dashboard."""
        if not self.allowed_ips:
            return True  # Allow all if no IPs specified
        
        return ip in self.allowed_ips
    
    def require_auth(self, f):
        """Decorator to require authentication for admin routes."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if remote access is enabled
            if not self.remote_access_enabled:
                return jsonify({"error": "Remote access is disabled"}), 403
            
            # Check IP restrictions
            client_ip = request.remote_addr
            if not self.check_ip_allowed(client_ip):
                return jsonify({"error": "IP not allowed"}), 403
            
            # Check rate limiting
            if not self.check_rate_limit(client_ip):
                return jsonify({"error": "Rate limit exceeded"}), 429
            
            # Check authentication
            auth_token = request.cookies.get('admin_token') or request.headers.get('X-Admin-Token')
            
            if not auth_token or not self.verify_session_token(auth_token):
                return jsonify({"error": "Authentication required"}), 401
            
            return f(*args, **kwargs)
        return decorated_function
    
    def login_required(self, f):
        """Decorator for login page."""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if remote access is enabled
            if not self.remote_access_enabled:
                return jsonify({"error": "Remote access is disabled"}), 403
            
            # Check IP restrictions
            client_ip = request.remote_addr
            if not self.check_ip_allowed(client_ip):
                return jsonify({"error": "IP not allowed"}), 403
            
            return f(*args, **kwargs)
        return decorated_function

# Global admin config instance
admin_config = AdminConfig()

def create_admin_auth_routes(app):
    """Create authentication routes for admin dashboard."""
    
    @app.route('/admin/login', methods=['GET', 'POST'])
    @admin_config.login_required
    def admin_login():
        """Admin login page."""
        if request.method == 'POST':
            data = request.get_json() or request.form.to_dict()
            username = data.get('username', '')
            password = data.get('password', '')
            
            if username == admin_config.admin_username and admin_config.verify_password(password):
                # Generate session token
                token = admin_config.generate_session_token()
                response = jsonify({"status": "success", "message": "Login successful"})
                response.set_cookie('admin_token', token, max_age=admin_config.session_timeout, httponly=True)
                return response
            else:
                return jsonify({"error": "Invalid credentials"}), 401
        
        return render_template_string(ADMIN_LOGIN_HTML)
    
    @app.route('/admin/logout', methods=['POST'])
    def admin_logout():
        """Admin logout."""
        response = jsonify({"status": "success", "message": "Logout successful"})
        response.delete_cookie('admin_token')
        return response
    
    @app.route('/admin/status')
    def admin_status():
        """Get admin dashboard status."""
        return jsonify({
            "remote_access_enabled": admin_config.remote_access_enabled,
            "allowed_ips": admin_config.allowed_ips,
            "rate_limit_enabled": admin_config.rate_limit_enabled,
            "session_timeout": admin_config.session_timeout
        })

# HTML template for admin login
ADMIN_LOGIN_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - GPT-Cursor Runner</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .login-container {
            background: #1e293b;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 400px;
        }
        .login-container h1 {
            margin: 0 0 20px 0;
            color: #f8fafc;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #94a3b8;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #475569;
            border-radius: 6px;
            background: #334155;
            color: #f8fafc;
            font-size: 16px;
            box-sizing: border-box;
        }
        .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
        }
        .login-btn {
            width: 100%;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 10px;
        }
        .login-btn:hover {
            background: #2563eb;
        }
        .error-message {
            color: #ef4444;
            text-align: center;
            margin-top: 10px;
            display: none;
        }
        .success-message {
            color: #10b981;
            text-align: center;
            margin-top: 10px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>🔧 Admin Login</h1>
        <form id="login-form">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="login-btn">Login</button>
        </form>
        <div id="error-message" class="error-message"></div>
        <div id="success-message" class="success-message"></div>
    </div>

    <script>
        document.getElementById('login-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            const successMessage = document.getElementById('success-message');
            
            try {
                const response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    errorMessage.style.display = 'none';
                    successMessage.textContent = data.message;
                    successMessage.style.display = 'block';
                    
                    // Redirect to admin dashboard after successful login
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 1000);
                } else {
                    successMessage.style.display = 'none';
                    errorMessage.textContent = data.error || 'Login failed';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                successMessage.style.display = 'none';
                errorMessage.textContent = 'Network error. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    </script>
</body>
</html>
"""