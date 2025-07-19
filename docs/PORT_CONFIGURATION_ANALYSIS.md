# Port Configuration Analysis & Resolution Plan

## 🔍 **Current Port Usage Analysis**

### **Currently Active Ports (from lsof)**
- **Port 4040**: ngrok tunnel (localhost)
- **Port 4041**: node process (gitSync-audit-upload)
- **Port 5000**: ControlCenter
- **Port 5051**: Python ghost runner (gpt-cursor-runner)
- **Port 5555**: Node.js server (gpt-cursor-runner)
- **Port 7000**: ControlCenter
- **Port 8081**: Expo development server (tm-mobile-cursor)

## 📋 **Project Port Defaults**

### **MAIN Project: gpt-cursor-runner**
| Service | Default Port | Environment Variable | Current Status |
|---------|-------------|-------------------|----------------|
| Python Ghost Runner | 5051 | `PYTHON_PORT=5051` | ✅ Running |
| Node.js Server | 5555 | `PORT=5555` | ✅ Running |
| Development Runner | 5051 | `RUNNER_DEV_PORT=5051` | ✅ Running |
| Production Runner | 5555 | `RUNNER_PORT=5555` | ✅ Running |

### **CYOPS Project: tm-mobile-cursor**
| Service | Default Port | Environment Variable | Current Status |
|---------|-------------|-------------------|----------------|
| Backend API | 4000 | `PORT=4000` | ❌ Not Running |
| Expo Dev Server | 8081 | Auto-assigned | ✅ Running |
| Metro Bundler | 8081 | Auto-assigned | ✅ Running |
| Expo Web | 19006 | Auto-assigned | ❌ Not Running |

## 🚨 **Port Conflicts Identified**

### **Current Conflicts**
1. **Port 8081**: Used by Expo dev server (tm-mobile-cursor)
2. **Port 4040**: Used by ngrok tunnel
3. **Port 4041**: Used by node process (gitSync-audit-upload)

### **Potential Conflicts**
1. **Port 4000**: Backend API not running but could conflict
2. **Port 3000**: Referenced in CORS but not currently used
3. **Port 19006**: Expo web server not running but could conflict

## 🔧 **Port Resolution Strategy**

### **Standardized Port Assignments**

#### **MAIN Project (gpt-cursor-runner)**
```bash
# Python Ghost Runner
PYTHON_PORT=5051          # Main ghost runner
RUNNER_DEV_PORT=5051      # Development mode

# Node.js Server  
PORT=5555                 # Node.js server
RUNNER_PORT=5555          # Production mode

# Health Check Ports
HEALTH_CHECK_PORT=5051    # Python health
NODE_HEALTH_PORT=5555     # Node health
```

#### **CYOPS Project (tm-mobile-cursor)**
```bash
# Backend API
PORT=4000                 # Backend API server
API_PORT=4000            # Alternative name

# Expo Development
EXPO_PORT=8081           # Expo dev server
METRO_PORT=8081          # Metro bundler
EXPO_WEB_PORT=19006      # Expo web server

# Development Tools
DEV_PORT=3000            # Development server
```

### **Port Kill Scripts**

#### **MAIN Project Kill Script**
```bash
#!/bin/bash
# kill-ports-main.sh

echo "🔄 Killing ports for MAIN project..."

# Kill Python ghost runner
pkill -f "python3 -m gpt_cursor_runner.main" || true
pkill -f "gpt_cursor_runner.main" || true

# Kill Node.js server
pkill -f "node server/index.js" || true
pkill -f "server/index.js" || true

# Kill specific ports
lsof -ti:5051 | xargs kill -9 2>/dev/null || true
lsof -ti:5555 | xargs kill -9 2>/dev/null || true

echo "✅ MAIN project ports killed"
```

#### **CYOPS Project Kill Script**
```bash
#!/bin/bash
# kill-ports-cyops.sh

echo "🔄 Killing ports for CYOPS project..."

# Kill Expo development server
pkill -f "expo start" || true
pkill -f "expo" || true

# Kill Metro bundler
pkill -f "metro" || true

# Kill backend API
pkill -f "nodemon.*backend" || true
pkill -f "ts-node.*backend" || true

# Kill specific ports
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19006 | xargs kill -9 2>/dev/null || true

echo "✅ CYOPS project ports killed"
```

#### **Universal Kill Script**
```bash
#!/bin/bash
# kill-all-ports.sh

echo "🔄 Killing all project ports..."

# Kill all project-related processes
pkill -f "gpt_cursor_runner" || true
pkill -f "expo" || true
pkill -f "metro" || true
pkill -f "nodemon" || true
pkill -f "ts-node" || true

# Kill specific ports
lsof -ti:4000,4040,4041,5051,5555,8081,19006 | xargs kill -9 2>/dev/null || true

echo "✅ All project ports killed"
```

