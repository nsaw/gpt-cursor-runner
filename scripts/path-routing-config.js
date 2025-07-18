#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PathRoutingConfig {
    constructor() {
        this.projectRoot = process.cwd();
        this.projectName = path.basename(this.projectRoot);
        
        // Define absolute paths for tm-mobile-cursor
        this.paths = {
            // Main project paths
            projectRoot: this.projectRoot,
            mobileNativeFresh: path.join(this.projectRoot, 'mobile-native-fresh'),
            
            // Target paths for patches and summaries
            patchesPath: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'patches'),
            summariesPath: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'summaries'),
            
            // Supporting directories
            logsPath: path.join(this.projectRoot, 'logs'),
            scriptsPath: path.join(this.projectRoot, 'scripts'),
            tasksPath: path.join(this.projectRoot, 'tasks'),
            
            // Legacy paths (for backward compatibility)
            legacyPatchesPath: path.join(this.projectRoot, 'patches'),
            legacySummariesPath: path.join(this.projectRoot, 'summaries')
        };
        
        // Validate this is the correct project
        if (this.projectName !== 'tm-mobile-cursor') {
            throw new Error(`Wrong project context: expected tm-mobile-cursor, got ${this.projectName}`);
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    ensureDirectories() {
        this.log('🔧 Ensuring all required directories exist...');
        
        const directories = [
            this.paths.patchesPath,
            this.paths.summariesPath,
            this.paths.logsPath,
            this.paths.scriptsPath,
            this.paths.tasksPath,
            path.join(this.paths.patchesPath, '.archive'),
            path.join(this.paths.patchesPath, '.failed'),
            path.join(this.paths.summariesPath, '.archive')
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.log(`Created directory: ${dir}`);
            } else {
                this.log(`Directory exists: ${dir}`);
            }
        }
    }

    updateScriptPaths() {
        this.log('🔧 Updating script path configurations...');
        
        const scriptsToUpdate = [
            'scripts/log-rotation.js',
            'scripts/verify-systems.js',
            'scripts/systems-go-handshake.js',
            'scripts/trust-daemon.js',
            'scripts/summary-cleanup.js',
            'scripts/monitoring-system.js'
        ];

        for (const scriptPath of scriptsToUpdate) {
            if (fs.existsSync(scriptPath)) {
                this.updateScriptPathConfig(scriptPath);
            } else {
                this.log(`Script not found: ${scriptPath}`, 'WARN');
            }
        }
    }

    updateScriptPathConfig(scriptPath) {
        try {
            let content = fs.readFileSync(scriptPath, 'utf8');
            let updated = false;

            // Replace relative path references with absolute paths
            const replacements = [
                {
                    pattern: /this\.logDir\s*=\s*['"`]logs['"`]/g,
                    replacement: `this.logDir = '${this.paths.logsPath}'`
                },
                {
                    pattern: /path\.join\(__dirname,\s*['"`]\.\.\/logs['"`]\)/g,
                    replacement: `'${this.paths.logsPath}'`
                },
                {
                    pattern: /path\.join\(__dirname,\s*['"`]\.\.\/summaries['"`]\)/g,
                    replacement: `'${this.paths.summariesPath}'`
                },
                {
                    pattern: /path\.join\(__dirname,\s*['"`]\.\.\/patches['"`]\)/g,
                    replacement: `'${this.paths.patchesPath}'`
                },
                {
                    pattern: /['"`]summaries['"`]/g,
                    replacement: `'${this.paths.summariesPath}'`
                },
                {
                    pattern: /['"`]patches['"`]/g,
                    replacement: `'${this.paths.patchesPath}'`
                }
            ];

            for (const replacement of replacements) {
                if (replacement.pattern.test(content)) {
                    content = content.replace(replacement.pattern, replacement.replacement);
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(scriptPath, content);
                this.log(`Updated path configurations in: ${scriptPath}`);
            } else {
                this.log(`No path updates needed for: ${scriptPath}`);
            }
        } catch (error) {
            this.log(`Error updating ${scriptPath}: ${error.message}`, 'ERROR');
        }
    }

    createPathRoutingConfig() {
        this.log('🔧 Creating path routing configuration...');
        
        const config = {
            projectName: this.projectName,
            projectRoot: this.projectRoot,
            paths: this.paths,
            timestamp: new Date().toISOString(),
            description: 'Path routing configuration for tm-mobile-cursor project'
        };

        const configPath = path.join(this.projectRoot, 'scripts', 'path-routing-config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        this.log(`Created path routing config: ${configPath}`);
        
        return config;
    }

    migrateLegacyFiles() {
        this.log('🔧 Migrating legacy files to new paths...');
        
        const migrations = [
            {
                from: this.paths.legacyPatchesPath,
                to: this.paths.patchesPath,
                type: 'patches'
            },
            {
                from: this.paths.legacySummariesPath,
                to: this.paths.summariesPath,
                type: 'summaries'
            }
        ];

        for (const migration of migrations) {
            if (fs.existsSync(migration.from)) {
                this.log(`Migrating ${migration.type} from ${migration.from} to ${migration.to}`);
                
                const files = fs.readdirSync(migration.from);
                for (const file of files) {
                    const sourcePath = path.join(migration.from, file);
                    const destPath = path.join(migration.to, file);
                    
                    if (fs.statSync(sourcePath).isFile()) {
                        fs.copyFileSync(sourcePath, destPath);
                        this.log(`Migrated: ${file}`);
                    }
                }
            }
        }
    }

    createCursorPathConfig() {
        this.log('🔧 Creating Cursor path configuration...');
        
        const cursorConfig = {
            paths: {
                patches: this.paths.patchesPath,
                summaries: this.paths.summariesPath,
                logs: this.paths.logsPath,
                scripts: this.paths.scriptsPath,
                tasks: this.paths.tasksPath
            },
            routing: {
                patches: {
                    target: this.paths.patchesPath,
                    archive: path.join(this.paths.patchesPath, '.archive'),
                    failed: path.join(this.paths.patchesPath, '.failed')
                },
                summaries: {
                    target: this.paths.summariesPath,
                    archive: path.join(this.paths.summariesPath, '.archive')
                }
            },
            project: {
                name: this.projectName,
                root: this.projectRoot,
                mobileNativeFresh: this.paths.mobileNativeFresh
            }
        };

        const cursorConfigPath = path.join(this.projectRoot, '.cursor', 'path-routing.json');
        
        // Ensure .cursor directory exists
        if (!fs.existsSync(path.dirname(cursorConfigPath))) {
            fs.mkdirSync(path.dirname(cursorConfigPath), { recursive: true });
        }
        
        fs.writeFileSync(cursorConfigPath, JSON.stringify(cursorConfig, null, 2));
        this.log(`Created Cursor path config: ${cursorConfigPath}`);
        
        return cursorConfig;
    }

    verifyPathRouting() {
        this.log('🔍 Verifying path routing configuration...');
        
        const results = {
            directories: {},
            permissions: {},
            routing: {}
        };

        // Check directory existence and permissions
        for (const [name, fullPath] of Object.entries(this.paths)) {
            const exists = fs.existsSync(fullPath);
            const isDirectory = exists ? fs.statSync(fullPath).isDirectory() : false;
            const writable = exists ? fs.accessSync(fullPath, fs.constants.W_OK) : false;
            
            results.directories[name] = {
                path: fullPath,
                exists,
                isDirectory,
                writable,
                valid: exists && isDirectory && writable
            };
        }

        // Check routing configuration
        results.routing = {
            patchesTarget: this.paths.patchesPath,
            summariesTarget: this.paths.summariesPath,
            patchesTargetExists: fs.existsSync(this.paths.patchesPath),
            summariesTargetExists: fs.existsSync(this.paths.summariesPath)
        };

        return results;
    }

    generatePathRoutingScript() {
        this.log('🔧 Generating path routing utility script...');
        
        const scriptContent = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PathRouter {
    constructor() {
        this.projectRoot = '${this.projectRoot}';
        this.paths = ${JSON.stringify(this.paths, null, 8)};
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

    writePatch(patchData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = \`patch-\${timestamp}.json\`;
        const filepath = path.join(this.paths.patchesPath, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(patchData, null, 2));
        return filepath;
    }

    writeSummary(summaryData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = \`summary-\${timestamp}.md\`;
        const filepath = path.join(this.paths.summariesPath, filename);
        
        fs.writeFileSync(filepath, summaryData);
        return filepath;
    }

    listPatches() {
        if (!fs.existsSync(this.paths.patchesPath)) return [];
        return fs.readdirSync(this.paths.patchesPath)
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(this.paths.patchesPath, file));
    }

    listSummaries() {
        if (!fs.existsSync(this.paths.summariesPath)) return [];
        return fs.readdirSync(this.paths.summariesPath)
            .filter(file => file.endsWith('.md'))
            .map(file => path.join(this.paths.summariesPath, file));
    }
}

module.exports = PathRouter;

// CLI usage
if (require.main === module) {
    const router = new PathRouter();
    const command = process.argv[2];
    
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
        default:
            console.log('Usage: node path-router.js [patches-path|summaries-path|list-patches|list-summaries]');
    }
}
`;

        const scriptPath = path.join(this.projectRoot, 'scripts', 'path-router.js');
        fs.writeFileSync(scriptPath, scriptContent);
        fs.chmodSync(scriptPath, '755');
        this.log(`Generated path router script: ${scriptPath}`);
    }

    runConfiguration() {
        this.log('🚀 Starting Path Routing Configuration...');
        this.log(`Project: ${this.projectName}`);
        this.log(`Root: ${this.projectRoot}`);
        
        try {
            // Ensure all directories exist
            this.ensureDirectories();
            
            // Update script path configurations
            this.updateScriptPaths();
            
            // Create path routing configuration
            this.createPathRoutingConfig();
            
            // Create Cursor path configuration
            this.createCursorPathConfig();
            
            // Generate path routing utility script
            this.generatePathRoutingScript();
            
            // Migrate legacy files if they exist
            this.migrateLegacyFiles();
            
            // Verify the configuration
            const verification = this.verifyPathRouting();
            
            this.log('\n📊 Path Routing Configuration Summary:');
            
            const allDirectoriesValid = Object.values(verification.directories).every(dir => dir.valid);
            const routingValid = verification.routing.patchesTargetExists && verification.routing.summariesTargetExists;
            
            if (allDirectoriesValid && routingValid) {
                this.log('✅ Path routing configuration complete!');
                this.log(`✅ Patches will be written to: ${this.paths.patchesPath}`);
                this.log(`✅ Summaries will be written to: ${this.paths.summariesPath}`);
                this.log('✅ All paths are absolute and hardened');
            } else {
                this.log('⚠️ Some path routing issues detected:', 'WARN');
                if (!allDirectoriesValid) {
                    this.log('❌ Some directories are missing or not writable');
                }
                if (!routingValid) {
                    this.log('❌ Target directories for patches/summaries are missing');
                }
            }
            
            return {
                success: allDirectoriesValid && routingValid,
                paths: this.paths,
                verification
            };
            
        } catch (error) {
            this.log(`Configuration failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const config = new PathRoutingConfig();
    const results = config.runConfiguration();
    
    if (results.success) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

module.exports = PathRoutingConfig; 