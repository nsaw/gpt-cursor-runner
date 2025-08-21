// Authentication Middleware — Phase 8 Future Prep
// Placeholder authCheck middleware for future authentication hardening

import fs from "fs";
import path from "path";
import crypto from "crypto";

const authLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/auth-middleware.log";
const authConfigPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/auth-config.json";

interface AuthConfig {
  enabled: boolean;
  methods: {
    apiKey: boolean;
    jwt: boolean;
    oauth: boolean;
    basic: boolean;
  };
  apiKeys: string[];
  jwtSecret: string;
  tokenExpiry: number;
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
  };
}

interface AuthRequest {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  headers: { [key: string]: string };
  clientIp: string;
  userAgent: string;
  authenticated: boolean;
  authMethod?: string;
  userId?: string;
  permissions?: string[];
}

interface AuthResult {
  authenticated: boolean;
  userId?: string;
  permissions?: string[];
  authMethod?: string;
  error?: string;
}

class AuthCheckMiddleware {
  private config: AuthConfig;
  private requestHistory: AuthRequest[] = [];
  private rateLimitMap: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor() {
    this.config = this.loadConfig();
    this.log(
      "auth_middleware_initialized",
      "Authentication middleware initialized",
    );
  }

  private loadConfig(): AuthConfig {
    try {
      if (fs.existsSync(authConfigPath)) {
        const configData = fs.readFileSync(authConfigPath, "utf8");
        return JSON.parse(configData);
      } else {
        return this.getDefaultConfig();
      }
    } catch (error) {
      this.log("config_error", `Failed to load auth config: ${error}`);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): AuthConfig {
    return {
      enabled: false, // Disabled by default for development
      methods: {
        apiKey: true,
        jwt: true,
        oauth: false,
        basic: false,
      },
      apiKeys: [process.env.TELEMETRY_API_KEY || "default-dev-key"],
      jwtSecret: process.env.JWT_SECRET || "default-jwt-secret",
      tokenExpiry: 3600,
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000,
      },
      cors: {
        enabled: true,
        allowedOrigins: ["http://localhost:3000", "http://localhost:5050"],
      },
    };
  }

