#!/usr/bin/env node

/**
 * Automation Entrypoint Audit Script
 * Scans for all potential automation triggers, patch delivery mechanisms, and launch helpers
 * across the gpt-cursor-runner ecosystem for hardening purposes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutomationEntrypointAuditor {
  constructor() {
    this.auditResults = {
      timestamp: new Date().toISOString(),
      project: 'gpt-cursor-runner',
      summary: {
        totalEntrypoints: 0,
        criticalEntrypoints: 0,
        hardeningTargets: 0,
        recommendations: []
      },
      entrypoints: []
    };
    
    this.scanPaths = [
      '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/',
      '/Users/sawyer/gitSync/gpt-cursor-runner/runner/',
      '/Users/sawyer/gitSync/_global/',
      '/Users/sawyer/gitSync/tm-mobile-cursor/'
    ];
    
    this.triggerPatterns = {
      patchDelivery: [
        'patch-watchdog',
        'patch_runner',
        'apply_patch',
        'patch_classifier',
        'patch_metrics',
        'patch_reverter',
        'patch_viewer',
        'read_patches'
      ],
      agentLaunch: [
        'main.py',
        'gpt_cursor_runner',
        'python3 -m',
        'node.*server',
        'npm run',
        'start.*agent',
        'launch.*agent'
      ],
      commandTriggers: [
        'slack_handler',
        'slack_dispatch',
        'webhook_handler',
        'post_to_webhook',
        'slash.*command',
        'slack.*command'
      ],
      automationHelpers: [
        'launchd',
        'cron',
        'plist',
        'systemctl',
        'service',
        'daemon',
        'watchdog',
        'auto.*start',
        'boot.*script'
      ],
      devTools: [
        'dev.*tool',
        'cli.*tool',
        'validator',
        'checker',
        'linter',
        'formatter',
        'migrator'
      ]
    };
  }

  async runAudit() {
    console.log('🔍 Starting automation entrypoint audit...');
    
    try {
      // Scan each path for automation entrypoints
      for (const scanPath of this.scanPaths) {
        if (fs.existsSync(scanPath)) {
          await this.scanDirectory(scanPath);
        } else {
          console.log(`⚠️  Path not found: ${scanPath}`);
        }
      }
      
      // Analyze launchd and cron configurations
      await this.analyzeSystemAutomation();
      
      // Generate hardening recommendations
      this.generateRecommendations();
      
      // Save audit results
      this.saveResults();
      
      console.log('✅ Automation entrypoint audit completed');
      console.log(`📊 Found ${this.auditResults.summary.totalEntrypoints} entrypoints`);
      console.log(`🎯 ${this.auditResults.summary.criticalEntrypoints} critical targets identified`);
      
    } catch (error) {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    }
  }

  async scanDirectory(dirPath) {
    console.log(`📁 Scanning: ${dirPath}`);
    
    try {
      const files = this.getAllFiles(dirPath);
      
      for (const file of files) {
        const entrypoints = await this.analyzeFile(file);
        this.auditResults.entrypoints.push(...entrypoints);
      }
      
    } catch (error) {
      console.error(`❌ Error scanning ${dirPath}:`, error);
    }
  }

  getAllFiles(dirPath) {
    const files = [];
    
    function traverse(currentPath) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules, .git, and other non-relevant directories
          if (!['node_modules', '.git', 'venv', '__pycache__', '.DS_Store'].includes(item)) {
            traverse(fullPath);
          }
        } else {
          // Only analyze relevant file types
          const ext = path.extname(item).toLowerCase();
          if (['.js', '.py', '.sh', '.plist', '.cron', '.yaml', '.yml', '.json', '.md'].includes(ext) || 
              item.includes('Dockerfile') || item.includes('Makefile')) {
            files.push(fullPath);
          }
        }
      }
    }
    
    traverse(dirPath);
    return files;
  }

  async analyzeFile(filePath) {
    const entrypoints = [];
    const relativePath = path.relative(process.cwd(), filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Check for each trigger pattern
      for (const [category, patterns] of Object.entries(this.triggerPatterns)) {
        for (const pattern of patterns) {
          const regex = new RegExp(pattern, 'gi');
          const matches = content.match(regex);
          
          if (matches) {
            const entrypoint = {
              file: relativePath,
              category: category,
              pattern: pattern,
              matches: matches.length,
              riskLevel: this.assessRiskLevel(category, fileName, content),
              summary: this.generateSummary(fileName, category, pattern),
              recommendation: this.generateRecommendation(category, pattern, fileName)
            };
            
            entrypoints.push(entrypoint);
          }
        }
      }
      
      // Check for specific automation indicators
      if (this.isAutomationFile(fileName, content)) {
        entrypoints.push({
          file: relativePath,
          category: 'automation_file',
          pattern: 'automation_file',
          matches: 1,
          riskLevel: 'high',
          summary: `Automation file: ${fileName}`,
          recommendation: 'Review and harden automation logic'
        });
      }
      
    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error);
    }
    
    return entrypoints;
  }

  assessRiskLevel(category, fileName, content) {
    const highRiskPatterns = [
      'patch-watchdog',
      'main.py',
      'slack_handler',
      'webhook_handler',
      'launchd',
      'cron'
    ];
    
    const mediumRiskPatterns = [
      'patch_runner',
      'apply_patch',
      'slack_dispatch',
      'daemon',
      'service'
    ];
    
    // Check if file contains high-risk patterns
    for (const pattern of highRiskPatterns) {
      if (content.includes(pattern) || fileName.includes(pattern)) {
        return 'high';
      }
    }
    
    // Check if file contains medium-risk patterns
    for (const pattern of mediumRiskPatterns) {
      if (content.includes(pattern) || fileName.includes(pattern)) {
        return 'medium';
      }
    }
    
    return 'low';
  }

  generateSummary(fileName, category, pattern) {
    const summaries = {
      patchDelivery: `Patch delivery mechanism in ${fileName}`,
      agentLaunch: `Agent launch trigger in ${fileName}`,
      commandTriggers: `Command trigger in ${fileName}`,
      automationHelpers: `Automation helper in ${fileName}`,
      devTools: `Development tool in ${fileName}`
    };
    
    return summaries[category] || `Automation entrypoint in ${fileName}`;
  }

  generateRecommendation(category, pattern, fileName) {
    const recommendations = {
      patchDelivery: 'Implement retry logic, validation, and rollback mechanisms',
      agentLaunch: 'Add health checks, monitoring, and graceful shutdown',
      commandTriggers: 'Implement rate limiting, validation, and error handling',
      automationHelpers: 'Add logging, monitoring, and failure recovery',
      devTools: 'Add validation, error handling, and dry-run capabilities'
    };
    
    return recommendations[category] || 'Review and add appropriate safety measures';
  }

  isAutomationFile(fileName, content) {
    const automationIndicators = [
      '#!/bin/bash',
      '#!/usr/bin/env python',
      '#!/usr/bin/env node',
      'launchd',
      'cron',
      'systemctl',
      'service',
      'daemon',
      'watchdog',
      'auto.*start',
      'boot.*script'
    ];
    
    return automationIndicators.some(indicator => 
      content.includes(indicator) || fileName.includes(indicator)
    );
  }

  async analyzeSystemAutomation() {
    console.log('🔧 Analyzing system automation configurations...');
    
    try {
      // Check for launchd plists
      const launchdPath = require('os').homedir() + '/Library/LaunchAgents';
      if (fs.existsSync(launchdPath)) {
        const plists = fs.readdirSync(launchdPath).filter(file => file.endsWith('.plist'));
        
        for (const plist of plists) {
          if (plist.includes('gpt') || plist.includes('cursor') || plist.includes('runner')) {
            this.auditResults.entrypoints.push({
              file: `~/Library/LaunchAgents/${plist}`,
              category: 'system_automation',
              pattern: 'launchd_plist',
              matches: 1,
              riskLevel: 'high',
              summary: `Launchd plist: ${plist}`,
              recommendation: 'Review plist configuration and add monitoring'
            });
          }
        }
      }
      
      // Check for cron jobs
      try {
        const cronOutput = execSync('crontab -l 2>/dev/null || echo ""', { encoding: 'utf8' });
        const cronLines = cronOutput.split('\n').filter(line => 
          line.includes('gpt') || line.includes('cursor') || line.includes('runner')
        );
        
        for (const line of cronLines) {
          this.auditResults.entrypoints.push({
            file: 'crontab',
            category: 'system_automation',
            pattern: 'cron_job',
            matches: 1,
            riskLevel: 'high',
            summary: `Cron job: ${line.trim()}`,
            recommendation: 'Review cron schedule and add logging'
          });
        }
      } catch (error) {
        // No cron jobs or error reading crontab
      }
      
    } catch (error) {
      console.error('❌ Error analyzing system automation:', error);
    }
  }

  generateRecommendations() {
    const criticalEntrypoints = this.auditResults.entrypoints.filter(ep => ep.riskLevel === 'high');
    const mediumEntrypoints = this.auditResults.entrypoints.filter(ep => ep.riskLevel === 'medium');
    
    this.auditResults.summary.criticalEntrypoints = criticalEntrypoints.length;
    this.auditResults.summary.hardeningTargets = criticalEntrypoints.length + mediumEntrypoints.length;
    
    // Generate specific recommendations
    const recommendations = [
      'Implement comprehensive error handling and retry logic for all patch delivery mechanisms',
      'Add health checks and monitoring for all agent launch triggers',
      'Implement rate limiting and validation for all command triggers',
      'Add logging and failure recovery for all automation helpers',
      'Create a centralized monitoring dashboard for all automation entrypoints',
      'Implement dry-run capabilities for all development tools',
      'Add automated testing for all critical automation paths',
      'Create rollback mechanisms for all patch operations',
      'Implement circuit breakers for external service calls',
      'Add comprehensive logging and alerting for all automation failures'
    ];
    
    this.auditResults.summary.recommendations = recommendations;
  }

  saveResults() {
    const outputPath = 'logs/hardenable-automation-report.json';
    fs.writeFileSync(outputPath, JSON.stringify(this.auditResults, null, 2));
    console.log(`📄 Audit results saved to: ${outputPath}`);
  }
}

// Run the audit
async function main() {
  const auditor = new AutomationEntrypointAuditor();
  await auditor.runAudit();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AutomationEntrypointAuditor; 