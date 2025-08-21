// Centralized Environment Configuration — Phase 8A P8.11.00
// Unified configuration management for all GHOST telemetry systems

import fs from "fs";
import path from "path";
import crypto from "crypto";

const configLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/config-manager.log";
const configStatePath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/config-state.json";
const envConfigPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/environment-config.json";
const logDir = path.dirname(configLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(configStatePath))) {
  fs.mkdirSync(path.dirname(configStatePath), { recursive: true });
}

interface TelemetryConfig {
  dashboard: {
    port: number;
    host: string;
    refreshInterval: number;
    maxDataPoints: number;
  };
  api: {
    port: number;
    host: string;
    corsEnabled: boolean;
    rateLimit: number;
  };
  orchestrator: {
    healthCheckInterval: number;
    componentTimeout: number;
    maxRetries: number;
  };
  metrics: {
    aggregationInterval: number;
    retentionDays: number;
    maxMetricsPerComponent: number;
  };
  alerts: {
    enabled: boolean;
    notificationChannels: string[];
    severityLevels: string[];
    cooldownPeriod: number;
  };
  logging: {
    level: string;
    maxFileSize: string;
    maxFiles: number;
    enableConsole: boolean;
  };
}

interface EnvironmentConfig {
  environment: string;
  version: string;
  telemetry: TelemetryConfig;
  security: {
    encryptionEnabled: boolean;
    apiKeyRequired: boolean;
    allowedOrigins: string[];
  };
  performance: {
    maxConcurrentRequests: number;
    requestTimeout: number;
    cacheEnabled: boolean;
  };
}

class CentralizedEnvironmentConfig {
  private config: EnvironmentConfig;
  private configHash: string;
  private lastModified: number;

  constructor() {
    this.config = this.getDefaultConfig();
    this.configHash = this.calculateConfigHash();
    this.lastModified = Date.now();
    this.initializeConfig();
  }

  private getDefaultConfig(): EnvironmentConfig {
    return {
      environment: process.env.NODE_ENV || "development",
      version: "8.11.00",
      telemetry: {
        dashboard: {
          port: 5050,
          host: "localhost",
          refreshInterval: 5000,
          maxDataPoints: 1000,
        },
        api: {
          port: 5051,
          host: "localhost",
          corsEnabled: true,
          rateLimit: 100,
        },
        orchestrator: {
          healthCheckInterval: 30000,
          componentTimeout: 60000,
          maxRetries: 3,
        },
        metrics: {
          aggregationInterval: 60000,
          retentionDays: 30,
          maxMetricsPerComponent: 100,
        },
        alerts: {
          enabled: true,
          notificationChannels: ["console", "file"],
          severityLevels: ["info", "warning", "error", "critical"],
          cooldownPeriod: 300000,
        },
        logging: {
          level: "info",
          maxFileSize: "10MB",
          maxFiles: 5,
          enableConsole: true,
        },
      },
      security: {
        encryptionEnabled: false,
        apiKeyRequired: false,
        allowedOrigins: ["http://localhost:3000", "http://localhost:5050"],
      },
      performance: {
        maxConcurrentRequests: 100,
        requestTimeout: 30000,
        cacheEnabled: true,
      },
    };
  }

