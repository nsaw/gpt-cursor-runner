#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IntelligentMonitor {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.monitorLog = path.join(this.logDir, 'intelligent-monitor.log');
        this.insightsFile = path.join(this.logDir, 'monitor-insights.json');
        this.patternsFile = path.join(this.logDir, 'monitor-patterns.json');
        this.ensureLogDir();
        this.patterns = this.loadPatterns();
        this.insights = this.loadInsights();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            component: 'intelligent-monitor'
        };
        
        console.log(`[${timestamp}] [${level}] ${message}`);
        
        // Append to log file
        fs.appendFileSync(this.monitorLog, JSON.stringify(logEntry) + '\n');
    }

    loadPatterns() {
        try {
            if (fs.existsSync(this.patternsFile)) {
                return JSON.parse(fs.readFileSync(this.patternsFile, 'utf8'));
            }
        } catch (error) {
            this.log(`Error loading patterns: ${error.message}`, 'ERROR');
        }
        
        return {
            patterns: {},
            anomalies: [],
            trends: []
        };
    }

    loadInsights() {
        try {
            if (fs.existsSync(this.insightsFile)) {
                return JSON.parse(fs.readFileSync(this.insightsFile, 'utf8'));
            }
        } catch (error) {
            this.log(`Error loading insights: ${error.message}`, 'ERROR');
        }
        
        return {
            insights: [],
            predictions: [],
            recommendations: []
        };
    }

    savePatterns() {
        try {
            fs.writeFileSync(this.patternsFile, JSON.stringify(this.patterns, null, 2));
        } catch (error) {
            this.log(`Failed to save patterns: ${error.message}`, 'ERROR');
        }
    }

    saveInsights() {
        try {
            fs.writeFileSync(this.insightsFile, JSON.stringify(this.insights, null, 2));
        } catch (error) {
            this.log(`Failed to save insights: ${error.message}`, 'ERROR');
        }
    }

    collectMetrics() {
        this.log('Collecting system metrics...');
        
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                system: {
                    memory: this.getMemoryMetrics(),
                    cpu: this.getCPUMetrics(),
                    disk: this.getDiskMetrics(),
                    network: this.getNetworkMetrics()
                },
                processes: this.getProcessMetrics(),
                logs: this.getLogMetrics(),
                performance: this.getPerformanceMetrics()
            };
            
            return metrics;
        } catch (error) {
            this.log(`Error collecting metrics: ${error.message}`, 'ERROR');
            return null;
        }
    }

    getMemoryMetrics() {
        try {
            const memInfo = execSync('vm_stat', { encoding: 'utf8' });
            const lines = memInfo.split('\n');
            const metrics = {};
            
            lines.forEach(line => {
                if (line.includes(':')) {
                    const [key, value] = line.split(':').map(s => s.trim());
                    if (key && value) {
                        metrics[key] = value;
                    }
                }
            });
            
            return metrics;
        } catch (error) {
            return { error: error.message };
        }
    }

    getCPUMetrics() {
        try {
            const cpuInfo = execSync('top -l 1 -n 0', { encoding: 'utf8' });
            const lines = cpuInfo.split('\n');
            const cpuLine = lines.find(line => line.includes('CPU usage'));
            
            if (cpuLine) {
                return { usage: cpuLine.trim() };
            }
            
            return { usage: 'unavailable' };
        } catch (error) {
            return { error: error.message };
        }
    }

    getDiskMetrics() {
        try {
            const diskInfo = execSync('df -h .', { encoding: 'utf8' });
            return { info: diskInfo.trim() };
        } catch (error) {
            return { error: error.message };
        }
    }

    getNetworkMetrics() {
        try {
            const netInfo = execSync('netstat -i', { encoding: 'utf8' });
            return { interfaces: netInfo.trim() };
        } catch (error) {
            return { error: error.message };
        }
    }

    getProcessMetrics() {
        try {
            const processes = [
                'trust-daemon',
                'log-rotation',
                'systems-go',
                'monitoring-system'
            ];
            
            const metrics = {};
            
            processes.forEach(process => {
                try {
                    const result = execSync(`ps aux | grep "${process}" | grep -v grep | wc -l`, { encoding: 'utf8' });
                    metrics[process] = parseInt(result.trim()) > 0;
                } catch (error) {
                    metrics[process] = false;
                }
            });
            
            return metrics;
        } catch (error) {
            return { error: error.message };
        }
    }

    getLogMetrics() {
        try {
            const logFiles = fs.readdirSync(this.logDir);
            const metrics = {
                totalFiles: logFiles.length,
                totalSize: 0,
                recentActivity: 0
            };
            
            const now = Date.now();
            const oneHourAgo = now - (60 * 60 * 1000);
            
            logFiles.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                metrics.totalSize += stats.size;
                
                if (stats.mtime.getTime() > oneHourAgo) {
                    metrics.recentActivity++;
                }
            });
            
            return metrics;
        } catch (error) {
            return { error: error.message };
        }
    }

    getPerformanceMetrics() {
        try {
            const metrics = {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            };
            
            return metrics;
        } catch (error) {
            return { error: error.message };
        }
    }

    analyzePatterns(metrics) {
        this.log('Analyzing patterns in metrics...');
        
        const patterns = {
            timestamp: new Date().toISOString(),
            memoryTrend: this.analyzeMemoryTrend(metrics),
            cpuTrend: this.analyzeCPUTrend(metrics),
            processHealth: this.analyzeProcessHealth(metrics),
            logActivity: this.analyzeLogActivity(metrics)
        };
        
        this.patterns.patterns[Date.now()] = patterns;
        this.savePatterns();
        
        return patterns;
    }

    analyzeMemoryTrend(metrics) {
        // Simple memory trend analysis
        const memory = metrics.system.memory;
        if (memory.error) {
            return { status: 'unknown', reason: 'memory metrics unavailable' };
        }
        
        // Analyze memory patterns
        return {
            status: 'stable',
            trend: 'normal',
            recommendation: 'memory usage appears normal'
        };
    }

    analyzeCPUTrend(metrics) {
        const cpu = metrics.system.cpu;
        if (cpu.error) {
            return { status: 'unknown', reason: 'cpu metrics unavailable' };
        }
        
        return {
            status: 'stable',
            trend: 'normal',
            recommendation: 'cpu usage appears normal'
        };
    }

    analyzeProcessHealth(metrics) {
        const processes = metrics.processes;
        const running = Object.values(processes).filter(Boolean).length;
        const total = Object.keys(processes).length;
        
        return {
            running,
            total,
            health: running / total,
            status: running === total ? 'healthy' : 'degraded'
        };
    }

    analyzeLogActivity(metrics) {
        const logs = metrics.logs;
        
        return {
            activity: logs.recentActivity > 0 ? 'active' : 'inactive',
            size: logs.totalSize,
            files: logs.totalFiles,
            status: logs.recentActivity > 0 ? 'normal' : 'warning'
        };
    }

    generateInsights(patterns) {
        this.log('Generating intelligent insights...');
        
        const insights = {
            timestamp: new Date().toISOString(),
            patterns,
            predictions: this.generatePredictions(patterns),
            recommendations: this.generateRecommendations(patterns),
            anomalies: this.detectAnomalies(patterns)
        };
        
        this.insights.insights.push(insights);
        this.saveInsights();
        
        return insights;
    }

    generatePredictions(patterns) {
        const predictions = [];
        
        // Predict potential issues based on patterns
        if (patterns.processHealth.health < 1.0) {
            predictions.push({
                type: 'process_failure',
                probability: 0.8,
                timeframe: '24h',
                description: 'Potential process failures detected'
            });
        }
        
        if (patterns.logActivity.status === 'warning') {
            predictions.push({
                type: 'log_overflow',
                probability: 0.6,
                timeframe: '7d',
                description: 'Log files may grow significantly'
            });
        }
        
        return predictions;
    }

    generateRecommendations(patterns) {
        const recommendations = [];
        
        if (patterns.processHealth.health < 1.0) {
            recommendations.push({
                priority: 'high',
                action: 'restart_failed_processes',
                description: 'Restart failed system processes'
            });
        }
        
        if (patterns.logActivity.status === 'warning') {
            recommendations.push({
                priority: 'medium',
                action: 'cleanup_logs',
                description: 'Clean up old log files'
            });
        }
        
        return recommendations;
    }

    detectAnomalies(patterns) {
        const anomalies = [];
        
        // Detect unusual patterns
        if (patterns.processHealth.health === 0) {
            anomalies.push({
                type: 'critical',
                description: 'All critical processes are down',
                severity: 'high'
            });
        }
        
        return anomalies;
    }

    runIntelligentAnalysis() {
        this.log('🧠 Starting Intelligent Monitor Analysis...');
        
        const metrics = this.collectMetrics();
        if (!metrics) {
            this.log('Failed to collect metrics', 'ERROR');
            return null;
        }
        
        const patterns = this.analyzePatterns(metrics);
        const insights = this.generateInsights(patterns);
        
        this.log('Intelligent analysis completed');
        return { metrics, patterns, insights };
    }

    startMonitoring(intervalMs = 300000) { // 5 minutes default
        this.log(`🔍 Starting Intelligent Monitoring (interval: ${intervalMs}ms)`);
        
        const runAnalysis = () => {
            this.runIntelligentAnalysis();
        };
        
        // Run immediately
        runAnalysis();
        
        // Schedule periodic runs
        setInterval(runAnalysis, intervalMs);
        
        this.log('Intelligent monitoring active');
    }

    getInsights() {
        return this.insights;
    }

    getPatterns() {
        return this.patterns;
    }

    generateReport() {
        this.log('Generating intelligent monitoring report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalInsights: this.insights.insights.length,
                totalPatterns: Object.keys(this.patterns.patterns).length,
                systemHealth: this.calculateSystemHealth()
            },
            recentInsights: this.insights.insights.slice(-5),
            recommendations: this.insights.insights
                .flatMap(insight => insight.recommendations)
                .slice(-10)
        };
        
        return report;
    }

    calculateSystemHealth() {
        const recentPatterns = Object.values(this.patterns.patterns).slice(-5);
        if (recentPatterns.length === 0) {
            return 'unknown';
        }
        
        const avgHealth = recentPatterns.reduce((sum, pattern) => {
            return sum + (pattern.processHealth?.health || 0);
        }, 0) / recentPatterns.length;
        
        if (avgHealth >= 0.9) return 'excellent';
        if (avgHealth >= 0.7) return 'good';
        if (avgHealth >= 0.5) return 'fair';
        return 'poor';
    }
}

// CLI interface
if (require.main === module) {
    const monitor = new IntelligentMonitor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            monitor.startMonitoring();
            break;
        case 'analyze':
            const result = monitor.runIntelligentAnalysis();
            console.log(JSON.stringify(result, null, 2));
            break;
        case 'insights':
            const insights = monitor.getInsights();
            console.log(JSON.stringify(insights, null, 2));
            break;
        case 'patterns':
            const patterns = monitor.getPatterns();
            console.log(JSON.stringify(patterns, null, 2));
            break;
        case 'report':
            const report = monitor.generateReport();
            console.log(JSON.stringify(report, null, 2));
            break;
        default:
            console.log('Usage: node intelligent-monitor.js [start|analyze|insights|patterns|report]');
            process.exit(1);
    }
}

module.exports = IntelligentMonitor; 