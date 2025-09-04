#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG = {
  rubricFile: '/Users/sawyer/gitSync/gpt-cursor-runner/__SoT__/RUBRIC.yml',
  outputFile: '/Users/sawyer/gitSync/gpt-cursor-runner/logs/rubric-results.yml',
  passingGrade: 95
};

class RubricGrader {
  constructor() {
    this.rubric = null;
    this.results = {
      timestamp: new Date().toISOString(),
      version: 'v2.3.61',
      score: 0,
      grade: 'F',
      passed: false,
      categories: {},
      details: {},
      recommendations: []
    };
  }

  loadRubric() {
    try {
      const rubricContent = fs.readFileSync(CONFIG.rubricFile, 'utf8');
      this.rubric = yaml.load(rubricContent);
      console.log('✅ Rubric loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load rubric:', error.message);
      process.exit(1);
    }
  }

  async checkNB20Compliance() {
    const category = this.rubric.categories.nb20_compliance;
    let score = 0;
    const details = {};

    // Check for NB 2.0 pattern usage
    try {
      const result = await this.runCommand('grep -r "nb-safe-detach.sh" /Users/sawyer/gitSync/gpt-cursor-runner/scripts/ | wc -l');
      const nb20Usage = parseInt(result.trim());
      if (nb20Usage > 0) {
        score += category.criteria.non_blocking_patterns.points;
        details.nb20_patterns = `Found ${nb20Usage} NB 2.0 pattern usages`;
      } else {
        details.nb20_patterns = 'No NB 2.0 patterns found';
        this.results.recommendations.push('Implement NB 2.0 patterns using ./scripts/nb-safe-detach.sh');
      }
    } catch (error) {
      details.nb20_patterns = `Error checking NB 2.0 patterns: ${error.message}`;
    }

    // Check for forbidden patterns
    try {
      const forbiddenPatterns = ['disown', '{ .* & }', '\\( .* \\) &', 'tail -f'];
      let violations = 0;
      
      for (const pattern of forbiddenPatterns) {
        const result = await this.runCommand(`grep -r "${pattern}" /Users/sawyer/gitSync/gpt-cursor-runner/scripts/ | wc -l`);
        violations += parseInt(result.trim());
      }
      
      if (violations === 0) {
        score += category.criteria.no_forbidden_patterns.points;
        details.forbidden_patterns = 'No forbidden patterns found';
      } else {
        details.forbidden_patterns = `Found ${violations} forbidden pattern violations`;
        this.results.recommendations.push('Remove forbidden patterns (disown, inline groups, tail -f)');
      }
    } catch (error) {
      details.forbidden_patterns = `Error checking forbidden patterns: ${error.message}`;
    }

    // Check for absolute paths
    try {
      const result = await this.runCommand('grep -r "/Users/sawyer/gitSync/" /Users/sawyer/gitSync/gpt-cursor-runner/scripts/ | wc -l');
      const absolutePaths = parseInt(result.trim());
      if (absolutePaths > 0) {
        score += category.criteria.absolute_paths.points;
        details.absolute_paths = `Found ${absolutePaths} absolute path usages`;
      } else {
        details.absolute_paths = 'No absolute paths found';
        this.results.recommendations.push('Use absolute paths starting with /Users/sawyer/gitSync/');
      }
    } catch (error) {
      details.absolute_paths = `Error checking absolute paths: ${error.message}`;
    }

    this.results.categories.nb20_compliance = {
      score,
      maxScore: category.weight,
      percentage: (score / category.weight) * 100,
      details
    };

    return score;
  }

  async checkValidationGates() {
    const category = this.rubric.categories.validation_gates;
    let score = 0;
    const details = {};

    // Check TypeScript compilation
    try {
      const result = await this.runCommand('cd /Users/sawyer/gitSync/gpt-cursor-runner && npx tsc --noEmit --skipLibCheck');
      score += category.criteria.typescript_compilation.points;
      details.typescript = 'TypeScript compilation passed';
    } catch (error) {
      details.typescript = `TypeScript compilation failed: ${error.message}`;
      this.results.recommendations.push('Fix TypeScript compilation errors');
    }

    // Check ESLint validation
    try {
      const result = await this.runCommand('cd /Users/sawyer/gitSync/gpt-cursor-runner && npx eslint . --ext .ts,.tsx --max-warnings=0');
      score += category.criteria.eslint_validation.points;
      details.eslint = 'ESLint validation passed';
    } catch (error) {
      details.eslint = `ESLint validation failed: ${error.message}`;
      this.results.recommendations.push('Fix ESLint validation errors');
    }

    // Check contract compliance
    try {
      const result = await this.runCommand('cd /Users/sawyer/gitSync/gpt-cursor-runner && node scripts/tools/check-absolute-paths.js');
      score += category.criteria.contract_compliance.points;
      details.contract = 'Contract compliance passed';
    } catch (error) {
      details.contract = `Contract compliance failed: ${error.message}`;
      this.results.recommendations.push('Fix contract compliance issues');
    }

    this.results.categories.validation_gates = {
      score,
      maxScore: category.weight,
      percentage: (score / category.weight) * 100,
      details
    };

    return score;
  }

