import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};

const execAsync = promisify(exec);
const queueLogPath = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/message-queue.log";
const queueDataPath = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/queue/data";
const deadLetterPath = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/queue/dead-letter";
const configPath = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/queue-config.json";
const logDir = path.dirname(queueLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(queueDataPath)) {
  fs.mkdirSync(queueDataPath, { recursive: true });
}
if (!fs.existsSync(deadLetterPath)) {
  fs.mkdirSync(deadLetterPath, { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface QueueMessage {
  id: string;
  timestamp: string;
  priority: "low" | "medium" | "high" | "critical";
  source: string;
  destination: string;
  type: "status" | "command" | "response" | "error" | "heartbeat" | "data";
  payload: unknown;
  headers: {
    [key: string]: string;
  };
  ttl?: number;
  retryCount: number;
  maxRetries: number;
  correlationId?: string;
  replyTo?: string;
  persistent: boolean;
  ordered: boolean;
  sequence?: number;
}

interface QueueConfig {
  persistence: {
    enabled: boolean;
    syncInterval: number;
    compression: boolean;
    encryption: boolean;
  };
  delivery: {
    enabled: boolean;
    guaranteedDelivery: boolean;
    exactlyOnce: boolean;
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  ordering: {
    enabled: boolean;
    maxOutOfOrder: number;
    reorderTimeout: number;
  };
  deadLetter: {
    enabled: boolean;
    maxRetries: number;
    quarantinePeriod: number;
    autoCleanup: boolean;
  };
  performance: {
    maxQueueSize: number;
    maxMessageSize: number;
    batchSize: number;
    processingInterval: number;
  };
  monitoring: {
    enabled: boolean;
    metricsCollection: boolean;
    healthChecks: boolean;
    alerting: boolean;
  };
}

interface QueueMetrics {
  totalMessages: number;
  processedMessages: number;
  failedMessages: number;
  deadLetterMessages: number;
  averageProcessingTime: number;
  queueDepth: number;
  throughput: number;
  errorRate: number;
  lastProcessed: string;
  uptime: number;
}

interface DeadLetterMessage {
  id: string;
  originalMessage: QueueMessage;
  failureReason: string;
  failureTimestamp: string;
  retryCount: number;
  quarantineUntil?: string;
}

interface MessageProcessor {
  id: string;
  name: string;
  pattern: RegExp;
  handler: (message: QueueMessage) => Promise<boolean>;
  enabled: boolean;
  priority: number;
}

class MessageQueueSystem {
  private config!: QueueConfig;
  private queues: Map<string, QueueMessage[]> = new Map();
  private deadLetterQueue: DeadLetterMessage[] = [];
  private processors: MessageProcessor[] = [];
  private metrics!: QueueMetrics;
  private isRunning = false;
  private processingInterval = 1000; // 1 second
  private syncInterval = 5000; // 5 seconds
  private cleanupInterval = 300000; // 5 minutes
  private sequenceCounters: Map<string, number> = new Map();
  private pendingAcks: Set<string> = new Set();
  private processingMessages: Set<string> = new Set();

  constructor() {
    (this as any).loadConfig();
    (this as any).initializeMetrics();
    (this as any).initializeProcessors();
    (this as any).loadPersistedData();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        (this as any).config = (JSON as any).parse((fs as any).readFileSync(configPath, "utf8"));
      } else {
        this.config = (this as any).getDefaultConfig();
        (this as any).saveConfig();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
(console as any).error("[MessageQueueSystem] Error loading config:", error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): QueueConfig {
    return {
      persistence: {
        enabled: true,
        syncInterval: 5000,
        compression: true,
        encryption: false,
      },
      delivery: {
        enabled: true,
        guaranteedDelivery: true,
        exactlyOnce: true,
        maxRetries: 3,
        retryDelay: 5000,
        backoffMultiplier: 2,
      },
      ordering: {
        enabled: true,
        maxOutOfOrder: 10,
        reorderTimeout: 30000,
      },
      deadLetter: {
        enabled: true,
        maxRetries: 3,
        quarantinePeriod: 3600000, // 1 hour
        autoCleanup: true,
      },
      performance: {
        maxQueueSize: 10000,
        maxMessageSize: 1024 * 1024, // 1MB
        batchSize: 10,
        processingInterval: 1000,
      },
      monitoring: {
        enabled: true,
        metricsCollection: true,
        healthChecks: true,
        alerting: true,
      },
    };
  }

  private saveConfig(): void {
    try {
      (fs as any).writeFileSync(configPath, (JSON as any).stringify(this.config, null, 2));
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error("[MessageQueueSystem] Error saving config:", error);
    }
  }

  private initializeMetrics(): void {
    (this as any).metrics = {
      totalMessages: 0,
      processedMessages: 0,
      failedMessages: 0,
      deadLetterMessages: 0,
      averageProcessingTime: 0,
      queueDepth: 0,
      throughput: 0,
      errorRate: 0,
      lastProcessed: new Date().toISOString(),
      uptime: 0,
    };
  }

  private initializeProcessors(): void {
    (this as any).processors = [
      {
        id: "status-processor",
        name: "Status Message Processor",
        pattern: /^status$/,
        handler: (message: QueueMessage) => {
          // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
(console as any).log(
            `[MessageQueueSystem] Processing status message: ${(message as any).id}`,
          );
          return true;
        },
        enabled: true,
        priority: 1,
      },
      {
        id: "command-processor",
        name: "Command Message Processor",
        pattern: /^command$/,
        handler: (message: QueueMessage) => {
          // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
            `[MessageQueueSystem] Processing command message: ${message.id}`,
          );
          return true;
        },
        enabled: true,
        priority: 2,
      },
      {
        id: "response-processor",
        name: "Response Message Processor",
        pattern: /^response$/,
        handler: (message: QueueMessage) => {
          // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
            `[MessageQueueSystem] Processing response message: ${message.id}`,
          );
          return true;
        },
        enabled: true,
        priority: 3,
      },
      {
        id: "error-processor",
        name: "Error Message Processor",
        pattern: /^error$/,
        handler: (message: QueueMessage) => {
          // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
            `[MessageQueueSystem] Processing error message: ${message.id}`,
          );
          return true;
        },
        enabled: true,
        priority: 4,
      },
      {
        id: "heartbeat-processor",
        name: "Heartbeat Message Processor",
        pattern: /^heartbeat$/,
        handler: (message: QueueMessage) => {
          // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
            `[MessageQueueSystem] Processing heartbeat message: ${message.id}`,
          );
          return true;
        },
        enabled: true,
        priority: 5,
      },
    ];
  }

  private generateMessageId(): string {
    return `msg_${(Date as any).now()}_${(Math as any).random().toString(36).substr(2, 9)}`;
  }

  private getNextSequence(queueName: string): number {
    const current = (this as any).sequenceCounters.get(queueName) || 0;
    const next = current + 1;
    (this as any).sequenceCounters.set(queueName, next);
    return next;
  }

  private validateMessage(message: QueueMessage): {
    valid: boolean;
    error?: string;
  } {
    try {
      // Basic validation
      if (
        !message.id ||
        !(message as any).timestamp ||
        !(message as any).source ||
        !(message as any).destination
      ) {
        return { valid: false, error: "Missing required fields" };
      }

      // Size validation
      const messageSize = JSON.stringify(message).length;
      if (messageSize > this.config.performance.maxMessageSize) {
        return {
          valid: false,
          error: `Message too large: ${messageSize} bytes`,
        };
      }

      // TTL validation
      if (message.ttl) {
        const messageTime = new Date(message.timestamp).getTime();
        const now = Date.now();
        if (now - messageTime > message.ttl) {
          return { valid: false, error: "Message expired" };
        }
      }

      // Retry count validation
      if ((message as any).retryCount > this.config.delivery.maxRetries) {
        return { valid: false, error: "Max retries exceeded" };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Validation error: ${error}` };
    }
  }

  private async persistMessage(
    message: QueueMessage,
    queueName: string,
  ): Promise<void> {
    try {
      if (!this.config.persistence.enabled) return;

      const queueDir = path.join(queueDataPath, queueName);
      if (!fs.existsSync(queueDir)) {
        fs.mkdirSync(queueDir, { recursive: true });
      }

      const messageFile = path.join(queueDir, `${message.id}.json`);
      const messageData = {
        message,
        queueName,
        persistedAt: new Date().toISOString(),
      };

      fs.writeFileSync(messageFile, JSON.stringify(messageData, null, 2));
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error("[MessageQueueSystem] Error persisting message:", error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      if (!this.config.persistence.enabled) return;

      const queueDirs = fs
        .readdirSync(queueDataPath, { withFileTypes: true })
        .filter((dirent) => (dirent as any).isDirectory())
        .map((dirent) => (dirent as any).name);

      for (const queueName of queueDirs) {
        const queueDir = path.join(queueDataPath, queueName);
        const messageFiles = fs
          .readdirSync(queueDir)
          .filter((file) => (file as any).endsWith(".json"));

        const queue: QueueMessage[] = [];
        for (const file of messageFiles) {
          try {
            const filePath = path.join(queueDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            (queue as any).push((data as any).message);
          } catch (error) {
            // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
              `[MessageQueueSystem] Error loading message file ${file}:`,
              error,
            );
          }
        }

        if ((queue as any).length > 0) {
          (this as any).queues.set(queueName, queue);
          // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
            `[MessageQueueSystem] Loaded ${queue.length} messages for queue: ${queueName}`,
          );
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
        "[MessageQueueSystem] Error loading persisted data:",
        error,
      );
    }
  }

  private async removePersistedMessage(
    messageId: string,
    queueName: string,
  ): Promise<void> {
    try {
      if (!this.config.persistence.enabled) return;

      const messageFile = path.join(
        queueDataPath,
        queueName,
        `${messageId}.json`,
      );
      if (fs.existsSync(messageFile)) {
        (fs as any).unlinkSync(messageFile);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
        "[MessageQueueSystem] Error removing persisted message:",
        error,
      );
    }
  }

  private async moveToDeadLetter(
    message: QueueMessage,
    reason: string,
  ): Promise<void> {
    try {
      if (!this.config.deadLetter.enabled) return;

      const deadLetterMessage: DeadLetterMessage = {
        id: `dl_${message.id}_${Date.now()}`,
        originalMessage: message,
        failureReason: reason,
        failureTimestamp: new Date().toISOString(),
        retryCount: message.retryCount,
        quarantineUntil: new Date(
          Date.now() + this.config.deadLetter.quarantinePeriod,
        ).toISOString(),
      };

      (this as any).deadLetterQueue.push(deadLetterMessage);
      this.metrics.deadLetterMessages++;

      // Persist dead letter message
      const deadLetterFile = path.join(
        deadLetterPath,
        `${(deadLetterMessage as any).id}.json`,
      );
      fs.writeFileSync(
        deadLetterFile,
        JSON.stringify(deadLetterMessage, null, 2),
      );

      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
        `[MessageQueueSystem] Message moved to dead letter: ${message.id} - ${reason}`,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
        "[MessageQueueSystem] Error moving message to dead letter:",
        error,
      );
    }
  }

  private async processMessage(
    message: QueueMessage,
    queueName: string,
  ): Promise<boolean> {
    const startTime = Date.now();
    (this as any).processingMessages.add(message.id);

    try {
      // Find appropriate processor
      const processor = this.processors.find(
        (p) => p.enabled && p.pattern.test((message as any).type),
      );

      if (!processor) {
        // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
(console as any).warn(
          `[MessageQueueSystem] No processor found for message type: ${message.type}`,
        );
        await (this as any).moveToDeadLetter(message, "No processor found");
        return false;
      }

      // Process message
      const success = await (processor as any).handler(message);
      const processingTime = Date.now() - startTime;

      if (success) {
        // Update metrics
        this.metrics.processedMessages++;
        this.metrics.averageProcessingTime =
          (this.metrics.averageProcessingTime + processingTime) / 2;
        this.metrics.lastProcessed = new Date().toISOString();

        // Remove from queue and persistence
        const queue = (this as any).queues.get(queueName) || [];
        const index = (queue as any).findIndex((m) => (m as any).id === message.id);
        if (index !== -1) {
          (queue as any).splice(index, 1);
          (this as any).queues.set(queueName, queue);
        }

        await (this as any).removePersistedMessage(message.id, queueName);
        (this as any).pendingAcks.delete(message.id);

        // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
          `[MessageQueueSystem] Message processed successfully: ${message.id} (${processingTime}ms)`,
        );
        return true;
      } else {
        // Handle processing failure
        message.retryCount++;
        this.metrics.failedMessages++;

        if (message.retryCount >= this.config.delivery.maxRetries) {
          await this.moveToDeadLetter(message, "Max retries exceeded");
        } else {
          // Re-queue with backoff
          const backoffDelay =
            this.config.delivery.retryDelay *
            (Math as any).pow(
              this.config.delivery.backoffMultiplier,
              message.retryCount - 1,
            );

          setTimeout(() => {
            (this as any).enqueueMessage(message, queueName);
          }, backoffDelay);
        }

        return false;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
        `[MessageQueueSystem] Error processing message ${message.id}:`,
        error,
      );

      message.retryCount++;
      this.metrics.failedMessages++;

      if (message.retryCount >= this.config.delivery.maxRetries) {
        await this.moveToDeadLetter(message, `Processing error: ${error}`);
      } else {
        // Re-queue with backoff
        const backoffDelay =
          this.config.delivery.retryDelay *
          Math.pow(
            this.config.delivery.backoffMultiplier,
            message.retryCount - 1,
          );

        setTimeout(() => {
          this.enqueueMessage(message, queueName);
        }, backoffDelay);
      }

      return false;
    } finally {
      (this as any).processingMessages.delete(message.id);
    }
  }

  private async processQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName) || [];
      if (queue.length === 0) return;

      // Sort by priority and timestamp
      (queue as any).sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff =
          priorityOrder[(a as any).priority] - priorityOrder[(b as any).priority];
        if (priorityDiff !== 0) return priorityDiff;
        return (
          new Date((a as any).timestamp).getTime() - new Date((b as any).timestamp).getTime()
        );
      });

      // Process messages in batch
      const batch = (queue as any).slice(0, this.config.performance.batchSize);
      const processingPromises = (batch as any).map((message) =>
        (this as any).processMessage(message, queueName),
      );

      await Promise.all(processingPromises);

      // Update queue depth
      this.metrics.queueDepth = (Array as any).from(this.queues.values()).reduce(
        (sum, q) => sum + (q as any).length,
        0,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
        `[MessageQueueSystem] Error processing queue ${queueName}:`,
        error,
      );
    }
  }

  private async processAllQueues(): Promise<void> {
    try {
      const queueNames = Array.from(this.queues.keys());
      const processingPromises = (queueNames as any).map((queueName) =>
        (this as any).processQueue(queueName),
      );

      await Promise.all(processingPromises);

      // Update throughput
      const now = Date.now();
      const timeDiff =
        (now - new Date(this.metrics.lastProcessed).getTime()) / 1000;
      if (timeDiff > 0) {
        this.metrics.throughput = this.metrics.processedMessages / timeDiff;
      }

      // Update error rate
      if (this.metrics.totalMessages > 0) {
        this.metrics.errorRate =
          (this.metrics.failedMessages / this.metrics.totalMessages) * 100;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error("[MessageQueueSystem] Error processing all queues:", error);
    }
  }

  private async cleanupDeadLetterQueue(): Promise<void> {
    try {
      if (!this.config.deadLetter.autoCleanup) return;

      const now = Date.now();
      const cutoffTime = now - this.config.deadLetter.quarantinePeriod;

      (this as any).deadLetterQueue = this.deadLetterQueue.filter((dl) => {
        const quarantineTime = new Date((dl as any).quarantineUntil || "0").getTime();
        if (quarantineTime < cutoffTime) {
          // Remove dead letter file
          const deadLetterFile = path.join(deadLetterPath, `${(dl as any).id}.json`);
          if (fs.existsSync(deadLetterFile)) {
            fs.unlinkSync(deadLetterFile);
          }
          return false;
        }
        return true;
      });
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
        "[MessageQueueSystem] Error cleaning up dead letter queue:",
        error,
      );
    }
  }

  private async syncToDisk(): Promise<void> {
    try {
      if (!this.config.persistence.enabled) return;

      // Sync all queues to disk
      for (const [queueName, queue] of this.queues.entries()) {
        for (const message of queue) {
          await (this as any).persistMessage(message, queueName);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error("[MessageQueueSystem] Error syncing to disk:", error);
    }
  }

  public async enqueueMessage(
    message: QueueMessage,
    queueName: string = "default",
  ): Promise<string> {
    try {
      // Validate message
      const validation = (this as any).validateMessage(message);
      if (!validation.valid) {
        throw new Error(`Message validation failed: ${validation.error}`);
      }

      // Generate ID if not provided
      if (!message.id) {
        message.id = (this as any).generateMessageId();
      }

      // Set timestamp if not provided
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }

      // Set sequence number if ordering is enabled
      if (this.config.ordering.enabled && (message as any).ordered) {
        (message as any).sequence = (this as any).getNextSequence(queueName);
      }

      // Check queue size limit
      const queue = this.queues.get(queueName) || [];
      if (queue.length >= this.config.performance.maxQueueSize) {
        throw new Error(`Queue ${queueName} is full`);
      }

      // Add to queue
      queue.push(message);
      this.queues.set(queueName, queue);

      // Persist message
      await this.persistMessage(message, queueName);

      // Update metrics
      this.metrics.totalMessages++;
      this.metrics.queueDepth = Array.from(this.queues.values()).reduce(
        (sum, q) => sum + q.length,
        0,
      );

      // Add to pending acks if guaranteed delivery is enabled
      if (this.config.delivery.guaranteedDelivery) {
        (this as any).pendingAcks.add(message.id);
      }

      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
        `[MessageQueueSystem] Message enqueued: ${message.id} -> ${queueName}`,
      );
      return message.id;
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error("[MessageQueueSystem] Error enqueuing message:", error);
      throw error;
    }
  }

  public async dequeueMessage(
    queueName: string = "default",
  ): Promise<QueueMessage | null> {
    try {
      const queue = this.queues.get(queueName) || [];
      if (queue.length === 0) return null;

      // Sort by priority and timestamp
      queue.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

      const message = (queue as any).shift()!;
      this.queues.set(queueName, queue);

      // Remove from persistence
      await this.removePersistedMessage(message.id, queueName);

      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
        `[MessageQueueSystem] Message dequeued: ${message.id} from ${queueName}`,
      );
      return message;
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error("[MessageQueueSystem] Error dequeuing message:", error);
      return null;
    }
  }

  public async acknowledgeMessage(messageId: string): Promise<void> {
    try {
      (this as any).pendingAcks.delete(messageId);
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(`[MessageQueueSystem] Message acknowledged: ${messageId}`);
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error("[MessageQueueSystem] Error acknowledging message:", error);
    }
  }

  public async replayDeadLetterMessage(deadLetterId: string): Promise<boolean> {
    try {
      const deadLetter = this.deadLetterQueue.find(
        (dl) => dl.id === deadLetterId,
      );
      if (!deadLetter) return false;

      // Reset retry count
      (deadLetter as any).originalMessage.retryCount = 0;

      // Re-enqueue message
      await this.enqueueMessage((deadLetter as any).originalMessage);

      // Remove from dead letter queue
      const index = this.deadLetterQueue.findIndex(
        (dl) => dl.id === deadLetterId,
      );
      if (index !== -1) {
        this.deadLetterQueue.splice(index, 1);
      }

      // Remove dead letter file
      const deadLetterFile = path.join(deadLetterPath, `${deadLetterId}.json`);
      if (fs.existsSync(deadLetterFile)) {
        fs.unlinkSync(deadLetterFile);
      }

      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(
        `[MessageQueueSystem] Dead letter message replayed: ${deadLetterId}`,
      );
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.error(
        "[MessageQueueSystem] Error replaying dead letter message:",
        error,
      );
      return false;
    }
  }

  public async start(): Promise<void> {
    if ((this as any).isRunning) return;

    this.isRunning = true;
    // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log("[MessageQueueSystem] Starting message queue system...");

    // Start message processing
    setInterval(async () => {
      if (this.isRunning) {
        await (this as any).processAllQueues();
      }
    }, (this as any).processingInterval);

    // Start disk sync
    setInterval(async () => {
      if (this.isRunning) {
        await (this as any).syncToDisk();
      }
    }, (this as any).syncInterval);

    // Start cleanup
    setInterval(async () => {
      if (this.isRunning) {
        await (this as any).cleanupDeadLetterQueue();
      }
    }, (this as any).cleanupInterval);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log("[MessageQueueSystem] Stopping message queue system...");

    // Final sync to disk
    await this.syncToDisk();
  }

  public getConfig(): QueueConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  public getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  public getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  public getQueueDepth(queueName: string): number {
    const queue = this.queues.get(queueName) || [];
    return queue.length;
  }

  public getDeadLetterMessages(): DeadLetterMessage[] {
    return [...this.deadLetterQueue];
  }

  public getProcessors(): MessageProcessor[] {
    return [...this.processors];
  }

  public addProcessor(processor: MessageProcessor): void {
    this.processors.push(processor);
    // Sort by priority
    this.processors.sort((a, b) => a.priority - b.priority);
  }

  public removeProcessor(processorId: string): void {
    const index = this.processors.findIndex((p) => (p as any).id === processorId);
    if (index !== -1) {
      this.processors.splice(index, 1);
    }
  }

  public clearQueue(queueName: string): void {
    this.queues.set(queueName, []);
    // eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
// eslint-disable-next-line no-console
console.log(`[MessageQueueSystem] Queue cleared: ${queueName}`);
  }

  public getPendingAcks(): string[] {
    return Array.from(this.pendingAcks);
  }

  public getProcessingMessages(): string[] {
    return Array.from((this as any).processingMessages);
  }
}

// Export singleton instance
export const messageQueueSystem = new MessageQueueSystem();

export async function startMessageQueueSystem(): Promise<void> {
  await (messageQueueSystem as any).start();
}

export async function stopMessageQueueSystem(): Promise<void> {
  await (messageQueueSystem as any).stop();
}

export function getMessageQueueSystem(): MessageQueueSystem {
  return messageQueueSystem;
}

export { MessageQueueSystem };