  private calculateConfigHash(): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(this.config))
      .digest("hex");
  }

  private initializeConfig(): void {
    try {
      // Load existing config if available
      if (fs.existsSync(envConfigPath)) {
        const existingConfig = JSON.parse(
          fs.readFileSync(envConfigPath, "utf8"),
        );
        this.config = { ...this.config, ...existingConfig };
        this.log("info", "Loaded existing configuration", {
          path: envConfigPath,
        });
      } else {
        // Save default config
        this.saveConfig();
        this.log("info", "Created default configuration", {
          path: envConfigPath,
        });
      }

      // Save config state
      this.saveConfigState();
    } catch (error) {
      this.log("error", "Failed to initialize configuration", {
        error: (error as Error).message,
      });
    }
  }

  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  public getConfigWithVersionGuard(): {
    config: EnvironmentConfig;
    version: string;
    valid: boolean;
  } {
    const validation = this.validateConfig();
    return {
      config: { ...this.config },
      version: this.config.version,
      valid: validation.valid,
    };
  }

  public getTelemetryConfig(): TelemetryConfig {
    return { ...this.config.telemetry };
  }

  public getDashboardConfig() {
    return { ...this.config.telemetry.dashboard };
  }

  public getApiConfig() {
    return { ...this.config.telemetry.api };
  }

  public getOrchestratorConfig() {
    return { ...this.config.telemetry.orchestrator };
  }

  public getMetricsConfig() {
    return { ...this.config.telemetry.metrics };
  }

  public getAlertsConfig() {
    return { ...this.config.telemetry.alerts };
  }

  public getLoggingConfig() {
    return { ...this.config.telemetry.logging };
  }

  public getSecurityConfig() {
    return { ...this.config.security };
  }

  public getPerformanceConfig() {
    return { ...this.config.performance };
  }

  public updateConfig(updates: Partial<EnvironmentConfig>): boolean {
    try {
      const oldHash = this.configHash;
      this.config = { ...this.config, ...updates };
      this.configHash = this.calculateConfigHash();
      this.lastModified = Date.now();

      if (oldHash !== this.configHash) {
        this.saveConfig();
        this.saveConfigState();
        this.log("info", "Configuration updated", {
          changes: Object.keys(updates),
          newHash: this.configHash.substring(0, 8),
        });
        return true;
      }
      return false;
    } catch (error) {
      this.log("error", "Failed to update configuration", {
        error: (error as Error).message,
      });
      return false;
    }
  }

  public updateTelemetryConfig(updates: Partial<TelemetryConfig>): boolean {
    return this.updateConfig({
      telemetry: { ...this.config.telemetry, ...updates },
    });
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate dashboard config
    if (
      this.config.telemetry.dashboard.port < 1 ||
      this.config.telemetry.dashboard.port > 65535
    ) {
      errors.push("Dashboard port must be between 1 and 65535");
    }

    // Validate API config
    if (
      this.config.telemetry.api.port < 1 ||
      this.config.telemetry.api.port > 65535
    ) {
      errors.push("API port must be between 1 and 65535");
    }

    // Validate orchestrator config
    if (this.config.telemetry.orchestrator.healthCheckInterval < 1000) {
      errors.push("Health check interval must be at least 1000ms");
    }

    // Validate metrics config
    if (this.config.telemetry.metrics.retentionDays < 1) {
      errors.push("Metrics retention days must be at least 1");
    }

    // Validate performance config
    if (this.config.performance.maxConcurrentRequests < 1) {
      errors.push("Max concurrent requests must be at least 1");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public reloadConfig(): boolean {
    try {
      if (fs.existsSync(envConfigPath)) {
        const fileContent = fs.readFileSync(envConfigPath, "utf8");
        const newConfig = JSON.parse(fileContent);
        const newHash = crypto
          .createHash("sha256")
          .update(fileContent)
          .digest("hex");

        if (newHash !== this.configHash) {
          this.config = { ...this.config, ...newConfig };
          this.configHash = newHash;
          this.lastModified = Date.now();
          this.saveConfigState();
          this.log("info", "Configuration reloaded from file", {
            path: envConfigPath,
            newHash: this.configHash.substring(0, 8),
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      this.log("error", "Failed to reload configuration", {
        error: (error as Error).message,
      });
      return false;
    }
  }

  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  public importConfig(configJson: string): boolean {
    try {
      const newConfig = JSON.parse(configJson);
      const validation = this.validateConfig();

      if (!validation.valid) {
        this.log("error", "Invalid configuration import", {
          errors: validation.errors,
        });
        return false;
      }

      return this.updateConfig(newConfig);
    } catch (error) {
      this.log("error", "Failed to import configuration", {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });
      return false;
    }
  }

  public getConfigInfo(): {
    hash: string;
    lastModified: number;
    environment: string;
    version: string;
    valid: boolean;
  } {
    const validation = this.validateConfig();
    return {
      hash: this.configHash,
      lastModified: this.lastModified,
      environment: this.config.environment,
      version: this.config.version,
      valid: validation.valid,
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(envConfigPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.log("error", "Failed to save configuration", {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });
    }
  }

  private saveConfigState(): void {
    try {
      const state = {
        hash: this.configHash,
        lastModified: this.lastModified,
        environment: this.config.environment,
        version: this.config.version,
        valid: this.validateConfig().valid,
      };
      fs.writeFileSync(configStatePath, JSON.stringify(state, null, 2));
    } catch (error) {
      this.log("error", "Failed to save config state", {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      });
    }
  }

  private log(level: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      component: "CentralizedEnvironmentConfig",
    };

    // Console logging
    if (this.config.telemetry.logging.enableConsole) {
      console.log(
        `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        data || "",
      );
    }

    // File logging
    try {
      fs.appendFileSync(configLogPath, JSON.stringify(logEntry) + "\n");
    } catch (error) {
      console.error("Failed to writerror to config log:", error);
    }
  }
}

// Export singleton instance
export const centralizedConfig = new CentralizedEnvironmentConfig();
export default centralizedConfig;