  private log(message: string, data?: unknown): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: "auth-middleware",
      message,
      data,
    };

    try {
      fs.appendFileSync(authLogPath, JSON.stringify(logEntry) + "\n");
    } catch (error) {
      console.error("Failed to writerror to auth log:", error);
    }
  }

  private checkApiKey(authHeader: string): AuthResult {
    if (!this.config.methods.apiKey) {
      return { authenticated: false, error: "API key authentication disabled" };
    }

    const apiKey = authHeader.replace("Bearer ", "").replace("ApiKey ", "");

    if (this.config.apiKeys.includes(apiKey)) {
      return {
        authenticated: true,
        userId: "api-user",
        permissions: ["read", "write"],
        authMethod: "api-key",
      };
    }

    return { authenticated: false, error: "Invalid API key" };
  }

  private checkJWT(authHeader: string): AuthResult {
    if (!this.config.methods.jwt) {
      return { authenticated: false, error: "JWT authentication disabled" };
    }

    try {
      const token = authHeader.replace("Bearer ", "");

      // Placeholder JWT validation - implement proper JWT library
      if (token && token.length > 10) {
        return {
          authenticated: true,
          userId: "jwt-user",
          permissions: ["read", "write"],
          authMethod: "jwt",
        };
      }

      return { authenticated: false, error: "Invalid JWT token" };
    } catch (error) {
      return { authenticated: false, error: "JWT validation failed" };
    }
  }

  private checkBasicAuth(authHeader: string): AuthResult {
    if (!this.config.methods.basic) {
      return { authenticated: false, error: "Basic authentication disabled" };
    }

    try {
      const credentials = Buffer.from(
        authHeader.replace("Basic ", ""),
        "base64",
      ).toString();
      const [username, password] = credentials.split(":");

      // Placeholder basic auth validation
      if (username && password) {
        return {
          authenticated: true,
          userId: username,
          permissions: ["read"],
          authMethod: "basic",
        };
      }

      return { authenticated: false, error: "Invalid basic auth credentials" };
    } catch (error) {
      return { authenticated: false, error: "Basic auth validation failed" };
    }
  }

  private checkRateLimit(clientIp: string): boolean {
    if (!this.config.rateLimit.enabled) return true;

    const now = Date.now();
    const key = clientIp;

    const current = this.rateLimitMap.get(key);
    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.config.rateLimit.windowMs,
      });
      return true;
    }

    if (current.count >= this.config.rateLimit.maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  public async authenticate(req: unknown): Promise<AuthResult> {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const clientIp = req.socket?.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    // Create auth request record
    const authRequest: AuthRequest = {
      id: requestId,
      timestamp,
      method: req.method || "GET",
      path: req.url || "/",
      headers: req.headers,
      clientIp,
      userAgent,
      authenticated: false,
    };

    // Check if authentication is enabled
    if (!this.config.enabled) {
      authRequest.authenticated = true;
      authRequest.authMethod = "disabled";
      this.recordRequest(authRequest);
      return { authenticated: true, authMethod: "disabled" };
    }

    // Check rate limiting
    if (!this.checkRateLimit(clientIp)) {
      authRequest.authenticated = false;
      this.recordRequest(authRequest);
      return { authenticated: false, error: "Rate limit exceeded" };
    }

    // Get authorization header
    const authHeader =
      req.headers.authorization || req.headers["x-api-key"] || "";

    if (!authHeader) {
      authRequest.authenticated = false;
      this.recordRequest(authRequest);
      return { authenticated: false, error: "No authorization header" };
    }

    // Try different authentication methods
    let authResult: AuthResult;

    if (authHeader.startsWith("Bearer ") || authHeader.startsWith("ApiKey ")) {
      authResult = this.checkApiKey(authHeader);
    } else if (authHeader.startsWith("Bearer ")) {
      authResult = this.checkJWT(authHeader);
    } else if (authHeader.startsWith("Basic ")) {
      authResult = this.checkBasicAuth(authHeader);
    } else {
      authResult = {
        authenticated: false,
        error: "Unsupported authentication method",
      };
    }

    // Update auth request record
    authRequest.authenticated = authResult.authenticated;
    authRequest.authMethod = authResult.authMethod;
    authRequest.userId = authResult.userId;
    authRequest.permissions = authResult.permissions;

    this.recordRequest(authRequest);

    if (!authResult.authenticated) {
      this.log("auth_failed", {
        requestId,
        clientIp,
        path: req.url,
        error: authResult.error,
      });
    }

    return authResult;
  }

  private recordRequest(authRequest: AuthRequest): void {
    this.requestHistory.push(authRequest);

    // Maintain history size
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }
  }

  public getAuthStats(): unknown {
    const total = this.requestHistory.length;
    const authenticated = this.requestHistory.filter(
      (r) => r.authenticated,
    ).length;
    const failed = total - authenticated;

    return {
      total,
      authenticated,
      failed,
      successRate: total > 0 ? (authenticated / total) * 100 : 0,
      lastRequest:
        this.requestHistory[this.requestHistory.length - 1]?.timestamp,
    };
  }

  public getConfig(): AuthConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log("config_updated", newConfig);
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public enable(): void {
    this.config.enabled = true;
    this.log("auth_enabled", "Authentication middleware enabled");
  }

  public disable(): void {
    this.config.enabled = false;
    this.log("auth_disabled", "Authentication middleware disabled");
  }
}

// Export middleware function
export function authCheck(): (req: unknown, res: unknown, next: unknown) => Promise<void> {
  const authMiddleware = new AuthCheckMiddleware();

  return async (req: unknown, res: unknown, next: unknown) => {
    try {
      const authResult = await authMiddleware.authenticate(req);

      if (authResult.authenticated) {
        // Add auth info to request
        req.auth = authResult;
        next();
      } else {
        res.writeHead(401, {
          "Content-Type": "application/json",
          "WWW-Authenticate": "Bearer, ApiKey",
        });
        res.end(
          JSON.stringify({
            error: "Authentication required",
            message: authResult.error,
            timestamp: new Date().toISOString(),
          }),
        );
      }
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Authentication error",
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }),
      );
    }
  };
}

// Export middleware class for direct use
export { AuthCheckMiddleware };
