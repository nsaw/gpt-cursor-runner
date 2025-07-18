#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class EnhancedPathRouter {
    constructor() {
        this.projectRoot = process.cwd();
        this.projectName = path.basename(this.projectRoot);
        
        // Environment-based configuration
        this.env = process.env;
        
        // Project targets based on environment analysis
        this.projectTargets = {
            'tm-mobile-cursor': {
                name: 'tm-mobile-cursor',
                type: 'mobile-app',
                primaryTarget: 'mobile-native-fresh',
                apiBaseUrl: this.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.68.127:4000',
                firebaseProjectId: this.env.VITE_FIREBASE_PROJECT_ID || 'thoughtmarks-25replit',
                stripeKey: this.env.VITE_STRIPE_PUBLIC_KEY,
                slackKey: this.env.SLACK_TEST_API_KEY,
                openaiKey: this.env.OPENAI_API_KEY
            },
            'gpt-cursor-runner': {
                name: 'gpt-cursor-runner',
                type: 'automation-server',
                primaryTarget: 'gpt_cursor_runner',
                apiBaseUrl: 'https://gpt-cursor-runner.fly.dev',
                firebaseProjectId: null,
                stripeKey: null,
                slackKey: this.env.SLACK_BOT_TOKEN,
                openaiKey: this.env.OPENAI_API_KEY
            }
        };
        
        // Get current project configuration
        this.currentProject = this.projectTargets[this.projectName] || this.projectTargets['tm-mobile-cursor'];
        
        // Define paths based on project type
        this.paths = this.definePaths();
    }

    definePaths() {
        const basePaths = {
            projectRoot: this.projectRoot,
            logsPath: path.join(this.projectRoot, 'logs'),
            scriptsPath: path.join(this.projectRoot, 'scripts'),
            tasksPath: path.join(this.projectRoot, 'tasks')
        };

        // Project-specific path configurations
        if (this.currentProject.type === 'mobile-app') {
            return {
                ...basePaths,
                primaryTarget: path.join(this.projectRoot, 'mobile-native-fresh'),
                patchesPath: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'patches'),
                summariesPath: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'summaries'),
                backendPath: path.join(this.projectRoot, 'mobile-native-fresh', 'backend'),
                srcPath: path.join(this.projectRoot, 'mobile-native-fresh', 'src'),
                assetsPath: path.join(this.projectRoot, 'mobile-native-fresh', 'assets'),
                iosPath: path.join(this.projectRoot, 'mobile-native-fresh', 'ios'),
                androidPath: path.join(this.projectRoot, 'mobile-native-fresh', 'android'),
                docsPath: path.join(this.projectRoot, 'mobile-native-fresh', 'docs'),
                // Legacy paths for backward compatibility
                legacyPatchesPath: path.join(this.projectRoot, 'patches'),
                legacySummariesPath: path.join(this.projectRoot, 'summaries')
            };
        } else if (this.currentProject.type === 'automation-server') {
            return {
                ...basePaths,
                primaryTarget: path.join(this.projectRoot, 'gpt_cursor_runner'),
                patchesPath: path.join(this.projectRoot, 'patches'),
                summariesPath: path.join(this.projectRoot, 'summaries'),
                serverPath: path.join(this.projectRoot, 'server'),
                pythonPath: path.join(this.projectRoot, 'gpt_cursor_runner'),
                // Legacy paths for backward compatibility
                legacyPatchesPath: path.join(this.projectRoot, 'patches'),
                legacySummariesPath: path.join(this.projectRoot, 'summaries')
            };
        }

        // Default fallback
        return {
            ...basePaths,
            primaryTarget: this.projectRoot,
            patchesPath: path.join(this.projectRoot, 'patches'),
            summariesPath: path.join(this.projectRoot, 'summaries'),
            legacyPatchesPath: path.join(this.projectRoot, 'patches'),
            legacySummariesPath: path.join(this.projectRoot, 'summaries')
        };
    }

    getProjectInfo() {
        return {
            name: this.currentProject.name,
            type: this.currentProject.type,
            primaryTarget: this.currentProject.primaryTarget,
            apiBaseUrl: this.currentProject.apiBaseUrl,
            firebaseProjectId: this.currentProject.firebaseProjectId,
            hasStripe: !!this.currentProject.stripeKey,
            hasSlack: !!this.currentProject.slackKey,
            hasOpenAI: !!this.currentProject.openaiKey
        };
    }

    getPatchesPath() {
        return this.paths.patchesPath;
    }

    getSummariesPath() {
        return this.paths.summariesPath;
    }

    getLogsPath() {
        return this.paths.logsPath;
    }

    getPrimaryTarget() {
        return this.paths.primaryTarget;
    }

    getBackendPath() {
        return this.paths.backendPath;
    }

    getSrcPath() {
        return this.paths.srcPath;
    }

    getServerPath() {
        return this.paths.serverPath;
    }

    getPythonPath() {
        return this.paths.pythonPath;
    }

    writePatch(patchData, target = 'default') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `patch-${timestamp}.json`;
        
        let targetPath = this.paths.patchesPath;
        
        // Target-specific routing
        if (target === 'mobile-native-fresh' && this.paths.backendPath) {
            targetPath = path.join(this.paths.backendPath, 'patches');
        } else if (target === 'server' && this.paths.serverPath) {
            targetPath = path.join(this.paths.serverPath, 'patches');
        } else if (target === 'python' && this.paths.pythonPath) {
            targetPath = path.join(this.paths.pythonPath, 'patches');
        }
        
        // Ensure target directory exists
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        
        const filepath = path.join(targetPath, filename);
        fs.writeFileSync(filepath, JSON.stringify(patchData, null, 2));
        return filepath;
    }

    writeSummary(summaryData, target = 'default') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `summary-${timestamp}.md`;
        
        let targetPath = this.paths.summariesPath;
        
        // Target-specific routing
        if (target === 'mobile-native-fresh' && this.paths.backendPath) {
            targetPath = path.join(this.paths.backendPath, 'summaries');
        } else if (target === 'server' && this.paths.serverPath) {
            targetPath = path.join(this.paths.serverPath, 'summaries');
        } else if (target === 'python' && this.paths.pythonPath) {
            targetPath = path.join(this.paths.pythonPath, 'summaries');
        }
        
        // Ensure target directory exists
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        
        const filepath = path.join(targetPath, filename);
        fs.writeFileSync(filepath, summaryData);
        return filepath;
    }

    listPatches(target = 'default') {
        let targetPath = this.paths.patchesPath;
        
        // Target-specific routing
        if (target === 'mobile-native-fresh' && this.paths.backendPath) {
            targetPath = path.join(this.paths.backendPath, 'patches');
        } else if (target === 'server' && this.paths.serverPath) {
            targetPath = path.join(this.paths.serverPath, 'patches');
        } else if (target === 'python' && this.paths.pythonPath) {
            targetPath = path.join(this.paths.pythonPath, 'patches');
        }
        
        if (!fs.existsSync(targetPath)) return [];
        return fs.readdirSync(targetPath)
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(targetPath, file));
    }

    listSummaries(target = 'default') {
        let targetPath = this.paths.summariesPath;
        
        // Target-specific routing
        if (target === 'mobile-native-fresh' && this.paths.backendPath) {
            targetPath = path.join(this.paths.backendPath, 'summaries');
        } else if (target === 'server' && this.paths.serverPath) {
            targetPath = path.join(this.paths.serverPath, 'summaries');
        } else if (target === 'python' && this.paths.pythonPath) {
            targetPath = path.join(this.paths.pythonPath, 'summaries');
        }
        
        if (!fs.existsSync(targetPath)) return [];
        return fs.readdirSync(targetPath)
            .filter(file => file.endsWith('.md'))
            .map(file => path.join(targetPath, file));
    }

    getTargetPaths(target = 'default') {
        const targets = {
            default: {
                patches: this.paths.patchesPath,
                summaries: this.paths.summariesPath,
                logs: this.paths.logsPath
            },
            'mobile-native-fresh': {
                patches: this.paths.backendPath ? path.join(this.paths.backendPath, 'patches') : this.paths.patchesPath,
                summaries: this.paths.backendPath ? path.join(this.paths.backendPath, 'summaries') : this.paths.summariesPath,
                logs: this.paths.logsPath
            },
            server: {
                patches: this.paths.serverPath ? path.join(this.paths.serverPath, 'patches') : this.paths.patchesPath,
                summaries: this.paths.serverPath ? path.join(this.paths.serverPath, 'summaries') : this.paths.summariesPath,
                logs: this.paths.logsPath
            },
            python: {
                patches: this.paths.pythonPath ? path.join(this.paths.pythonPath, 'patches') : this.paths.patchesPath,
                summaries: this.paths.pythonPath ? path.join(this.paths.pythonPath, 'summaries') : this.paths.summariesPath,
                logs: this.paths.logsPath
            }
        };
        
        return targets[target] || targets.default;
    }

    validateTarget(target) {
        const validTargets = ['default', 'mobile-native-fresh', 'server', 'python'];
        return validTargets.includes(target);
    }

    getEnvironmentInfo() {
        return {
            projectName: this.projectName,
            projectType: this.currentProject.type,
            apiBaseUrl: this.currentProject.apiBaseUrl,
            firebaseProjectId: this.currentProject.firebaseProjectId,
            hasStripe: !!this.currentProject.stripeKey,
            hasSlack: !!this.currentProject.slackKey,
            hasOpenAI: !!this.currentProject.openaiKey,
            environment: process.env.NODE_ENV || 'development'
        };
    }
}

module.exports = EnhancedPathRouter;

// CLI usage
if (require.main === module) {
    const router = new EnhancedPathRouter();
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
            console.log(JSON.stringify(router.listPatches(target), null, 2));
            break;
        case 'list-summaries':
            console.log(JSON.stringify(router.listSummaries(target), null, 2));
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
            const patchPath = router.writePatch(patchData, target);
            console.log(`Patch written to: ${patchPath}`);
            break;
        case 'write-summary':
            const summaryData = process.argv[4] || '# Test Summary\n\nThis is a test summary.';
            const summaryPath = router.writeSummary(summaryData, target);
            console.log(`Summary written to: ${summaryPath}`);
            break;
        default:
            console.log('Usage: node enhanced-path-router.js [command] [target] [data]');
            console.log('Commands: patches-path, summaries-path, list-patches, list-summaries, project-info, environment-info, target-paths, write-patch, write-summary');
            console.log('Targets: default, mobile-native-fresh, server, python');
    }
} 