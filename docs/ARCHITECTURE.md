# System Architecture Overview

## 🎯 System Overview

The GPT-Cursor-Runner is a multi-layered automation system designed for remote control of Cursor agents through GPT-generated patches. The system provides comprehensive monitoring, auto-recovery, and self-organization capabilities.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTERFACES                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    GPT      │  │   Slack     │  │   Cloudflare        │ │
│  │  (Webhook)  │  │ (Commands)  │  │   (Tunnel)          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CORE PROCESSING LAYER                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Ghost Runner  │  │  BRAUN Daemon   │  │   Enhanced  │ │
│  │   (Port 5053)   │  │  (Patch Proc)   │  │   Document  │ │
│  │                 │  │                 │  │   Daemon    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING & RECOVERY                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Watchdog      │  │   Health        │  │   Auto      │ │
│  │   System        │  │   Monitoring    │  │   Recovery  │ │
│  │                 │  │                 │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA & STORAGE LAYER                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Patch         │  │   Summary       │  │   Log       │ │
│  │   Storage       │  │   Storage       │  │   Storage   │ │
│  │   (MAIN/CYOPS)  │  │   (Auto-org)    │  │   (System)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### 1. **Ghost Runner** (Port 5053)
**Purpose**: Main patch processing system for CYOPS environment

**Features**:
- Webhook processing for GPT patches
- Patch validation and execution
- Health monitoring endpoints
- Event logging and tracking

**Key Endpoints**:
- `POST /webhook` - Receive GPT patches
- `GET /health` - Health check
- `GET /status` - System status

### 2. **BRAUN Daemon** (Enhanced Patch Processing)
**Purpose**: Advanced patch processing with self-monitoring

**Features**:
- Automatic patch processing
- Self-monitoring and health tracking
- Error recovery and retry logic
- Performance metrics collection

**Processing Flow**:
1. Monitor patch directories
2. Validate patch format
3. Execute patches safely
4. Move to completed/failed
5. Generate summaries

### 3. **Enhanced Document Daemon**
**Purpose**: Auto-organization and documentation generation

**Features**:
- Auto-archive summaries after 2 days
- Generate patch manifests with changelogs
- Create README and INDEX files recursively
- Monitor both MAIN and CYOPS directories

**Generated Output**:
- `patch-manifest.json` - Comprehensive patch history
- `README.md` - Auto-generated documentation
- `INDEX.md` - File and directory indexes
- `.archive/` - Organized old files

### 4. **Node.js Server** (Port 5555)
**Purpose**: Main API server and Slack integration

**Features**:
- 25+ Slack slash commands
- REST API endpoints
- Dashboard interface
- Webhook routing

**Key Endpoints**:
- `POST /slack/commands` - Slack command processing
- `GET /dashboard` - System dashboard
- `GET /health` - Health check
- `POST /webhook` - Webhook processing

### 5. **Watchdog System**
**Purpose**: Comprehensive monitoring and auto-recovery

**Components**:
- **Tunnel Watchdog** - External access monitoring
- **Fly.io Watchdog** - Cloud deployment monitoring
- **Flask Watchdog** - Webhook service monitoring
- **Patch Executor Watchdog** - Patch processing monitoring
- **BRAUN Daemon Watchdog** - Patch daemon monitoring
- **Ghost Runner Watchdog** - Ghost processing monitoring
- **Dashboard Uplink Watchdog** - Dashboard metrics monitoring
- **Summary Watcher Watchdog** - Summary posting monitoring
- **Enhanced Document Daemon Watchdog** - Documentation monitoring

## 📊 Data Flow

### 1. **GPT → System Flow**
```
GPT generates patch
    ↓
Webhook endpoint (Port 5555)
    ↓
Ghost Bridge processing
    ↓
Patch validation
    ↓
BRAUN Daemon execution
    ↓
Cursor agent application
    ↓
Summary generation
    ↓
Feedback to GPT
```

### 2. **Slack → System Flow**
```
Slack command
    ↓
Slack API validation
    ↓
Command processing (Port 5555)
    ↓
System action execution
    ↓
Response formatting
    ↓
Slack response
```

### 3. **Monitoring Flow**
```
System components
    ↓
Health checks (every 30-120s)
    ↓
Watchdog monitoring
    ↓
Status evaluation
    ↓
Auto-recovery (if needed)
    ↓
Alert notifications
```

## 🔐 Security Architecture

### Authentication & Authorization
- **Slack OAuth** - Secure Slack integration
- **Webhook Signing** - Request validation
- **Environment Variables** - Secure configuration
- **Process Isolation** - Component separation

