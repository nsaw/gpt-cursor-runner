import fs from "fs";
import path from "path";
const validationLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/config-validation.log";
const configBackupPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/backups";
const schemaPath = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/schemas";
const auditLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/config-audit.log";
const logDir = path.dirname(validationLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(configBackupPath)) {
  fs.mkdirSync(configBackupPath, { recursive: true });
}
if (!fs.existsSync(schemaPath)) {
  fs.mkdirSync(schemaPath, { recursive: true });
}

interface ConfigSchema {
  id: string;
  name: string;
  version: string;
  description: string;
  properties: {
    [key: string]: {
      type: "string" | "number" | "boolean" | "object" | "array";
      required: boolean;
      default?: unknown;
      min?: number;
      max?: number;
      pattern?: string;
      enum?: unknown[];
      sanitize?: boolean;
      sensitive?: boolean;
      validation?: string;
    };
  };
  required: string[];
  additionalProperties: boolean;
}

interface ConfigValidation {
  id: string;
  configPath: string;
  schemaId: string;
  timestamp: string;
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitized: boolean;
  backupCreated: boolean;
  rollbackRequired: boolean;
}

interface ValidationError {
  path: string;
  message: string;
  severity: "error" | "critical";
  code: string;
  suggestion?: string;
}

interface ValidationWarning {
  path: string;
  message: string;
  severity: "warning" | "info";
  code: string;
  suggestion?: string;
}

interface ConfigChange {
  id: string;
  configPath: string;
  timestamp: string;
  user: string;
  action: "create" | "update" | "delete" | "validate" | "rollback";
  changes: {
    path: string;
    oldValue?: unknown;
    newValue?: unknown;
    type: "add" | "remove" | "modify";
  }[];
  validation: ConfigValidation;
  backupPath?: string;
  rollbackPath?: string;
}

interface ValidationEngineConfig {
  validation: {
    enabled: boolean;
    strictMode: boolean;
    autoSanitize: boolean;
    backupBeforeValidation: boolean;
    maxBackups: number;
  };
  security: {
    enabled: boolean;
    inputSanitization: boolean;
    sensitiveFieldDetection: boolean;
    injectionPrevention: boolean;
    encryption: boolean;
  };
  rollback: {
    enabled: boolean;
    autoRollback: boolean;
    rollbackThreshold: number;
    maxRollbackAttempts: number;
  };
  audit: {
    enabled: boolean;
    logAllChanges: boolean;
    logSensitiveData: boolean;
    retentionDays: number;
  };
  conflict: {
    enabled: boolean;
    autoResolution: boolean;
    conflictDetection: boolean;
    mergeStrategies: string[];
  };
}

interface SanitizationRule {
  id: string;
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

class ConfigurationValidationEngine {
  private config!: ValidationEngineConfig;
  private schemas: Map<string, ConfigSchema> = new Map();
  private validations: ConfigValidation[] = [];
  private changes: ConfigChange[] = [];
  private sanitizationRules: SanitizationRule[] = [];
  private isRunning = false;
  private validationInterval = 60000; // 1 minute
  private cleanupInterval = 300000; // 5 minutes

  constructor() {
    this.loadConfig();
    this.initializeSchemas();
    this.initializeSanitizationRules();
  }

