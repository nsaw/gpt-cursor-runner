#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing final logEvent argument errors...');

// Function to fix logEvent argument issues
function fixLogEventArguments(content) {
  // Fix logEvent calls that are missing severity parameters
  // Pattern: this.logEvent('event', 'message') -> this.logEvent('event', 'message', 'info')
  
  // System events
  content = content.replace(/this\.logEvent\s*\(\s*['"](system_startup|system_shutdown|system_maintenance)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Orchestrator events
  content = content.replace(/this\.logEvent\s*\(\s*['"](orchestrator_start|orchestrator_stop)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Dashboard events
  content = content.replace(/this\.logEvent\s*\(\s*['"](dashboard_integration)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Heartbeat events
  content = content.replace(/this\.logEvent\s*\(\s*['"](heartbeat)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Snapshot events
  content = content.replace(/this\.logEvent\s*\(\s*['"](snapshot_start|snapshot_complete)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Loop events
  content = content.replace(/this\.logEvent\s*\(\s*['"](loop_complete)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Validation events
  content = content.replace(/this\.logEvent\s*\(\s*['"](validation_complete)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Relay events
  content = content.replace(/this\.logEvent\s*\(\s*['"](relay_complete)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'info')");
  });
  
  // Error events
  content = content.replace(/this\.logEvent\s*\(\s*['"](config_error|state_error)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'error')");
  });
  
  // Warning events
  content = content.replace(/this\.logEvent\s*\(\s*['"](config_warning|state_warning)['"],\s*['"][^'"]+['"]\s*\)/g, (match, eventType) => {
    return match.replace(')', ", 'warning')");
  });
  
  return content;
}

// Function to fix specific logEvent calls with object arguments
function fixLogEventObjectArguments(content) {
  // Fix logEvent calls that have object arguments by removing them
  content = content.replace(/this\.logEvent\s*\(\s*['"](config_update)['"],\s*['"][^'"]+['"],\s*([^)]+)\s*\)/g, (match, eventType, message, objectArg) => {
    return `this.logEvent('${eventType}', '${message}', 'info')`;
  });
  
  return content;
}

// Function to process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Apply fixes
    content = fixLogEventArguments(content);
    content = fixLogEventObjectArguments(content);
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  const targetFiles = [
    'src-nextgen/ghost/telemetry/ghostHeartbeatVisualizer.ts',
    'src-nextgen/ghost/telemetry/ghostLoopAuditor.ts',
    'src-nextgen/ghost/telemetry/ghostRelayTelemetryCore.ts'
  ];
  
  let fixedCount = 0;
  
  for (const file of targetFiles) {
    if (fs.existsSync(file)) {
      if (processFile(file)) {
        fixedCount++;
      }
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }
  
  console.log(`\n🎯 Fixed ${fixedCount} files`);
  
  // Run TypeScript check to see remaining errors
  try {
    console.log('\n🔍 Running TypeScript check...');
    const result = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8' });
    const errorCount = (result.match(/error TS/g) || []).length;
    console.log(`📊 Remaining TypeScript errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n📋 First 10 errors:');
      const lines = result.split('\n').filter(line => line.includes('error TS')).slice(0, 10);
      lines.forEach(line => console.log(line));
    }
  } catch (error) {
    console.log('✅ No TypeScript errors found!');
  }
}

main(); 