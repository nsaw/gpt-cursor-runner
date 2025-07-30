// load-balancer-system.js: Comprehensive load balancing system for multiple autonomous triggers
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

class LoadBalancerSystem {
  constructor() {
    this.loadBalancerDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/load-balancer';
    this.configsDir = path.join(this.loadBalancerDir, 'configs');
    this.monitoringDir = path.join(this.loadBalancerDir, 'monitoring');
    this.routingDir = path.join(this.loadBalancerDir, 'routing');
    this.healthDir = path.join(this.loadBalancerDir, 'health');
    
    this.ensureDirectories();
    this.loadConfiguration();
  }

  ensureDirectories() {
    [this.loadBalancerDir, this.configsDir, this.monitoringDir, this.routingDir, this.healthDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadConfiguration() {
    this.config = {
      // Load balancer settings
      port: 8791,
      maxTriggers: 5,
      healthCheckInterval: 30000, // 30 seconds
      failoverEnabled: true,
      autoScaling: true,
      
      // Load balancing algorithms
      algorithms: {
        roundRobin: {
          name: 'round-robin',
          description: 'Distribute requests in round-robin fashion',
          enabled: true
        },
        leastConnections: {
          name: 'least-connections',
          description: 'Route to trigger with least active connections',
          enabled: true
        },
        weightedRoundRobin: {
          name: 'weighted-round-robin',
          description: 'Round-robin with performance-based weights',
          enabled: true
        },
        ipHash: {
          name: 'ip-hash',
          description: 'Route based on client IP hash',
          enabled: false
        },
        leastResponseTime: {
          name: 'least-response-time',
          description: 'Route to trigger with fastest response time',
          enabled: true
        }
      },
      
      // Trigger configuration
      triggers: [
        {
          id: 'trigger-1',
          name: 'Autonomous Trigger 1',
          host: 'localhost',
          port: 8790,
          weight: 1,
          maxConnections: 10,
          healthCheck: '/health',
          status: 'active'
        },
        {
          id: 'trigger-2',
          name: 'Autonomous Trigger 2',
          host: 'localhost',
          port: 8792,
          weight: 1,
          maxConnections: 10,
          healthCheck: '/health',
          status: 'active'
        },
        {
          id: 'trigger-3',
          name: 'Autonomous Trigger 3',
          host: 'localhost',
          port: 8793,
          weight: 1,
          maxConnections: 10,
          healthCheck: '/health',
          status: 'active'
        }
      ],
      
      // Health check settings
      healthCheck: {
        timeout: 5000,
        interval: 30000,
        unhealthyThreshold: 3,
        healthyThreshold: 2
      },
      
      // Auto-scaling settings
      autoScaling: {
        enabled: true,
        minTriggers: 2,
        maxTriggers: 5,
        scaleUpThreshold: 80, // CPU usage
        scaleDownThreshold: 30, // CPU usage
        scaleUpCooldown: 300000, // 5 minutes
        scaleDownCooldown: 600000 // 10 minutes
      }
    };
  }

  async start() {
    console.log('⚖️ Starting Load Balancer System...');
    
    // Initialize components
    await this.initializeLoadBalancer();
    await this.initializeHealthChecker();
    await this.initializeAutoScaler();
    await this.initializeRoutingEngine();
    await this.initializeMonitoringSystem();
    
    // Start load balancer
    this.startLoadBalancer();
    
    console.log('✅ Load Balancer System started');
  }

  async initializeLoadBalancer() {
    console.log('⚖️ Initializing Load Balancer...');
    
    this.loadBalancer = {
      currentAlgorithm: 'round-robin',
      currentIndex: 0,
      triggerStats: new Map(),
      
      // Initialize trigger statistics
      initializeTriggerStats: () => {
        for (const trigger of this.config.triggers) {
          this.loadBalancer.triggerStats.set(trigger.id, {
            activeConnections: 0,
            totalRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastResponseTime: 0,
            healthStatus: 'unknown',
            lastHealthCheck: null
          });
        }
      },
      
      // Route request
      routeRequest: async (request) => {
        console.log(`🔄 Routing request: ${request.id}`);
        
        const algorithm = this.loadBalancer.currentAlgorithm;
        let selectedTrigger = null;
        
        switch (algorithm) {
        case 'round-robin':
          selectedTrigger = this.loadBalancer.roundRobin();
          break;
        case 'least-connections':
          selectedTrigger = this.loadBalancer.leastConnections();
          break;
        case 'weighted-round-robin':
          selectedTrigger = this.loadBalancer.weightedRoundRobin();
          break;
        case 'ip-hash':
          selectedTrigger = this.loadBalancer.ipHash(request.clientIP);
          break;
        case 'least-response-time':
          selectedTrigger = this.loadBalancer.leastResponseTime();
          break;
        default:
          selectedTrigger = this.loadBalancer.roundRobin();
        }
        
        if (!selectedTrigger) {
          throw new Error('No available triggers');
        }
        
        // Update statistics
        this.loadBalancer.updateTriggerStats(selectedTrigger.id, 'request');
        
        // Forward request
        const result = await this.loadBalancer.forwardRequest(selectedTrigger, request);
        
        // Update response statistics
        this.loadBalancer.updateTriggerStats(selectedTrigger.id, 'response', result.responseTime);
        
        return result;
      },
      
      // Round-robin algorithm
      roundRobin: () => {
        const availableTriggers = this.getAvailableTriggers();
        if (availableTriggers.length === 0) {
          return null;
        }
        
        const trigger = availableTriggers[this.loadBalancer.currentIndex % availableTriggers.length];
        this.loadBalancer.currentIndex = (this.loadBalancer.currentIndex + 1) % availableTriggers.length;
        
        return trigger;
      },
      
      // Least connections algorithm
      leastConnections: () => {
        const availableTriggers = this.getAvailableTriggers();
        if (availableTriggers.length === 0) {
          return null;
        }
        
        return availableTriggers.reduce((least, current) => {
          const leastStats = this.loadBalancer.triggerStats.get(least.id);
          const currentStats = this.loadBalancer.triggerStats.get(current.id);
          
          return currentStats.activeConnections < leastStats.activeConnections ? current : least;
        });
      },
      
      // Weighted round-robin algorithm
      weightedRoundRobin: () => {
        const availableTriggers = this.getAvailableTriggers();
        if (availableTriggers.length === 0) {
          return null;
        }
        
        // Calculate total weight
        const totalWeight = availableTriggers.reduce((sum, trigger) => sum + trigger.weight, 0);
        
        // Use weighted selection
        let random = Math.random() * totalWeight;
        for (const trigger of availableTriggers) {
          random -= trigger.weight;
          if (random <= 0) {
            return trigger;
          }
        }
        
        return availableTriggers[0];
      },
      
      // IP hash algorithm
      ipHash: (clientIP) => {
        const availableTriggers = this.getAvailableTriggers();
        if (availableTriggers.length === 0) {
          return null;
        }
        
        // Simple hash function
        const hash = clientIP.split('.').reduce((sum, octet) => sum + parseInt(octet), 0);
        const index = hash % availableTriggers.length;
        
        return availableTriggers[index];
      },
      
      // Least response time algorithm
      leastResponseTime: () => {
        const availableTriggers = this.getAvailableTriggers();
        if (availableTriggers.length === 0) {
          return null;
        }
        
        return availableTriggers.reduce((fastest, current) => {
          const fastestStats = this.loadBalancer.triggerStats.get(fastest.id);
          const currentStats = this.loadBalancer.triggerStats.get(current.id);
          
          return currentStats.averageResponseTime < fastestStats.averageResponseTime ? current : fastest;
        });
      },
      
      // Get available triggers
      getAvailableTriggers: () => {
        return this.config.triggers.filter(trigger => {
          const stats = this.loadBalancer.triggerStats.get(trigger.id);
          return trigger.status === 'active' && 
                 stats.healthStatus === 'healthy' && 
                 stats.activeConnections < trigger.maxConnections;
        });
      },
      
      // Update trigger statistics
      updateTriggerStats: (triggerId, type, data = null) => {
        const stats = this.loadBalancer.triggerStats.get(triggerId);
        if (!stats) {
          return;
        }
        
        switch (type) {
        case 'request':
          stats.activeConnections++;
          stats.totalRequests++;
          break;
        case 'response':
          stats.activeConnections--;
          if (data) {
            stats.lastResponseTime = data;
            stats.averageResponseTime = (stats.averageResponseTime + data) / 2;
          }
          break;
        case 'failure':
          stats.failedRequests++;
          stats.activeConnections--;
          break;
        case 'health':
          stats.healthStatus = data;
          stats.lastHealthCheck = new Date().toISOString();
          break;
        }
      },
      
      // Forward request to trigger
      forwardRequest: async (trigger, request) => {
        const startTime = Date.now();
        
        try {
          const response = await axios.post(`http://${trigger.host}:${trigger.port}/execute`, {
            ...request,
            loadBalancerId: 'load-balancer-1',
            triggerId: trigger.id
          }, {
            timeout: 30000
          });
          
          const responseTime = Date.now() - startTime;
          
          return {
            success: true,
            data: response.data,
            responseTime,
            triggerId: trigger.id
          };
          
        } catch (_error) {
          const responseTime = Date.now() - startTime;
          
          // Update failure statistics
          this.loadBalancer.updateTriggerStats(trigger.id, 'failure');
          
          throw new Error(`Request failed: ${error.message}`);
        }
      },
      
      // Change algorithm
      changeAlgorithm: (algorithm) => {
        if (this.config.algorithms[algorithm] && this.config.algorithms[algorithm].enabled) {
          this.loadBalancer.currentAlgorithm = algorithm;
          console.log(`🔄 Load balancing algorithm changed to: ${algorithm}`);
        } else {
          throw new Error(`Algorithm ${algorithm} is not available or disabled`);
        }
      },
      
      // Get load balancer statistics
      getStatistics: () => {
        const stats = {
          algorithm: this.loadBalancer.currentAlgorithm,
          totalRequests: 0,
          totalFailures: 0,
          averageResponseTime: 0,
          triggers: {}
        };
        
        for (const [triggerId, triggerStats] of this.loadBalancer.triggerStats) {
          stats.totalRequests += triggerStats.totalRequests;
          stats.totalFailures += triggerStats.failedRequests;
          stats.averageResponseTime += triggerStats.averageResponseTime;
          
          stats.triggers[triggerId] = {
            ...triggerStats,
            successRate: triggerStats.totalRequests > 0 ? 
              (triggerStats.totalRequests - triggerStats.failedRequests) / triggerStats.totalRequests : 0
          };
        }
        
        if (this.loadBalancer.triggerStats.size > 0) {
          stats.averageResponseTime /= this.loadBalancer.triggerStats.size;
        }
        
        return stats;
      }
    };
    
    this.loadBalancer.initializeTriggerStats();
    console.log('✅ Load Balancer initialized');
  }

  async initializeHealthChecker() {
    console.log('🏥 Initializing Health Checker...');
    
    this.healthChecker = {
      // Start health checking
      startHealthChecking: () => {
        this.healthChecker.healthCheckInterval = setInterval(async () => {
          await this.healthChecker.checkAllTriggers();
        }, this.config.healthCheck.interval);
      },
      
      // Check all triggers
      checkAllTriggers: async () => {
        console.log('🏥 Running health checks...');
        
        for (const trigger of this.config.triggers) {
          await this.healthChecker.checkTriggerHealth(trigger);
        }
      },
      
      // Check individual trigger health
      checkTriggerHealth: async (trigger) => {
        try {
          const response = await axios.get(`http://${trigger.host}:${trigger.port}${trigger.healthCheck}`, {
            timeout: this.config.healthCheck.timeout
          });
          
          const isHealthy = response.status === 200;
          this.healthChecker.updateTriggerHealth(trigger.id, isHealthy);
          
          console.log(`✅ Trigger ${trigger.id} health check: ${isHealthy ? 'healthy' : 'unhealthy'}`);
          
        } catch (_error) {
          this.healthChecker.updateTriggerHealth(trigger.id, false);
          console.log(`❌ Trigger ${trigger.id} health check failed: ${error.message}`);
        }
      },
      
      // Update trigger health status
      updateTriggerHealth: (triggerId, isHealthy) => {
        const stats = this.loadBalancer.triggerStats.get(triggerId);
        if (!stats) {
          return;
        }
        
        const newStatus = isHealthy ? 'healthy' : 'unhealthy';
        
        if (stats.healthStatus !== newStatus) {
          stats.healthStatus = newStatus;
          this.loadBalancer.updateTriggerStats(triggerId, 'health', newStatus);
          
          // Trigger failover if needed
          if (!isHealthy && this.config.failoverEnabled) {
            this.healthChecker.triggerFailover(triggerId);
          }
        }
      },
      
      // Trigger failover
      triggerFailover: (triggerId) => {
        console.log(`🔄 Triggering failover for trigger: ${triggerId}`);
        
        // Find backup trigger
        const backupTrigger = this.config.triggers.find(t => 
          t.id !== triggerId && 
          this.loadBalancer.triggerStats.get(t.id)?.healthStatus === 'healthy'
        );
        
        if (backupTrigger) {
          console.log(`✅ Failover to trigger: ${backupTrigger.id}`);
        } else {
          console.warn('⚠️ No healthy backup trigger available for failover');
        }
      }
    };
    
    console.log('✅ Health Checker initialized');
  }

  async initializeAutoScaler() {
    console.log('📈 Initializing Auto Scaler...');
    
    this.autoScaler = {
      lastScaleUp: 0,
      lastScaleDown: 0,
      
      // Start auto scaling
      startAutoScaling: () => {
        this.autoScaler.scalingInterval = setInterval(async () => {
          await this.autoScaler.checkScaling();
        }, 60000); // Check every minute
      },
      
      // Check if scaling is needed
      checkScaling: async () => {
        if (!this.config.autoScaling.enabled) {
          return;
        }
        
        const currentLoad = await this.autoScaler.getCurrentLoad();
        const currentTriggers = this.config.triggers.length;
        
        console.log(`📊 Current load: ${currentLoad}%, Triggers: ${currentTriggers}`);
        
        // Check scale up
        if (currentLoad > this.config.autoScaling.scaleUpThreshold && 
            currentTriggers < this.config.autoScaling.maxTriggers &&
            Date.now() - this.autoScaler.lastScaleUp > this.config.autoScaling.scaleUpCooldown) {
          await this.autoScaler.scaleUp();
        }
        
        // Check scale down
        if (currentLoad < this.config.autoScaling.scaleDownThreshold && 
            currentTriggers > this.config.autoScaling.minTriggers &&
            Date.now() - this.autoScaler.lastScaleDown > this.config.autoScaling.scaleDownCooldown) {
          await this.autoScaler.scaleDown();
        }
      },
      
      // Get current load
      getCurrentLoad: async () => {
        try {
          // Calculate load based on active connections and response times
          let totalLoad = 0;
          let triggerCount = 0;
          
          for (const [triggerId, stats] of this.loadBalancer.triggerStats) {
            if (stats.healthStatus === 'healthy') {
              const load = (stats.activeConnections / 10) * 100; // Assuming max 10 connections = 100% load
              totalLoad += load;
              triggerCount++;
            }
          }
          
          return triggerCount > 0 ? totalLoad / triggerCount : 0;
        } catch (_error) {
          console.error('❌ Error calculating current load:', error.message);
          return 0;
        }
      },
      
      // Scale up
      scaleUp: async () => {
        console.log('📈 Scaling up...');
        
        const newTriggerId = `trigger-${this.config.triggers.length + 1}`;
        const newPort = 8790 + this.config.triggers.length;
        
        const newTrigger = {
          id: newTriggerId,
          name: `Autonomous Trigger ${this.config.triggers.length + 1}`,
          host: 'localhost',
          port: newPort,
          weight: 1,
          maxConnections: 10,
          healthCheck: '/health',
          status: 'active'
        };
        
        // Add new trigger
        this.config.triggers.push(newTrigger);
        
        // Initialize statistics
        this.loadBalancer.triggerStats.set(newTriggerId, {
          activeConnections: 0,
          totalRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          lastResponseTime: 0,
          healthStatus: 'unknown',
          lastHealthCheck: null
        });
        
        // Start new trigger
        await this.autoScaler.startTrigger(newTrigger);
        
        this.autoScaler.lastScaleUp = Date.now();
        console.log(`✅ Scaled up to ${this.config.triggers.length} triggers`);
      },
      
      // Scale down
      scaleDown: async () => {
        console.log('📉 Scaling down...');
        
        // Find least loaded trigger
        let leastLoadedTrigger = null;
        let minLoad = Infinity;
        
        for (const trigger of this.config.triggers) {
          const stats = this.loadBalancer.triggerStats.get(trigger.id);
          if (stats && stats.activeConnections < minLoad) {
            minLoad = stats.activeConnections;
            leastLoadedTrigger = trigger;
          }
        }
        
        if (leastLoadedTrigger && minLoad === 0) {
          // Remove trigger
          this.config.triggers = this.config.triggers.filter(t => t.id !== leastLoadedTrigger.id);
          this.loadBalancer.triggerStats.delete(leastLoadedTrigger.id);
          
          // Stop trigger
          await this.autoScaler.stopTrigger(leastLoadedTrigger);
          
          this.autoScaler.lastScaleDown = Date.now();
          console.log(`✅ Scaled down to ${this.config.triggers.length} triggers`);
        }
      },
      
      // Start trigger
      startTrigger: async (trigger) => {
        console.log(`🚀 Starting trigger: ${trigger.id}`);
        
        // Implementation for starting trigger
        // This would typically involve spawning a new process or container
        console.log(`✅ Trigger ${trigger.id} started on port ${trigger.port}`);
      },
      
      // Stop trigger
      stopTrigger: async (trigger) => {
        console.log(`🛑 Stopping trigger: ${trigger.id}`);
        
        // Implementation for stopping trigger
        // This would typically involve terminating a process or container
        console.log(`✅ Trigger ${trigger.id} stopped`);
      }
    };
    
    console.log('✅ Auto Scaler initialized');
  }

  async initializeRoutingEngine() {
    console.log('🛣️ Initializing Routing Engine...');
    
    this.routingEngine = {
      // Route request
      route: async (request) => {
        console.log(`🛣️ Routing request: ${request.id}`);
        
        // Apply routing rules
        const routingRules = await this.routingEngine.getRoutingRules();
        const matchedRule = this.routingEngine.matchRule(request, routingRules);
        
        if (matchedRule) {
          // Apply rule-based routing
          return await this.routingEngine.applyRule(request, matchedRule);
        } else {
          // Use load balancer
          return await this.loadBalancer.routeRequest(request);
        }
      },
      
      // Get routing rules
      getRoutingRules: async () => {
        const rulesFile = path.join(this.routingDir, 'rules.json');
        
        if (fs.existsSync(rulesFile)) {
          return JSON.parse(fs.readFileSync(rulesFile, 'utf8'));
        }
        
        return [];
      },
      
      // Match rule
      matchRule: (request, rules) => {
        for (const rule of rules) {
          if (this.routingEngine.evaluateCondition(request, rule.condition)) {
            return rule;
          }
        }
        
        return null;
      },
      
      // Evaluate condition
      evaluateCondition: (request, condition) => {
        switch (condition.type) {
        case 'path':
          return request.path === condition.value;
        case 'method':
          return request.method === condition.value;
        case 'header':
          return request.headers[condition.name] === condition.value;
        case 'ip':
          return request.clientIP === condition.value;
        default:
          return false;
        }
      },
      
      // Apply rule
      applyRule: async (request, rule) => {
        console.log(`🛣️ Applying routing rule: ${rule.name}`);
        
        switch (rule.action.type) {
        case 'redirect':
          return await this.routingEngine.redirect(request, rule.action);
        case 'rewrite':
          return await this.routingEngine.rewrite(request, rule.action);
        case 'forward':
          return await this.routingEngine.forward(request, rule.action);
        default:
          return await this.loadBalancer.routeRequest(request);
        }
      },
      
      // Redirect request
      redirect: async (request, action) => {
        return {
          type: 'redirect',
          location: action.target,
          statusCode: action.statusCode || 302
        };
      },
      
      // Rewrite request
      rewrite: async (request, action) => {
        const rewrittenRequest = {
          ...request,
          path: action.target
        };
        
        return await this.loadBalancer.routeRequest(rewrittenRequest);
      },
      
      // Forward request
      forward: async (request, action) => {
        const targetTrigger = this.config.triggers.find(t => t.id === action.target);
        
        if (targetTrigger) {
          return await this.loadBalancer.forwardRequest(targetTrigger, request);
        } else {
          throw new Error(`Target trigger not found: ${action.target}`);
        }
      }
    };
    
    console.log('✅ Routing Engine initialized');
  }

  async initializeMonitoringSystem() {
    console.log('📊 Initializing Monitoring System...');
    
    this.monitoringSystem = {
      // Start monitoring
      startMonitoring: () => {
        this.monitoringSystem.monitoringInterval = setInterval(async () => {
          await this.monitoringSystem.collectMetrics();
        }, 30000); // Every 30 seconds
      },
      
      // Collect metrics
      collectMetrics: async () => {
        const metrics = {
          timestamp: new Date().toISOString(),
          loadBalancer: this.loadBalancer.getStatistics(),
          triggers: this.monitoringSystem.getTriggerMetrics(),
          system: await this.monitoringSystem.getSystemMetrics()
        };
        
        // Save metrics
        await this.monitoringSystem.saveMetrics(metrics);
        
        // Check for alerts
        await this.monitoringSystem.checkAlerts(metrics);
      },
      
      // Get trigger metrics
      getTriggerMetrics: () => {
        const metrics = {};
        
        for (const trigger of this.config.triggers) {
          const stats = this.loadBalancer.triggerStats.get(trigger.id);
          if (stats) {
            metrics[trigger.id] = {
              ...stats,
              trigger: {
                id: trigger.id,
                name: trigger.name,
                host: trigger.host,
                port: trigger.port,
                status: trigger.status
              }
            };
          }
        }
        
        return metrics;
      },
      
      // Get system metrics
      getSystemMetrics: async () => {
        try {
          // CPU usage
          const { stdout: cpuOutput } = await this.execAsync('top -l 1 -n 0 | grep "CPU usage"');
          const cpuMatch = cpuOutput.match(/(\d+\.\d+)%/);
          const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
          
          // Memory usage
          const { stdout: memOutput } = await this.execAsync('vm_stat | grep "Pages free"');
          const memMatch = memOutput.match(/(\d+)/);
          const memoryFree = memMatch ? parseInt(memMatch[1]) : 0;
          
          return {
            cpuUsage,
            memoryFree,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
          };
        } catch (_error) {
          return {
            cpuUsage: 0,
            memoryFree: 0,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
          };
        }
      },
      
      // Save metrics
      saveMetrics: async (metrics) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const metricsFile = path.join(this.monitoringDir, `load-balancer-${timestamp}.json`);
        fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
        
        // Keep only last 1000 metrics files
        this.cleanupOldFiles(this.monitoringDir, 1000);
      },
      
      // Check alerts
      checkAlerts: async (metrics) => {
        const alerts = [];
        
        // Check for high failure rate
        const failureRate = metrics.loadBalancer.totalFailures / metrics.loadBalancer.totalRequests;
        if (failureRate > 0.1) { // 10% failure rate
          alerts.push({
            type: 'high_failure_rate',
            message: `High failure rate: ${(failureRate * 100).toFixed(2)}%`,
            severity: 'high'
          });
        }
        
        // Check for high response time
        if (metrics.loadBalancer.averageResponseTime > 5000) { // 5 seconds
          alerts.push({
            type: 'high_response_time',
            message: `High average response time: ${metrics.loadBalancer.averageResponseTime}ms`,
            severity: 'medium'
          });
        }
        
        // Check for unhealthy triggers
        const unhealthyTriggers = Object.values(metrics.triggers).filter(t => t.healthStatus !== 'healthy');
        if (unhealthyTriggers.length > 0) {
          alerts.push({
            type: 'unhealthy_triggers',
            message: `${unhealthyTriggers.length} unhealthy triggers detected`,
            severity: 'high'
          });
        }
        
        // Send alerts if any
        if (alerts.length > 0) {
          await this.monitoringSystem.sendAlerts(alerts);
        }
      },
      
      // Send alerts
      sendAlerts: async (alerts) => {
        console.log('🚨 Sending load balancer alerts:', alerts);
        
        // Save alerts to file
        const alertFile = path.join(this.loadBalancerDir, 'alerts.json');
        const existingAlerts = fs.existsSync(alertFile) ? JSON.parse(fs.readFileSync(alertFile, 'utf8')) : [];
        const updatedAlerts = [...existingAlerts, ...alerts];
        fs.writeFileSync(alertFile, JSON.stringify(updatedAlerts, null, 2));
        
        // Send to status API if available
        try {
          await axios.post('http://localhost:8789/api/alerts', {
            type: 'load-balancer',
            alerts,
            timestamp: new Date().toISOString()
          });
        } catch (_error) {
          console.log('⚠️ Could not send alerts to status API');
        }
      }
    };
    
    console.log('✅ Monitoring System initialized');
  }

  startLoadBalancer() {
    console.log('⚖️ Starting load balancer...');
    
    // Start health checking
    this.healthChecker.startHealthChecking();
    
    // Start auto scaling
    this.autoScaler.startAutoScaling();
    
    // Start monitoring
    this.monitoringSystem.startMonitoring();
    
    console.log('✅ Load balancer started');
  }

  // Helper methods
  execAsync(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  cleanupOldFiles(directory, maxFiles) {
    try {
      const files = fs.readdirSync(directory)
        .map(file => ({ name: file, path: path.join(directory, file) }))
        .sort((a, b) => fs.statSync(b.path).mtime.getTime() - fs.statSync(a.path).mtime.getTime());
      
      if (files.length > maxFiles) {
        const filesToDelete = files.slice(maxFiles);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (_error) {
      console.warn(`⚠️ Could not cleanup old files in ${directory}:`, error.message);
    }
  }

  async stop() {
    console.log('🛑 Stopping Load Balancer System...');
    
    // Stop all intervals
    if (this.healthChecker.healthCheckInterval) {
      clearInterval(this.healthChecker.healthCheckInterval);
    }
    
    if (this.autoScaler.scalingInterval) {
      clearInterval(this.autoScaler.scalingInterval);
    }
    
    if (this.monitoringSystem.monitoringInterval) {
      clearInterval(this.monitoringSystem.monitoringInterval);
    }
    
    console.log('✅ Load Balancer System stopped');
  }
}

// Export for use in other modules
module.exports = LoadBalancerSystem;

// Start if run directly
if (require.main === module) {
  const loadBalancer = new LoadBalancerSystem();
  loadBalancer.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await loadBalancer.stop();
    process.exit(0);
  });
} 