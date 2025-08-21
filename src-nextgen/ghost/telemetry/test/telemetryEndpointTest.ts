// Telemetry Endpoint Runtime Test — Phase 8 Validation
// Comprehensive test of all telemetry API endpoints with live data

import fs from "fs";
import path from "path";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

const testLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/test/telemetry-test.log";
const testResultsPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/test/test-results.json";

interface TestResult {
  endpoint: string;
  method: string;
  status: "PASS" | "FAIL";
  responseTime: number;
  statusCode: number;
  error?: string;
  data?: unknown;
  timestamp: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageResponseTime: number;
  };
}

class TelemetryEndpointTester {
  private testResults: TestSuite[] = [];
  private baseUrl: string;
  private port: number;

  constructor(port: number = 5051) {
    this.port = port;
    this.baseUrl = `http://localhost:${port}`;
  }

  private log(message: string, data?: unknown): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data,
    };
    fs.appendFileSync(testLogPath, JSON.stringify(logEntry) + "\n");
  }

  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: unknown,
  ): Promise<TestResult> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json();

      return {
        endpoint,
        method,
        status: response.ok ? "PASS" : "FAIL",
        responseTime,
        statusCode: response.status,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        endpoint,
        method,
        status: "FAIL",
        responseTime,
        statusCode: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async testHealthEndpoints(): Promise<TestResult[]> {
    this.log("Testing health endpoints");
    const tests: TestResult[] = [];

    // Test basic health check
    tests.push(await this.makeRequest("/api/telemetry/health"));

    // Test system info
    tests.push(await this.makeRequest("/api/telemetry/info"));

    return tests;
  }

  private async testDataEndpoints(): Promise<TestResult[]> {
    this.log("Testing data endpoints");
    const tests: TestResult[] = [];

    // Test telemetry data retrieval
    tests.push(await this.makeRequest("/api/telemetry/data"));
    tests.push(await this.makeRequest("/api/telemetry/data?limit=10"));
    tests.push(
      await this.makeRequest("/api/telemetry/data?component=dashboard"),
    );

    // Test component-specific data
    tests.push(await this.makeRequest("/api/telemetry/data/dashboard"));
    tests.push(await this.makeRequest("/api/telemetry/data/api"));

    return tests;
  }

  private async testMetricsEndpoints(): Promise<TestResult[]> {
    this.log("Testing metrics endpoints");
    const tests: TestResult[] = [];

    // Test aggregated metrics
    tests.push(await this.makeRequest("/api/telemetry/metrics"));
    tests.push(await this.makeRequest("/api/telemetry/metrics?interval=60"));

    // Test component-specific metrics
    tests.push(await this.makeRequest("/api/telemetry/metrics/dashboard"));
    tests.push(await this.makeRequest("/api/telemetry/metrics/api"));

    return tests;
  }

  private async testAlertEndpoints(): Promise<TestResult[]> {
    this.log("Testing alert endpoints");
    const tests: TestResult[] = [];

    // Test alert retrieval
    tests.push(await this.makeRequest("/api/telemetry/alerts"));
    tests.push(await this.makeRequest("/api/telemetry/alerts?status=active"));
    tests.push(await this.makeRequest("/api/telemetry/alerts?limit=10"));

    // Test component-specific alerts
    tests.push(await this.makeRequest("/api/telemetry/alerts/dashboard"));

    // Test alert management (POST requests)
    const testAlert = {
      component: "test-component",
      severity: "warning",
      message: "Test alert from endpoint tester",
      value: 75.0,
      threshold: 70.0,
    };
    tests.push(
      await this.makeRequest("/api/telemetry/alerts", "POST", testAlert),
    );

    return tests;
  }

  private async testEventEndpoints(): Promise<TestResult[]> {
    this.log("Testing event endpoints");
    const tests: TestResult[] = [];

    // Test event submission
    const testEvent = {
      component: "test-component",
      eventType: "test_event",
      data: {
        action: "endpoint_test",
        timestamp: new Date().toISOString(),
      },
    };
    tests.push(
      await this.makeRequest("/api/telemetry/event", "POST", testEvent),
    );

    // Test event retrieval
    tests.push(await this.makeRequest("/api/telemetry/events"));
    tests.push(await this.makeRequest("/api/telemetry/events?limit=10"));

    return tests;
  }

  private async testConfigEndpoints(): Promise<TestResult[]> {
    this.log("Testing configuration endpoints");
    const tests: TestResult[] = [];

    // Test config retrieval
    tests.push(await this.makeRequest("/api/telemetry/config"));

    // Test config update
    const configUpdate = {
      telemetry: {
        dashboard: {
          refreshInterval: 3000,
        },
      },
    };
    tests.push(
      await this.makeRequest("/api/telemetry/config", "PUT", configUpdate),
    );

    return tests;
  }

  private async testComponentEndpoints(): Promise<TestResult[]> {
    this.log("Testing component endpoints");
    const tests: TestResult[] = [];

    // Test component status
    tests.push(await this.makeRequest("/api/telemetry/components"));

    // Test component restart (POST request)
    tests.push(
      await this.makeRequest(
        "/api/telemetry/components/dashboard/restart",
        "POST",
      ),
    );

    return tests;
  }

  private calculateSummary(tests: TestResult[]): TestSuite["summary"] {
    const total = tests.length;
    const passed = tests.filter((t) => t.status === "PASS").length;
    const failed = total - passed;
    const averageResponseTime =
      tests.reduce((sum, t) => sum + t.responseTime, 0) / total;

    return {
      total,
      passed,
      failed,
      averageResponseTime,
    };
  }

  public async runAllTests(): Promise<void> {
    this.log("Starting comprehensive telemetry endpoint testing");

    // Test all endpoint categories
    const testSuites = [
      { name: "Health Endpoints", tests: await this.testHealthEndpoints() },
      { name: "Data Endpoints", tests: await this.testDataEndpoints() },
      { name: "Metrics Endpoints", tests: await this.testMetricsEndpoints() },
      { name: "Alert Endpoints", tests: await this.testAlertEndpoints() },
      { name: "Event Endpoints", tests: await this.testEventEndpoints() },
      { name: "Config Endpoints", tests: await this.testConfigEndpoints() },
      {
        name: "Component Endpoints",
        tests: await this.testComponentEndpoints(),
      },
    ];

    // Calculate summaries
    this.testResults = testSuites.map((suite) => ({
      ...suite,
      summary: this.calculateSummary(suite.tests),
    }));

    // Save results
    this.saveResults();
    this.logResults();
  }

  private saveResults(): void {
    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      testSuites: this.testResults,
      overallSummary: {
        totalTests: this.testResults.reduce(
          (sum, suite) => sum + suite.summary.total,
          0,
        ),
        totalPassed: this.testResults.reduce(
          (sum, suite) => sum + suite.summary.passed,
          0,
        ),
        totalFailed: this.testResults.reduce(
          (sum, suite) => sum + suite.summary.failed,
          0,
        ),
        averageResponseTime:
          this.testResults.reduce(
            (sum, suite) => sum + suite.summary.averageResponseTime,
            0,
          ) / this.testResults.length,
      },
    };

    fs.writeFileSync(testResultsPath, JSON.stringify(results, null, 2));
  }

  private logResults(): void {
    this.log("=== TELEMETRY ENDPOINT TEST RESULTS ===");

    this.testResults.forEach((suite) => {
      this.log(`${suite.name}:`, {
        total: suite.summary.total,
        passed: suite.summary.passed,
        failed: suite.summary.failed,
        averageResponseTime: suite.summary.averageResponseTime,
      });
    });

    const overall = this.testResults.reduce(
      (sum, suite) => ({
        total: sum.total + suite.summary.total,
        passed: sum.passed + suite.summary.passed,
        failed: sum.failed + suite.summary.failed,
      }),
      { total: 0, passed: 0, failed: 0 },
    );

    this.log("OVERALL RESULTS:", overall);
  }

  public getResults(): unknown {
    return {
      testSuites: this.testResults,
      resultsFile: testResultsPath,
      logFile: testLogPath,
    };
  }
}

// Export test runner
export async function runTelemetryEndpointTests(
  port: number = 5051,
): Promise<any> {
  const tester = new TelemetryEndpointTester(port);
  await tester.runAllTests();
  return tester.getResults();
}

export { TelemetryEndpointTester };
