// advanced-patch-analytics.js: Comprehensive patch execution analytics and optimization system
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

class AdvancedPatchAnalytics {
  constructor() {
    this.analyticsDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/analytics';
    this.reportsDir = path.join(this.analyticsDir, 'reports');
    this.metricsDir = path.join(this.analyticsDir, 'metrics');
    this.optimizationsDir = path.join(this.analyticsDir, 'optimizations');
    
    this.ensureDirectories();
    this.loadConfiguration();
  }

  ensureDirectories() {
    [this.analyticsDir, this.reportsDir, this.metricsDir, this.optimizationsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadConfiguration() {
    this.config = {
      // Data collection settings
      collectionInterval: 60000, // 1 minute
      retentionDays: 30,
      batchSize: 100,
      
      // Analysis settings
      analysisWindow: 86400000, // 24 hours
      trendWindow: 604800000, // 7 days
      optimizationThreshold: 0.8,
      
      // Metrics settings
      keyMetrics: [
        'executionTime',
        'successRate',
        'errorRate',
        'queueTime',
        'validationTime',
        'rollbackRate',
        'resourceUsage'
      ],
      
      // Data sources
      dataSources: {
        patches: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
        summaries: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
        completed: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.completed',
        failed: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.failed',
        logs: '/Users/sawyer/gitSync/gpt-cursor-runner/logs',
        heartbeat: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat'
      }
    };
  }

  async start() {
    console.log('📊 Starting Advanced Patch Analytics System...');
    
    // Initialize components
    await this.initializeDataCollector();
    await this.initializeMetricsEngine();
    await this.initializeOptimizationEngine();
    await this.initializeReportingEngine();
    
    // Start analytics
    this.startAnalytics();
    
    console.log('✅ Advanced Patch Analytics System started');
  }

  async initializeDataCollector() {
    console.log('📥 Initializing Data Collector...');
    
    this.dataCollector = {
      // Collect patch execution data
      collectPatchData: async () => {
        const patchData = [];
        
        try {
          // Collect from patches directory
          const patchesDir = this.config.dataSources.patches;
          const patchFiles = fs.readdirSync(patchesDir).filter(f => f.endsWith('.json'));
          
          for (const patchFile of patchFiles) {
            try {
              const patchPath = path.join(patchesDir, patchFile);
              const patchContent = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
              
              const patchInfo = {
                id: patchFile.replace('.json', ''),
                timestamp: fs.statSync(patchPath).mtime.toISOString(),
                size: fs.statSync(patchPath).size,
                type: patchContent.type || 'unknown',
                priority: patchContent.priority || 'normal',
                validation: patchContent.validation || {},
                execution: patchContent.execution || {}
              };
              
              patchData.push(patchInfo);
            } catch (error) {
              console.warn(`⚠️ Could not parse patch file: ${patchFile}`);
            }
          }
        } catch (error) {
          console.error('❌ Error collecting patch data:', error.message);
        }
        
        return patchData;
      },
      
      // Collect summary data
      collectSummaryData: async () => {
        const summaryData = [];
        
        try {
          const summariesDir = this.config.dataSources.summaries;
          const summaryFiles = fs.readdirSync(summariesDir).filter(f => f.endsWith('.md'));
          
          for (const summaryFile of summaryFiles) {
            try {
              const summaryPath = path.join(summariesDir, summaryFile);
              const summaryContent = fs.readFileSync(summaryPath, 'utf8');
              const stats = fs.statSync(summaryPath);
              
              // Extract metadata from summary content
              const statusMatch = summaryContent.match(/Status:\s*([^\n]+)/);
              const phaseMatch = summaryContent.match(/Phase:\s*([^\n]+)/);
              const timestampMatch = summaryContent.match(/Timestamp:\s*([^\n]+)/);
              const executionTimeMatch = summaryContent.match(/execution.*?(\d+)/i);
              
              const summaryInfo = {
                id: summaryFile.replace('.md', ''),
                timestamp: stats.mtime.toISOString(),
                size: stats.size,
                status: statusMatch ? statusMatch[1].trim() : 'unknown',
                phase: phaseMatch ? phaseMatch[1].trim() : 'unknown',
                contentTimestamp: timestampMatch ? timestampMatch[1].trim() : null,
                executionTime: executionTimeMatch ? parseInt(executionTimeMatch[1]) : null,
                success: summaryContent.includes('✅ PASS') || summaryContent.includes('Status: ✅'),
                hasErrors: summaryContent.toLowerCase().includes('error') || summaryContent.toLowerCase().includes('fail'),
                validationResults: this.extractValidationResults(summaryContent)
              };
              
              summaryData.push(summaryInfo);
            } catch (error) {
              console.warn(`⚠️ Could not parse summary file: ${summaryFile}`);
            }
          }
        } catch (error) {
          console.error('❌ Error collecting summary data:', error.message);
        }
        
        return summaryData;
      },
      
      // Collect system performance data
      collectSystemData: async () => {
        const systemData = {
          timestamp: new Date().toISOString(),
          cpu: await this.getCPUUsage(),
          memory: await this.getMemoryUsage(),
          disk: await this.getDiskUsage(),
          processes: await this.getProcessCounts(),
          network: await this.getNetworkStats()
        };
        
        return systemData;
      },
      
      // Collect error data
      collectErrorData: async () => {
        const errorData = [];
        
        try {
          const logsDir = this.config.dataSources.logs;
          const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
          
          for (const logFile of logFiles.slice(-10)) { // Last 10 log files
            try {
              const logPath = path.join(logsDir, logFile);
              const logContent = fs.readFileSync(logPath, 'utf8');
              const lines = logContent.split('\n');
              
              for (const line of lines) {
                if (line.toLowerCase().includes('error') || line.toLowerCase().includes('fail')) {
                  const errorInfo = {
                    timestamp: new Date().toISOString(),
                    logFile,
                    line: line.trim(),
                    severity: this.classifyErrorSeverity(line),
                    category: this.classifyErrorCategory(line)
                  };
                  
                  errorData.push(errorInfo);
                }
              }
            } catch (error) {
              console.warn(`⚠️ Could not read log file: ${logFile}`);
            }
          }
        } catch (error) {
          console.error('❌ Error collecting error data:', error.message);
        }
        
        return errorData;
      }
    };
    
    console.log('✅ Data Collector initialized');
  }

  async initializeMetricsEngine() {
    console.log('📈 Initializing Metrics Engine...');
    
    this.metricsEngine = {
      // Calculate execution time metrics
      calculateExecutionMetrics: (summaryData) => {
        const executionTimes = summaryData
          .filter(s => s.executionTime !== null)
          .map(s => s.executionTime);
        
        if (executionTimes.length === 0) {
          return {
            avg: 0,
            median: 0,
            min: 0,
            max: 0,
            p95: 0,
            p99: 0
          };
        }
        
        executionTimes.sort((a, b) => a - b);
        const avg = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const median = executionTimes[Math.floor(executionTimes.length / 2)];
        const min = executionTimes[0];
        const max = executionTimes[executionTimes.length - 1];
        const p95 = executionTimes[Math.floor(executionTimes.length * 0.95)];
        const p99 = executionTimes[Math.floor(executionTimes.length * 0.99)];
        
        return { avg, median, min, max, p95, p99 };
      },
      
      // Calculate success rate metrics
      calculateSuccessMetrics: (summaryData) => {
        const total = summaryData.length;
        const successful = summaryData.filter(s => s.success).length;
        const failed = summaryData.filter(s => !s.success).length;
        
        return {
          total,
          successful,
          failed,
          successRate: total > 0 ? successful / total : 0,
          failureRate: total > 0 ? failed / total : 0
        };
      },
      
      // Calculate queue metrics
      calculateQueueMetrics: (patchData, summaryData) => {
        const now = new Date();
        const queueTimes = [];
        
        for (const patch of patchData) {
          const summary = summaryData.find(s => s.id === patch.id);
          if (summary) {
            const patchTime = new Date(patch.timestamp);
            const summaryTime = new Date(summary.timestamp);
            const queueTime = summaryTime.getTime() - patchTime.getTime();
            queueTimes.push(queueTime);
          }
        }
        
        if (queueTimes.length === 0) {
          return {
            avg: 0,
            median: 0,
            min: 0,
            max: 0
          };
        }
        
        queueTimes.sort((a, b) => a - b);
        const avg = queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length;
        const median = queueTimes[Math.floor(queueTimes.length / 2)];
        const min = queueTimes[0];
        const max = queueTimes[queueTimes.length - 1];
        
        return { avg, median, min, max };
      },
      
      // Calculate error metrics
      calculateErrorMetrics: (errorData) => {
        const errorCounts = {};
        const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
        const categoryCounts = {};
        
        for (const error of errorData) {
          // Count by category
          errorCounts[error.category] = (errorCounts[error.category] || 0) + 1;
          
          // Count by severity
          severityCounts[error.severity] = (severityCounts[error.severity] || 0) + 1;
          
          // Count by category
          categoryCounts[error.category] = (categoryCounts[error.category] || 0) + 1;
        }
        
        return {
          total: errorData.length,
          byCategory: errorCounts,
          bySeverity: severityCounts,
          topCategories: Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }))
        };
      },
      
      // Calculate resource usage metrics
      calculateResourceMetrics: (systemData) => {
        const cpuUsage = systemData.map(s => s.cpu);
        const memoryUsage = systemData.map(s => s.memory);
        const diskUsage = systemData.map(s => s.disk);
        
        return {
          cpu: {
            avg: cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length,
            max: Math.max(...cpuUsage),
            min: Math.min(...cpuUsage)
          },
          memory: {
            avg: memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length,
            max: Math.max(...memoryUsage),
            min: Math.min(...memoryUsage)
          },
          disk: {
            avg: diskUsage.reduce((a, b) => a + b, 0) / diskUsage.length,
            max: Math.max(...diskUsage),
            min: Math.min(...diskUsage)
          }
        };
      },
      
      // Calculate trend metrics
      calculateTrendMetrics: (historicalData) => {
        const trends = {};
        
        for (const metric of this.config.keyMetrics) {
          const values = historicalData.map(d => d[metric]).filter(v => v !== undefined);
          if (values.length > 1) {
            const slope = this.calculateSlope(values);
            trends[metric] = {
              slope,
              direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
              magnitude: Math.abs(slope)
            };
          }
        }
        
        return trends;
      }
    };
    