  async checkServiceHealth() {
    const category = this.rubric.categories.service_health;
    let score = 0;
    const details = {};

    // Check health endpoints
    try {
      const result = await this.runCommand('curl -s http://localhost:5052/health | jq .status');
      if (result.trim() === '"healthy"') {
        score += category.criteria.health_endpoints.points;
        details.health_endpoints = 'Health endpoints responding';
      } else {
        details.health_endpoints = 'Health endpoints not responding';
        this.results.recommendations.push('Ensure health endpoints are responding');
      }
    } catch (error) {
      details.health_endpoints = `Health endpoint check failed: ${error.message}`;
      this.results.recommendations.push('Start health endpoint service');
    }

    // Check PM2 integration
    try {
      const result = await this.runCommand('pm2 list | grep -c "online"');
      const onlineServices = parseInt(result.trim());
      if (onlineServices > 0) {
        score += category.criteria.process_management.points;
        details.process_management = `${onlineServices} services online`;
      } else {
        details.process_management = 'No services online';
        this.results.recommendations.push('Start PM2 services');
      }
    } catch (error) {
      details.process_management = `PM2 check failed: ${error.message}`;
    }

    // Check error handling
    try {
      const logFiles = ['/Users/sawyer/gitSync/gpt-cursor-runner/logs/app.log'];
      let hasErrorHandling = true;
      
      for (const logFile of logFiles) {
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          if (content.includes('ERROR') && content.includes('handled')) {
            hasErrorHandling = true;
            break;
          }
        }
      }
      
      if (hasErrorHandling) {
        score += category.criteria.error_handling.points;
        details.error_handling = 'Error handling implemented';
      } else {
        details.error_handling = 'Error handling not found';
        this.results.recommendations.push('Implement proper error handling');
      }
    } catch (error) {
      details.error_handling = `Error handling check failed: ${error.message}`;
    }

    this.results.categories.service_health = {
      score,
      maxScore: category.weight,
      percentage: (score / category.weight) * 100,
      details
    };

