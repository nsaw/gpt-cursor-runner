#!/usr/bin/env node

// Enhanced Path Router - Environment-based project targeting
// This is a wrapper that uses the enhanced path router for backward compatibility

const EnhancedPathRouter = require('./enhanced-path-router.js');

class PathRouter {
    constructor() {
        this.enhancedRouter = new EnhancedPathRouter();
    }

    getPatchesPath() {
        return this.enhancedRouter.getPatchesPath();
    }

    getSummariesPath() {
        return this.enhancedRouter.getSummariesPath();
    }

    getLogsPath() {
        return this.enhancedRouter.getLogsPath();
    }

    writePatch(patchData) {
        return this.enhancedRouter.writePatch(patchData, 'default');
    }

    writeSummary(summaryData) {
        return this.enhancedRouter.writeSummary(summaryData, 'default');
    }

    listPatches() {
        return this.enhancedRouter.listPatches('default');
    }

    listSummaries() {
        return this.enhancedRouter.listSummaries('default');
    }

    // Enhanced methods for target-specific routing
    writePatchToTarget(patchData, target) {
        return this.enhancedRouter.writePatch(patchData, target);
    }

    writeSummaryToTarget(summaryData, target) {
        return this.enhancedRouter.writeSummary(summaryData, target);
    }

    getTargetPaths(target) {
        return this.enhancedRouter.getTargetPaths(target);
    }

    getProjectInfo() {
        return this.enhancedRouter.getProjectInfo();
    }

    getEnvironmentInfo() {
        return this.enhancedRouter.getEnvironmentInfo();
    }
}

module.exports = PathRouter;

// CLI usage
if (require.main === module) {
    const router = new PathRouter();
    const command = process.argv[2];
    const target = process.argv[3] || 'default';
    
    switch (command) {
        case 'patches-path':
            console.log(router.getPatchesPath());
            break;
        case 'summaries-path':
            console.log(router.getSummariesPath());
            break;
        case 'list-patches':
            console.log(JSON.stringify(router.listPatches(), null, 2));
            break;
        case 'list-summaries':
            console.log(JSON.stringify(router.listSummaries(), null, 2));
            break;
        case 'project-info':
            console.log(JSON.stringify(router.getProjectInfo(), null, 2));
            break;
        case 'environment-info':
            console.log(JSON.stringify(router.getEnvironmentInfo(), null, 2));
            break;
        case 'target-paths':
            console.log(JSON.stringify(router.getTargetPaths(target), null, 2));
            break;
        case 'write-patch':
            const patchData = JSON.parse(process.argv[4] || '{"test": true}');
            const patchPath = router.writePatchToTarget(patchData, target);
            console.log(`Patch written to: ${patchPath}`);
            break;
        case 'write-summary':
            const summaryData = process.argv[4] || '# Test Summary\n\nThis is a test summary.';
            const summaryPath = router.writeSummaryToTarget(summaryData, target);
            console.log(`Summary written to: ${summaryPath}`);
            break;
        default:
            console.log('Usage: node path-router.js [command] [target] [data]');
            console.log('Commands: patches-path, summaries-path, list-patches, list-summaries, project-info, environment-info, target-paths, write-patch, write-summary');
            console.log('Targets: default, mobile-native-fresh, server, python');
    }
} 