### Data Protection
- **Encrypted Communication** - HTTPS/TLS
- **Secure Storage** - Environment-based secrets
- **Access Control** - Role-based permissions
- **Audit Logging** - Comprehensive activity tracking

## 🌐 Network Architecture

### Port Configuration
| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| **Node.js Server** | 5555 | Main API, Slack, Dashboard | ✅ Active |
| **Ghost Runner** | 5053 | Patch processing | ✅ Active |
| **Comprehensive Dashboard** | 3002 | System monitoring | ✅ Active |
| **Dual Monitor Server** | 8787 | Metrics collection | ✅ Active |
| **Cloudflare Tunnel** | Dynamic | External access | ✅ Active |

### External Access
- **Production**: `https://runner.thoughtmarks.app`
- **Development**: `https://runner.thoughtmarks.app`
- **Dashboard**: `https://runner.thoughtmarks.app/dashboard`
- **Health Check**: `https://runner.thoughtmarks.app/health`

## 📈 Scalability & Performance

### Resource Management
- **Memory Limits**: 512MB per daemon
- **CPU Limits**: 80% per daemon
- **Restart Limits**: 5 attempts per 5 minutes
- **Activity Monitoring**: 5-minute timeout

### Performance Characteristics
- **Response Time**: < 1000ms for API calls
- **Throughput**: 100+ patches per minute
- **Uptime**: Target > 99.5%
- **Recovery Time**: < 30 seconds

## 🔄 System Integration

### External Services
- **Slack API** - Command processing and notifications
- **OpenAI API** - GPT integration and communication
- **Cloudflare** - Tunnel and external access
- **Fly.io** - Cloud deployment (optional)

### Internal Services
- **File System** - Patch and summary storage
- **Process Management** - Daemon lifecycle
- **Logging System** - Comprehensive activity tracking
- **Configuration Management** - Environment-based settings

## 🛡️ Reliability Features

### Auto-Recovery
- **Process Monitoring** - Automatic restart on failure
- **Health Checks** - Regular endpoint validation
- **Resource Protection** - Memory and CPU limits
- **Circuit Breakers** - Prevent cascade failures

### Monitoring & Alerting
- **Real-time Monitoring** - Continuous health checks
- **Performance Metrics** - Resource usage tracking
- **Error Detection** - Automatic issue identification
- **Alert System** - Slack notifications for issues

### Data Integrity
- **Backup Systems** - Automatic patch backups
- **Validation** - Patch format and content validation
- **Rollback Capability** - Patch reversion support
- **Audit Trails** - Complete activity logging

## 🎯 System Capabilities

### Core Functionality
- **Remote Patch Execution** - GPT-controlled Cursor automation
- **Slack Integration** - 25+ remote management commands
- **Auto-Organization** - Documentation and patch management
- **Self-Monitoring** - Comprehensive health monitoring
- **Auto-Recovery** - Automatic issue resolution

### Advanced Features
- **Multi-Environment Support** - MAIN and CYOPS processing
- **Enhanced Documentation** - Auto-generated documentation
- **Patch Manifests** - Complete patch history and changelogs
- **Performance Analytics** - System performance insights
- **Security Monitoring** - Comprehensive security tracking

## 📋 Component Dependencies

### Critical Dependencies
- **Node.js 18+** - Server runtime
- **Python 3.8+** - Processing runtime
- **Cloudflare Tunnel** - External access
- **Slack API** - Command interface
- **File System** - Data storage

### Optional Dependencies
- **Fly.io** - Cloud deployment
- **Redis** - Caching (future)
- **PostgreSQL** - Database (future)
- **Prometheus** - Metrics (future)

## 🔮 Future Architecture

### Planned Enhancements
- **Microservices** - Component separation
- **Event Streaming** - Kafka/RabbitMQ integration
- **Container Orchestration** - Kubernetes deployment
- **Advanced ML** - Predictive failure detection
- **Multi-Region** - Geographic redundancy

### Scalability Roadmap
- **Horizontal Scaling** - Multi-instance deployment
- **Load Balancing** - Intelligent traffic distribution
- **Caching Layer** - Redis integration
- **Database Layer** - PostgreSQL integration
- **CDN Integration** - Global content delivery

---

**Architecture Status**: ✅ **PRODUCTION READY**  
**Scalability**: 🔵 **MEDIUM** - Supports current load with room for growth  
**Reliability**: ✅ **HIGH** - Comprehensive monitoring and auto-recovery  
**Security**: ✅ **SECURE** - Proper authentication and data protection 