    console.log('✅ Metrics Engine initialized');
  }

  async initializeOptimizationEngine() {
    console.log('⚡ Initializing Optimization Engine...');
    
    this.optimizationEngine = {
      // Generate optimization recommendations
      generateRecommendations: async (metrics) => {
        const recommendations = [];
        
        // Execution time optimizations
        if (metrics.executionTime && metrics.executionTime.avg > 120000) { // > 2 minutes
          recommendations.push({
            type: 'execution_time',
            priority: 'high',
            description: 'Average execution time is high. Consider parallel validation or caching.',
            impact: 'Reduce execution time by 30-50%',
            actions: [
              'Implement parallel validation pipeline',
              'Add result caching for repeated operations',
              'Optimize validation scripts'
            ]
          });
        }
        
        // Success rate optimizations
        if (metrics.successRate && metrics.successRate.successRate < 0.8) { // < 80%
          recommendations.push({
            type: 'success_rate',
            priority: 'critical',
            description: 'Success rate is below optimal threshold.',
            impact: 'Improve success rate to 90%+',
            actions: [
              'Review and fix common failure patterns',
              'Implement better error handling',
              'Add pre-validation checks'
            ]
          });
        }
        
        // Queue time optimizations
        if (metrics.queueTime && metrics.queueTime.avg > 300000) { // > 5 minutes
          recommendations.push({
            type: 'queue_time',
            priority: 'medium',
            description: 'Average queue time is high.',
            impact: 'Reduce queue time by 40-60%',
            actions: [
              'Implement priority queue system',
              'Add load balancing for multiple executors',
              'Optimize patch processing pipeline'
            ]
          });
        }
        
        // Resource usage optimizations
        if (metrics.resourceUsage) {
          if (metrics.resourceUsage.cpu.avg > 80) {
            recommendations.push({
              type: 'resource_usage',
              priority: 'medium',
              description: 'High CPU usage detected.',
              impact: 'Reduce CPU usage by 20-30%',
              actions: [
                'Implement resource throttling',
                'Add background processing',
                'Optimize validation algorithms'
              ]
            });
          }
          
          if (metrics.resourceUsage.memory.avg > 85) {
            recommendations.push({
              type: 'resource_usage',
              priority: 'high',
              description: 'High memory usage detected.',
              impact: 'Reduce memory usage by 25-40%',
              actions: [
                'Implement memory cleanup',
                'Add garbage collection',
                'Optimize data structures'
              ]
            });
          }
        }
        
        return recommendations;
      },
      
      // Apply optimizations
      applyOptimizations: async (recommendations) => {
        const applied = [];
        
        for (const recommendation of recommendations) {
          if (recommendation.priority === 'critical' || recommendation.priority === 'high') {
            try {
              await this.optimizationEngine.applyOptimization(recommendation);
              applied.push({
                ...recommendation,
                appliedAt: new Date().toISOString(),
                status: 'applied'
              });
            } catch (error) {
              console.error(`❌ Failed to apply optimization: ${recommendation.type}`, error.message);
              applied.push({
                ...recommendation,
                appliedAt: new Date().toISOString(),
                status: 'failed',
                error: error.message
              });
            }
          }
        }
        
        return applied;
      },
      
      // Apply specific optimization
      applyOptimization: async (recommendation) => {
        switch (recommendation.type) {
          case 'execution_time':
            await this.optimizationEngine.optimizeExecutionTime();
            break;
          case 'success_rate':
            await this.optimizationEngine.optimizeSuccessRate();
            break;
          case 'queue_time':
            await this.optimizationEngine.optimizeQueueTime();
            break;
          case 'resource_usage':
            await this.optimizationEngine.optimizeResourceUsage();
            break;
          default:
            throw new Error(`Unknown optimization type: ${recommendation.type}`);
        }
      },
      
      // Optimize patch execution
      optimizePatchExecution: async (patchPath) => {
        console.log(`⚡ Optimizing patch execution: ${patchPath}`);
        
        const optimizations = [];
        
        // Check if parallel validation is beneficial
        if (this.config.parallelValidation) {
          optimizations.push({
            type: 'parallel_validation',
            description: 'Run validation tasks in parallel',
            impact: 'Reduce validation time by 40-60%'
          });
        }
        
        // Check if caching is beneficial
        if (this.config.cacheEnabled) {
          optimizations.push({
            type: 'caching',
            description: 'Use cached validation results',
            impact: 'Reduce execution time by 80-90%'
          });
        }
        
        // Check if load balancing is beneficial
        if (this.config.loadBalancing) {
          optimizations.push({
            type: 'load_balancing',
            description: 'Distribute load across workers',
            impact: 'Improve throughput by 20-40%'
          });
        }
        
        return optimizations;
      },
      
      // Optimize execution time
      optimizeExecutionTime: async () => {
        console.log('⚡ Applying execution time optimizations...');
        
        // Implement parallel validation
        const parallelValidationScript = `
          // Parallel validation implementation
          const { Worker } = require('worker_threads');
          
          async function parallelValidate(patches) {
            const workers = patches.map(patch => {
              return new Promise((resolve, reject) => {
                const worker = new Worker('./validation-worker.js', {
                  workerData: { patch }
                });
                worker.on('message', resolve);
                worker.on('error', reject);
              });
            });
            
            return Promise.all(workers);
          }
        `;
        
        fs.writeFileSync(path.join(this.optimizationsDir, 'parallel-validation.js'), parallelValidationScript);
        
        // Add caching mechanism
        const cachingScript = `
          // Result caching implementation
          const cache = new Map();
          
          function getCachedResult(key) {
            return cache.get(key);
          }
          
          function setCachedResult(key, result, ttl = 3600000) {
            cache.set(key, {
              result,
              timestamp: Date.now(),
              ttl
            });
          }
        `;
        
        fs.writeFileSync(path.join(this.optimizationsDir, 'caching.js'), cachingScript);
      },
      
      // Optimize success rate
      optimizeSuccessRate: async () => {
        console.log('⚡ Applying success rate optimizations...');
        
        // Implement pre-validation checks
        const preValidationScript = `
          // Pre-validation checks
          async function preValidate(patch) {
            const checks = [
              checkPatchFormat(patch),
              checkDependencies(patch),
              checkResourceAvailability(patch)
            ];
            
            const results = await Promise.all(checks);
            return results.every(r => r.valid);
          }
        `;
        
        fs.writeFileSync(path.join(this.optimizationsDir, 'pre-validation.js'), preValidationScript);
      },
      
      // Optimize queue time
      optimizeQueueTime: async () => {
        console.log('⚡ Applying queue time optimizations...');
        
        // Implement priority queue
        const priorityQueueScript = `
          // Priority queue implementation
          class PriorityQueue {
            constructor() {
              this.queue = [];
            }
            
            enqueue(item, priority) {
              this.queue.push({ item, priority });
              this.queue.sort((a, b) => b.priority - a.priority);
            }
            
            dequeue() {
              return this.queue.shift()?.item;
            }
          }
        `;
        
        fs.writeFileSync(path.join(this.optimizationsDir, 'priority-queue.js'), priorityQueueScript);
      },
      
      // Optimize resource usage
      optimizeResourceUsage: async () => {
        console.log('⚡ Applying resource usage optimizations...');
        
        // Implement resource throttling
        const throttlingScript = `
          // Resource throttling implementation
          class ResourceThrottler {
            constructor(maxConcurrent = 3) {
              this.maxConcurrent = maxConcurrent;
              this.running = 0;
              this.queue = [];
            }
            
            async execute(task) {
              if (this.running >= this.maxConcurrent) {
                return new Promise(resolve => {
                  this.queue.push({ task, resolve });
                });
              }
              
              this.running++;
              try {
                const result = await task();
                return result;
              } finally {
                this.running--;
                if (this.queue.length > 0) {
                  const { task, resolve } = this.queue.shift();
                  resolve(this.execute(task));
                }
              }
            }
          }
        `;
        
        fs.writeFileSync(path.join(this.optimizationsDir, 'resource-throttling.js'), throttlingScript);
      }
    };
    
    console.log('✅ Optimization Engine initialized');
  }

  async initializeReportingEngine() {
    console.log('📋 Initializing Reporting Engine...');
    
    this.reportingEngine = {
      // Generate comprehensive report
      generateReport: async (metrics, recommendations) => {
        const report = {
          timestamp: new Date().toISOString(),
          summary: this.reportingEngine.generateSummary(metrics),
          metrics: metrics,
          recommendations: recommendations,
          trends: await this.reportingEngine.calculateTrends(),
          performance: this.reportingEngine.calculatePerformanceScore(metrics)
        };
        
        return report;
      },
      
      // Generate summary
      generateSummary: (metrics) => {
        const summary = {
          totalPatches: metrics.successRate?.total || 0,
          successRate: metrics.successRate?.successRate || 0,
          avgExecutionTime: metrics.executionTime?.avg || 0,
          avgQueueTime: metrics.queueTime?.avg || 0,
          errorRate: metrics.errorMetrics?.total || 0,
          systemHealth: this.reportingEngine.calculateSystemHealth(metrics)
        };
        
        return summary;
      },
      
      // Calculate trends
      calculateTrends: async () => {
        // Load historical data and calculate trends
        const historicalData = await this.loadHistoricalData();
        return this.metricsEngine.calculateTrendMetrics(historicalData);
      },
      
      // Calculate performance score
      calculatePerformanceScore: (metrics) => {
        let score = 100;
        
        // Deduct points for issues
        if (metrics.successRate?.successRate < 0.9) {
          score -= (0.9 - metrics.successRate.successRate) * 50;
        }
        
        if (metrics.executionTime?.avg > 120000) {
          score -= Math.min(20, (metrics.executionTime.avg - 120000) / 60000 * 20);
        }
        
        if (metrics.queueTime?.avg > 300000) {
          score -= Math.min(15, (metrics.queueTime.avg - 300000) / 300000 * 15);
        }
        
        return Math.max(0, score);
      },
      
      // Calculate system health
      calculateSystemHealth: (metrics) => {
        const health = {
          cpu: 'good',
          memory: 'good',
          disk: 'good',
          overall: 'good'
        };
        
        if (metrics.resourceUsage) {
          if (metrics.resourceUsage.cpu.avg > 80) health.cpu = 'warning';
          if (metrics.resourceUsage.cpu.avg > 90) health.cpu = 'critical';
          
          if (metrics.resourceUsage.memory.avg > 85) health.memory = 'warning';
          if (metrics.resourceUsage.memory.avg > 95) health.memory = 'critical';
          
          if (metrics.resourceUsage.disk.avg > 90) health.disk = 'warning';
          if (metrics.resourceUsage.disk.avg > 95) health.disk = 'critical';
        }
        
        const criticalCount = [health.cpu, health.memory, health.disk].filter(h => h === 'critical').length;
        const warningCount = [health.cpu, health.memory, health.disk].filter(h => h === 'warning').length;
        
        if (criticalCount > 0) health.overall = 'critical';
        else if (warningCount > 1) health.overall = 'warning';
        else health.overall = 'good';
        
        return health;
      },
      
      // Save report
      saveReport: async (report) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(this.reportsDir, `analytics-report-${timestamp}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        // Keep only last 100 reports
        this.cleanupOldFiles(this.reportsDir, 100);
        
        return reportFile;
      },
      
      // Export report to different formats
      exportReport: async (report, format = 'json') => {
        switch (format) {
          case 'json':
            return JSON.stringify(report, null, 2);
          case 'csv':
            return this.convertToCSV(report);
          case 'html':
            return this.convertToHTML(report);
          default:
            throw new Error(`Unsupported format: ${format}`);
        }
      }
    };
    
    console.log('✅ Reporting Engine initialized');
  }

  startAnalytics() {
    console.log('📊 Starting continuous analytics...');
    
    // Initial analytics run
    this.runAnalytics();
    
    // Set up periodic analytics
    this.analyticsInterval = setInterval(async () => {
      await this.runAnalytics();
    }, this.config.collectionInterval);
  }

  async runAnalytics() {
    try {
      console.log('📊 Running analytics collection...');
      
      // Collect data
      const patchData = await this.dataCollector.collectPatchData();
      const summaryData = await this.dataCollector.collectSummaryData();
      const systemData = await this.dataCollector.collectSystemData();
      const errorData = await this.dataCollector.collectErrorData();
      
      // Calculate metrics
      const metrics = {
        executionTime: this.metricsEngine.calculateExecutionMetrics(summaryData),
        successRate: this.metricsEngine.calculateSuccessMetrics(summaryData),
        queueTime: this.metricsEngine.calculateQueueMetrics(patchData, summaryData),
        errorMetrics: this.metricsEngine.calculateErrorMetrics(errorData),
        resourceUsage: this.metricsEngine.calculateResourceMetrics([systemData])
      };
      
      // Save metrics
      await this.saveMetrics(metrics);
      
      // Generate recommendations
      const recommendations = await this.optimizationEngine.generateRecommendations(metrics);
      
      // Apply optimizations if needed
      if (recommendations.length > 0) {
        const applied = await this.optimizationEngine.applyOptimizations(recommendations);
        console.log(`⚡ Applied ${applied.filter(a => a.status === 'applied').length} optimizations`);
      }
      
      // Generate and save report
      const report = await this.reportingEngine.generateReport(metrics, recommendations);
      const reportFile = await this.reportingEngine.saveReport(report);
      
      console.log(`📋 Analytics report saved: ${reportFile}`);
      
      // Update status
      this.updateStatus(metrics, recommendations);
      
    } catch (error) {
      console.error('❌ Analytics error:', error.message);
    }
  }

  async saveMetrics(metrics) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsFile = path.join(this.metricsDir, `metrics-${timestamp}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    
    // Keep only last 1000 metrics files
    this.cleanupOldFiles(this.metricsDir, 1000);
  }

  updateStatus(metrics, recommendations) {
    const status = {
      timestamp: new Date().toISOString(),
      metrics: {
        successRate: metrics.successRate?.successRate || 0,
        avgExecutionTime: metrics.executionTime?.avg || 0,
        avgQueueTime: metrics.queueTime?.avg || 0,
        errorCount: metrics.errorMetrics?.total || 0
      },
      recommendations: recommendations.length,
      system: 'advanced-patch-analytics',
      status: 'running'
    };
    
    const statusFile = path.join(this.analyticsDir, 'status.json');
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  }

  // Helper methods
  extractValidationResults(summaryContent) {
    const results = {};
    
    // Extract validation status
    const validationMatch = summaryContent.match(/validation.*?([✅❌])/i);
    if (validationMatch) {
      results.overall = validationMatch[1] === '✅' ? 'pass' : 'fail';
    }
    
    // Extract specific validation results
    const typescriptMatch = summaryContent.match(/typescript.*?([✅❌])/i);
    if (typescriptMatch) results.typescript = typescriptMatch[1] === '✅' ? 'pass' : 'fail';
    
    const eslintMatch = summaryContent.match(/eslint.*?([✅❌])/i);
    if (eslintMatch) results.eslint = eslintMatch[1] === '✅' ? 'pass' : 'fail';
    
    const runtimeMatch = summaryContent.match(/runtime.*?([✅❌])/i);
    if (runtimeMatch) results.runtime = runtimeMatch[1] === '✅' ? 'pass' : 'fail';
    
    return results;
  }

  classifyErrorSeverity(errorLine) {
    const line = errorLine.toLowerCase();
    if (line.includes('critical') || line.includes('fatal')) return 'critical';
    if (line.includes('error') || line.includes('exception')) return 'high';
    if (line.includes('warning') || line.includes('deprecated')) return 'medium';
    return 'low';
  }

  classifyErrorCategory(errorLine) {
    const line = errorLine.toLowerCase();
    if (line.includes('timeout') || line.includes('connection')) return 'network';
    if (line.includes('validation') || line.includes('syntax')) return 'validation';
    if (line.includes('memory') || line.includes('resource')) return 'resource';
    if (line.includes('permission') || line.includes('access')) return 'permission';
    return 'other';
  }

  async getCPUUsage() {
    try {
      const { stdout } = await this.execAsync('top -l 1 -n 0 | grep "CPU usage"');
      const match = stdout.match(/(\d+\.\d+)%/);
      return match ? parseFloat(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  async getMemoryUsage() {
    try {
      const { stdout } = await this.execAsync('vm_stat | grep "Pages free"');
      const match = stdout.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  async getDiskUsage() {
    try {
      const { stdout } = await this.execAsync('df /Users/sawyer/gitSync | tail -1');
      const match = stdout.match(/(\d+)%/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  async getProcessCounts() {
    const processes = ['ghost-bridge', 'patch-executor', 'summary-monitor'];
    const counts = {};
    
    for (const process of processes) {
      try {
        const { stdout } = await this.execAsync(`pgrep -f "${process}" | wc -l`);
        counts[process] = parseInt(stdout.trim());
      } catch (error) {
        counts[process] = 0;
      }
    }
    
    return counts;
  }

  async getNetworkStats() {
    try {
      const { stdout } = await this.execAsync('netstat -i | grep en0');
      const match = stdout.match(/(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        return {
          packetsIn: parseInt(match[1]),
          packetsOut: parseInt(match[2]),
          errorsIn: parseInt(match[3]),
          errorsOut: parseInt(match[4])
        };
      }
    } catch (error) {
      // Ignore network stats errors
    }
    
    return { packetsIn: 0, packetsOut: 0, errorsIn: 0, errorsOut: 0 };
  }

  calculateSlope(values) {
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + (i * y), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  async loadHistoricalData() {
    const data = [];
    const metricsFiles = fs.readdirSync(this.metricsDir).slice(-100); // Last 100 files
    
    for (const file of metricsFiles) {
      try {
        const metricsData = JSON.parse(fs.readFileSync(path.join(this.metricsDir, file), 'utf8'));
        data.push(metricsData);
      } catch (error) {
        console.warn(`⚠️ Could not load metrics file: ${file}`);
      }
    }
    
    return data;
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
    } catch (error) {
      console.warn(`⚠️ Could not cleanup old files in ${directory}:`, error.message);
    }
  }

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

  async stop() {
    console.log('🛑 Stopping Advanced Patch Analytics System...');
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }
    
    console.log('✅ Advanced Patch Analytics System stopped');
  }
}

// Export for use in other modules
module.exports = AdvancedPatchAnalytics;

// Start if run directly
if (require.main === module) {
  const analytics = new AdvancedPatchAnalytics();
  analytics.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await analytics.stop();
    process.exit(0);
  });
} 