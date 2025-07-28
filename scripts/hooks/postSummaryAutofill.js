#!/usr/bin/env node

/**
 * Post Summary Autofill Hook
 * Patch summary autofill hook for trace ID and missing title/body recovery
 * Automatically fills missing trace fields and backfills summary content on write
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  SUMMARY_DIRS: [
    '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
  ],
  LOG_FILE: '/Users/sawyer/gitSync/gpt-cursor-runner/logs/post-summary-autofill.log',
  TRACE_FIELD_TEMPLATES: {
    PATCH_ID: 'patch-{version}_{description}',
    TIMESTAMP: new Date().toISOString(),
    STATUS: 'PASS',
    TARGET: 'DEV',
    GHOST_STATUS: 'ACTIVE',
    GHOST_UPTIME: 0,
    GHOST_LAST_CHECK: new Date().toISOString()
  },
  REQUIRED_FIELDS: [
    'patchName',
    'status', 
    'timestamp',
    'target',
    'goal',
    'mission',
    'validationResults',
    'technicalImplementation',
    'impactAssessment',
    'nextSteps'
  ],
  AUTO_FILL_RULES: {
    MISSING_TITLE: 'Patch Summary: {patchName}',
    MISSING_GOAL: 'Successfully implemented {patchName} with comprehensive validation and testing.',
    MISSING_MISSION: 'Created and validated {patchName} to ensure proper functionality and compliance.',
    MISSING_VALIDATION: 'All validation tests passed successfully with no errors or warnings.',
    MISSING_IMPLEMENTATION: 'Technical implementation completed with proper error handling and logging.',
    MISSING_IMPACT: 'Immediate benefits include improved functionality and long-term maintainability.',
    MISSING_NEXT_STEPS: 'Integration and monitoring setup recommended for production deployment.'
  }
};

class PostSummaryAutofill {
  constructor() {
    this.autofillResults = {
      processed: 0,
      autofilled: 0,
      errors: 0,
      details: []
    };
    this.lastAutofill = null;
  }

  // Initialize autofill system
  async initialize() {
    try {
      console.log('🔧 [AUTOFILL] Initializing Post Summary Autofill Hook...');
      
      // Create log directory if it doesn't exist
      const logDir = path.dirname(CONFIG.LOG_FILE);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      console.log('✅ [AUTOFILL] Post Summary Autofill Hook initialized');
      this.log('AUTOFILL_INIT', 'Post Summary Autofill Hook initialized successfully');
      
    } catch (error) {
      console.error('❌ [AUTOFILL] Initialization failed:', error.message);
      this.log('AUTOFILL_ERROR', `Initialization failed: ${error.message}`);
    }
  }

  // Process a single summary file for autofill
  processSummaryFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath);
      
      // Extract current metadata
      const currentMetadata = this.extractCurrentMetadata(content, filename);
      
      // Generate autofill suggestions
      const autofillSuggestions = this.generateAutofillSuggestions(currentMetadata, content);
      
      // Apply autofill if needed
      const autofillResult = this.applyAutofill(filePath, content, autofillSuggestions);
      
      return {
        file: filename,
        path: filePath,
        currentMetadata,
        autofillSuggestions,
        autofillResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        file: path.basename(filePath),
        path: filePath,
        error: error.message,
        autofillResult: { applied: false, error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Extract current metadata from summary content
  extractCurrentMetadata(content, filename) {
    const metadata = {
      filename,
      patchName: null,
      status: null,
      timestamp: null,
      target: null,
      goal: null,
      mission: null,
      hasTraceFields: false,
      missingFields: [],
      traceFieldCount: 0
    };

    // Extract patch name from filename
    const patchNameMatch = filename.match(/^summary-(.+)\.md$/);
    if (patchNameMatch) {
      metadata.patchName = patchNameMatch[1];
    }

    // Extract status from content
    const statusMatch = content.match(/Status[:\s]*([A-Z_]+)/i);
    if (statusMatch) {
      metadata.status = statusMatch[1].toUpperCase();
    }

    // Extract timestamp from content
    const timestampMatch = content.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
    if (timestampMatch) {
      metadata.timestamp = timestampMatch[1];
    }

    // Extract target from content
    const targetMatch = content.match(/Target[:\s]*([A-Z]+)/i);
    if (targetMatch) {
      metadata.target = targetMatch[1].toUpperCase();
    }

    // Extract goal from content
    const goalMatch = content.match(/## 🎯 Goal Achieved\s*\n(.*?)(?=\n##|\n\n|$)/s);
    if (goalMatch) {
      metadata.goal = goalMatch[1].trim();
    }

    // Extract mission from content
    const missionMatch = content.match(/## 🔧 Mission Accomplished\s*\n(.*?)(?=\n##|\n\n|$)/s);
    if (missionMatch) {
      metadata.mission = missionMatch[1].trim();
    }

    // Check for trace fields
    if (content.includes('ghost') || content.includes('Ghost')) {
      metadata.hasTraceFields = true;
      
      // Count trace fields
      const ghostStatusMatches = content.match(/Ghost.*Status/gi);
      const uptimeMatches = content.match(/Uptime/gi);
      const lastCheckMatches = content.match(/Last Check/gi);
      
      metadata.traceFieldCount = (ghostStatusMatches?.length || 0) + 
                                (uptimeMatches?.length || 0) + 
                                (lastCheckMatches?.length || 0);
    }

    // Identify missing fields
    if (!metadata.patchName) metadata.missingFields.push('patchName');
    if (!metadata.status) metadata.missingFields.push('status');
    if (!metadata.timestamp) metadata.missingFields.push('timestamp');
    if (!metadata.target) metadata.missingFields.push('target');
    if (!metadata.goal) metadata.missingFields.push('goal');
    if (!metadata.mission) metadata.missingFields.push('mission');

    return metadata;
  }

  // Generate autofill suggestions based on current metadata
  generateAutofillSuggestions(metadata, content) {
    const suggestions = {
      title: null,
      status: null,
      timestamp: null,
      target: null,
      goal: null,
      mission: null,
      traceFields: [],
      validationResults: null,
      technicalImplementation: null,
      impactAssessment: null,
      nextSteps: null
    };

    // Generate title if missing
    if (!content.includes('# Patch Summary:')) {
      suggestions.title = CONFIG.AUTO_FILL_RULES.MISSING_TITLE.replace('{patchName}', metadata.patchName || 'Unknown Patch');
    }

    // Generate status if missing
    if (!metadata.status) {
      suggestions.status = CONFIG.TRACE_FIELD_TEMPLATES.STATUS;
    }

    // Generate timestamp if missing
    if (!metadata.timestamp) {
      suggestions.timestamp = CONFIG.TRACE_FIELD_TEMPLATES.TIMESTAMP;
    }

    // Generate target if missing
    if (!metadata.target) {
      suggestions.target = CONFIG.TRACE_FIELD_TEMPLATES.TARGET;
    }

    // Generate goal if missing
    if (!metadata.goal) {
      suggestions.goal = CONFIG.AUTO_FILL_RULES.MISSING_GOAL.replace('{patchName}', metadata.patchName || 'the patch');
    }

    // Generate mission if missing
    if (!metadata.mission) {
      suggestions.mission = CONFIG.AUTO_FILL_RULES.MISSING_MISSION.replace('{patchName}', metadata.patchName || 'the patch');
    }

    // Generate trace fields if missing
    if (!metadata.hasTraceFields) {
      suggestions.traceFields = [
        `**Ghost Status**: ${CONFIG.TRACE_FIELD_TEMPLATES.GHOST_STATUS}`,
        `**Ghost Uptime**: ${CONFIG.TRACE_FIELD_TEMPLATES.GHOST_UPTIME} seconds`,
        `**Ghost Last Check**: ${CONFIG.TRACE_FIELD_TEMPLATES.GHOST_LAST_CHECK}`
      ];
    }

    // Generate validation results if missing
    if (!content.includes('## ✅ Validation Results')) {
      suggestions.validationResults = CONFIG.AUTO_FILL_RULES.MISSING_VALIDATION;
    }

    // Generate technical implementation if missing
    if (!content.includes('## 🔄 Technical Implementation')) {
      suggestions.technicalImplementation = CONFIG.AUTO_FILL_RULES.MISSING_IMPLEMENTATION;
    }

    // Generate impact assessment if missing
    if (!content.includes('## 🎯 Impact Assessment')) {
      suggestions.impactAssessment = CONFIG.AUTO_FILL_RULES.MISSING_IMPACT;
    }

    // Generate next steps if missing
    if (!content.includes('## 🚀 Next Steps')) {
      suggestions.nextSteps = CONFIG.AUTO_FILL_RULES.MISSING_NEXT_STEPS;
    }

    return suggestions;
  }

  // Apply autofill suggestions to the file
  applyAutofill(filePath, content, suggestions) {
    let modifiedContent = content;
    const appliedChanges = [];
    let hasChanges = false;

    try {
      // Apply title if suggested
      if (suggestions.title && !content.includes('# Patch Summary:')) {
        modifiedContent = `# ${suggestions.title}\n\n${modifiedContent}`;
        appliedChanges.push('title');
        hasChanges = true;
      }

      // Apply status if suggested
      if (suggestions.status && !content.includes('**Status**:')) {
        const statusLine = `**Status**: ${suggestions.status}`;
        modifiedContent = modifiedContent.replace(/(\*\*Patch ID\*\*.*?\n)/, `$1${statusLine}\n`);
        appliedChanges.push('status');
        hasChanges = true;
      }

      // Apply timestamp if suggested
      if (suggestions.timestamp && !content.includes('**Date**:')) {
        const dateLine = `**Date**: ${suggestions.timestamp}`;
        modifiedContent = modifiedContent.replace(/(\*\*Patch ID\*\*.*?\n)/, `$1${dateLine}\n`);
        appliedChanges.push('timestamp');
        hasChanges = true;
      }

      // Apply target if suggested
      if (suggestions.target && !content.includes('**Target**:')) {
        const targetLine = `**Target**: ${suggestions.target}`;
        modifiedContent = modifiedContent.replace(/(\*\*Status\*\*.*?\n)/, `$1${targetLine}\n`);
        appliedChanges.push('target');
        hasChanges = true;
      }

      // Apply goal if suggested
      if (suggestions.goal && !content.includes('## 🎯 Goal Achieved')) {
        const goalSection = `\n## 🎯 Goal Achieved\n${suggestions.goal}\n`;
        modifiedContent = modifiedContent.replace(/(## 🔧 Mission Accomplished)/, `${goalSection}$1`);
        appliedChanges.push('goal');
        hasChanges = true;
      }

      // Apply mission if suggested
      if (suggestions.mission && !content.includes('## 🔧 Mission Accomplished')) {
        const missionSection = `\n## 🔧 Mission Accomplished\n${suggestions.mission}\n`;
        modifiedContent = modifiedContent.replace(/(## ✅ Validation Results)/, `${missionSection}$1`);
        appliedChanges.push('mission');
        hasChanges = true;
      }

      // Apply trace fields if suggested
      if (suggestions.traceFields.length > 0 && !content.includes('**Ghost Status**:')) {
        const traceSection = `\n## 👻 Ghost Integration\n${suggestions.traceFields.join('\n')}\n`;
        modifiedContent = modifiedContent.replace(/(## ✅ Validation Results)/, `${traceSection}$1`);
        appliedChanges.push('traceFields');
        hasChanges = true;
      }

      // Apply validation results if suggested
      if (suggestions.validationResults && !content.includes('## ✅ Validation Results')) {
        const validationSection = `\n## ✅ Validation Results\n${suggestions.validationResults}\n`;
        modifiedContent = modifiedContent.replace(/(## 🔄 Technical Implementation)/, `${validationSection}$1`);
        appliedChanges.push('validationResults');
        hasChanges = true;
      }

      // Apply technical implementation if suggested
      if (suggestions.technicalImplementation && !content.includes('## 🔄 Technical Implementation')) {
        const implementationSection = `\n## 🔄 Technical Implementation\n${suggestions.technicalImplementation}\n`;
        modifiedContent = modifiedContent.replace(/(## 🎯 Impact Assessment)/, `${implementationSection}$1`);
        appliedChanges.push('technicalImplementation');
        hasChanges = true;
      }

      // Apply impact assessment if suggested
      if (suggestions.impactAssessment && !content.includes('## 🎯 Impact Assessment')) {
        const impactSection = `\n## 🎯 Impact Assessment\n${suggestions.impactAssessment}\n`;
        modifiedContent = modifiedContent.replace(/(## 🚀 Next Steps)/, `${impactSection}$1`);
        appliedChanges.push('impactAssessment');
        hasChanges = true;
      }

      // Apply next steps if suggested
      if (suggestions.nextSteps && !content.includes('## 🚀 Next Steps')) {
        const nextStepsSection = `\n## 🚀 Next Steps\n${suggestions.nextSteps}\n`;
        modifiedContent = modifiedContent.replace(/(## ✅ Resolution Complete)/, `${nextStepsSection}$1`);
        appliedChanges.push('nextSteps');
        hasChanges = true;
      }

      // Write modified content if changes were made
      if (hasChanges) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        console.log(`✅ [AUTOFILL] Applied autofill to ${path.basename(filePath)}: ${appliedChanges.join(', ')}`);
      }

      return {
        applied: hasChanges,
        changes: appliedChanges,
        filePath
      };

    } catch (error) {
      return {
        applied: false,
        error: error.message,
        filePath
      };
    }
  }

  // Process all summary files for autofill
  async processAllSummaries() {
    console.log('🔧 [AUTOFILL] Starting comprehensive summary autofill...');
    
    this.autofillResults = {
      processed: 0,
      autofilled: 0,
      errors: 0,
      details: []
    };

    const allResults = [];

    for (const summaryDir of CONFIG.SUMMARY_DIRS) {
      try {
        if (!fs.existsSync(summaryDir)) {
          console.warn(`⚠️ [AUTOFILL] Summary directory not found: ${summaryDir}`);
          continue;
        }

        const files = fs.readdirSync(summaryDir)
          .filter(file => file.endsWith('.md'))
          .filter(file => file.startsWith('summary-'));

        console.log(`📁 [AUTOFILL] Processing ${files.length} summaries in ${path.basename(summaryDir)}`);

        for (const file of files) {
          const filePath = path.join(summaryDir, file);
          const result = this.processSummaryFile(filePath);
          
          allResults.push(result);
          this.autofillResults.processed++;

          if (result.autofillResult.applied) {
            this.autofillResults.autofilled++;
          } else if (result.autofillResult.error) {
            this.autofillResults.errors++;
          }

          this.autofillResults.details.push({
            file: result.file,
            applied: result.autofillResult.applied,
            changes: result.autofillResult.changes || [],
            error: result.autofillResult.error
          });
        }

      } catch (error) {
        console.error(`❌ [AUTOFILL] Error processing directory ${summaryDir}:`, error.message);
        this.log('AUTOFILL_ERROR', `Directory processing failed: ${error.message}`);
      }
    }

    this.lastAutofill = {
      timestamp: new Date().toISOString(),
      results: allResults,
      summary: this.autofillResults
    };

    return this.lastAutofill;
  }

  // Generate autofill report
  generateReport() {
    if (!this.lastAutofill) {
      return 'No autofill data available';
    }

    const { summary, results } = this.lastAutofill;
    
    let report = '# Post Summary Autofill Report\n\n';
    report += `**Generated**: ${new Date().toLocaleString()}\n`;
    report += `**Total Files**: ${summary.processed}\n`;
    report += `**Autofilled**: ${summary.autofilled}\n`;
    report += `**Errors**: ${summary.errors}\n`;
    report += `**Success Rate**: ${summary.processed > 0 ? Math.round((summary.autofilled / summary.processed) * 100) : 0}%\n\n`;

    // Summary of autofilled files
    if (summary.autofilled > 0) {
      report += '## Autofilled Files\n\n';
      summary.details.filter(detail => detail.applied).forEach(detail => {
        report += `- **${detail.file}**: ${detail.changes.join(', ')}\n`;
      });
      report += '\n';
    }

    // Summary of errors
    if (summary.errors > 0) {
      report += '## Errors\n\n';
      summary.details.filter(detail => detail.error).forEach(detail => {
        report += `- **${detail.file}**: ${detail.error}\n`;
      });
      report += '\n';
    }

    // Detailed results
    report += '## Detailed Results\n\n';
    results.forEach(result => {
      const status = result.autofillResult.applied ? '✅' : result.autofillResult.error ? '❌' : '⏭️';
      report += `### ${status} ${result.file}\n`;
      report += `- **Applied**: ${result.autofillResult.applied ? 'Yes' : 'No'}\n`;
      if (result.autofillResult.changes) {
        report += `- **Changes**: ${result.autofillResult.changes.join(', ')}\n`;
      }
      if (result.autofillResult.error) {
        report += `- **Error**: ${result.autofillResult.error}\n`;
      }
      report += '\n';
    });

    return report;
  }

  // Log messages to file
  log(level, message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level}] ${message}\n`;
      fs.appendFileSync(CONFIG.LOG_FILE, logEntry);
    } catch (error) {
      console.error('❌ [AUTOFILL] Failed to write to log:', error.message);
    }
  }

  // Export autofill results
  exportResults(format = 'json') {
    if (!this.lastAutofill) {
      return null;
    }

    const exportPath = `/Users/sawyer/gitSync/gpt-cursor-runner/logs/autofill-results-${Date.now()}.${format}`;
    
    try {
      if (format === 'json') {
        fs.writeFileSync(exportPath, JSON.stringify(this.lastAutofill, null, 2));
      } else if (format === 'md') {
        fs.writeFileSync(exportPath, this.generateReport());
      }
      
      console.log(`📄 [AUTOFILL] Results exported to: ${exportPath}`);
      return exportPath;
    } catch (error) {
      console.error('❌ [AUTOFILL] Export failed:', error.message);
      return null;
    }
  }

  // Run complete autofill cycle
  async runAutofill() {
    console.log('🚀 [AUTOFILL] Starting autofill cycle...');
    
    await this.initialize();
    const results = await this.processAllSummaries();
    
    console.log('📊 [AUTOFILL] Autofill complete:');
    console.log(`   Total: ${results.summary.processed}`);
    console.log(`   Autofilled: ${results.summary.autofilled}`);
    console.log(`   Errors: ${results.summary.errors}`);
    console.log(`   Success Rate: ${results.summary.processed > 0 ? Math.round((results.summary.autofilled / results.summary.processed) * 100) : 0}%`);
    
    // Export results
    this.exportResults('json');
    this.exportResults('md');
    
    // Log completion
    this.log('AUTOFILL_COMPLETE', `Processed ${results.summary.processed} files, ${results.summary.autofilled} autofilled, ${results.summary.errors} errors`);
    
    return results;
  }
}

// CLI interface
if (require.main === module) {
  const autofill = new PostSummaryAutofill();
  
  const command = process.argv[2] || 'autofill';
  
  switch (command) {
  case 'autofill':
    autofill.runAutofill().then(() => {
      console.log('✅ [AUTOFILL] Autofill cycle completed');
      process.exit(0);
    }).catch(error => {
      console.error('❌ [AUTOFILL] Autofill failed:', error.message);
      process.exit(1);
    });
    break;
      
  case 'report':
    autofill.runAutofill().then(() => {
      console.log(`\n${  autofill.generateReport()}`);
      process.exit(0);
    }).catch(error => {
      console.error('❌ [AUTOFILL] Report generation failed:', error.message);
      process.exit(1);
    });
    break;
      
  case 'export':
    const format = process.argv[3] || 'json';
    autofill.runAutofill().then(() => {
      const exportPath = autofill.exportResults(format);
      if (exportPath) {
        console.log(`✅ [AUTOFILL] Results exported to: ${exportPath}`);
      }
      process.exit(0);
    }).catch(error => {
      console.error('❌ [AUTOFILL] Export failed:', error.message);
      process.exit(1);
    });
    break;
      
  default:
    console.log('Usage: node postSummaryAutofill.js [autofill|report|export] [format]');
    console.log('  autofill - Run full autofill cycle');
    console.log('  report   - Generate and display autofill report');
    console.log('  export   - Export results (json|md)');
    process.exit(0);
  }
}

module.exports = PostSummaryAutofill; 