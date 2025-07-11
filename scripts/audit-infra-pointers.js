#!/usr/bin/env node

/**
 * Infrastructure Pointer Audit Script
 * 
 * Scans the codebase for hardcoded references to domains, hosts, tunnels,
 * and other infrastructure components that need updating during transitions.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SCAN_PATTERNS = {
  domains: [
    /https?:\/\/[^\s"']+/g,
    /wss?:\/\/[^\s"']+/g
  ],
  hosts: [
    /localhost:\d+/g,
    /127\.0\.0\.1:\d+/g,
    /0\.0\.0\.0:\d+/g
  ],
  secrets: [
    /SLACK_BOT_TOKEN/g,
    /SLACK_SIGNING_SECRET/g,
    /FLY_API_TOKEN/g,
    /CLOUDFLARE_API_TOKEN/g
  ],
  webhooks: [
    /webhook/g,
    /slack\/events/g,
    /slack\/commands/g,
    /slack\/interactions/g
  ],
  env_vars: [
    /process\.env\.[A-Z_]+/g
  ]
};

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.env/,
  /package-lock\.json/,
  /yarn\.lock/,
  /\.log$/,
  /\.md$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/
];

const KNOWN_SAFE_DOMAINS = [
  'gpt-cursor-runner.fly.dev',
  'api.slack.com',
  'hooks.slack.com',
  'cdn.tailwindcss.com',
  'github.com',
  'npmjs.com'
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {
      file: filePath,
      domains: [],
      hosts: [],
      secrets: [],
      webhooks: [],
      env_vars: []
    };

    // Scan for each pattern type
    Object.keys(SCAN_PATTERNS).forEach(patternType => {
      SCAN_PATTERNS[patternType].forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          results[patternType].push(...matches);
        }
      });
    });

    // Filter out known safe domains
    results.domains = results.domains.filter(domain => {
      return !KNOWN_SAFE_DOMAINS.some(safe => domain.includes(safe));
    });

    // Remove duplicates
    Object.keys(results).forEach(key => {
      results[key] = [...new Set(results[key])];
    });

    return results;
  } catch (error) {
    return { file: filePath, error: error.message };
  }
}

function shouldScanFile(filePath) {
  return !IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

function getAllFiles(dir) {
  const files = [];
  
  function scan(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (shouldScanFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_files_scanned: results.length,
      files_with_issues: results.filter(r => !r.error && Object.values(r).some(arr => Array.isArray(arr) && arr.length > 0)).length,
      total_issues: 0
    },
    issues: {
      domains: [],
      hosts: [],
      secrets: [],
      webhooks: [],
      env_vars: []
    },
    files: results.filter(r => !r.error && Object.values(r).some(arr => Array.isArray(arr) && arr.length > 0))
  };

  // Aggregate issues
  results.forEach(result => {
    if (result.error) return;
    
    Object.keys(result).forEach(key => {
      if (key !== 'file' && Array.isArray(result[key])) {
        result[key].forEach(item => {
          if (!report.issues[key].includes(item)) {
            report.issues[key].push(item);
          }
        });
      }
    });
  });

  // Count total issues
  Object.values(report.issues).forEach(arr => {
    report.summary.total_issues += arr.length;
  });

  return report;
}

function printReport(report) {
  console.log('\n🔍 Infrastructure Pointer Audit Report');
  console.log('=====================================\n');
  
  console.log(`📊 Summary:`);
  console.log(`   Files Scanned: ${report.summary.total_files_scanned}`);
  console.log(`   Files with Issues: ${report.summary.files_with_issues}`);
  console.log(`   Total Issues Found: ${report.summary.total_issues}\n`);
  
  if (report.summary.total_issues === 0) {
    console.log('✅ No infrastructure pointer issues found!');
    return;
  }
  
  console.log('🚨 Issues Found:\n');
  
  Object.keys(report.issues).forEach(category => {
    if (report.issues[category].length > 0) {
      console.log(`📁 ${category.toUpperCase()}:`);
      report.issues[category].forEach(item => {
        console.log(`   • ${item}`);
      });
      console.log('');
    }
  });
  
  console.log('📄 Files with Issues:');
  report.files.forEach(file => {
    console.log(`   • ${file.file}`);
    Object.keys(file).forEach(key => {
      if (key !== 'file' && Array.isArray(file[key]) && file[key].length > 0) {
        console.log(`     ${key}: ${file[key].join(', ')}`);
      }
    });
    console.log('');
  });
}

function main() {
  const args = process.argv.slice(2);
  const applyFlag = args.includes('--apply');
  const targetDir = args.find(arg => !arg.startsWith('--')) || '.';
  
  console.log('🔍 Scanning for infrastructure pointers...');
  console.log(`📁 Target directory: ${path.resolve(targetDir)}`);
  
  const files = getAllFiles(targetDir);
  console.log(`📄 Found ${files.length} files to scan`);
  
  const results = files.map(scanFile);
  const report = generateReport(results);
  
  // Save report to file
  const reportPath = 'logs/infra-pointer-report.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  printReport(report);
  
  console.log(`📋 Full report saved to: ${reportPath}`);
  
  if (applyFlag && report.summary.total_issues > 0) {
    console.log('\n⚠️  --apply flag detected but manual review required for infrastructure changes');
    console.log('   Please review the report and update references manually');
  }
}

if (require.main === module) {
  main();
}

module.exports = { scanFile, generateReport, printReport }; 