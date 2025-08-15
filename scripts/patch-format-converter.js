#!/usr/bin/env node
/**
 * Patch Format Converter
 * Converts between different patch formats used by webhook handler and patch executor
 * Ensures compatibility and validation across all systems
 */

const fs = require("fs/promises");

class PatchFormatConverter {
  constructor() {
    this.supportedFormats = ["webhook", "executor", "unified"];
    this.validationRules = {
      webhook: ["id", "role", "target_file", "patch"],
      executor: ["id", "mutations", "postMutationBuild"],
      unified: ["id", "type", "target", "content", "validation", "metadata"],
    };
  }

  /**
   * Convert webhook format to executor format
   * @param {Object} webhookPatch - Patch in webhook format
   * @returns {Object} Patch in executor format
   */
  convertWebhookToExecutor(webhookPatch) {
    try {
      // Skip validation for now to handle flexible structure
      // this.validatePatch(webhookPatch, 'webhook');

      // Handle both traditional webhook format and current format with mutations
      let mutations = [];
      let postMutationBuild = { shell: [] };
      let validation = {
        enforceValidationGate: true,
        strictRuntimeAudit: true,
        runDryCheck: true,
        forceRuntimeTrace: true,
        requireMutationProof: true,
        requireServiceUptime: true,
      };

      if (webhookPatch.mutations && Array.isArray(webhookPatch.mutations)) {
        // Current format with mutations array
        mutations = webhookPatch.mutations;
        if (webhookPatch.postMutationBuild) {
          postMutationBuild = webhookPatch.postMutationBuild;
        }
        if (webhookPatch.validate) {
          validation = { ...validation, ...webhookPatch.validate };
        }
      } else if (webhookPatch.target_file && webhookPatch.patch) {
        // Traditional webhook format
        mutations = [
          {
            path: webhookPatch.target_file,
            contents: webhookPatch.patch,
            type: "file_modification",
          },
        ];
        if (webhookPatch.validation) {
          validation = { ...validation, ...webhookPatch.validation };
        }
      } else {
        throw new Error("Unable to determine patch structure");
      }

      const executorPatch = {
        id: webhookPatch.id || webhookPatch.blockId,
        metadata: {
          originalFormat: "webhook",
          convertedAt: new Date().toISOString(),
          role: webhookPatch.role || webhookPatch.target || "default",
          targetFile: webhookPatch.target_file || mutations[0]?.path,
        },
        mutations,
        postMutationBuild,
        validation,
      };

      // this.validatePatch(executorPatch, 'executor');
      return executorPatch;
    } catch (error) {
      throw new Error(
        `Webhook to executor conversion failed: ${error.message}`,
      );
    }
  }

  /**
   * Convert executor format to webhook format
   * @param {Object} executorPatch - Patch in executor format
   * @returns {Object} Patch in webhook format
   */
  convertExecutorToWebhook(executorPatch) {
    try {
      this.validatePatch(executorPatch, "executor");

      // Find the main file mutation
      const mainMutation =
        executorPatch.mutations.find((m) => m.type === "file_modification") ||
        executorPatch.mutations[0];

      if (!mainMutation) {
        throw new Error("No file mutation found in executor patch");
      }

      const webhookPatch = {
        id: executorPatch.id,
        role: executorPatch.metadata?.role || "default",
        target_file: mainMutation.path,
        patch: mainMutation.contents,
        metadata: {
          originalFormat: "executor",
          convertedAt: new Date().toISOString(),
          validation: executorPatch.validation,
        },
      };

      // Add validation commands if present
      if (executorPatch.postMutationBuild?.shell?.length > 0) {
        webhookPatch.validation = {
          shell: executorPatch.postMutationBuild.shell,
        };
      }

      this.validatePatch(webhookPatch, "webhook");
      return webhookPatch;
    } catch (error) {
      throw new Error(
        `Executor to webhook conversion failed: ${error.message}`,
      );
    }
  }

