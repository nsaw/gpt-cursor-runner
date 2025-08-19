import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

const execAsync = promisify(exec);
const relayLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/gpt-relay.log";
const relayStatePath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/relay/relay-state.json";
const configPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/relay-config.json";
const logDir = path.dirname(relayLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(relayStatePath))) {
  fs.mkdirSync(path.dirname(relayStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface GptRequest {
  id: string;
  timestamp: string;
  command: string;
  context: any;
  priority: "low" | "medium" | "high" | "critical";
  timeout: number;
  maxRetries: number;
  retryCount: number;
  source: string;
  correlationId?: string;
}

interface GptResponse {
  id: string;
  requestId: string;
  timestamp: string;
  success: boolean;
  content: string;
  error?: string;
  processingTime: number;
  tokensUsed?: number;
  sanitized: boolean;
}

interface RelayConfig {
  api: {
    endpoint: string;
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  safety: {
    enabled: boolean;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    maxConcurrentRequests: number;
    rateLimitPerMinute: number;
  };
  sanitization: {
    enabled: boolean;
    removeScripts: boolean;
    removeCommands: boolean;
    maxResponseLength: number;
    allowedCommands: string[];
    blockedPatterns: RegExp[];
  };
  monitoring: {
    enabled: boolean;
    logAllRequests: boolean;
    logResponses: boolean;
    metricsCollection: boolean;
  };
}

interface RelayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  currentConcurrentRequests: number;
  rateLimitHits: number;
  lastRequestTime: string;
  uptime: number;
}

interface RateLimiter {
  requests: { timestamp: number }[];
  limit: number;
  windowMs: number;
}

class GhostGptRelayCore {
  private config!: RelayConfig;
  private metrics!: RelayMetrics;
  private rateLimiter!: RateLimiter;
  private activeRequests: Map<string, GptRequest> = new Map();
  private requestQueue: GptRequest[] = [];
  private isRunning = false;
  private processingInterval = 1000; // 1 second

  constructor() {
    this.loadConfig();
    this.initializeMetrics();
    this.initializeRateLimiter();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error("[GhostGptRelayCorerror] Error loading config:", error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): RelayConfig {
    return {
      api: {
        endpoint: "https://api.openai.com/v1/chat/completions",
        apiKey: process.env.OPENAI_API_KEY || "",
        model: "gpt-4",
        maxTokens: 2048,
        temperature: 0.7,
      },
      safety: {
        enabled: true,
        timeoutMs: 30000,
        maxRetries: 3,
        retryDelayMs: 5000,
        maxConcurrentRequests: 5,
        rateLimitPerMinute: 60,
      },
      sanitization: {
        enabled: true,
        removeScripts: true,
        removeCommands: true,
        maxResponseLength: 10000,
        allowedCommands: ["help", "status", "info", "version"],
        blockedPatterns: [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /vbscript:/gi,
          /on\w+\s*=/gi,
          /eval\s*\(/gi,
          /exec\s*\(/gi,
          /system\s*\(/gi,
        ],
      },
      monitoring: {
        enabled: true,
        logAllRequests: true,
        logResponses: true,
        metricsCollection: true,
      },
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error("[GhostGptRelayCorerror] Error saving config:", error);
    }
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      currentConcurrentRequests: 0,
      rateLimitHits: 0,
      lastRequestTime: new Date().toISOString(),
      uptime: 0,
    };
  }

  private initializeRateLimiter(): void {
    this.rateLimiter = {
      requests: [],
      limit: this.config.safety.rateLimitPerMinute,
      windowMs: 60000, // 1 minute
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimiter.windowMs;

    // Remove old requests outside the window
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      (req) => req.timestamp > windowStart,
    );

    return this.rateLimiter.requests.length >= this.rateLimiter.limit;
  }

  private addRateLimitRequest(): void {
    this.rateLimiter.requests.push({ timestamp: Date.now() });
  }

  private sanitizeResponse(content: string): {
    sanitized: string;
    wasSanitized: boolean;
  } {
    if (!this.config.sanitization.enabled) {
      return { sanitized: content, wasSanitized: false };
    }

    let sanitized = content;
    let wasSanitized = false;

    // Remove blocked patterns
    for (const pattern of this.config.sanitization.blockedPatterns) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, "[SANITIZED]");
        wasSanitized = true;
      }
    }

    // Remove scripts if enabled
    if (this.config.sanitization.removeScripts) {
      const scriptPattern =
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
      if (scriptPattern.test(sanitized)) {
        sanitized = sanitized.replace(scriptPattern, "[SCRIPT_REMOVED]");
        wasSanitized = true;
      }
    }

    // Remove commands if enabled
    if (this.config.sanitization.removeCommands) {
      const commandPattern = /`[^`]*`/g;
      const matches = sanitized.match(commandPattern);
      if (matches) {
        for (const match of matches) {
          const command = match.slice(1, -1);
          const isAllowed = this.config.sanitization.allowedCommands.some(
            (allowed) => command.toLowerCase().includes(allowed.toLowerCase()),
          );
          if (!isAllowed) {
            sanitized = sanitized.replace(match, "[COMMAND_REMOVED]");
            wasSanitized = true;
          }
        }
      }
    }

    // Truncate if too long
    if (sanitized.length > this.config.sanitization.maxResponseLength) {
      sanitized = sanitized.substring(
        0,
        this.config.sanitization.maxResponseLength,
      );
      ("...[TRUNCATED]");
      wasSanitized = true;
    }

    return { sanitized, wasSanitized };
  }

  private async makeGptRequest(request: GptRequest): Promise<GptResponse> {
    const startTime = Date.now();

    try {
      // Check rate limiting
      if (this.isRateLimited()) {
        this.metrics.rateLimitHits++;
        throw new Error("Rate limit exceeded");
      }

      // Check concurrent request limit
      if (
        this.metrics.currentConcurrentRequests >=
        this.config.safety.maxConcurrentRequests
      ) {
        throw new Error("Too many concurrent requests");
      }

      this.metrics.currentConcurrentRequests++;
      this.addRateLimitRequest();

      // Prepare request payload
      const payload = {
        model: this.config.api.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant integrated with the ***REMOVED*** system. Provide clear, actionable responses.",
          },
          {
            role: "user",
            content: request.command,
          },
        ],
        max_tokens: this.config.api.maxTokens,
        temperature: this.config.api.temperature,
      };

      // Make API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.safety.timeoutMs,
      );

      const response = await fetch(this.config.api.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.api.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // Sanitize response
      const { sanitized, wasSanitized } = this.sanitizeResponse(content);

      const processingTime = Date.now() - startTime;

      const gptResponse: GptResponse = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: request.id,
        timestamp: new Date().toISOString(),
        success: true,
        content: sanitized,
        processingTime,
        tokensUsed: data.usage?.total_tokens,
        sanitized: wasSanitized,
      };

      // Update metrics
      this.metrics.successfulRequests++;
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + processingTime) / 2;
      this.metrics.lastRequestTime = gptResponse.timestamp;

      return gptResponse;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.metrics.failedRequests++;

      const gptResponse: GptResponse = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requestId: request.id,
        timestamp: new Date().toISOString(),
        success: false,
        content: "",
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        sanitized: false,
      };

      return gptResponse;
    } finally {
      this.metrics.currentConcurrentRequests--;
    }
  }

  private async processRequest(request: GptRequest): Promise<void> {
    try {
      // Log request
      if (this.config.monitoring.logAllRequests) {
        const logEntry = `[${request.timestamp}] REQUEST: ${request.id} | ${request.command.substring(0, 100)}... | Priority: ${request.priority}\n`;
        fs.appendFileSync(relayLogPath, logEntry);
      }

      // Make GPT request
      const response = await this.makeGptRequest(request);

      // Log response
      if (this.config.monitoring.logResponses) {
        const logEntry = `[${response.timestamp}] RESPONSE: ${response.id} | Success: ${response.success} | Time: ${response.processingTime}ms${response.sanitized ? " | SANITIZED" : ""}\n`;
        fs.appendFileSync(relayLogPath, logEntry);
      }

      // Handle retry logic
      if (!response.success && request.retryCount < request.maxRetries) {
        request.retryCount++;
        setTimeout(() => {
          this.requestQueue.push(request);
        }, this.config.safety.retryDelayMs * request.retryCount);
      }

      // Remove from active requests
      this.activeRequests.delete(request.id);
    } catch (error) {
      console.error(
        `[GhostGptRelayCorerror] Error processing request ${request.id}:`,
        error,
      );
      this.activeRequests.delete(request.id);
    }
  }

  private async processQueue(): Promise<void> {
    try {
      while (
        this.requestQueue.length > 0 &&
        this.metrics.currentConcurrentRequests <
          this.config.safety.maxConcurrentRequests
      ) {
        const request = this.requestQueue.shift();
        if (request) {
          this.activeRequests.set(request.id, request);
          this.processRequest(request);
        }
      }
    } catch (error) {
      console.error(
        "[GhostGptRelayCorerror] Error processing queuerror:",
        error,
      );
    }
  }

  public async sendCommand(
    command: string,
    context: any = {},
    priority: "low" | "medium" | "high" | "critical" = "medium",
    timeout: number = this.config.safety.timeoutMs,
    maxRetries: number = this.config.safety.maxRetries,
    source: string = "unknown",
  ): Promise<string> {
    const request: GptRequest = {
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      command,
      context,
      priority,
      timeout,
      maxRetries,
      retryCount: 0,
      source,
    };

    this.metrics.totalRequests++;
    this.requestQueue.push(request);

    // Wait for response (simplified - in real implementation, this would be async)
    return `Request ${request.id} queued for processing`;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("[GhostGptRelayCorerror] Starting GPT relay corerror...");

    // Start queue processing
    setInterval(async () => {
      if (this.isRunning) {
        await this.processQueue();
      }
    }, this.processingInterval);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log("[GhostGptRelayCorerror] Stopping GPT relay corerror...");
  }

  public getConfig(): RelayConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<RelayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  public getMetrics(): RelayMetrics {
    return { ...this.metrics };
  }

  public getActiveRequests(): GptRequest[] {
    return Array.from(this.activeRequests.values());
  }

  public getQueueLength(): number {
    return this.requestQueue.length;
  }

  public isHealthy(): boolean {
    return (
      this.isRunning &&
      this.metrics.failedRequests / Math.max(this.metrics.totalRequests, 1) <
        0.1
    );
  }
}

// Export singleton instance
export const ghostGptRelayCore = new GhostGptRelayCore();

export async function startGhostGptRelayCore(): Promise<void> {
  await ghostGptRelayCore.start();
}

export async function stopGhostGptRelayCore(): Promise<void> {
  await ghostGptRelayCore.stop();
}

export function getGhostGptRelayCore(): GhostGptRelayCore {
  return ghostGptRelayCore;
}

export { GhostGptRelayCore };
