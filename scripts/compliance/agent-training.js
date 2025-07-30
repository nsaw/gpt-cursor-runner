const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class AgentTraining {
  constructor() {
    this.trainingModules = [
      {
        name: 'Non-blocking Command Patterns',
        description: 'Understanding and implementing non-blocking terminal patterns',
        content: `
# Non-blocking Command Patterns Training

## Core Principle
All terminal commands in Cursor agent chat MUST use non-blocking patterns to prevent:
- Cursor UI freezing
- GPT flow interruption
- Agent chat hanging
- User experience degradation

## Mandatory Pattern
\`\`\`bash
{ command & } >/dev/null 2>&1 & disown
\`\`\`

## Pattern Components
1. **Subshell Wrapping**: \`{ command & }\` - Isolates command execution
2. **Background Execution**: \`&\` - Runs command in background
3. **Output Suppression**: \`>/dev/null 2>&1\` - Prevents output blocking
4. **Process Detachment**: \`& disown\` - Removes from parent process

## Examples
✅ **CORRECT**:
\`\`\`bash
{ bash scripts/validate-runtime.sh & } >/dev/null 2>&1 & disown
{ npm run build & } >/dev/null 2>&1 & disown
{ python3 -m server.main & } >/dev/null 2>&1 & disown
\`\`\`

❌ **INCORRECT**:
\`\`\`bash
bash scripts/validate-runtime.sh
npm run build
python3 -m server.main
\`\`\`

## Enforcement
- All agents MUST follow this pattern
- No exceptions without explicit user approval
- Pattern must be used for all script executions
- Background processes require disown pattern
        `
      },
      {
        name: 'Validation Gate Enforcement',
        description: 'Understanding validation requirements and enforcement',
        content: `
# Validation Gate Enforcement Training

## Required Patch Properties
All patches must include:
- "enforceValidationGate": true
- "strictRuntimeAudit": true
- "runDryCheck": true
- "forceRuntimeTrace": true
- "requireMutationProof": true
- "requireServiceUptime": true

## Validation Steps
1. **Pre-execution**: Validate command patterns
2. **Runtime**: Monitor execution without blocking
3. **Post-execution**: Verify results and generate reports
4. **Compliance**: Ensure all requirements are met

## Failure Handling
- If validation fails, halt progression
- Mark patch as FAIL
- Move to failed directory
- Generate detailed error report
        `
      },
      {
        name: 'Agent Accountability',
        description: 'Understanding agent responsibilities and reporting',
        content: `
# Agent Accountability Training

## Core Responsibilities
1. **Never fabricate status or summaries**
2. **All claims must be backed by disk proof**
3. **Ask user immediately if uncertain**
4. **Halt and request elevation if blocked**
5. **Create summary files for all progress reports**

## Mandatory Summary Creation
- Progress reports
- Stalls or failures
- Agent stops progressing
- Patch execution issues
- Agent chat stops

## Summary Requirements
- Must be .md files
- Must begin with "summary-"
- Must be written to assigned paths
- Must contain validation status (PASS/FAIL)
- Must include timestamps and backlinks

## Enforcement
- Zero tolerance for summary fabrication
- Automatic rollback for violations
- Immediate error reporting
- Audit trail maintenance
        `
      }
    ];
    
    this.trainingStatus = {
      completed: false,
      modules: [],
      timestamp: null,
      agentId: null
    };
  }

  async startTraining(agentId) {
    console.log('🎓 Starting Agent Training Program...\n');
    
    this.trainingStatus.agentId = agentId;
    this.trainingStatus.timestamp = new Date().toISOString();
    
    for (const module of this.trainingModules) {
      console.log(`📚 Module: ${module.name}`);
      console.log(`📝 Description: ${module.description}\n`);
      console.log(module.content);
      console.log(`\n${  '='.repeat(80)  }\n`);
      
      // Simulate training completion
      this.trainingStatus.modules.push({
        name: module.name,
        completed: true,
        timestamp: new Date().toISOString()
      });
      
      // Small delay to simulate reading
      await this.delay(1000);
    }
    
    this.trainingStatus.completed = true;
    await this.saveTrainingStatus();
    
    console.log('✅ Agent Training Completed Successfully!');
    console.log(`🎯 Agent ID: ${agentId}`);
    console.log(`📅 Completion Time: ${this.trainingStatus.timestamp}`);
    
    return this.trainingStatus;
  }

  async acknowledgeTraining(agentId, acknowledgment) {
    if (!acknowledgment || !acknowledgment.understood || !acknowledgment.willComply) {
      throw new Error('Agent must acknowledge understanding and compliance');
    }
    
    console.log(`✅ Agent ${agentId} acknowledged training completion`);
    console.log(`📋 Understanding confirmed: ${acknowledgment.understood}`);
    console.log(`🤝 Compliance pledged: ${acknowledgment.willComply}`);
    
    this.trainingStatus.acknowledgment = {
      ...acknowledgment,
      timestamp: new Date().toISOString()
    };
    
    await this.saveTrainingStatus();
    return true;
  }

  async saveTrainingStatus() {
    const trainingDir = './logs/training';
    await fs.mkdir(trainingDir, { recursive: true });
    
    const statusFile = path.join(trainingDir, `agent-${this.trainingStatus.agentId}-training.json`);
    await fs.writeFile(statusFile, JSON.stringify(this.trainingStatus, null, 2));
    
    console.log(`💾 Training status saved to: ${statusFile}`);
  }

  async checkTrainingStatus(agentId) {
    try {
      const trainingDir = './logs/training';
      const statusFile = path.join(trainingDir, `agent-${agentId}-training.json`);
      const content = await fs.readFile(statusFile, 'utf8');
      return JSON.parse(content);
    } catch (_error) {
      return { completed: false, error: 'Training status not found' };
    }
  }

  async generateComplianceReport() {
    const trainingDir = './logs/training';
    const files = await fs.readdir(trainingDir);
    const trainingFiles = files.filter(f => f.endsWith('-training.json'));
    
    const report = {
      timestamp: new Date().toISOString(),
      totalAgents: trainingFiles.length,
      trainedAgents: 0,
      untrainedAgents: [],
      complianceRate: 0,
      details: []
    };
    
    for (const file of trainingFiles) {
      try {
        const content = await fs.readFile(path.join(trainingDir, file), 'utf8');
        const status = JSON.parse(content);
        
        if (status.completed && status.acknowledgment) {
          report.trainedAgents++;
          report.details.push({
            agentId: status.agentId,
            completed: true,
            timestamp: status.timestamp,
            acknowledgment: status.acknowledgment
          });
        } else {
          report.untrainedAgents.push(status.agentId || file);
        }
      } catch (_error) {
        report.untrainedAgents.push(file);
      }
    }
    
    report.complianceRate = (report.trainedAgents / report.totalAgents) * 100;
    
    const reportFile = path.join(trainingDir, 'compliance-report.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Training Compliance Report:');
    console.log(`✅ Trained Agents: ${report.trainedAgents}`);
    console.log(`❌ Untrained Agents: ${report.untrainedAgents.length}`);
    console.log(`📈 Compliance Rate: ${report.complianceRate.toFixed(1)}%`);
    
    return report;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
if (require.main === module) {
  const training = new AgentTraining();
  
  const command = process.argv[2];
  const agentId = process.argv[3];
  
  switch (command) {
  case 'start':
    training.startTraining(agentId || 'default-agent').catch(console.error);
    break;
  case 'status':
    training.checkTrainingStatus(agentId || 'default-agent').then(console.log).catch(console.error);
    break;
  case 'report':
    training.generateComplianceReport().catch(console.error);
    break;
  default:
    console.log('Usage: node agent-training.js [start|status|report] [agentId]');
  }
}

module.exports = AgentTraining; 