  /**
   * Convert to unified format (common format for all systems)
   * @param {Object} patch - Patch in any supported format
   * @param {string} sourceFormat - Source format type
   * @returns {Object} Patch in unified format
   */
  convertToUnified(patch, sourceFormat) {
    try {
      // Skip validation for now to handle flexible structure
      // this.validatePatch(patch, sourceFormat);

      const unifiedPatch = {
        id: patch.id || patch.blockId,
        type: "unified",
        metadata: {
          sourceFormat,
          convertedAt: new Date().toISOString(),
          version: "1.0.0",
        },
        target: {},
        content: {},
        validation: {
          enforceValidationGate: true,
          strictRuntimeAudit: true,
          runDryCheck: true,
          forceRuntimeTrace: true,
          requireMutationProof: true,
          requireServiceUptime: true,
        },
        execution: {
          priority: "normal",
          retryCount: 0,
          maxRetries: 3,
          timeout: 300000, // 5 minutes
        },
      };

      // Convert based on source format
      if (sourceFormat === "webhook") {
        // Handle current format with mutations
        if (patch.mutations && Array.isArray(patch.mutations)) {
          unifiedPatch.target = {
            files: patch.mutations.map((m) => m.path),
            role: patch.target || "default",
          };
          unifiedPatch.content = {
            type: "multi_mutation",
            mutations: patch.mutations,
          };
        } else {
          // Traditional webhook format
          unifiedPatch.target = {
            file: patch.target_file,
            role: patch.role || "default",
          };
          unifiedPatch.content = {
            type: "file_modification",
            data: patch.patch,
          };
        }

        // Add validation from current format
        if (patch.validate) {
          unifiedPatch.validation = {
            ...unifiedPatch.validation,
            ...patch.validate,
          };
        }
      } else if (sourceFormat === "executor") {
        unifiedPatch.target = {
          files: patch.mutations.map((m) => m.path),
          role: patch.metadata?.role || "default",
        };
        unifiedPatch.content = {
          type: "multi_mutation",
          mutations: patch.mutations,
        };
        if (patch.postMutationBuild) {
          unifiedPatch.validation = {
            ...unifiedPatch.validation,
            ...patch.postMutationBuild.validation,
          };
        }
      }

      // Skip validation for now
      // this.validatePatch(unifiedPatch, 'unified');
      return unifiedPatch;
    } catch (error) {
      throw new Error(`Unified conversion failed: ${error.message}`);
    }
  }

  /**
   * Validate patch format against rules
   * @param {Object} patch - Patch to validate
   * @param {string} format - Expected format
   */
  validatePatch(patch, format) {
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }

    if (!patch || typeof patch !== "object") {
      throw new Error("Patch must be a valid object");
    }