## 🚀 **Start Scripts with Port Management**

### **MAIN Project Start Script**
```bash
#!/bin/bash
# start-main.sh

echo "🚀 Starting MAIN project..."

# Kill existing processes
./kill-ports-main.sh

# Set environment variables
export PYTHON_PORT=5051
export PORT=5555
export RUNNER_DEV_PORT=5051
export RUNNER_PORT=5555

# Start Python ghost runner
echo "📡 Starting Python ghost runner on port 5051..."
python3 -m gpt_cursor_runner.main &
PYTHON_PID=$!

# Wait for Python server
sleep 3

# Start Node.js server
echo "🖥️ Starting Node.js server on port 5555..."
node server/index.js &
NODE_PID=$!

# Wait for Node.js server
sleep 3

# Health checks
echo "🔍 Running health checks..."
curl -s http://localhost:5051/health > /dev/null && echo "✅ Python server healthy" || echo "❌ Python server failed"
curl -s http://localhost:5555/health > /dev/null && echo "✅ Node.js server healthy" || echo "❌ Node.js server failed"

echo "🎉 MAIN project started successfully!"
```

### **CYOPS Project Start Script**
```bash
#!/bin/bash
# start-cyops.sh

echo "🚀 Starting CYOPS project..."

# Kill existing processes
./kill-ports-cyops.sh

# Set environment variables
export PORT=4000
export API_PORT=4000
export EXPO_PORT=8081
export METRO_PORT=8081
export EXPO_WEB_PORT=19006

# Start backend API
echo "🔧 Starting backend API on port 4000..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait for backend
sleep 5

# Start Expo development server
echo "📱 Starting Expo dev server on port 8081..."
npx expo start --port 8081 &
EXPO_PID=$!

# Wait for Expo
sleep 5

# Health checks
echo "🔍 Running health checks..."
curl -s http://localhost:4000/health > /dev/null && echo "✅ Backend API healthy" || echo "❌ Backend API failed"
curl -s http://localhost:8081 > /dev/null && echo "✅ Expo server healthy" || echo "❌ Expo server failed"

echo "🎉 CYOPS project started successfully!"
```

## 📊 **Complete Port Mapping**

### **Development Environment**
| Port | Service | Project | Status | URL |
|------|---------|---------|--------|-----|
| 4000 | Backend API | CYOPS | ❌ Stopped | http://localhost:4000 |
| 4040 | ngrok tunnel | System | ✅ Running | http://localhost:4040 |
| 4041 | gitSync audit | System | ✅ Running | http://localhost:4041 |
| 5051 | Python ghost runner | MAIN | ✅ Running | http://localhost:5051 |
| 5555 | Node.js server | MAIN | ✅ Running | http://localhost:5555 |
| 8081 | Expo dev server | CYOPS | ✅ Running | http://localhost:8081 |

### **Production Environment**
| Port | Service | Project | Status | URL |
|------|---------|---------|--------|-----|
| 4000 | Backend API | CYOPS | ❌ Stopped | https://api.thoughtmarks.app |
| 5051 | Python ghost runner | MAIN | ✅ Running | https://runner.thoughtmarks.app |
| 5555 | Node.js server | MAIN | ✅ Running | https://dashboard.thoughtmarks.app |

## 🔄 **Environment Configuration Files**

### **MAIN Project (.env)**
```bash
# Ghost Runner Configuration
PYTHON_PORT=5051
PORT=5555
RUNNER_DEV_PORT=5051
RUNNER_PORT=5555

# Development
DEBUG_MODE=true
LOG_LEVEL=INFO

# Health Check Ports
HEALTH_CHECK_PORT=5051
NODE_HEALTH_PORT=5555
```

### **CYOPS Project (.env)**
```bash
# Backend API Configuration
PORT=4000
API_PORT=4000

# Expo Configuration
EXPO_PORT=8081
METRO_PORT=8081
EXPO_WEB_PORT=19006

# Development
NODE_ENV=development
DEBUG=true
```

## ✅ **Recommendations**

1. **Always use port kill scripts before starting services**
2. **Use environment variables for all port configurations**
3. **Implement health checks after service startup**
4. **Use different port ranges for different environments**
5. **Document all port assignments and dependencies**
6. **Implement automatic port conflict detection**
7. **Use process management tools (PM2, supervisor) for production**

## 🎯 **Next Steps**

1. Create the port kill scripts
2. Update environment configuration files
3. Implement start scripts with health checks
4. Test port conflict resolution
5. Document all port assignments
6. Set up monitoring for port usage 