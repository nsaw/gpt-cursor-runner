#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PathRoutingVerifier {
    constructor() {
        this.projectRoot = process.cwd();
        this.projectName = path.basename(this.projectRoot);
        
        // Expected paths
        this.expectedPaths = {
            patchesPath: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'patches'),
            summariesPath: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'summaries'),
            logsPath: path.join(this.projectRoot, 'logs'),
            scriptsPath: path.join(this.projectRoot, 'scripts'),
            tasksPath: path.join(this.projectRoot, 'tasks')
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    verifyDirectoryStructure() {
        this.log('🔍 Verifying directory structure...');
        
        const directories = {
            patches: this.expectedPaths.patchesPath,
            summaries: this.expectedPaths.summariesPath,
            logs: this.expectedPaths.logsPath,
            scripts: this.expectedPaths.scriptsPath,
            tasks: this.expectedPaths.tasksPath
        };

        const results = {};
        
        for (const [name, expectedPath] of Object.entries(directories)) {
            const exists = fs.existsSync(expectedPath);
            const isDirectory = exists ? fs.statSync(expectedPath).isDirectory() : false;
            
            results[name] = {
                path: expectedPath,
                exists,
                isDirectory,
                valid: exists && isDirectory
            };
            
            if (results[name].valid) {
                this.log(`✅ ${name}: ${expectedPath} (exists and is directory)`);
            } else {
                this.log(`❌ ${name}: ${expectedPath} (missing or not directory)`, 'ERROR');
            }
        }
        
        return results;
    }

    verifyPathConfigurations() {
        this.log('🔍 Verifying path configurations in scripts...');
        
        const scriptFiles = [
            'scripts/log-rotation.js',
            'scripts/verify-systems.js',
            'scripts/systems-go-handshake.js',
            'scripts/trust-daemon.js',
            'scripts/summary-cleanup.js',
            'scripts/monitoring-system.js'
        ];
        
        const results = {};
        
        for (const scriptFile of scriptFiles) {
            const fullPath = path.join(this.projectRoot, scriptFile);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const pathConfigs = this.extractPathConfigurations(content);
                results[scriptFile] = pathConfigs;
                
                this.log(`📄 ${scriptFile}: Found ${Object.keys(pathConfigs).length} path configurations`);
            } else {
                this.log(`⚠️ ${scriptFile}: File not found`, 'WARN');
            }
        }
        
        return results;
    }

    extractPathConfigurations(content) {
        const configs = {};
        
        // Look for path configurations
        const patterns = [
            /this\.(\w+Dir)\s*=\s*['"`]([^'"`]+)['"`]/g,
            /path\.join\([^)]*\)/g,
            /['"`](summaries|patches|logs|scripts|tasks)['"`]/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] && match[2]) {
                    configs[match[1]] = match[2];
                } else if (match[0]) {
                    configs[`path_${Object.keys(configs).length}`] = match[0];
                }
            }
        });
        
        return configs;
    }

    verifyCursorConfiguration() {
        this.log('🔍 Verifying Cursor configuration...');
        
        const cursorConfigPath = path.join(this.projectRoot, '.cursor', 'path-routing.json');
        const results = {
            configExists: fs.existsSync(cursorConfigPath),
            projectName: null,
            paths: null,
            routing: null
        };
        
        if (results.configExists) {
            try {
                const config = JSON.parse(fs.readFileSync(cursorConfigPath, 'utf8'));
                results.projectName = config.project?.name;
                results.paths = config.paths;
                results.routing = config.routing;
                
                this.log(`✅ Cursor path config found: ${results.projectName}`);
            } catch (error) {
                this.log(`❌ Error reading cursor config: ${error.message}`, 'ERROR');
            }
        } else {
            this.log(`⚠️ No cursor config found at ${cursorConfigPath}`, 'WARN');
        }
        
        return results;
    }

    verifyProjectContext() {
        this.log('🔍 Verifying project context...');
        
        const results = {
            currentDirectory: this.projectRoot,
            projectName: this.projectName,
            parentDirectory: path.dirname(this.projectRoot),
            expectedProjectName: 'tm-mobile-cursor',
            isCorrectProject: this.projectName === 'tm-mobile-cursor'
        };
        
        this.log(`📁 Current directory: ${results.currentDirectory}`);
        this.log(`📁 Project name: ${results.projectName}`);
        this.log(`📁 Parent directory: ${results.parentDirectory}`);
        
        if (results.isCorrectProject) {
            this.log(`✅ Working in correct project: ${results.projectName}`);
        } else {
            this.log(`❌ Wrong project context: expected tm-mobile-cursor, got ${results.projectName}`, 'ERROR');
        }
        
        return results;
    }

    verifyPathRouting() {
        this.log('🔍 Verifying path routing for Cursor...');
        
        const results = {
            summariesPath: this.expectedPaths.summariesPath,
            patchesPath: this.expectedPaths.patchesPath,
            logsPath: this.expectedPaths.logsPath,
            scriptsPath: this.expectedPaths.scriptsPath,
            tasksPath: this.expectedPaths.tasksPath
        };
        
        // Test write permissions
        for (const [name, fullPath] of Object.entries(results)) {
            const exists = fs.existsSync(fullPath);
            const writable = exists ? fs.accessSync(fullPath, fs.constants.W_OK) : false;
            
            this.log(`${name}: ${fullPath} (exists: ${exists}, writable: ${writable})`);
        }
        
        return results;
    }

    testPathRouter() {
        this.log('🔍 Testing path router functionality...');
        
        try {
            const PathRouter = require('./path-router.js');
            const router = new PathRouter();
            
            const tests = [
                {
                    name: 'Patches Path',
                    test: () => router.getPatchesPath(),
                    expected: this.expectedPaths.patchesPath
                },
                {
                    name: 'Summaries Path',
                    test: () => router.getSummariesPath(),
                    expected: this.expectedPaths.summariesPath
                },
                {
                    name: 'Logs Path',
                    test: () => router.getLogsPath(),
                    expected: this.expectedPaths.logsPath
                }
            ];
            
            const results = {};
            
            for (const test of tests) {
                const result = test.test();
                const passed = result === test.expected;
                
                results[test.name] = {
                    result,
                    expected: test.expected,
                    passed
                };
                
                if (passed) {
                    this.log(`✅ ${test.name}: ${result}`);
                } else {
                    this.log(`❌ ${test.name}: got ${result}, expected ${test.expected}`, 'ERROR');
                }
            }
            
            return results;
        } catch (error) {
            this.log(`❌ Path router test failed: ${error.message}`, 'ERROR');
            return { error: error.message };
        }
    }

    testWriteOperations() {
        this.log('🔍 Testing write operations...');
        
        try {
            const PathRouter = require('./path-router.js');
            const router = new PathRouter();
            
            // Test patch writing
            const testPatch = {
                id: 'test-patch-' + Date.now(),
                timestamp: new Date().toISOString(),
                content: 'Test patch content',
                test: true
            };
            
            const patchPath = router.writePatch(testPatch);
            const patchExists = fs.existsSync(patchPath);
            
            // Test summary writing
            const testSummary = `# Test Summary

This is a test summary to verify path routing.

- Timestamp: ${new Date().toISOString()}
- Test: true
- Project: ${this.projectName}
`;
            
            const summaryPath = router.writeSummary(testSummary);
            const summaryExists = fs.existsSync(summaryPath);
            
            // Cleanup test files
            if (patchExists) fs.unlinkSync(patchPath);
            if (summaryExists) fs.unlinkSync(summaryPath);
            
            const results = {
                patchWrite: { path: patchPath, exists: patchExists, passed: patchExists },
                summaryWrite: { path: summaryPath, exists: summaryExists, passed: summaryExists }
            };
            
            if (results.patchWrite.passed) {
                this.log(`✅ Patch write test passed: ${patchPath}`);
            } else {
                this.log(`❌ Patch write test failed`, 'ERROR');
            }
            
            if (results.summaryWrite.passed) {
                this.log(`✅ Summary write test passed: ${summaryPath}`);
            } else {
                this.log(`❌ Summary write test failed`, 'ERROR');
            }
            
            return results;
        } catch (error) {
            this.log(`❌ Write operations test failed: ${error.message}`, 'ERROR');
            return { error: error.message };
        }
    }

    runVerification() {
        this.log('🚀 Starting Path Routing Verification...');
        this.log(`Project: ${this.projectName}`);
        this.log(`Root: ${this.projectRoot}`);
        
        const results = {
            projectContext: this.verifyProjectContext(),
            directoryStructure: this.verifyDirectoryStructure(),
            pathConfigurations: this.verifyPathConfigurations(),
            cursorConfiguration: this.verifyCursorConfiguration(),
            pathRouting: this.verifyPathRouting(),
            pathRouter: this.testPathRouter(),
            writeOperations: this.testWriteOperations()
        };
        
        // Summary
        this.log('\n📊 Path Routing Verification Summary:');
        
        const directoryValid = Object.values(results.directoryStructure).every(dir => dir.valid);
        const projectCorrect = results.projectContext.isCorrectProject;
        const cursorConfigured = results.cursorConfiguration.configExists;
        const pathRouterValid = !results.pathRouter.error;
        const writeOperationsValid = !results.writeOperations.error;
        
        if (directoryValid && projectCorrect && cursorConfigured && pathRouterValid && writeOperationsValid) {
            this.log('✅ All path routing is correctly configured!');
            this.log('✅ Cursor will write to the correct locations for this project.');
            this.log(`✅ Patches will be written to: ${this.expectedPaths.patchesPath}`);
            this.log(`✅ Summaries will be written to: ${this.expectedPaths.summariesPath}`);
        } else {
            this.log('⚠️ Some path routing issues detected:');
            if (!projectCorrect) {
                this.log('❌ Wrong project context');
            }
            if (!directoryValid) {
                this.log('❌ Missing or invalid directories');
            }
            if (!cursorConfigured) {
                this.log('❌ Cursor configuration missing');
            }
            if (!pathRouterValid) {
                this.log('❌ Path router not working');
            }
            if (!writeOperationsValid) {
                this.log('❌ Write operations failing');
            }
        }
        
        return results;
    }
}

// CLI interface
if (require.main === module) {
    const verifier = new PathRoutingVerifier();
    const results = verifier.runVerification();
    
    // Exit with appropriate code
    const directoryValid = Object.values(results.directoryStructure).every(dir => dir.valid);
    const projectCorrect = results.projectContext.isCorrectProject;
    const cursorConfigured = results.cursorConfiguration.configExists;
    const pathRouterValid = !results.pathRouter.error;
    const writeOperationsValid = !results.writeOperations.error;
    
    if (directoryValid && projectCorrect && cursorConfigured && pathRouterValid && writeOperationsValid) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

module.exports = PathRoutingVerifier; 