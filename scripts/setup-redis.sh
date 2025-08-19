#!/bin/bash
# ***REMOVED*** 2.0 Redis Setup

echo '[REDIS SETUP] Starting Redis installation and configuration...'

# Check if Redis is already installed
if ! command -v redis-server &> /dev/null; then
    echo '[REDIS SETUP] Installing Redis...'
    
    # Detect OS and install Redis
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
        else
            echo '[REDIS SETUP] Error: Homebrew not found. Please install Homebrew first.'
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y redis-server
        elif command -v yum &> /dev/null; then
            sudo yum install -y redis
        else
            echo '[REDIS SETUP] Error: No supported package manager found.'
            exit 1
        fi
    else
        echo '[REDIS SETUP] Error: Unsupported operating system.'
        exit 1
    fi
else
    echo '[REDIS SETUP] Redis already installed.'
fi

# Create Redis configuration directory
mkdir -p /usr/local/etc/redis

# Create Redis configuration file
cat > /usr/local/etc/redis/redis.conf << EOF
# ***REMOVED*** 2.0 Redis Configuration
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /usr/local/var/db/redis/
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
notify-keyspace-events ""
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit slave 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
aof-rewrite-incremental-fsync yes
EOF

# Create data directory
mkdir -p /usr/local/var/db/redis

# Start Redis server
echo '[REDIS SETUP] Starting Redis server...'
redis-server /usr/local/etc/redis/redis.conf --daemonize yes

# Wait for Redis to start
sleep 3

# Test Redis connection
echo '[REDIS SETUP] Testing Redis connection...'
if redis-cli ping | grep -q "PONG"; then
    echo '[REDIS SETUP] Redis is operational!' 
    
    # Test basic operations
    redis-cli set "ghost:test" "hello"
    redis-cli get "ghost:test"
    redis-cli del "ghost:test"
    
    echo '[REDIS SETUP] Redis setup completed successfully.'
else
    echo '[REDIS SETUP] Error: Redis is not responding.'
    exit 1
fi 
