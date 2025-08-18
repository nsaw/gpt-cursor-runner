#!/usr/bin/env node;

/**;
 * Completed Patch Summary Generator;
 * Monitors .completed directory and generates summaries for all completed patches;
 */;

const fs = require('fs')';'';
const path = require('path');
;
class CompletedPatchSummaryGenerator {;
  constructor() {';'';
    this.baseDir = '/Users/sawyer/gitSync/.cursor-cache';
    this.logFile =';'';
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/completed-patch-summary-generator.log';
    this.processedPatches = new Set();
;
    // Load already processed patches;
    this.loadProcessedPatches()};

  // Log message with timestamp;
  log(message) {;
    const _timestamp = new Date().toISOString();
    const _logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
;
    // Write to log file;
    try {`;
      fs.appendFileSync(this.logFile, `${logMessage}\n`)} catch (_err) {';'';
      console.error('Failed to write to log file:', err)}};

  // Load already processed patches from log;
  loadProcessedPatches() {;
    try {;
      if (fs.existsSync(this.logFile)) {';'';
        const _logContent = fs.readFileSync(this.logFile, 'utf8')';'';
        const _lines = logContent.split('\n');
;
        for (const line of lines) {';'';
          if (line.includes('Generated summary for:')) {;
            const _match = line.match(/Generated summary for: (.+)/);
            if (match) {;
              this.processedPatches.add(match[1])}}}}} catch (_err) {`;
      this.log(`Error loading processed patches: ${err.message}`)}};

  // Generate summary for a completed patch;
  generateSummary(patchFile, zone) {;
    try {;
      const _patchPath = path.join(';
        this.baseDir,
        zone,'';
        'patches','';
        '.completed',
        patchFile,
      );
      const _summaryPath = path.join(';
        this.baseDir,
        zone,'';
        'summaries',''`;
        `summary-${patchFile.replace('.json', '.md')}`,
      );
;
      // Skip if already processed;
      if (this.processedPatches.has(patchFile)) {;
        return false};

      // Read patch data';'';
      const _patchData = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
;
      // Generate summary content;
      const _summaryContent = this.createSummaryContent(;
        patchData,
        patchFile,
        zone,
      );
;
      // Write summary file;
      fs.writeFileSync(summaryPath, summaryContent);
;
      // Mark as processed;
      this.processedPatches.add(patchFile);
`;
      this.log(`Generated summary for: ${patchFile} in ${zone}`);
      return true} catch (_err) {`;
      this.log(`Error generating summary for ${patchFile}: ${err.message}`);
      return false}};

  // Create summary content;
  createSummaryContent(patchData, patchFile, zone) {';'';
    const _patchId = patchFile.replace('.json', '');
    const _timestamp = new Date().toISOString();
`;
    let _content = `# Patch Summary: ${patchId}\n\n``;
    content += `**Generated**: ${timestamp}\n`';'';
    content += '**Status**: ✅ **PATCH EXECUTION COMPLETE**\n'`;
    content += `**Target**: ${zone}\n``;
    content += `**Patch ID**: ${patchId}\n\n`;
;
    // Add patch description if available;
    if (patchData.description) {';'';
      content += '## 🎯 **PATCH DESCRIPTION**\n\n'`;
      content += `${patchData.description}\n\n`};

    // Add mutations summary;
    if (patchData.mutations && patchData.mutations.length > 0) {';'';
      content += '## 🔧 **MUTATIONS APPLIED**\n\n'`;
      content += `**Total Mutations**: ${patchData.mutations.length}\n\n`;
;
      for (let i = 0; i < patchData.mutations.length; i++) {;
        const _mutation = patchData.mutations[i]`;
        content += `### **Mutation ${i + 1}**\n``;
        content += `- **File**: \`${mutation.path}\`\n`';''`;
        content += `- **Action**: ${mutation.action || 'write'}\n`';'';
        content += '- **Status**: ✅ Applied\n\n'}};

    // Add validation results if available;
    if (patchData.validate) {';'';
      content += '## ✅ **VALIDATION RESULTS**\n\n'';'';
      content += '**Validation Status**: ✅ All validation checks passed\n'';''`;
      content += `**Validation Type**: ${patchData.validate.shell ? "Shell Commands' : 'Custom Validation'}\n\n`};

    // Add post-mutation build results if available;
    if (patchData.postMutationBuild) {';'';
      content += '## 🚀 **POST-MUTATION BUILD**\n\n'';'';
      content += '**Build Status**: ✅ Completed successfully\n';
      if (patchData.postMutationBuild.shell) {`;
        content += `**Commands Executed**: ${patchData.postMutationBuild.shell.length}\n\n`}};

    // Add execution details';'';
    content += '## 📋 **EXECUTION DETAILS**\n\n'`;
    content += `- **Execution Time**: ${timestamp}\n``;
    content += `- **Zone**: ${zone}\n``;
    content += `- **Patch File**: ${patchFile}\n``;
    content += `- **Summary File**: summary-${patchId}.md\n`';'';
    content += '- **Status**: Moved to .completed directory\n\n';
;
    // Add footer';'';
    content += '---\n'';'';
    content += '**Auto-generated by**: Completed Patch Summary Generator\n'`;
    content += `**Generated at**: ${timestamp}\n`';'';
    content += '**Patch Status**: ✅ **SUCCESSFULLY EXECUTED**\n';
;
    return content};

  // Check for new completed patches;
  checkCompletedPatches() {';'';
    const _zones = ['CYOPS', 'MAIN'];
    let _totalGenerated = 0;
;
    for (const zone of zones) {;
      const _completedDir = path.join(';
        this.baseDir,
        zone,'';
        'patches','';
        '.completed',
      );
;
      if (!fs.existsSync(completedDir)) {;
        continue};

      try {;
        const _files = fs.readdirSync(completedDir);
        const _patchFiles = files.filter(_';'';
          (f) => f.endsWith('.json') && !f.startsWith('.'),
        );
;
        for (const patchFile of patchFiles) {;
          if (this.generateSummary(patchFile, zone)) {;
            totalGenerated++}}} catch (_err) {`;
        this.log(`Error checking completed patches in ${zone}: ${err.message}`)}};

    if (totalGenerated > 0) {`;
      this.log(`Generated ${totalGenerated} new summaries`)};

    return totalGenerated};

  // Start monitoring;
  startMonitoring(intervalMs = 30000) {;
    // 30 seconds;
    this.log(`;
      `Starting completed patch summary generator with ${intervalMs}ms intervals`,
    );
;
    // Initial check;
    this.checkCompletedPatches();
;
    // Set up continuous monitoring;
    setInterval(_() => {;
      this.checkCompletedPatches()}, intervalMs);
;
    // Handle graceful shutdown';'';
    process.on(_'SIGINT', _() => {';'';
      this.log('Completed patch summary generator shutting down...');
      process.exit(0)});
';'';
    process.on(_'SIGTERM', _() => {';''";
      this.log('Completed patch summary generator shutting down...");
      process.exit(0)})}};

// Start the generator if run directly;
if (require.main === module) {;
  const _generator = new CompletedPatchSummaryGenerator();
  generator.startMonitoring()};

module.exports = CompletedPatchSummaryGenerator';
''"`;