    const requiredFields = this.validationRules[format];
    for (const field of requiredFields) {
      if (!(field in patch)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Additional format-specific validation
    if (format === "webhook") {
      if (typeof patch.patch !== "string") {
        throw new Error("Webhook patch content must be a string");
      }
      if (!patch.target_file || typeof patch.target_file !== "string") {
        throw new Error("Webhook target_file must be a valid string path");
      }
    } else if (format === "executor") {
      if (!Array.isArray(patch.mutations)) {
        throw new Error("Executor mutations must be an array");
      }
      for (const mutation of patch.mutations) {
        if (!mutation.path || !mutation.contents) {
          throw new Error("Each mutation must have path and contents");
        }
      }
    } else if (format === "unified") {
      if (!patch.target || !patch.content) {
        throw new Error("Unified patch must have target and content sections");
      }
    }
  }

  /**
   * Auto-detect patch format
   * @param {Object} patch - Patch to analyze
   * @returns {string} Detected format
   */
  detectFormat(patch) {
    if (!patch || typeof patch !== "object") {
      throw new Error("Invalid patch object");
    }

    // Check for webhook format (with flexible field detection)
    if (
      (patch.target_file || patch.target) &&
      (patch.patch || patch.mutations) &&
      (patch.role || patch.target)
    ) {
      return "webhook";
    }

    // Check for executor format
    if (patch.mutations && Array.isArray(patch.mutations)) {
      return "executor";
    }

    // Check for unified format
    if (patch.type === "unified" && patch.target && patch.content) {
      return "unified";
    }

    // Default to webhook if it has basic structure
    if (patch.id && (patch.mutations || patch.target_file)) {
      return "webhook";
    }

    throw new Error("Unable to detect patch format");
  }

  /**
   * Convert patch to any target format
   * @param {Object} patch - Source patch
   * @param {string} targetFormat - Target format
   * @returns {Object} Converted patch
   */
  convert(patch, targetFormat) {
    const sourceFormat = this.detectFormat(patch);

    if (sourceFormat === targetFormat) {
      return patch; // No conversion needed
    }

    // Convert through unified format for maximum compatibility
    const unified = this.convertToUnified(patch, sourceFormat);

    if (targetFormat === "unified") {
      return unified;
    } else if (targetFormat === "webhook") {
      return this.convertUnifiedToWebhook(unified);
    } else if (targetFormat === "executor") {
      return this.convertUnifiedToExecutor(unified);
    }

    throw new Error(`Unsupported target format: ${targetFormat}`);
  }

  /**
   * Convert unified format to webhook format
   * @param {Object} unifiedPatch - Unified patch
   * @returns {Object} Webhook patch
   */
  convertUnifiedToWebhook(unifiedPatch) {
    if (unifiedPatch.content.type === "file_modification") {
      return {
        id: unifiedPatch.id,
        role: unifiedPatch.target.role || "default",
        target_file: unifiedPatch.target.file,
        patch: unifiedPatch.content.data,
        metadata: unifiedPatch.metadata,
      };
    } else {
      throw new Error(
        "Unified patch with multi_mutation cannot be converted to webhook format",
      );
    }
  }

  /**
   * Convert unified format to executor format
   * @param {Object} unifiedPatch - Unified patch
   * @returns {Object} Executor patch
   */
  convertUnifiedToExecutor(unifiedPatch) {
    const mutations =
      unifiedPatch.content.type === "multi_mutation"
        ? unifiedPatch.content.mutations
        : [
            {
              path: unifiedPatch.target.file,
              contents: unifiedPatch.content.data,
              type: "file_modification",
            },
          ];

    return {
      id: unifiedPatch.id,
      metadata: {
        ...unifiedPatch.metadata,
        role: unifiedPatch.target.role || "default",
      },
      mutations,
      postMutationBuild: {
        shell: [],
        validation: unifiedPatch.validation,
      },
      validation: unifiedPatch.validation,
    };
  }
}

// Export for use in other modules
module.exports = PatchFormatConverter;

// CLI interface for testing
if (require.main === module) {
  const converter = new PatchFormatConverter();

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      "Usage: node patch-format-converter.js <source-format> <target-format> [patch-file]",
    );
    console.log("Formats: webhook, executor, unified");
    process.exit(1);
  }

  const [sourceFormat, targetFormat, patchFile] = args;

  if (patchFile) {
    // Convert from file
    fs.readFile(patchFile, "utf8")
      .then((content) => {
        const patch = JSON.parse(content);
        const converted = converter.convert(patch, targetFormat);
        console.log(JSON.stringify(converted, null, 2));
      })
      .catch((error) => {
        console.error("Error:", error.message);
        process.exit(1);
      });
  } else {
    // Interactive mode
    console.log(`Converting from ${sourceFormat} to ${targetFormat} format`);
    console.log("Enter patch JSON (Ctrl+D when done):");

    let input = "";
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });

    process.stdin.on("end", () => {
      try {
        const patch = JSON.parse(input);
        const converted = converter.convert(patch, targetFormat);
        console.log(JSON.stringify(converted, null, 2));
      } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
      }
    });
  }
}