    return score;
  }

  async checkSecurityCompliance() {
    const category = this.rubric.categories.security_compliance;
    let score = 0;
    const details = {};

    // Check for hardcoded secrets
    try {
      const result = await this.runCommand('grep -r "password\\|secret\\|key" /Users/sawyer/gitSync/gpt-cursor-runner/ --exclude-dir=node_modules --exclude-dir=.git | grep -v "process.env" | wc -l');
      const hardcodedSecrets = parseInt(result.trim());
      
      if (hardcodedSecrets === 0) {
        score += category.criteria.secret_management.points;
        details.secret_management = 'No hardcoded secrets found';
      } else {
        details.secret_management = `Found ${hardcodedSecrets} potential hardcoded secrets`;
        this.results.recommendations.push('Remove hardcoded secrets, use environment variables');
      }
    } catch (error) {
      details.secret_management = `Secret check failed: ${error.message}`;
    }

    // Check access control
    try {
      const result = await this.runCommand('find /Users/sawyer/gitSync/gpt-cursor-runner/ -name "*.js" -exec grep -l "access.*control\\|permission" {} \\; | wc -l');
      const accessControlFiles = parseInt(result.trim());
      
      if (accessControlFiles > 0) {
        score += category.criteria.access_control.points;
        details.access_control = `Found ${accessControlFiles} access control implementations`;
      } else {
        details.access_control = 'No access control found';
        this.results.recommendations.push('Implement access control mechanisms');
      }
    } catch (error) {
      details.access_control = `Access control check failed: ${error.message}`;
    }

    this.results.categories.security_compliance = {
      score,
      maxScore: category.weight,
      percentage: (score / category.weight) * 100,
      details
    };

    return score;
  }

  async checkDocumentation() {
    const category = this.rubric.categories.documentation;
    let score = 0;
    const details = {};

    // Check SoT files
    const sotFiles = [
      '/Users/sawyer/gitSync/gpt-cursor-runner/__SoT__/SYSTEMS-MASTER.md',
      '/Users/sawyer/gitSync/gpt-cursor-runner/__SoT__/POLICIES.md',
      '/Users/sawyer/gitSync/gpt-cursor-runner/__SoT__/CONTRACTS.md'
    ];

    let sotFilesExist = 0;
    for (const file of sotFiles) {
      if (fs.existsSync(file)) {
        sotFilesExist++;
      }
    }

    if (sotFilesExist === sotFiles.length) {
      score += category.criteria.source_of_truth.points;
      details.source_of_truth = 'All SoT files present';
    } else {
      details.source_of_truth = `${sotFilesExist}/${sotFiles.length} SoT files present`;
      this.results.recommendations.push('Create missing SoT files');
    }

    // Check documentation freshness
    try {
      const result = await this.runCommand('find /Users/sawyer/gitSync/gpt-cursor-runner/__SoT__/ -name "*.md" -mtime -7 | wc -l');
      const recentDocs = parseInt(result.trim());
      
      if (recentDocs > 0) {
        score += category.criteria.update_process.points;
        details.update_process = `${recentDocs} recent documentation updates`;
      } else {
        details.update_process = 'No recent documentation updates';
        this.results.recommendations.push('Update documentation regularly');
      }
    } catch (error) {
      details.update_process = `Documentation check failed: ${error.message}`;
    }

    this.results.categories.documentation = {
      score,
      maxScore: category.weight,
      percentage: (score / category.weight) * 100,
      details
    };

    return score;
  }

  async checkOperationalExcellence() {
    const category = this.rubric.categories.operational_excellence;
    let score = 0;
    const details = {};

    // Check monitoring
    try {
      const result = await this.runCommand('find /Users/sawyer/gitSync/gpt-cursor-runner/services/ -name "*monitor*" | wc -l');
      const monitoringServices = parseInt(result.trim());
      
      if (monitoringServices > 0) {
        score += category.criteria.monitoring.points;
        details.monitoring = `${monitoringServices} monitoring services found`;
      } else {
        details.monitoring = 'No monitoring services found';
        this.results.recommendations.push('Implement monitoring services');
      }
    } catch (error) {
      details.monitoring = `Monitoring check failed: ${error.message}`;
    }

    // Check backup procedures
    try {
      const result = await this.runCommand('find /Users/sawyer/gitSync/_backups/ -name "*.tar.gz" -mtime -7 | wc -l');
      const recentBackups = parseInt(result.trim());
      
      if (recentBackups > 0) {
        score += category.criteria.backup_recovery.points;
        details.backup_recovery = `${recentBackups} recent backups found`;
      } else {
        details.backup_recovery = 'No recent backups found';
        this.results.recommendations.push('Implement regular backup procedures');
      }
    } catch (error) {
      details.backup_recovery = `Backup check failed: ${error.message}`;
    }

    this.results.categories.operational_excellence = {
      score,
      maxScore: category.weight,
      percentage: (score / category.weight) * 100,
      details
    };

    return score;
  }

  async runCommand(command) {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  calculateGrade(score) {
    if (score >= 98) return 'A+';
    if (score >= 95) return 'A';
    if (score >= 90) return 'B';
    if (score >= 85) return 'C';
    if (score >= 80) return 'D';
    return 'F';
  }

  async grade() {
    console.log('🎯 Starting rubric grading...');
    
    this.loadRubric();
    
    const nb20Score = await this.checkNB20Compliance();
    const validationScore = await this.checkValidationGates();
    const serviceScore = await this.checkServiceHealth();
    const securityScore = await this.checkSecurityCompliance();
    const docScore = await this.checkDocumentation();
    const opsScore = await this.checkOperationalExcellence();
    
    this.results.score = nb20Score + validationScore + serviceScore + securityScore + docScore + opsScore;
    this.results.grade = this.calculateGrade(this.results.score);
    this.results.passed = this.results.score >= CONFIG.passingGrade;
    
    // Write results
    this.ensureLogsDirectory();
    fs.writeFileSync(CONFIG.outputFile, yaml.dump(this.results, { indent: 2 }));
    
    // Print summary
    console.log('\n📊 RUBRIC GRADING RESULTS');
    console.log('========================');
    console.log(`Score: ${this.results.score}/100`);
    console.log(`Grade: ${this.results.grade}`);
    console.log(`Passed: ${this.results.passed ? '✅' : '❌'}`);
    console.log(`Threshold: ${CONFIG.passingGrade}%`);
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.results.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    console.log(`\n📄 Detailed results written to: ${CONFIG.outputFile}`);
    
    return this.results;
  }

  ensureLogsDirectory() {
    const logsDir = path.dirname(CONFIG.outputFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }
}

if (require.main === module) {
  const grader = new RubricGrader();
  grader.grade().then(results => {
    process.exit(results.passed ? 0 : 1);
  }).catch(error => {
    console.error('❌ Grading failed:', error.message);
    process.exit(1);
  });
}

module.exports = RubricGrader;
