#!/usr/bin/env python3
"""
Admin Dashboard Setup Script.

Helps configure the admin dashboard with secure authentication and remote access settings.
"""

import os
import sys
import hashlib
import getpass
import argparse
from pathlib import Path

def generate_password_hash(password: str) -> str:
    """Generate SHA-256 hash of password."""
    return hashlib.sha256(password.encode()).hexdigest()

def setup_admin_config():
    """Interactive setup for admin configuration."""
    print("🔧 GPT-Cursor Runner Admin Dashboard Setup")
    print("=" * 50)
    
    # Get admin username
    username = input("Enter admin username (default: admin): ").strip() or "admin"
    
    # Get admin password
    while True:
        password = getpass.getpass("Enter admin password: ")
        if len(password) < 8:
            print("❌ Password must be at least 8 characters long")
            continue
        confirm_password = getpass.getpass("Confirm admin password: ")
        if password != confirm_password:
            print("❌ Passwords do not match")
            continue
        break
    
    # Generate password hash
    password_hash = generate_password_hash(password)
    
    # Remote access settings
    print("\n🌐 Remote Access Configuration")
    print("-" * 30)
    
    remote_enabled = input("Enable remote access? (y/n, default: y): ").strip().lower()
    remote_enabled = remote_enabled != 'n'
    
    allowed_ips = []
    if remote_enabled:
        ips_input = input("Enter allowed IP addresses (comma-separated, empty for all): ").strip()
        if ips_input:
            allowed_ips = [ip.strip() for ip in ips_input.split(',')]
    
    # Security settings
    print("\n🔒 Security Configuration")
    print("-" * 30)
    
    session_timeout = input("Session timeout in seconds (default: 3600): ").strip()
    session_timeout = int(session_timeout) if session_timeout.isdigit() else 3600
    
    rate_limit_enabled = input("Enable rate limiting? (y/n, default: y): ").strip().lower()
    rate_limit_enabled = rate_limit_enabled != 'n'
    
    rate_limit_requests = 100
    if rate_limit_enabled:
        rate_limit_input = input("Rate limit requests per hour (default: 100): ").strip()
        if rate_limit_input.isdigit():
            rate_limit_requests = int(rate_limit_input)
    
    # Generate secret key
    import secrets
    secret_key = secrets.token_hex(32)
    
    # Create environment variables
    env_vars = {
        'ADMIN_USERNAME': username,
        'ADMIN_PASSWORD_HASH': password_hash,
        'ADMIN_SECRET_KEY': secret_key,
        'REMOTE_ACCESS_ENABLED': str(remote_enabled).lower(),
        'ALLOWED_IPS': ','.join(allowed_ips) if allowed_ips else '',
        'ADMIN_SESSION_TIMEOUT': str(session_timeout),
        'ADMIN_RATE_LIMIT_ENABLED': str(rate_limit_enabled).lower(),
        'ADMIN_RATE_LIMIT_REQUESTS': str(rate_limit_requests)
    }
    
    # Write to .env file
    env_file = Path('.env')
    env_content = []
    
    # Read existing .env file
    if env_file.exists():
        with open(env_file, 'r') as f:
            existing_lines = f.readlines()
        
        # Update existing variables and add new ones
        existing_vars = {}
        for line in existing_lines:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                existing_vars[key] = value
        
        # Merge with new admin variables
        existing_vars.update(env_vars)
        env_vars = existing_vars
    
    # Write all variables
    for key, value in env_vars.items():
        env_content.append(f"{key}={value}")
    
    with open(env_file, 'w') as f:
        f.write('\n'.join(env_content))
    
    print("\n✅ Configuration saved to .env file")
    print("\n📋 Summary:")
    print(f"  Username: {username}")
    print(f"  Remote Access: {'Enabled' if remote_enabled else 'Disabled'}")
    if allowed_ips:
        print(f"  Allowed IPs: {', '.join(allowed_ips)}")
    else:
        print("  Allowed IPs: All IPs")
    print(f"  Session Timeout: {session_timeout} seconds")
    print(f"  Rate Limiting: {'Enabled' if rate_limit_enabled else 'Disabled'}")
    if rate_limit_enabled:
        print(f"  Rate Limit: {rate_limit_requests} requests/hour")
    
    print("\n🚀 Next steps:")
    print("1. Start the server: python -m gpt_cursor_runner.main")
    print("2. Access admin dashboard: http://localhost:5000/admin")
    print("3. Login with your credentials")
    
    if remote_enabled:
        print("\n🌐 For remote access:")
        print("1. Use ngrok: ngrok http 5000")
        print("2. Or use localtunnel: npx localtunnel --port 5000")
        print("3. Access via the provided public URL")

def generate_password_hash_cli():
    """Generate password hash for command line use."""
    parser = argparse.ArgumentParser(description='Generate password hash for admin dashboard')
    parser.add_argument('password', help='Password to hash')
    args = parser.parse_args()
    
    password_hash = generate_password_hash(args.password)
    print(f"Password hash: {password_hash}")
    print(f"Add to .env: ADMIN_PASSWORD_HASH={password_hash}")

def main():
    """Main setup function."""
    if len(sys.argv) > 1 and sys.argv[1] == 'hash':
        generate_password_hash_cli()
    else:
        setup_admin_config()

if __name__ == '__main__':
    main()