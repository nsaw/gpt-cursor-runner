#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function writeDualSummaries(patchId, summaryContent) {
    try {
        const timestamp = new Date().toISOString();
        const summaryTemplate = `# Summary: ${patchId}

## Agent Validation: PENDING

**Automated Status**: PATCH_EXECUTED
**Live State**: Awaiting dashboard confirmation
**User/GPT Validation**: REQUIRED

${summaryContent}

**Timestamp**: ${timestamp}
**Summary Location**: CYOPS summaries directory

Awaiting live state confirmation from dashboard/user.
`;

        // Write CYOPS summary
        const cyopsSummaryPath = `/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/summary-${patchId}.md`;
        const cyopsDir = path.dirname(cyopsSummaryPath);
        if (!fs.existsSync(cyopsDir)) {
            fs.mkdirSync(cyopsDir, { recursive: true });
        }
        fs.writeFileSync(cyopsSummaryPath, summaryTemplate);
        console.log(`CYOPS_SUMMARY_WRITTEN:${cyopsSummaryPath}`);

        // Write MAIN summary
        const mainSummaryPath = `/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/summary-${patchId}.md`;
        const mainDir = path.dirname(mainSummaryPath);
        if (!fs.existsSync(mainDir)) {
            fs.mkdirSync(mainDir, { recursive: true });
        }
        fs.writeFileSync(mainSummaryPath, summaryTemplate);
        console.log(`MAIN_SUMMARY_WRITTEN:${mainSummaryPath}`);

        console.log(`DUAL_SUMMARIES_COMPLETE:${patchId}`);
        process.exit(0);
    } catch (error) {
        console.error(`DUAL_SUMMARY_ERROR:${error.message}`);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
let patchId = null;
let summaryContent = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--patch-id' && i + 1 < args.length) {
        patchId = args[i + 1];
        i++;
    } else if (args[i] === '--summary-content' && i + 1 < args.length) {
        summaryContent = args[i + 1];
        i++;
    }
}

if (!patchId || !summaryContent) {
    console.error('Usage: node summary_ensure_dual_once.js --patch-id <patchId> --summary-content <content>');
    process.exit(1);
}

writeDualSummaries(patchId, summaryContent);
