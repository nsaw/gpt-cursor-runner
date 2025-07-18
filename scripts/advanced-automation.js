#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class AdvancedAutomation {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.automationLog = path.join(this.logDir, 'advanced-automation.log');
        this.workflowsFile = path.join(this.logDir, 'automation-workflows.json');
        this.ensureLogDir();
        this.workflows = this.loadWorkflows();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            component: 'advanced-automation'
        };
        
        console.log(`[${timestamp}] [${level}] ${message}`);
        
        // Append to log file
        fs.appendFileSync(this.automationLog, JSON.stringify(logEntry) + '\n');
    }

    loadWorkflows() {
        try {
            if (fs.existsSync(this.workflowsFile)) {
                return JSON.parse(fs.readFileSync(this.workflowsFile, 'utf8'));
            }
        } catch (error) {
            this.log(`Error loading workflows: ${error.message}`, 'ERROR');
        }
        
        return {
            workflows: {},
            schedules: {},
            triggers: {}
        };
    }

    saveWorkflows() {
        try {
            fs.writeFileSync(this.workflowsFile, JSON.stringify(this.workflows, null, 2));
            this.log('Workflows saved');
        } catch (error) {
            this.log(`Failed to save workflows: ${error.message}`, 'ERROR');
        }
    }

    createWorkflow(name, steps, schedule = null, triggers = []) {
        this.log(`Creating workflow: ${name}`);
        
        const workflow = {
            name,
            steps,
            schedule,
            triggers,
            created: new Date().toISOString(),
            lastRun: null,
            status: 'active'
        };
        
        this.workflows.workflows[name] = workflow;
        this.saveWorkflows();
        
        this.log(`Workflow '${name}' created successfully`);
        return workflow;
    }

    executeWorkflow(name) {
        const workflow = this.workflows.workflows[name];
        if (!workflow) {
            this.log(`Workflow '${name}' not found`, 'ERROR');
            return false;
        }

        this.log(`Executing workflow: ${name}`);
        
        try {
            let success = true;
            const results = [];
            
            for (const step of workflow.steps) {
                this.log(`Executing step: ${step.name}`);
                
                const result = this.executeStep(step);
                results.push({
                    step: step.name,
                    success: result.success,
                    output: result.output,
                    error: result.error
                });
                
                if (!result.success) {
                    success = false;
                    this.log(`Step '${step.name}' failed: ${result.error}`, 'ERROR');
                    break;
                }
            }
            
            workflow.lastRun = new Date().toISOString();
            workflow.lastResults = results;
            this.saveWorkflows();
            
            if (success) {
                this.log(`Workflow '${name}' completed successfully`);
            } else {
                this.log(`Workflow '${name}' failed`, 'ERROR');
            }
            
            return success;
        } catch (error) {
            this.log(`Workflow execution error: ${error.message}`, 'ERROR');
            return false;
        }
    }

    executeStep(step) {
        try {
            switch (step.type) {
                case 'command':
                    return this.executeCommand(step.command);
                case 'script':
                    return this.executeScript(step.script);
                case 'condition':
                    return this.evaluateCondition(step.condition);
                case 'wait':
                    return this.wait(step.duration);
                default:
                    return { success: false, error: `Unknown step type: ${step.type}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    executeCommand(command) {
        try {
            const output = execSync(command, { encoding: 'utf8' });
            return { success: true, output };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    executeScript(scriptPath) {
        try {
            const fullPath = path.resolve(__dirname, scriptPath);
            if (!fs.existsSync(fullPath)) {
                return { success: false, error: `Script not found: ${scriptPath}` };
            }
            
            const output = execSync(`node ${fullPath}`, { encoding: 'utf8' });
            return { success: true, output };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    evaluateCondition(condition) {
        try {
            // Simple condition evaluation
            const result = eval(condition);
            return { success: true, output: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    wait(duration) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, output: `Waited ${duration}ms` });
            }, duration);
        });
    }

    scheduleWorkflow(name, cronExpression) {
        this.log(`Scheduling workflow: ${name} with cron: ${cronExpression}`);
        
        this.workflows.schedules[name] = {
            workflow: name,
            cron: cronExpression,
            nextRun: this.calculateNextRun(cronExpression),
            active: true
        };
        
        this.saveWorkflows();
        this.log(`Workflow '${name}' scheduled successfully`);
    }

    calculateNextRun(cronExpression) {
        // Simple cron calculation (basic implementation)
        const now = new Date();
        const nextRun = new Date(now.getTime() + 60000); // Default to 1 minute from now
        return nextRun.toISOString();
    }

    addTrigger(name, event, workflow) {
        this.log(`Adding trigger: ${name} for event: ${event}`);
        
        this.workflows.triggers[name] = {
            event,
            workflow,
            active: true,
            created: new Date().toISOString()
        };
        
        this.saveWorkflows();
        this.log(`Trigger '${name}' added successfully`);
    }

    handleEvent(event, data = {}) {
        this.log(`Handling event: ${event}`);
        
        const triggers = Object.values(this.workflows.triggers)
            .filter(trigger => trigger.event === event && trigger.active);
        
        triggers.forEach(trigger => {
            this.log(`Executing workflow for trigger: ${trigger.workflow}`);
            this.executeWorkflow(trigger.workflow);
        });
    }

    getWorkflowStatus(name) {
        const workflow = this.workflows.workflows[name];
        if (!workflow) {
            return null;
        }
        
        return {
            name: workflow.name,
            status: workflow.status,
            lastRun: workflow.lastRun,
            lastResults: workflow.lastResults
        };
    }

    listWorkflows() {
        return Object.keys(this.workflows.workflows).map(name => ({
            name,
            ...this.getWorkflowStatus(name)
        }));
    }

    createDefaultWorkflows() {
        this.log('Creating default workflows...');
        
        // System health check workflow
        this.createWorkflow('system-health-check', [
            { name: 'check-trust-daemon', type: 'command', command: 'ps aux | grep trust-daemon | grep -v grep' },
            { name: 'check-log-rotation', type: 'command', command: 'ps aux | grep log-rotation | grep -v grep' },
            { name: 'check-systems-go', type: 'command', command: 'ps aux | grep systems-go | grep -v grep' },
            { name: 'verify-systems', type: 'script', script: 'verify-systems.js' }
        ]);
        
        // Performance optimization workflow
        this.createWorkflow('performance-optimization', [
            { name: 'cleanup-logs', type: 'command', command: 'find logs -name "*.log" -mtime +7 -delete' },
            { name: 'optimize-memory', type: 'script', script: 'performance-optimizer.js optimize' },
            { name: 'check-disk-space', type: 'command', command: 'df -h .' }
        ]);
        
        // Deployment workflow
        this.createWorkflow('deployment-check', [
            { name: 'check-git-status', type: 'command', command: 'git status --porcelain' },
            { name: 'run-tests', type: 'script', script: 'verify-all-systems.sh' },
            { name: 'deploy-if-clean', type: 'condition', condition: 'true' }
        ]);
        
        this.log('Default workflows created successfully');
    }

    startAutomation() {
        this.log('🤖 Starting Advanced Automation System...');
        
        // Create default workflows if none exist
        if (Object.keys(this.workflows.workflows).length === 0) {
            this.createDefaultWorkflows();
        }
        
        // Start monitoring for scheduled workflows
        this.startScheduler();
        
        this.log('Advanced Automation System active');
    }

    startScheduler() {
        this.log('Starting workflow scheduler...');
        
        setInterval(() => {
            this.checkScheduledWorkflows();
        }, 60000); // Check every minute
        
        this.log('Workflow scheduler started');
    }

    checkScheduledWorkflows() {
        const now = new Date();
        
        Object.entries(this.workflows.schedules).forEach(([name, schedule]) => {
            if (schedule.active && new Date(schedule.nextRun) <= now) {
                this.log(`Executing scheduled workflow: ${schedule.workflow}`);
                this.executeWorkflow(schedule.workflow);
                
                // Update next run time
                schedule.nextRun = this.calculateNextRun(schedule.cron);
                this.saveWorkflows();
            }
        });
    }
}

// CLI interface
if (require.main === module) {
    const automation = new AdvancedAutomation();
    
    const command = process.argv[2];
    const args = process.argv.slice(3);
    
    switch (command) {
        case 'start':
            automation.startAutomation();
            break;
        case 'create':
            if (args.length < 3) {
                console.log('Usage: node advanced-automation.js create <name> <steps> [schedule]');
                process.exit(1);
            }
            const [name, stepsJson, schedule] = args;
            const steps = JSON.parse(stepsJson);
            automation.createWorkflow(name, steps, schedule);
            break;
        case 'execute':
            if (args.length < 1) {
                console.log('Usage: node advanced-automation.js execute <workflow-name>');
                process.exit(1);
            }
            automation.executeWorkflow(args[0]);
            break;
        case 'list':
            const workflows = automation.listWorkflows();
            console.log(JSON.stringify(workflows, null, 2));
            break;
        case 'schedule':
            if (args.length < 2) {
                console.log('Usage: node advanced-automation.js schedule <workflow-name> <cron-expression>');
                process.exit(1);
            }
            automation.scheduleWorkflow(args[0], args[1]);
            break;
        case 'trigger':
            if (args.length < 2) {
                console.log('Usage: node advanced-automation.js trigger <event> <workflow-name>');
                process.exit(1);
            }
            automation.addTrigger(`trigger-${Date.now()}`, args[0], args[1]);
            break;
        case 'event':
            if (args.length < 1) {
                console.log('Usage: node advanced-automation.js event <event-name> [data]');
                process.exit(1);
            }
            const data = args[1] ? JSON.parse(args[1]) : {};
            automation.handleEvent(args[0], data);
            break;
        default:
            console.log('Usage: node advanced-automation.js [start|create|execute|list|schedule|trigger|event]');
            process.exit(1);
    }
}

module.exports = AdvancedAutomation; 