import fs from "fs";
import path from "path";

/**
 * Centralized logging utility for Ghost Phase 7 components
 * Provides consistent log path management and logging patterns
 */

export interface LogConfig {
  baseDir: string;
  componentName: string;
  logLevel: "debug" | "info" | "warn" | "error" | "critical";
  maxFileSize: number; // in bytes
  maxFiles: number;
  enableConsole: boolean;
  enableFile: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  metadata?: Record<string, any>;
  error?: Error;
}

export class LogUtils {
  private config: LogConfig;
  private logPath: string = "";
  private errorLogPath: string = "";
  private auditLogPath: string = "";

  constructor(config: LogConfig) {
    this.config = config;
    this.initializePaths();
    this.ensureDirectories();
  }

  private initializePaths(): void {
    const baseDir = this.config.baseDir;
    const componentName = this.config.componentName;

    this.logPath = path.join(baseDir, "logs", `${componentName}.log`);
    this.errorLogPath = path.join(
      baseDir,
      "logs",
      `${componentName}-errors.log`,
    );
    this.auditLogPath = path.join(
      baseDir,
      "logs",
      `${componentName}-audit.log`,
    );
  }

  private ensureDirectories(): void {
    const dirs = [
      path.dirname(this.logPath),
      path.dirname(this.errorLogPath),
      path.dirname(this.auditLogPath),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private getLogLevelPriority(level: string): number {
    const priorities = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4,
    };
    return priorities[level as keyof typeof priorities] || 0;
  }

  private shouldLog(level: string): boolean {
    const configPriority = this.getLogLevelPriority(this.config.logLevel);
    const messagePriority = this.getLogLevelPriority(level);
    return messagePriority >= configPriority;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(7);
    const component = entry.component.padEnd(20);
    const message = entry.message;

    let logLine = `[${timestamp}] ${level} | ${component} | ${message}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      logLine += ` | ${JSON.stringify(entry.metadata)}`;
    }

    if (entry.error) {
      logLine += ` | Error: ${entry.error.message}`;
      if (entry.error.stack) {
        logLine += ` | Stack: ${entry.error.stack.split("\n")[1]?.trim()}`;
      }
    }

    return logLine + "\n";
  }

  private async writeToFile(filePath: string, content: string): Promise<void> {
    try {
      // Check file size and rotate if needed
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > this.config.maxFileSize) {
          await this.rotateLogFile(filePath);
        }
      }

      fs.appendFileSync(filePath, content);
    } catch (error) {
      console.error(
        `[LogUtils] Failed to write to log file ${filePath}:`,
        error,
      );
    }
  }

  private async rotateLogFile(filePath: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      const baseName = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath);

      // Remove oldest log file if we have too many
      const existingFiles = fs
        .readdirSync(dir)
        .filter((file) => file.startsWith(baseName) && file.endsWith(ext))
        .sort();

      if (existingFiles.length >= this.config.maxFiles) {
        const oldestFile = path.join(dir, existingFiles[0]);
        fs.unlinkSync(oldestFile);
      }

      // Rename current file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const newPath = path.join(dir, `${baseName}-${timestamp}${ext}`);
      fs.renameSync(filePath, newPath);
    } catch (error) {
      console.error(`[LogUtils] Failed to rotate log file ${filePath}:`, error);
    }
  }

  private log(
    level: string,
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.config.componentName,
      message,
      metadata,
      error,
    };

    const logLine = this.formatLogEntry(entry);

    // Console output
    if (this.config.enableConsole) {
      const consoleLevel =
        level === "error" || level === "critical"
          ? "error"
          : level === "warn"
            ? "warn"
            : "log";
      console[consoleLevel](logLine.trim());
    }

    // File output
    if (this.config.enableFile) {
      // Main log file
      this.writeToFile(this.logPath, logLine);

      // Error log file for errors and critical messages
      if (level === "error" || level === "critical") {
        this.writeToFile(this.errorLogPath, logLine);
      }

      // Audit log file for all entries
      this.writeToFile(this.auditLogPath, logLine);
    }
  }

  public debug(message: string, metadata?: Record<string, any>): void {
    this.log("debug", message, metadata);
  }

  public info(message: string, metadata?: Record<string, any>): void {
    this.log("info", message, metadata);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    this.log("warn", message, metadata);
  }

  public error(
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
  ): void {
    this.log("error", message, metadata, error);
  }

  public critical(
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
  ): void {
    this.log("critical", message, metadata, error);
  }

  public audit(
    action: string,
    target: string,
    metadata?: Record<string, any>,
  ): void {
    const auditMessage = `AUDIT: ${action} on ${target}`;
    this.log("info", auditMessage, metadata);
  }

  public performance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    const perfMessage = `PERF: ${operation} took ${duration}ms`;
    this.log("debug", perfMessage, metadata);
  }

  public security(event: string, metadata?: Record<string, any>): void {
    const securityMessage = `SECURITY: ${event}`;
    this.log("warn", securityMessage, metadata);
  }

  public health(
    component: string,
    status: string,
    metadata?: Record<string, any>,
  ): void {
    const healthMessage = `HEALTH: ${component} - ${status}`;
    this.log("info", healthMessage, metadata);
  }

  public getLogPath(): string {
    return this.logPath;
  }

  public getErrorLogPath(): string {
    return this.errorLogPath;
  }

  public getAuditLogPath(): string {
    return this.auditLogPath;
  }

  public getConfig(): LogConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializePaths();
    this.ensureDirectories();
  }
}

// Pre-configured loggers for common components
export const createComponentLogger = (componentName: string): LogUtils => {
  const config: LogConfig = {
    baseDir: "/Users/sawyer/gitSync/.cursor-cache/CYOPS",
    componentName,
    logLevel: "info",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableConsole: true,
    enableFile: true,
  };

  return new LogUtils(config);
};

// Common component loggers
export const autonomousDecisionLogger = createComponentLogger(
  "autonomous-decision-engine",
);
export const machineLearningLogger = createComponentLogger(
  "machine-learning-predictor",
);
export const patchGeneratorLogger = createComponentLogger(
  "autonomous-patch-generator",
);
export const ghostRelayLogger = createComponentLogger("ghost-gpt-relay-core");
export const autopilotHealerLogger = createComponentLogger("autopilot-healer");
export const cliBridgeLogger = createComponentLogger("cli-gpt-cmd-bridge");
export const feedbackIngestionLogger = createComponentLogger(
  "gpt-feedback-ingestion",
);
export const healthAggregatorLogger = createComponentLogger(
  "health-check-aggregator",
);
export const configValidatorLogger = createComponentLogger(
  "configuration-validation-engine",
);
export const messageQueueLogger = createComponentLogger("message-queue-system");
export const failureRecoveryLogger = createComponentLogger(
  "failure-recovery-orchestrator",
);

// Utility functions for common logging patterns
export const logSystemStartup = (
  componentName: string,
  version: string,
): void => {
  const logger = createComponentLogger(componentName);
  logger.info("System startup initiated", {
    version,
    timestamp: new Date().toISOString(),
  });
};

export const logSystemShutdown = (
  componentName: string,
  reason: string,
): void => {
  const logger = createComponentLogger(componentName);
  logger.info("System shutdown initiated", {
    reason,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (
  componentName: string,
  message: string,
  error: Error,
  context?: Record<string, any>,
): void => {
  const logger = createComponentLogger(componentName);
  logger.error(message, context, error);
};

export const logPerformance = (
  componentName: string,
  operation: string,
  duration: number,
  metadata?: Record<string, any>,
): void => {
  const logger = createComponentLogger(componentName);
  logger.performance(operation, duration, metadata);
};

export const logHealthCheck = (
  componentName: string,
  status: string,
  metrics?: Record<string, any>,
): void => {
  const logger = createComponentLogger(componentName);
  logger.health(componentName, status, metrics);
};

export const logSecurityEvent = (
  componentName: string,
  event: string,
  metadata?: Record<string, any>,
): void => {
  const logger = createComponentLogger(componentName);
  logger.security(event, metadata);
};

export const logAuditEvent = (
  componentName: string,
  action: string,
  target: string,
  metadata?: Record<string, any>,
): void => {
  const logger = createComponentLogger(componentName);
  logger.audit(action, target, metadata);
};

// Export default configuration
export const defaultLogConfig: LogConfig = {
  baseDir: "/Users/sawyer/gitSync/.cursor-cache/CYOPS",
  componentName: "unknown",
  logLevel: "info",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  enableConsole: true,
  enableFile: true,
};