  private loadConfig(): void {
    try {
      const configFile = path.join(logDir, "../config/validation-config.json");
      if (fs.existsSync(configFile)) {
        this.config = JSON.parse(fs.readFileSync(configFile, "utf8"));
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error loading config:",
        error,
      );
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): ValidationEngineConfig {
    return {
      validation: {
        enabled: true,
        strictMode: true,
        autoSanitize: true,
        backupBeforeValidation: true,
        maxBackups: 10,
      },
      security: {
        enabled: true,
        inputSanitization: true,
        sensitiveFieldDetection: true,
        injectionPrevention: true,
        encryption: false,
      },
      rollback: {
        enabled: true,
        autoRollback: true,
        rollbackThreshold: 3,
        maxRollbackAttempts: 3,
      },
      audit: {
        enabled: true,
        logAllChanges: true,
        logSensitiveData: false,
        retentionDays: 90,
      },
      conflict: {
        enabled: true,
        autoResolution: true,
        conflictDetection: true,
        mergeStrategies: ["last-wins", "merge", "manual"],
      },
    };
  }

  private saveConfig(): void {
    try {
      const configFile = path.join(logDir, "../config/validation-config.json");
      fs.writeFileSync(configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error saving config:",
        error,
      );
    }
  }

  private initializeSchemas(): void {
    // Initialize with common Ghost configuration schemas
    const ghostSchemas: ConfigSchema[] = [
      {
        id: "ghost-relay-config",
        name: "Ghost Relay Configuration",
        version: "1.0.0",
        description: "Configuration schema for Ghost relay components",
        properties: {
          security: {
            type: "object",
            required: true,
            sanitize: true,
            validation: "security-config",
          },
          rateLimiting: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "rate-limit-config",
          },
          circuitBreaker: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "circuit-breaker-config",
          },
          messageQueue: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "queue-config",
          },
          audit: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "audit-config",
          },
        },
        required: [
          "security",
          "rateLimiting",
          "circuitBreaker",
          "messageQueue",
          "audit",
        ],
        additionalProperties: false,
      },
      {
        id: "ghost-health-config",
        name: "Ghost Health Configuration",
        version: "1.0.0",
        description: "Configuration schema for health monitoring",
        properties: {
          monitoring: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "monitoring-config",
          },
          scoring: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "scoring-config",
          },
          dependencies: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "dependency-config",
          },
          prediction: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "prediction-config",
          },
        },
        required: ["monitoring", "scoring", "dependencies", "prediction"],
        additionalProperties: false,
      },
      {
        id: "ghost-command-config",
        name: "Ghost Command Configuration",
        version: "1.0.0",
        description: "Configuration schema for command execution",
        properties: {
          security: {
            type: "object",
            required: true,
            sanitize: true,
            validation: "security-config",
          },
          execution: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "execution-config",
          },
          validation: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "validation-config",
          },
          logging: {
            type: "object",
            required: true,
            sanitize: false,
            validation: "logging-config",
          },
        },
        required: ["security", "execution", "validation", "logging"],
        additionalProperties: false,
      },
    ];

    for (const schema of ghostSchemas) {
      this.schemas.set(schema.id, schema);
    }
  }

  private initializeSanitizationRules(): void {
    this.sanitizationRules = [
      {
        id: "sql-injection",
        name: "SQL Injection Prevention",
        pattern:
          /(['";]|--|\/\*|\*\/|xp_|sp_|exec|execute|union|select|insert|update|delete|drop|create|alter)/gi,
        replacement: "[SANITIZED]",
        description: "Prevent SQL injection attacks",
        severity: "critical",
      },
      {
        id: "xss-prevention",
        name: "XSS Prevention",
        pattern: /(<script|javascript:|vbscript:|onload=|onerror=|onclick=)/gi,
        replacement: "[SANITIZED]",
        description: "Prevent cross-site scripting attacks",
        severity: "high",
      },
      {
        id: "path-traversal",
        name: "Path Traversal Prevention",
        pattern: /(\.\.\/|\.\.\\|~\/|~\\)/gi,
        replacement: "[SANITIZED]",
        description: "Prevent path traversal attacks",
        severity: "high",
      },
      {
        id: "command-injection",
        name: "Command Injection Prevention",
        pattern: /(\||&|;|`|\$\(\))/gi,
        replacement: "[SANITIZED]",
        description: "Prevent command injection attacks",
        severity: "critical",
      },
      {
        id: "sensitive-data",
        name: "Sensitive Data Protection",
        pattern: /(password|secret|key|token|credential)/gi,
        replacement: "[REDACTED]",
        description: "Protect sensitive data fields",
        severity: "medium",
      },
    ];
  }

  private sanitizeValue(value: unknown, property: Record<string, unknown>): unknown {
    if (!this.config.security.inputSanitization) return value;

    if (typeof value === "string") {
      let sanitized = value;

      // Apply sanitization rules
      for (const rule of this.sanitizationRules) {
        if (rule.pattern.test(sanitized)) {
          sanitized = sanitized.replace(rule.pattern, rule.replacement);
          console.warn(
            `[ConfigurationValidationEngine] Applied sanitization rule: ${rule.name}`,
          );
        }
      }

      // Additional property-specific sanitization
      if (property.sanitize) {
        // Remove any remaining potentially dangerous characters
        sanitized = sanitized.replace(/[<>"'&]/g, "");
      }

      return sanitized;
    }

    if (typeof value === "object" && value !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitizeValue(val, property);
      }
      return sanitized;
    }

    return value;
  }

  private validateValue(
    value: unknown,
    property: Record<string, unknown>,
    path: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Type validation
    if (property.type === "string" && typeof value !== "string") {
      errors.push({
        path,
        message: `Expected string, got ${typeof value}`,
        severity: "error",
        code: "TYPE_MISMATCH",
        suggestion: `Convert to string or change property type to ${typeof value}`,
      });
    } else if (property.type === "number" && typeof value !== "number") {
      errors.push({
        path,
        message: `Expected number, got ${typeof value}`,
        severity: "error",
        code: "TYPE_MISMATCH",
        suggestion: `Convert to number or change property type to ${typeof value}`,
      });
    } else if (property.type === "boolean" && typeof value !== "boolean") {
      errors.push({
        path,
        message: `Expected boolean, got ${typeof value}`,
        severity: "error",
        code: "TYPE_MISMATCH",
        suggestion: `Convert to boolean or change property type to ${typeof value}`,
      });
    }

    // Range validation for numbers
    if ((property as any).type === "number" && typeof value === "number") {
      if ((property as any).min !== undefined && value < (property as any).min) {
        errors.push({
          path,
          message: `Value ${value} is below minimum ${(property as any).min}`,
          severity: "error",
          code: "VALUE_TOO_LOW",
          suggestion: `Use a value >= ${(property as any).min}`,
        });
      }
      if ((property as any).max !== undefined && value > (property as any).max) {
        errors.push({
          path,
          message: `Value ${value} is above maximum ${(property as any).max}`,
          severity: "error",
          code: "VALUE_TOO_HIGH",
          suggestion: `Use a value <= ${(property as any).max}`,
        });
      }
    }

    // Pattern validation for strings
    if (
      (property as any).type === "string" &&
      typeof value === "string" &&
      (property as any).pattern
    ) {
      const regex = new RegExp((property as any).pattern);
      if (!regex.test(value)) {
        errors.push({
          path,
          message: `Value does not match pattern: ${(property as any).pattern}`,
          severity: "error",
          code: "PATTERN_MISMATCH",
          suggestion: "Ensure value matches the required pattern",
        });
      }
    }

    // Enum validation
    if ((property as any).enum && !(property as any).enum.includes(value)) {
      errors.push({
        path,
        message: `Value ${value} is not in allowed values: ${(property as any).enum.join(", ")}`,
        severity: "error",
        code: "ENUM_MISMATCH",
        suggestion: `Use one of: ${(property as any).enum.join(", ")}`,
      });
    }

    return errors;
  }

  private validateObject(
    obj: Record<string, unknown>,
    schema: ConfigSchema,
    path: string = "",
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required properties
    for (const requiredProp of schema.required) {
      if (!(requiredProp in obj)) {
        errors.push({
          path: path ? `${path}.${requiredProp}` : requiredProp,
          message: `Required property '${requiredProp}' is missing`,
          severity: "error",
          code: "MISSING_REQUIRED_PROPERTY",
          suggestion: `Add the required property '${requiredProp}'`,
        });
      }
    }

    // Validate each property
    for (const [propName, propValue] of Object.entries(obj)) {
      const propPath = path ? `${path}.${propName}` : propName;
      const property = schema.properties[propName];

      if (!property && !schema.additionalProperties) {
        errors.push({
          path: propPath,
          message: `Unexpected property '${propName}'`,
          severity: "error",
          code: "UNEXPECTED_PROPERTY",
          suggestion: "Remove this property or add it to the schema",
        });
        continue;
      }

      if (property) {
        // Validate value
        const valueErrors = this.validateValue(propValue, property, propPath);
        errors.push(...valueErrors);

        // Recursively validate objects
        if (
          property.type === "object" &&
          typeof propValue === "object" &&
          propValue !== null
        ) {
          const nestedSchema =
            this.schemas.get(property.validation || "") || schema;
          const nestedErrors = this.validateObject(
            propValue as Record<string, unknown>,
            nestedSchema,
            propPath,
          );
          errors.push(...nestedErrors);
        }
      }
    }

    return errors;
  }

  private async createBackup(configPath: string): Promise<string | null> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    try {
      if (!this.config.validation.backupBeforeValidation) return null;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = path.basename(configPath, path.extname(configPath));
      const backupFileName = `${fileName}_backup_${timestamp}${path.extname(configPath)}`;
      const backupPath = path.join(configBackupPath, backupFileName);

      fs.copyFileSync(configPath, backupPath);
      console.log(
        `[ConfigurationValidationEngine] Backup created: ${backupPath}`,
      );
      return backupPath;
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error creating backup:",
        error,
      );
      return null;
    }
  }

  private async cleanupBackups(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    try {
      const files = fs.readdirSync(configBackupPath);
      const backups = files
        .filter((file) => file.endsWith(".json"))
        .map((file) => ({
          name: file,
          path: path.join(configBackupPath, file),
        }))
        .sort(
          (a, b) =>
            fs.statSync(b.path).mtime.getTime() -
            fs.statSync(a.path).mtime.getTime(),
        );

      // Keep only the most recent backups
      if (backups.length > this.config.validation.maxBackups) {
        const toDelete = backups.slice(this.config.validation.maxBackups);
        for (const backup of toDelete) {
          fs.unlinkSync(backup.path);
          console.log(
            `[ConfigurationValidationEngine] Deleted old backup: ${backup.name}`,
          );
        }
      }
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error cleaning up backups:",
        error,
      );
    }
  }

  private async logChange(change: ConfigChange): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    try {
      if (!this.config.audit.enabled) return;

      const logLine = `[${change.timestamp}] CONFIG_CHANGE: ${change.action.toUpperCase()} | ${change.configPath} | ${change.user} | ${change.validation.success ? "SUCCESS" : "FAILED"} | ${change.validation.errors.length} errors, ${change.validation.warnings.length} warnings\n`;
      fs.appendFileSync(auditLogPath, logLine);

      this.changes.push(change);
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error logging change:",
        error,
      );
    }
  }

  public async validateConfiguration(
    configPath: string,
    schemaId: string,
  ): Promise<ConfigValidation> {
    try {
      const startTime = Date.now();
      const validationId = `val_${path.basename(configPath)}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Load schema
      const schema = this.schemas.get(schemaId);
      if (!schema) {
        throw new Error(`Schema not found: ${schemaId}`);
      }

      // Create backup
      const backupPath = await this.createBackup(configPath);

      // Load configuration
      const configContent = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(configContent);

      // Sanitize configuration
      let sanitizedConfig = config;
      let sanitized = false;
      if (this.config.security.inputSanitization) {
        sanitizedConfig = this.sanitizeValue(config, { sanitize: true });
        sanitized = JSON.stringify(sanitizedConfig) !== configContent;
      }

      // Validate configuration
      const errors = this.validateObject(sanitizedConfig, schema);
      const warnings: ValidationWarning[] = [];

      // Generate warnings for non-critical issues
      for (const error of errors) {
        if (error.severity === "error" && !this.config.validation.strictMode) {
          warnings.push({
            path: error.path,
            message: error.message,
            severity: "warning",
            code: error.code,
            suggestion: error.suggestion,
          });
        }
      }

      // Filter out errors that became warnings
      const finalErrors = errors.filter(
        (error) =>
          error.severity === "critical" ||
          (error.severity === "error" && this.config.validation.strictMode),
      );

      const success = finalErrors.length === 0;
      const rollbackRequired = !success && this.config.rollback.autoRollback;

      // Create validation result
      const validation: ConfigValidation = {
        id: validationId,
        configPath,
        schemaId,
        timestamp: new Date().toISOString(),
        success,
        errors: finalErrors,
        warnings,
        sanitized,
        backupCreated: !!backupPath,
        rollbackRequired,
      };

      // Log validation
      const logEntry = `[${validation.timestamp}] VALIDATION: ${configPath} | ${schemaId} | ${success ? "SUCCESS" : "FAILED"} | ${finalErrors.length} errors, ${warnings.length} warnings | ${Date.now() - startTime}ms\n`;
      fs.appendFileSync(validationLogPath, logEntry);

      this.validations.push(validation);

      // Auto-rollback if required
      if (rollbackRequired && backupPath) {
        await this.rollbackConfiguration(configPath, backupPath);
      }

      return validation;
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error validating configuration:",
        error,
      );
      throw error;
    }
  }

  public async rollbackConfiguration(
    configPath: string,
    backupPath: string,
  ): Promise<boolean> {
    try {
      console.log(
        `[ConfigurationValidationEngine] Rolling back configuration: ${configPath} from ${backupPath}`,
      );

      fs.copyFileSync(backupPath, configPath);

      const change: ConfigChange = {
        id: `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        configPath,
        timestamp: new Date().toISOString(),
        user: "system",
        action: "rollback",
        changes: [
          {
            path: "all",
            type: "modify",
            oldValue: "invalid",
            newValue: "rolled-back",
          },
        ],
        validation: {
          id: `rollback_val_${Date.now()}`,
          configPath,
          schemaId: "rollback",
          timestamp: new Date().toISOString(),
          success: true,
          errors: [],
          warnings: [],
          sanitized: false,
          backupCreated: false,
          rollbackRequired: false,
        },
        backupPath,
      };

      await this.logChange(change);
      return true;
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error rolling back configuration:",
        error,
      );
      return false;
    }
  }

  public async updateConfiguration(
    configPath: string,
    updates: unknown,
    schemaId: string,
  ): Promise<ConfigValidation> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    try {
      // Load current configuration
      const currentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

      // Create backup
      const backupPath = await this.createBackup(configPath);

      // Apply updates
      const updatedConfig = { ...currentConfig, ...(updates as Record<string, unknown>) };

      // Validate updated configuration
      const validation = await this.validateConfiguration(configPath, schemaId);

      if (validation.success) {
        // Write updated configuration
        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

        // Log change
        const changes = Object.keys(updates as Record<string, unknown>).map((key) => ({
          path: key,
          oldValue: currentConfig[key],
          newValue: (updates as Record<string, unknown>)[key],
          type: "modify" as const,
        }));

        const change: ConfigChange = {
          id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          configPath,
          timestamp: new Date().toISOString(),
          user: process.env.USER || "unknown",
          action: "update",
          changes,
          validation,
          backupPath: backupPath || undefined,
        };

        await this.logChange(change);
      }

      return validation;
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error updating configuration:",
        error,
      );
      throw error;
    }
  }

  public async detectConflicts(
    configPath1: string,
    configPath2: string,
  ): Promise<unknown[]> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    try {
      if (!this.config.conflict.conflictDetection) return [];

      const config1 = JSON.parse(fs.readFileSync(configPath1, "utf8"));
      const config2 = JSON.parse(fs.readFileSync(configPath2, "utf8"));

      const conflicts: unknown[] = [];

      // Find conflicting keys
      const allKeys = new Set([
        ...Object.keys(config1),
        ...Object.keys(config2),
      ]);

      for (const key of allKeys) {
        if (
          config1[key] !== undefined &&
          config2[key] !== undefined &&
          config1[key] !== config2[key]
        ) {
          conflicts.push({
            key,
            value1: config1[key],
            value2: config2[key],
            type: "value-conflict",
          });
        } else if (config1[key] !== undefined && config2[key] === undefined) {
          conflicts.push({
            key,
            value1: config1[key],
            value2: undefined,
            type: "missing-in-config2",
          });
        } else if (config1[key] === undefined && config2[key] !== undefined) {
          conflicts.push({
            key,
            value1: undefined,
            value2: config2[key],
            type: "missing-in-config1",
          });
        }
      }

      return conflicts;
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error detecting conflicts:",
        error,
      );
      return [];
    }
  }

  public async resolveConflicts(
    conflicts: unknown[],
    strategy: string = "last-wins",
  ): Promise<unknown> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    try {
      if (!this.config.conflict.autoResolution) return null;

      const resolved: Record<string, unknown> = {};

      for (const conflict of conflicts) {
        const conflictObj = conflict as { key: string; value1: unknown; value2: unknown };
        switch (strategy) {
          case "last-wins":
            resolved[conflictObj.key] =
              conflictObj.value2 !== undefined ? conflictObj.value2 : conflictObj.value1;
            break;
          case "first-wins":
            resolved[conflictObj.key] =
              conflictObj.value1 !== undefined ? conflictObj.value1 : conflictObj.value2;
            break;
          case "merge":
            if (
              typeof conflictObj.value1 === "object" &&
              typeof conflictObj.value2 === "object"
            ) {
              resolved[conflictObj.key] = {
                ...(conflictObj.value1 as Record<string, unknown>),
                ...(conflictObj.value2 as Record<string, unknown>),
              };
            } else {
              resolved[conflictObj.key] =
                conflictObj.value2 !== undefined
                  ? conflictObj.value2
                  : conflictObj.value1;
            }
            break;
          default:
            resolved[conflictObj.key] =
              conflictObj.value2 !== undefined ? conflictObj.value2 : conflictObj.value1;
        }
      }

      return resolved;
    } catch (error) {
      console.error(
        "[ConfigurationValidationEngine] Error resolving conflicts:",
        error,
      );
      return null;
    }
  }

  private async cleanup(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    // Clean up old validations
    const cutoffTime =
      Date.now() - this.config.audit.retentionDays * 24 * 60 * 60 * 1000;
    this.validations = this.validations.filter(
      (v) => new Date(v.timestamp).getTime() > cutoffTime,
    );

    this.changes = this.changes.filter(
      (c) => new Date(c.timestamp).getTime() > cutoffTime,
    );

    // Clean up backups
    await this.cleanupBackups();
  }

  public async start(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(
      "[ConfigurationValidationEngine] Starting configuration validation engine...",
    );

    // Start periodic cleanup
    setInterval(async () => {
      if (this.isRunning) {
        await this.cleanup();
      }
    }, this.cleanupInterval);
  }

  public async stop(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 0)); // Add await
    this.isRunning = false;
    console.log(
      "[ConfigurationValidationEngine] Stopping configuration validation engine...",
    );
  }

  public getConfig(): ValidationEngineConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ValidationEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  public getSchemas(): Map<string, ConfigSchema> {
    return new Map(this.schemas);
  }

  public getValidations(): ConfigValidation[] {
    return [...this.validations];
  }

  public getChanges(): ConfigChange[] {
    return [...this.changes];
  }

  public getSanitizationRules(): SanitizationRule[] {
    return [...this.sanitizationRules];
  }

  public addSchema(schema: ConfigSchema): void {
    this.schemas.set(schema.id, schema);
  }

  public addSanitizationRule(rule: SanitizationRule): void {
    this.sanitizationRules.push(rule);
  }
}

// Export singleton instance
export const configurationValidationEngine =
  new ConfigurationValidationEngine();

export async function startConfigurationValidationEngine(): Promise<void> {
  await configurationValidationEngine.start();
}

export async function stopConfigurationValidationEngine(): Promise<void> {
  await configurationValidationEngine.stop();
}

export function getConfigurationValidationEngine(): ConfigurationValidationEngine {
  return configurationValidationEngine;
}

export { ConfigurationValidationEngine };
