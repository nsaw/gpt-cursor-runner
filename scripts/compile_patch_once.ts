/* eslint-disable max-lines, complexity */
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface PatchTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  template: any;
  validation: string[];
}

interface CompileRequest {
  message: string;
  context?: string;
  domain: 'CYOPS' | 'MAIN';
  priority?: 'low' | 'normal' | 'high';
}

interface CompileResult {
  patchId: string;
  success: boolean;
  patch?: any;
  errors?: string[];
  template?: string;
  timestamp: string;
}

class NL2PatchCompiler {
  private templates: Map<string, PatchTemplate> = new Map();
  private templateDir: string;

  constructor() {
    this.templateDir = '/Users/sawyer/gitSync/gpt-cursor-runner/__SoT__/templates/patch';
  }

  public async loadTemplates(): Promise<void> {
    try {
      await fs.mkdir(this.templateDir, { recursive: true });
      
      // Load default templates
      const defaultTemplates = this.getDefaultTemplates();
      
      for (const template of defaultTemplates) {
        const templateFile = path.join(this.templateDir, `${template.id}.json`);
        await fs.writeFile(templateFile, JSON.stringify(template, null, 2));
        this.templates.set(template.id, template);
      }
      
      console.log(`📚 Loaded ${this.templates.size} patch templates`);
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      throw error;
    }
  }

  private getDefaultTemplates(): PatchTemplate[] {
    return [
      {
        id: 'file-creation',
        name: 'File Creation',
        description: 'Create a new file with specified content',
        category: 'file-operations',
        template: {
          showInUI: true,
          blockId: 'patch-v{version}({phase})_{slug}',
          description: '{description}',
          target: '{domain}',
          version: 'v{version}',
          mutations: [
            {
              path: '{file_path}',
              contents: '{file_content}'
            }
          ],
          validate: {
            shell: [
              'test -f {file_path}',
              'npx tsc --noEmit --skipLibCheck',
              'npx eslint . --ext .ts,.tsx --max-warnings=0'
            ]
          },
          postMutationBuild: {
            shell: [
              'npx tsc --noEmit --skipLibCheck',
              'npx eslint . --ext .ts,.tsx --max-warnings=0'
            ]
          },
          enforceValidationGate: true,
          strictRuntimeAudit: true,
          runDryCheck: true,
          forceRuntimeTrace: true,
          requireMutationProof: true,
          requireServiceUptime: true
        },
        validation: ['file_path', 'file_content', 'description']
      },
      {
        id: 'file-modification',
        name: 'File Modification',
        description: 'Modify an existing file with specified changes',
        category: 'file-operations',
        template: {
          showInUI: true,
          blockId: 'patch-v{version}({phase})_{slug}',
          description: '{description}',
          target: '{domain}',
          version: 'v{version}',
          mutations: [
            {
              path: '{file_path}',
              insertAfter: '{insert_after}',
              contents: '{new_content}',
              fallback: '{fallback_strategy}'
            }
          ],
          validate: {
            shell: [
              'test -f {file_path}',
              'npx tsc --noEmit --skipLibCheck',
              'npx eslint . --ext .ts,.tsx --max-warnings=0'
            ]
          },
          postMutationBuild: {
            shell: [
              'npx tsc --noEmit --skipLibCheck',
              'npx eslint . --ext .ts,.tsx --max-warnings=0'
            ]
          },
          enforceValidationGate: true,
          strictRuntimeAudit: true,
          runDryCheck: true,
          forceRuntimeTrace: true,
          requireMutationProof: true,
          requireServiceUptime: true
        },
        validation: ['file_path', 'insert_after', 'new_content', 'description']
      },
      {
        id: 'service-start',
        name: 'Service Start',
        description: 'Start a service or daemon',
        category: 'service-operations',
        template: {
          showInUI: true,
          blockId: 'patch-v{version}({phase})_{slug}',
          description: '{description}',
          target: '{domain}',
          version: 'v{version}',
          mutations: [
            {
              path: '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/service-start.sh',
              insertAfter: '# Service start commands',
              contents: './scripts/nb-safe-detach.sh {service_name} 30s bash -lc \'{start_command}\'',
              fallback: 'echo "Service start command added"'
            }
          ],
          validate: {
            shell: [
              'curl -s http://localhost:{service_port}/health | jq .status',
              'ps aux | grep -q {service_name}'
            ]
          },
          postMutationBuild: {
            shell: [
              './scripts/nb-safe-detach.sh {service_name} 30s bash -lc \'{start_command}\''
            ]
          },
          enforceValidationGate: true,
          strictRuntimeAudit: true,
          runDryCheck: true,
          forceRuntimeTrace: true,
          requireMutationProof: true,
          requireServiceUptime: true
        },
        validation: ['service_name', 'start_command', 'service_port', 'description']
      },
      {
        id: 'configuration-update',
        name: 'Configuration Update',
        description: 'Update configuration files',
        category: 'configuration',
        template: {
          showInUI: true,
          blockId: 'patch-v{version}({phase})_{slug}',
          description: '{description}',
          target: '{domain}',
          version: 'v{version}',
          mutations: [
            {
              path: '{config_file}',
              insertAt: '{config_key}',
              contents: '"{config_key}": {config_value},',
              fallback: '// Insert at end of config object'
            }
          ],
          validate: {
            shell: [
              'test -f {config_file}',
              'jq . {config_file} > /dev/null'
            ]
          },
          postMutationBuild: {
            shell: [
              'jq . {config_file} > /dev/null'
            ]
          },
          enforceValidationGate: true,
          strictRuntimeAudit: true,
          runDryCheck: true,
          forceRuntimeTrace: true,
          requireMutationProof: true,
          requireServiceUptime: true
        },
        validation: ['config_file', 'config_key', 'config_value', 'description']
      }
    ];
  }

