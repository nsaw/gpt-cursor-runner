// Runtime Schema Definitions for ***REMOVED*** 2.0 P7
// These schemas provide type safety and validation for inter-component communication

export const GptRelayInputSchema = {
  type: "object" as const,
  properties: {
    command: {
      type: "string" as const,
      description: "The command to send to GPT",
      minLength: 1,
      maxLength: 4000,
    },
    context: {
      type: "object" as const,
      description: "Additional context for the command",
      additionalProperties: true,
    },
    priority: {
      type: "string" as const,
      enum: ["low", "medium", "high", "critical"] as const,
      description: "Priority level of the request",
    },
    timeout: {
      type: "number" as const,
      description: "Timeout in milliseconds",
      minimum: 1000,
      maximum: 60000,
    },
    maxRetries: {
      type: "number" as const,
      description: "Maximum number of retries",
      minimum: 0,
      maximum: 10,
    },
    source: {
      type: "string" as const,
      description: "Source of the request",
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    correlationId: {
      type: "string" as const,
      description: "Correlation ID for tracking",
      optional: true,
    },
  },
  required: ["command", "priority", "timeout", "maxRetries", "source"] as const,
  additionalProperties: false,
};

export const CliCommandSchema = {
  type: "object" as const,
  properties: {
    command: {
      type: "string" as const,
      description: "The CLI command to execute",
      pattern: "^[a-zA-Z0-9_-]+(\\s+[a-zA-Z0-9_-]+)*$",
    },
    args: {
      type: "array" as const,
      items: {
        type: "string" as const,
      },
      description: "Command arguments",
    },
    options: {
      type: "object" as const,
      description: "Command options/flags",
      additionalProperties: {
        type: "string" as const,
      },
    },
    workingDir: {
      type: "string" as const,
      description: "Working directory for command execution",
      optional: true,
    },
    timeout: {
      type: "number" as const,
      description: "Command timeout in milliseconds",
      minimum: 1000,
      maximum: 300000,
    },
    user: {
      type: "string" as const,
      description: "User executing the command",
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    sessionId: {
      type: "string" as const,
      description: "Session ID for tracking",
      optional: true,
    },
  },
  required: ["command", "timeout", "user"] as const,
  additionalProperties: false,
};

export const PatchGeneratorPayloadSchema = {
  type: "object" as const,
  properties: {
    target: {
      type: "string" as const,
      description: "Target component or system",
      enum: [
        "ghost",
        "validation",
        "queue",
        "monitoring",
        "relay",
        "healer",
        "bridge",
      ] as const,
    },
    issue: {
      type: "object" as const,
      properties: {
        type: {
          type: "string" as const,
          enum: [
            "bug",
            "feature",
            "optimization",
            "security",
            "performance",
          ] as const,
        },
        severity: {
          type: "string" as const,
          enum: ["low", "medium", "high", "critical"] as const,
        },
        description: {
          type: "string" as const,
          description: "Description of the issue",
          maxLength: 1000,
        },
        symptoms: {
          type: "array" as const,
          items: {
            type: "string" as const,
          },
          description: "Symptoms of the issue",
        },
        affectedComponents: {
          type: "array" as const,
          items: {
            type: "string" as const,
          },
          description: "Components affected by the issue",
        },
      },
      required: ["type", "severity", "description"],
    },
    context: {
      type: "object" as const,
      properties: {
        environment: {
          type: "string" as const,
          enum: ["development", "staging", "production"] as const,
        },
        version: {
          type: "string" as const,
          description: "Current system version",
        },
        logs: {
          type: "array" as const,
          items: {
            type: "string" as const,
          },
          description: "Relevant log entries",
        },
        metrics: {
          type: "object" as const,
          description: "System metrics at time of issue",
          additionalProperties: true,
        },
      },
      required: ["environment", "version"],
    },
    constraints: {
      type: "object" as const,
      properties: {
        maxPatchSize: {
          type: "number" as const,
          description: "Maximum patch size in bytes",
          minimum: 1000,
          maximum: 1000000,
        },
        allowedFileTypes: {
          type: "array" as const,
          items: {
            type: "string" as const,
          },
          description: "Allowed file types for patching",
        },
        excludedPaths: {
          type: "array" as const,
          items: {
            type: "string" as const,
          },
          description: "Paths to exclude from patching",
        },
        rollbackRequired: {
          type: "boolean" as const,
          description: "Whether rollback capability is required",
        },
      },
      optional: true,
    },
  },
  required: ["target", "issue", "context"],
  additionalProperties: false,
} as const;

export const FeedbackIngestionSchema = {
  type: "object" as const,
  properties: {
    source: {
      type: "string" as const,
      description: "Source of the feedback",
      enum: ["gpt", "user", "system", "monitoring", "healer"] as const,
    },
    feedback: {
      type: "object" as const,
      properties: {
        type: {
          type: "string" as const,
          enum: [
            "positive",
            "negative",
            "neutral",
            "suggestion",
            "bug_report",
          ] as const,
        },
        content: {
          type: "string" as const,
          description: "Feedback content",
          maxLength: 5000,
        },
        rating: {
          type: "number" as const,
          description: "Rating from 1-10",
          minimum: 1,
          maximum: 10,
          optional: true,
        },
        tags: {
          type: "array" as const,
          items: {
            type: "string" as const,
          },
          description: "Tags for categorizing feedback",
        },
        context: {
          type: "object" as const,
          description: "Context when feedback was given",
          additionalProperties: true,
        },
      },
      required: ["type", "content"],
    },
    metadata: {
      type: "object" as const,
      properties: {
        timestamp: {
          type: "string" as const,
          description: "ISO timestamp of feedback",
          format: "date-time",
        },
        sessionId: {
          type: "string" as const,
          description: "Session ID",
          optional: true,
        },
        userId: {
          type: "string" as const,
          description: "User ID",
          optional: true,
        },
        component: {
          type: "string" as const,
          description: "Component that generated feedback",
          optional: true,
        },
      },
      required: ["timestamp"],
    },
  },
  required: ["source", "feedback", "metadata"],
  additionalProperties: false,
} as const;

export const MessageQueueSchema = {
  type: "object" as const,
  properties: {
    queue: {
      type: "string" as const,
      description: "Queue name",
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    message: {
      type: "object" as const,
      properties: {
        id: {
          type: "string" as const,
          description: "Message ID",
          pattern: "^[a-zA-Z0-9_-]+$",
        },
        type: {
          type: "string" as const,
          enum: [
            "status",
            "command",
            "response",
            "error",
            "heartbeat",
            "data",
          ] as const,
        },
        priority: {
          type: "string" as const,
          enum: ["low", "medium", "high", "critical"] as const,
        },
        payload: {
          type: "object" as const,
          description: "Message payload",
          additionalProperties: true,
        },
        headers: {
          type: "object" as const,
          description: "Message headers",
          additionalProperties: {
            type: "string" as const,
          },
        },
        ttl: {
          type: "number" as const,
          description: "Time to live in milliseconds",
          minimum: 1000,
          maximum: 86400000,
          optional: true,
        },
        persistent: {
          type: "boolean" as const,
          description: "Whether message should be persisted",
        },
        ordered: {
          type: "boolean" as const,
          description: "Whether message ordering is required",
        },
      },
      required: ["id", "type", "priority", "payload", "persistent", "ordered"],
    },
  },
  required: ["queue", "message"],
  additionalProperties: false,
} as const;

export const HealthCheckSchema = {
  type: "object" as const,
  properties: {
    component: {
      type: "string" as const,
      description: "Component to check",
      pattern: "^[a-zA-Z0-9_-]+$",
    },
    checkType: {
      type: "string" as const,
      enum: ["process", "api", "database", "network", "custom"] as const,
    },
    parameters: {
      type: "object" as const,
      description: "Health check parameters",
      additionalProperties: true,
    },
    timeout: {
      type: "number" as const,
      description: "Health check timeout",
      minimum: 1000,
      maximum: 30000,
    },
    expectedStatus: {
      type: "string" as const,
      enum: ["healthy", "degraded", "critical", "failed"] as const,
    },
  },
  required: ["component", "checkType", "timeout"],
  additionalProperties: false,
} as const;

// Schema registry for runtime validation
export const SchemaRegistry = {
  "gpt-relay-input": GptRelayInputSchema,
  "cli-command": CliCommandSchema,
  "patch-generator-payload": PatchGeneratorPayloadSchema,
  "feedback-ingestion": FeedbackIngestionSchema,
  "message-queue": MessageQueueSchema,
  "health-check": HealthCheckSchema,
};

// Type definitions for TypeScript integration
export type GptRelayInput = {
  command: string;
  context?: any;
  priority: "low" | "medium" | "high" | "critical";
  timeout: number;
  maxRetries: number;
  source: string;
  correlationId?: string;
};

export type CliCommand = {
  command: string;
  args?: string[];
  options?: { [key: string]: string };
  workingDir?: string;
  timeout: number;
  user: string;
  sessionId?: string;
};

export type PatchGeneratorPayload = {
  target:
    | "ghost"
    | "validation"
    | "queue"
    | "monitoring"
    | "relay"
    | "healer"
    | "bridge";
  issue: {
    type: "bug" | "feature" | "optimization" | "security" | "performance";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    symptoms?: string[];
    affectedComponents?: string[];
  };
  context: {
    environment: "development" | "staging" | "production";
    version: string;
    logs?: string[];
    metrics?: any;
  };
  constraints?: {
    maxPatchSize?: number;
    allowedFileTypes?: string[];
    excludedPaths?: string[];
    rollbackRequired?: boolean;
  };
};

export type FeedbackIngestion = {
  source: "gpt" | "user" | "system" | "monitoring" | "healer";
  feedback: {
    type: "positive" | "negative" | "neutral" | "suggestion" | "bug_report";
    content: string;
    rating?: number;
    tags?: string[];
    context?: any;
  };
  metadata: {
    timestamp: string;
    sessionId?: string;
    userId?: string;
    component?: string;
  };
};

export type MessageQueue = {
  queue: string;
  message: {
    id: string;
    type: "status" | "command" | "response" | "error" | "heartbeat" | "data";
    priority: "low" | "medium" | "high" | "critical";
    payload: any;
    headers?: { [key: string]: string };
    ttl?: number;
    persistent: boolean;
    ordered: boolean;
  };
};

export type HealthCheck = {
  component: string;
  checkType: "process" | "api" | "database" | "network" | "custom";
  parameters?: any;
  timeout: number;
  expectedStatus?: "healthy" | "degraded" | "critical" | "failed";
};

// Schema validation functions
export function validateGptRelayInput(data: any): data is GptRelayInput {
  const schema = SchemaRegistry["gpt-relay-input"];
  return validateAgainstSchema(data, schema);
}

export function validateCliCommand(data: any): data is CliCommand {
  const schema = SchemaRegistry["cli-command"];
  return validateAgainstSchema(data, schema);
}

export function validatePatchGeneratorPayload(
  data: any,
): data is PatchGeneratorPayload {
  const schema = SchemaRegistry["patch-generator-payload"];
  return validateAgainstSchema(data, schema);
}

export function validateFeedbackIngestion(
  data: any,
): data is FeedbackIngestion {
  const schema = SchemaRegistry["feedback-ingestion"];
  return validateAgainstSchema(data, schema);
}

export function validateMessageQueue(data: any): data is MessageQueue {
  const schema = SchemaRegistry["message-queue"];
  return validateAgainstSchema(data, schema);
}

export function validateHealthCheck(data: any): data is HealthCheck {
  const schema = SchemaRegistry["health-check"];
  return validateAgainstSchema(data, schema);
}

// Generic schema validation function
function validateAgainstSchema(data: any, schema: any): boolean {
  // Basic validation implementation
  // In a real implementation, this would use a proper JSON schema validator
  if (!data || typeof data !== "object") return false;

  // Check required properties
  if (schema.required) {
    for (const required of schema.required) {
      if (!(required in data)) return false;
    }
  }

  // Check properties
  if (schema.properties) {
    for (const [prop, propSchema] of Object.entries(schema.properties)) {
      if (prop in data) {
        const value = data[prop];
        const schemaObj = propSchema as any;

        // Type validation
        if (schemaObj.type === "string" && typeof value !== "string")
          return false;
        if (schemaObj.type === "number" && typeof value !== "number")
          return false;
        if (schemaObj.type === "boolean" && typeof value !== "boolean")
          return false;
        if (schemaObj.type === "array" && !Array.isArray(value)) return false;
        if (
          schemaObj.type === "object" &&
          (typeof value !== "object" || value === null)
        )
          return false;

        // Enum validation
        if (schemaObj.enum && !schemaObj.enum.includes(value)) return false;

        // Pattern validation
        if (schemaObj.pattern && typeof value === "string") {
          const regex = new RegExp(schemaObj.pattern);
          if (!regex.test(value)) return false;
        }

        // Range validation
        if (schemaObj.minimum !== undefined && value < schemaObj.minimum)
          return false;
        if (schemaObj.maximum !== undefined && value > schemaObj.maximum)
          return false;
        if (
          schemaObj.minLength !== undefined &&
          value.length < schemaObj.minLength
        )
          return false;
        if (
          schemaObj.maxLength !== undefined &&
          value.length > schemaObj.maxLength
        )
          return false;
      }
    }
  }

  return true;
}
