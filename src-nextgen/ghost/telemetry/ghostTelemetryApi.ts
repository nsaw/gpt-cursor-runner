// ***REMOVED*** Telemetry API — Phase 8A P8.10.00
// REST API server for telemetry data access

import fs from "fs";
import path from "path";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import crypto from "crypto";

const apiLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-api.log";
const apiStatePath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/api-state.json";
const configPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/telemetry-api-config.json";
const logDir = path.dirname(apiLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(apiStatePath))) {
  fs.mkdirSync(path.dirname(apiStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface ApiRequest {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: { [key: string]: string };
  headers: { [key: string]: string };
  body?: any;
  clientIp: string;
  userAgent: string;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
}

interface ApiEndpoint {
  path: string;
  method: string;
  handler: (req: ApiRequest) => Promise<ApiResponse>;
  authentication: boolean;
  rateLimit: number;
  description: string;
}

interface ApiConfig {
  enabled: boolean;
  server: {
    port: number;
    host: string;
    maxConnections: number;
    timeout: number;
  };
  authentication: {
    enabled: boolean;
    apiKeys: string[];
    jwtSecret: string;
    tokenExpiry: number;
  };
  rateLimiting: {
    enabled: boolean;
    defaultLimit: number;
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
  logging: {
    enabled: boolean;
    logRequests: boolean;
    logResponses: boolean;
    logErrors: boolean;
  };
  security: {
    enabled: boolean;
    inputValidation: boolean;
    outputSanitization: boolean;
    auditLogging: boolean;
  };
}

interface ApiState {
  timestamp: string;
  requests: ApiRequest[];
  endpoints: ApiEndpoint[];
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    uptime: number;
  };
  lastUpdate: string;
  version: string;
}

class GhostTelemetryApi {
  private config!: ApiConfig;
  private state!: ApiState;
  private server: any;
  private isRunning = false;
  private startTime: Date;
  private requestCount = 0;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor() {
    this.startTime = new Date();
    this.loadConfig();
    this.initializeState();
    this.setupEndpoints();
    this.logEvent("System started");
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, "utf8");
        this.config = JSON.parse(configData);
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      this.logEvent(`Failed to load config: ${error}`);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): ApiConfig {
    return {
      enabled: true,
      server: {
        port: 8788,
        host: "localhost",
        maxConnections: 100,
        timeout: 30000,
      },
      authentication: {
        enabled: true,
        apiKeys: [process.env.TELEMETRY_API_KEY || "default-key"],
        jwtSecret: process.env.JWT_SECRET || "default-secret",
        tokenExpiry: 3600,
      },
      rateLimiting: {
        enabled: true,
        defaultLimit: 100,
        windowMs: 60000,
        maxRequests: 1000,
      },
      cors: {
        enabled: true,
        allowedOrigins: ["http://localhost:3000", "http://localhost:8080"],
        allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
      },
      logging: {
        enabled: true,
        logRequests: true,
        logResponses: true,
        logErrors: true,
      },
      security: {
        enabled: true,
        inputValidation: true,
        outputSanitization: true,
        auditLogging: true,
      },
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.logEvent(`Failed to save config: ${error}`);
    }
  }

  private initializeState(): void {
    try {
      if (fs.existsSync(apiStatePath)) {
        const stateData = fs.readFileSync(apiStatePath, "utf8");
        this.state = JSON.parse(stateData);
      } else {
        this.state = this.getInitialState();
      }
    } catch (error) {
      this.logEvent(`Failed to load state: ${error}`);
      this.state = this.getInitialState();
    }
  }

  private getInitialState(): ApiState {
    return {
      timestamp: new Date().toISOString(),
      requests: [],
      endpoints: [],
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 0,
      },
      lastUpdate: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  private logEvent(message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: "telemetry-api",
      message,
      data,
    };

    fs.appendFileSync(apiLogPath, JSON.stringify(logEntry) + "\n");
  }

  private setupEndpoints(): void {
    this.state.endpoints = [
      {
        path: "/health",
        method: "GET",
        handler: this.handleHealthCheck.bind(this),
        authentication: false,
        rateLimit: 100,
        description: "Health check endpoint",
      },
      {
        path: "/metrics",
        method: "GET",
        handler: this.handleGetMetrics.bind(this),
        authentication: true,
        rateLimit: 50,
        description: "Get aggregated metrics",
      },
      {
        path: "/metrics/:metricName",
        method: "GET",
        handler: this.handleGetMetric.bind(this),
        authentication: true,
        rateLimit: 50,
        description: "Get specific metric data",
      },
      {
        path: "/alerts",
        method: "GET",
        handler: this.handleGetAlerts.bind(this),
        authentication: true,
        rateLimit: 30,
        description: "Get active alerts",
      },
      {
        path: "/alerts/:alertId/acknowledge",
        method: "POST",
        handler: this.handleAcknowledgeAlert.bind(this),
        authentication: true,
        rateLimit: 20,
        description: "Acknowledge an alert",
      },
      {
        path: "/alerts/:alertId/resolve",
        method: "POST",
        handler: this.handleResolveAlert.bind(this),
        authentication: true,
        rateLimit: 20,
        description: "Resolve an alert",
      },
      {
        path: "/components",
        method: "GET",
        handler: this.handleGetComponents.bind(this),
        authentication: true,
        rateLimit: 30,
        description: "Get component status",
      },
      {
        path: "/components/:componentId/restart",
        method: "POST",
        handler: this.handleRestartComponent.bind(this),
        authentication: true,
        rateLimit: 10,
        description: "Restart a component",
      },
      {
        path: "/trends",
        method: "GET",
        handler: this.handleGetTrends.bind(this),
        authentication: true,
        rateLimit: 30,
        description: "Get metric trends",
      },
      {
        path: "/anomalies",
        method: "GET",
        handler: this.handleGetAnomalies.bind(this),
        authentication: true,
        rateLimit: 30,
        description: "Get detected anomalies",
      },
      {
        path: "/config",
        method: "GET",
        handler: this.handleGetConfig.bind(this),
        authentication: true,
        rateLimit: 20,
        description: "Get API configuration",
      },
      {
        path: "/stats",
        method: "GET",
        handler: this.handleGetStats.bind(this),
        authentication: true,
        rateLimit: 50,
        description: "Get API statistics",
      },
    ];
  }

  private async handleHealthCheck(req: ApiRequest): Promise<ApiResponse> {
    return {
      success: true,
      data: {
        status: "healthy",
        uptime: this.getUptime(),
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      requestId: req.id,
    };
  }

  private async handleGetMetrics(req: ApiRequest): Promise<ApiResponse> {
    try {
      const aggregatorStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/metrics-aggregator-state.json";

      if (!fs.existsSync(aggregatorStatePath)) {
        return {
          success: false,
          error: "Metrics aggregator not available",
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
      }

      const data = JSON.parse(fs.readFileSync(aggregatorStatePath, "utf8"));
      const limit = parseInt(req.query.limit || "100");

      return {
        success: true,
        data: {
          metrics: data.aggregatedMetrics.slice(-limit),
          trends: data.trends,
          healthScore: data.healthScore,
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get metrics: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleGetMetric(req: ApiRequest): Promise<ApiResponse> {
    try {
      const metricName = req.path.split("/")[2];
      const aggregatorStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/metrics-aggregator-state.json";

      if (!fs.existsSync(aggregatorStatePath)) {
        return {
          success: false,
          error: "Metrics aggregator not available",
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
      }

      const data = JSON.parse(fs.readFileSync(aggregatorStatePath, "utf8"));
      const metricData = data.aggregatedMetrics.filter(
        (m: any) => m.name === metricName,
      );
      const limit = parseInt(req.query.limit || "100");

      return {
        success: true,
        data: {
          metricName,
          data: metricData.slice(-limit),
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get metric: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleGetAlerts(req: ApiRequest): Promise<ApiResponse> {
    try {
      const alertStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/alert-engine-state.json";

      if (!fs.existsSync(alertStatePath)) {
        return {
          success: false,
          error: "Alert engine not available",
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
      }

      const data = JSON.parse(fs.readFileSync(alertStatePath, "utf8"));
      const status = req.query.status || "active";

      let alerts = data.activeAlerts;
      if (status === "all") {
        alerts = [...data.activeAlerts, ...data.alertHistory];
      } else if (status === "history") {
        alerts = data.alertHistory;
      }

      const limit = parseInt(req.query.limit || "100");

      return {
        success: true,
        data: {
          alerts: alerts.slice(-limit),
          total: alerts.length,
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get alerts: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleAcknowledgeAlert(req: ApiRequest): Promise<ApiResponse> {
    try {
      const alertId = req.path.split("/")[2];
      const acknowledgedBy = req.body?.acknowledgedBy || "api-user";

      // This would integrate with the alert engine
      // For now, return success

      return {
        success: true,
        data: {
          alertId,
          acknowledgedBy,
          acknowledgedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to acknowledge alert: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleResolveAlert(req: ApiRequest): Promise<ApiResponse> {
    try {
      const alertId = req.path.split("/")[2];
      const resolvedBy = req.body?.resolvedBy || "api-user";

      // This would integrate with the alert engine
      // For now, return success

      return {
        success: true,
        data: {
          alertId,
          resolvedBy,
          resolvedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to resolve alert: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleGetComponents(req: ApiRequest): Promise<ApiResponse> {
    try {
      const orchestratorStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/orchestrator-state.json";

      if (!fs.existsSync(orchestratorStatePath)) {
        return {
          success: false,
          error: "Orchestrator not available",
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
      }

      const data = JSON.parse(fs.readFileSync(orchestratorStatePath, "utf8"));

      return {
        success: true,
        data: {
          components: data.components,
          systemHealth: data.systemHealth,
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get components: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleRestartComponent(req: ApiRequest): Promise<ApiResponse> {
    try {
      const componentId = req.path.split("/")[2];

      // This would integrate with the orchestrator
      // For now, return success

      return {
        success: true,
        data: {
          componentId,
          action: "restart",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to restart component: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleGetTrends(req: ApiRequest): Promise<ApiResponse> {
    try {
      const aggregatorStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/metrics-aggregator-state.json";

      if (!fs.existsSync(aggregatorStatePath)) {
        return {
          success: false,
          error: "Metrics aggregator not available",
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
      }

      const data = JSON.parse(fs.readFileSync(aggregatorStatePath, "utf8"));
      const limit = parseInt(req.query.limit || "50");

      return {
        success: true,
        data: {
          trends: data.trends.slice(-limit),
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get trends: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleGetAnomalies(req: ApiRequest): Promise<ApiResponse> {
    try {
      const aggregatorStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/metrics-aggregator-state.json";

      if (!fs.existsSync(aggregatorStatePath)) {
        return {
          success: false,
          error: "Metrics aggregator not available",
          timestamp: new Date().toISOString(),
          requestId: req.id,
        };
      }

      const data = JSON.parse(fs.readFileSync(aggregatorStatePath, "utf8"));
      const limit = parseInt(req.query.limit || "50");

      return {
        success: true,
        data: {
          anomalies: data.anomalies.slice(-limit),
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get anomalies: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: req.id,
      };
    }
  }

  private async handleGetConfig(req: ApiRequest): Promise<ApiResponse> {
    return {
      success: true,
      data: {
        server: this.config.server,
        authentication: { enabled: this.config.authentication.enabled },
        rateLimiting: { enabled: this.config.rateLimiting.enabled },
        cors: { enabled: this.config.cors.enabled },
        endpoints: this.state.endpoints.map((e) => ({
          path: e.path,
          method: e.method,
          description: e.description,
          authentication: e.authentication,
          rateLimit: e.rateLimit,
        })),
      },
      timestamp: new Date().toISOString(),
      requestId: req.id,
    };
  }

  private async handleGetStats(req: ApiRequest): Promise<ApiResponse> {
    return {
      success: true,
      data: {
        ...this.state.stats,
        uptime: this.getUptime(),
        requestCount: this.requestCount,
        endpoints: this.state.endpoints.length,
      },
      timestamp: new Date().toISOString(),
      requestId: req.id,
    };
  }

  private getUptime(): number {
    return (new Date().getTime() - this.startTime.getTime()) / 1000;
  }

  private validateAuthentication(req: ApiRequest): boolean {
    if (!this.config.authentication.enabled) return true;

    const apiKey =
      req.headers["x-api-key"] ||
      req.headers["authorization"]?.replace("Bearer ", "");
    return this.config.authentication.apiKeys.includes(apiKey || "");
  }

  private checkRateLimit(req: ApiRequest, endpoint: ApiEndpoint): boolean {
    if (!this.config.rateLimiting.enabled) return true;

    const clientId = req.clientIp;
    const now = Date.now();
    const key = `${clientId}:${endpoint.path}`;

    const current = this.rateLimitMap.get(key);
    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.config.rateLimiting.windowMs,
      });
      return true;
    }

    if (current.count >= endpoint.rateLimit) {
      return false;
    }

    current.count++;
    return true;
  }

  private async parseRequest(req: IncomingMessage): Promise<ApiRequest> {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const clientIp = req.socket.remoteAddress || "unknown";

    let body: any = null;
    if (req.method === "POST" || req.method === "PUT") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const bodyBuffer = Buffer.concat(chunks);
      try {
        body = JSON.parse(bodyBuffer.toString());
      } catch (_error) {
        body = bodyBuffer.toString();
      }
    }

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method: req.method || "GET",
      url: req.url || "",
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers as { [key: string]: string },
      body,
      clientIp,
      userAgent: req.headers["user-agent"] || "unknown",
    };
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const startTime = Date.now();
    let apiReq: ApiRequest | undefined;

    try {
      apiReq = await this.parseRequest(req);

      // Find matching endpoint
      const endpoint = this.state.endpoints.find(
        (e) => e.path === apiReq?.path && e.method === apiReq?.method,
      );

      if (!endpoint) {
        this.sendResponse(res, 404, {
          success: false,
          error: "Endpoint not found",
          timestamp: new Date().toISOString(),
          requestId: apiReq?.id,
        });
        return;
      }

      // Check authentication
      if (endpoint.authentication && !this.validateAuthentication(apiReq)) {
        this.sendResponse(res, 401, {
          success: false,
          error: "Authentication required",
          timestamp: new Date().toISOString(),
          requestId: apiReq?.id,
        });
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(apiReq, endpoint)) {
        this.sendResponse(res, 429, {
          success: false,
          error: "Rate limit exceeded",
          timestamp: new Date().toISOString(),
          requestId: apiReq?.id,
        });
        return;
      }

      // Handle CORS
      if (this.config.cors.enabled) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Access-Control-Allow-Methods",
          this.config.cors.allowedMethods.join(", "),
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          this.config.cors.allowedHeaders.join(", "),
        );
      }

      // Execute handler
      const response = await endpoint.handler(apiReq);

      // Update request with response info
      apiReq!.responseTime = Date.now() - startTime;
      apiReq!.statusCode = 200;

      this.sendResponse(res, 200, response);
    } catch (error) {
      const errorResponse = {
        success: false,
        error: `Internal server error: ${error}`,
        timestamp: new Date().toISOString(),
        requestId: apiReq?.id || crypto.randomUUID(),
      };

      if (apiReq) {
        apiReq!.responseTime = Date.now() - startTime;
        apiReq!.statusCode = 500;
        apiReq!.error =
          error instanceof Error
            ? error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : String(error)
            : "Unknown error";
      }

      this.sendResponse(res, 500, errorResponse);
    } finally {
      // Log request
      if (apiReq && this.config.logging.logRequests) {
        this.state.requests.push(apiReq);
        this.requestCount++;

        // Update stats
        this.state.stats.totalRequests++;
        if (apiReq?.statusCode && apiReq?.statusCode < 400) {
          this.state.stats.successfulRequests++;
        } else {
          this.state.stats.failedRequests++;
        }

        if (apiReq?.responseTime) {
          const currentAvg = this.state.stats.averageResponseTime;
          const totalRequests = this.state.stats.totalRequests;
          this.state.stats.averageResponseTime =
            (currentAvg * (totalRequests - 1) + apiReq?.responseTime) /
            totalRequests;
        }

        // Maintain request history
        if (this.state.requests.length > 1000) {
          this.state.requests = this.state.requests.slice(-1000);
        }
      }
    }
  }

  private sendResponse(
    res: ServerResponse,
    statusCode: number,
    data: any,
  ): void {
    res.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(data, null, 2));
  }

  private async saveState(): Promise<void> {
    try {
      this.state.timestamp = new Date().toISOString();
      this.state.lastUpdate = new Date().toISOString();
      fs.writeFileSync(apiStatePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logEvent(`Failed to save state: ${error}`);
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    return new Promise((resolve, reject) => {
      this.server = createServer(this.handleRequest.bind(this));

      this.server.listen(
        this.config.server.port,
        this.config.server.host,
        () => {
          this.isRunning = true;
          this.logEvent(
            `Telemetry API started on ${this.config.server.host}:${this.config.server.port}`,
          );
          resolve();
        },
      );

      this.server.on("error", (error) => {
        this.logEvent(`Server error: ${error}`, "error");
        reject(error);
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        this.logEvent("Telemetry API stopped");
        resolve();
      });
    });
  }

  public getState(): ApiState {
    return { ...this.state };
  }

  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.logEvent("Configuration updated", newConfig);
  }

  public getEndpoints(): ApiEndpoint[] {
    return [...this.state.endpoints];
  }

  public getStats(): any {
    return { ...this.state.stats, uptime: this.getUptime() };
  }

  public isHealthy(): boolean {
    return this.isRunning;
  }

  public clearHistory(): void {
    this.state.requests = [];
    this.logEvent("API history cleared");
  }
}

let apiInstance: GhostTelemetryApi | null = null;

export async function startGhostTelemetryApi(): Promise<void> {
  if (!apiInstance) {
    apiInstance = new GhostTelemetryApi();
  }
  await apiInstance.start();
}

export async function stopGhostTelemetryApi(): Promise<void> {
  if (apiInstance) {
    await apiInstance.stop();
  }
}

export function getGhostTelemetryApi(): GhostTelemetryApi {
  if (!apiInstance) {
    apiInstance = new GhostTelemetryApi();
  }
  return apiInstance;
}

export type { ApiRequest, ApiResponse, ApiEndpoint, ApiConfig, ApiState };