  public async compilePatch(request: CompileRequest): Promise<CompileResult> {
    const patchId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // Analyze the message to determine intent
      const intent = this.analyzeIntent(request.message);
      
      // Select appropriate template
      const template = this.selectTemplate(intent);
      
      if (!template) {
        return {
          patchId,
          success: false,
          errors: ['No suitable template found for the request'],
          timestamp
        };
      }

      // Extract parameters from the message
      const parameters = this.extractParameters(request.message, template);
      
      // Validate required parameters
      const validationErrors = this.validateParameters(parameters, template);
      if (validationErrors.length > 0) {
        return {
          patchId,
          success: false,
          errors: validationErrors,
          template: template.id,
          timestamp
        };
      }

      // Generate the patch
      const patch = this.generatePatch(template, parameters, request);
      
      // Save the patch
      const writerRoot = `/Users/sawyer/gitSync/.cursor-cache/${request.domain}/artifacts/patches`;
      await fs.mkdir(writerRoot, { recursive: true });
      
      const patchFile = path.join(writerRoot, `${patchId}.json`);
      await fs.writeFile(patchFile, JSON.stringify(patch, null, 2));

      // Create compile proof
      const proofDir = `/Users/sawyer/gitSync/.cursor-cache/${request.domain}/artifacts/proofs/patch-compile`;
      await fs.mkdir(proofDir, { recursive: true });
      
      const proofFile = path.join(proofDir, `${patchId}.json`);
      await fs.writeFile(proofFile, JSON.stringify({
        patchId,
        template: template.id,
        parameters,
        timestamp,
        success: true
      }, null, 2));

      console.log(`✅ Patch compiled successfully: ${patchId}`);
      console.log(`📋 Template: ${template.name}`);
      console.log(`🎯 Domain: ${request.domain}`);

      return {
        patchId,
        success: true,
        patch,
        template: template.id,
        timestamp
      };

    } catch (error) {
      console.error('❌ Error compiling patch:', error);
      return {
        patchId,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp
      };
    }
  }

  private analyzeIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('create') && lowerMessage.includes('file')) {
      return 'file-creation';
    } else if (lowerMessage.includes('modify') || lowerMessage.includes('update') || lowerMessage.includes('change')) {
      return 'file-modification';
    } else if (lowerMessage.includes('start') && (lowerMessage.includes('service') || lowerMessage.includes('daemon'))) {
      return 'service-start';
    } else if (lowerMessage.includes('config') || lowerMessage.includes('setting')) {
      return 'configuration-update';
    }
    
    return 'file-creation'; // Default fallback
  }

  private selectTemplate(intent: string): PatchTemplate | null {
    return this.templates.get(intent) || null;
  }

  private extractParameters(message: string, _template: PatchTemplate): Record<string, string> {
    const parameters: Record<string, string> = {};
    
    // Simple parameter extraction (can be enhanced with NLP)
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (line.includes('file:') || line.includes('path:')) {
        const match = line.match(/(?:file|path):\s*(.+)/i);
        if (match) parameters.file_path = match[1].trim();
      }
      
      if (line.includes('content:') || line.includes('code:')) {
        const match = line.match(/(?:content|code):\s*(.+)/i);
        if (match) parameters.file_content = match[1].trim();
      }
      
      if (line.includes('service:') || line.includes('name:')) {
        const match = line.match(/(?:service|name):\s*(.+)/i);
        if (match) parameters.service_name = match[1].trim();
      }
      
      if (line.includes('port:')) {
        const match = line.match(/port:\s*(\d+)/i);
        if (match) parameters.service_port = match[1].trim();
      }
    }
    
    // Extract description from the main message
    parameters.description = message.split('\n')[0].trim();
    
    return parameters;
  }

  private validateParameters(parameters: Record<string, string>, template: PatchTemplate): string[] {
    const errors: string[] = [];
    
    for (const required of template.validation) {
      if (!parameters[required] || parameters[required].trim() === '') {
        errors.push(`Missing required parameter: ${required}`);
      }
    }
    
    return errors;
  }

  private generatePatch(template: PatchTemplate, parameters: Record<string, string>, request: CompileRequest): any {
    const patch = JSON.parse(JSON.stringify(template.template));
    
    // Replace placeholders with actual values
    const patchStr = JSON.stringify(patch);
    let processedPatch = patchStr;
    
    // Replace common placeholders
    processedPatch = processedPatch.replace(/{version}/g, '2.3.61');
    processedPatch = processedPatch.replace(/{phase}/g, 'P7.1.01');
    processedPatch = processedPatch.replace(/{slug}/g, this.generateSlug(parameters.description));
    processedPatch = processedPatch.replace(/{domain}/g, request.domain);
    
    // Replace template-specific parameters
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`;
      processedPatch = processedPatch.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return JSON.parse(processedPatch);
  }

  private generateSlug(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }
}

export default NL2PatchCompiler;

// Standalone execution function
async function main() {
  const compiler = new NL2PatchCompiler();
  await compiler.loadTemplates();
  
  // Example usage
  const request: CompileRequest = {
    message: 'Create a new TypeScript file for the GPT Bridge service\nfile: server/services/gpt-bridge.ts\ncontent: export class GPTBridge { ... }',
    domain: 'CYOPS',
    priority: 'normal'
  };
  
  const result = await compiler.compilePatch(request);
  console.log('Compile result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}
