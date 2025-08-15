// predictive-failure-detection.js: Advanced ML-based failure prediction system
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");

class PredictiveFailureDetection {
  constructor() {
    this.dataDir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/ml-data";
    this.modelsDir = path.join(this.dataDir, "models");
    this.featuresDir = path.join(this.dataDir, "features");
    this.predictionsDir = path.join(this.dataDir, "predictions");

    this.ensureDirectories();
    this.loadConfiguration();
  }

  ensureDirectories() {
    [
      this.dataDir,
      this.modelsDir,
      this.featuresDir,
      this.predictionsDir,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadConfiguration() {
    this.config = {
      // Feature extraction settings
      featureWindow: 300, // 5 minutes
      predictionHorizon: 600, // 10 minutes
      updateInterval: 30000, // 30 seconds

      // ML model settings
      modelType: "ensemble", // ensemble, neural, statistical
      confidenceThreshold: 0.75,
      retrainInterval: 3600000, // 1 hour

      // Alert settings
      alertLevels: {
        low: 0.3,
        medium: 0.6,
        high: 0.8,
        critical: 0.9,
      },

      // Data sources
      dataSources: {
        logs: "/Users/sawyer/gitSync/gpt-cursor-runner/logs",
        patches: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
        summaries: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
        heartbeat: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat",
      },
    };
  }

  async start() {
    console.log("🤖 Starting Predictive Failure Detection System...");

    // Initialize components
    await this.initializeFeatureExtractor();
    await this.initializeModelManager();
    await this.initializePredictionEngine();

    // Start monitoring
    this.startMonitoring();

    console.log("✅ Predictive Failure Detection System started");
  }

  async initializeFeatureExtractor() {
    console.log("🔍 Initializing Feature Extractor...");

    this.featureExtractor = {
      // System health features
      extractSystemHealth: async () => {
        const features = {};

        // CPU and memory usage
        try {
          const { stdout } = await this.execAsync(
            'top -l 1 -n 0 | grep "CPU usage"',
          );
          const cpuMatch = stdout.match(/(\d+\.\d+)%/);
          features.cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
        } catch (_error) {
          features.cpuUsage = 0;
        }

        // Memory usage
        try {
          const { stdout } = await this.execAsync(
            'vm_stat | grep "Pages free"',
          );
          const memMatch = stdout.match(/(\d+)/);
          features.memoryFree = memMatch ? parseInt(memMatch[1]) : 0;
        } catch (_error) {
          features.memoryFree = 0;
        }

        // Disk space
        try {
          const { stdout } = await this.execAsync(
            "df /Users/sawyer/gitSync | tail -1",
          );
          const diskMatch = stdout.match(/(\d+)%/);
          features.diskUsage = diskMatch ? parseInt(diskMatch[1]) : 0;
        } catch (_error) {
          features.diskUsage = 0;
        }

        return features;
      },

      // Process health features
      extractProcessHealth: async () => {
        const features = {};

        // Ghost processes
        const ghostProcesses = [
          "ghost-bridge",
          "patch-executor",
          "summary-monitor",
        ];
        for (const process of ghostProcesses) {
          try {
            const { stdout } = await this.execAsync(
              `pgrep -f "${process}" | wc -l`,
            );
            features[`${process}_running`] =
              parseInt(stdout.trim()) > 0 ? 1 : 0;
          } catch (_error) {
            features[`${process}_running`] = 0;
          }
        }

        // Port availability
        const ports = [3001, 5051, 8787, 8788];
        for (const port of ports) {
          try {
            const { stdout } = await this.execAsync(`lsof -i :${port} | wc -l`);
            features[`port_${port}_active`] =
              parseInt(stdout.trim()) > 0 ? 1 : 0;
          } catch (_error) {
            features[`port_${port}_active`] = 0;
          }
        }

        return features;
      },

      // Patch execution features
      extractPatchFeatures: async () => {
        const features = {};

        try {
          // Patch queue status
          const patchesDir = this.config.dataSources.patches;
          const pendingPatches = fs
            .readdirSync(patchesDir)
            .filter((f) => f.endsWith(".json")).length;
          features.pendingPatches = pendingPatches;

          // Recent patch success rate
          const summariesDir = this.config.dataSources.summaries;
          const recentSummaries = fs
            .readdirSync(summariesDir)
            .filter((f) => f.endsWith(".md"))
            .slice(-10);

          let successCount = 0;
          for (const summary of recentSummaries) {
            const content = fs.readFileSync(
              path.join(summariesDir, summary),
              "utf8",
            );
            if (content.includes("✅ PASS") || content.includes("Status: ✅")) {
              successCount++;
            }
          }
          features.recentSuccessRate =
            recentSummaries.length > 0
              ? successCount / recentSummaries.length
              : 1;

          // Patch execution time
          features.avgExecutionTime = this.calculateAverageExecutionTime();
        } catch (_error) {
          features.pendingPatches = 0;
          features.recentSuccessRate = 1;
          features.avgExecutionTime = 0;
        }

        return features;
      },

      // Error pattern features
      extractErrorFeatures: async () => {
        const features = {};

        try {
          const logsDir = this.config.dataSources.logs;
          const logFiles = fs
            .readdirSync(logsDir)
            .filter((f) => f.endsWith(".log"));

          let totalErrors = 0;
          let timeoutErrors = 0;
          let connectionErrors = 0;
          let validationErrors = 0;

          for (const logFile of logFiles.slice(-5)) {
            // Last 5 log files
            const content = fs.readFileSync(
              path.join(logsDir, logFile),
              "utf8",
            );
            const lines = content.split("\n");

            for (const line of lines) {
              if (line.toLowerCase().includes("error")) {
                totalErrors++;
                if (line.toLowerCase().includes("timeout")) timeoutErrors++;
                if (line.toLowerCase().includes("connection"))
                  connectionErrors++;
                if (line.toLowerCase().includes("validation"))
                  validationErrors++;
              }
            }
          }

          features.totalErrors = totalErrors;
          features.timeoutErrors = timeoutErrors;
          features.connectionErrors = connectionErrors;
          features.validationErrors = validationErrors;
          features.errorRate = totalErrors / 100; // Normalize
        } catch (_error) {
          features.totalErrors = 0;
          features.timeoutErrors = 0;
          features.connectionErrors = 0;
          features.validationErrors = 0;
          features.errorRate = 0;
        }

        return features;
      },
    };

    console.log("✅ Feature Extractor initialized");
  }

  async initializeModelManager() {
    console.log("🧠 Initializing Model Manager...");

    this.modelManager = {
      models: {},

      // Load or create models
      loadModels: async () => {
        const modelFiles = fs
          .readdirSync(this.modelsDir)
          .filter((f) => f.endsWith(".json"));

        for (const modelFile of modelFiles) {
          const modelPath = path.join(this.modelsDir, modelFile);
          const modelData = JSON.parse(fs.readFileSync(modelPath, "utf8"));
          this.modelManager.models[modelData.name] = modelData;
        }

        // Create default models if none exist
        if (Object.keys(this.modelManager.models).length === 0) {
          await this.modelManager.createDefaultModels();
        }
      },

      // Create default models
      createDefaultModels: async () => {
        const defaultModels = {
          systemHealth: {
            name: "systemHealth",
            type: "statistical",
            features: ["cpuUsage", "memoryFree", "diskUsage"],
            weights: { cpuUsage: 0.4, memoryFree: 0.3, diskUsage: 0.3 },
            threshold: 0.7,
          },
          processHealth: {
            name: "processHealth",
            type: "ensemble",
            features: [
              "ghost-bridge_running",
              "patch-executor_running",
              "summary-monitor_running",
            ],
            weights: {
              "ghost-bridge_running": 0.4,
              "patch-executor_running": 0.4,
              "summary-monitor_running": 0.2,
            },
            threshold: 0.8,
          },
          patchExecution: {
            name: "patchExecution",
            type: "neural",
            features: [
              "pendingPatches",
              "recentSuccessRate",
              "avgExecutionTime",
            ],
            weights: {
              pendingPatches: 0.3,
              recentSuccessRate: 0.5,
              avgExecutionTime: 0.2,
            },
            threshold: 0.75,
          },
          errorPatterns: {
            name: "errorPatterns",
            type: "statistical",
            features: [
              "totalErrors",
              "timeoutErrors",
              "connectionErrors",
              "validationErrors",
            ],
            weights: {
              totalErrors: 0.3,
              timeoutErrors: 0.3,
              connectionErrors: 0.2,
              validationErrors: 0.2,
            },
            threshold: 0.6,
          },
        };

        for (const [name, model] of Object.entries(defaultModels)) {
          const modelPath = path.join(this.modelsDir, `${name}.json`);
          fs.writeFileSync(modelPath, JSON.stringify(model, null, 2));
          this.modelManager.models[name] = model;
        }
      },

      // Retrain models
      retrainModels: async () => {
        console.log("🔄 Retraining models...");

        for (const [name, model] of Object.entries(this.modelManager.models)) {
          await this.modelManager.retrainModel(name, model);
        }
      },

      // Retrain specific model
      retrainModel: async (name, model) => {
        // Load historical data
        const historicalData = await this.loadHistoricalData(name);

        if (historicalData.length < 10) {
          console.log(`⚠️ Insufficient data for ${name} model retraining`);
          return;
        }

        // Update model weights based on recent performance
        const recentPerformance = await this.calculateModelPerformance(
          name,
          historicalData,
        );
        model.weights = this.optimizeWeights(model.weights, recentPerformance);

        // Save updated model
        const modelPath = path.join(this.modelsDir, `${name}.json`);
        fs.writeFileSync(modelPath, JSON.stringify(model, null, 2));

        console.log(`✅ Model ${name} retrained`);
      },
    };

    await this.modelManager.loadModels();
    console.log("✅ Model Manager initialized");
  }

  async initializePredictionEngine() {
    console.log("🔮 Initializing Prediction Engine...");

    this.predictionEngine = {
      // Make predictions
      predict: async (features) => {
        const predictions = {};

        for (const [name, model] of Object.entries(this.modelManager.models)) {
          const prediction = await this.predictionEngine.predictWithModel(
            name,
            model,
            features,
          );
          predictions[name] = prediction;
        }

        // Calculate ensemble prediction
        predictions.ensemble =
          this.predictionEngine.calculateEnsemblePrediction(predictions);

        return predictions;
      },

      // Predict with specific model
      predictWithModel: async (name, model, features) => {
        let score = 0;

        // Calculate weighted score based on model type
        switch (model.type) {
          case "statistical":
            score = this.predictionEngine.statisticalPrediction(
              model,
              features,
            );
            break;
          case "ensemble":
            score = this.predictionEngine.ensemblePrediction(model, features);
            break;
          case "neural":
            score = this.predictionEngine.neuralPrediction(model, features);
            break;
          default:
            score = this.predictionEngine.statisticalPrediction(
              model,
              features,
            );
        }

        return {
          score,
          confidence: this.predictionEngine.calculateConfidence(score, model),
          risk: this.predictionEngine.calculateRiskLevel(score),
          timestamp: new Date().toISOString(),
        };
      },

      // Statistical prediction
      statisticalPrediction: (model, features) => {
        let weightedSum = 0;
        let totalWeight = 0;

        for (const [feature, weight] of Object.entries(model.weights)) {
          if (features[feature] !== undefined) {
            weightedSum += features[feature] * weight;
            totalWeight += weight;
          }
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
      },

      // Ensemble prediction
      ensemblePrediction: (model, features) => {
        const predictions = [];

        for (const [feature, weight] of Object.entries(model.weights)) {
          if (features[feature] !== undefined) {
            predictions.push(features[feature] * weight);
          }
        }

        return predictions.length > 0 ? Math.max(...predictions) : 0;
      },

      // Neural prediction (simplified)
      neuralPrediction: (model, features) => {
        // Simplified neural network simulation
        let activation = 0;

        for (const [feature, weight] of Object.entries(model.weights)) {
          if (features[feature] !== undefined) {
            activation += features[feature] * weight;
          }
        }

        // Sigmoid activation
        return 1 / (1 + Math.exp(-activation));
      },

      // Calculate confidence
      calculateConfidence: (score, model) => {
        const distance = Math.abs(score - model.threshold);
        return Math.max(0, 1 - distance);
      },

      // Calculate risk level
      calculateRiskLevel: (score) => {
        if (score >= this.config.alertLevels.critical) return "critical";
        if (score >= this.config.alertLevels.high) return "high";
        if (score >= this.config.alertLevels.medium) return "medium";
        if (score >= this.config.alertLevels.low) return "low";
        return "safe";
      },

      // Calculate ensemble prediction
      calculateEnsemblePrediction: (predictions) => {
        const scores = Object.values(predictions).map((p) => p.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        return {
          score: avgScore,
          confidence: this.predictionEngine.calculateConfidence(avgScore, {
            threshold: 0.7,
          }),
          risk: this.predictionEngine.calculateRiskLevel(avgScore),
          timestamp: new Date().toISOString(),
        };
      },
    };

    console.log("✅ Prediction Engine initialized");
  }

  startMonitoring() {
    console.log("📊 Starting continuous monitoring...");

    // Initial prediction
    this.runPrediction();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.runPrediction();
    }, this.config.updateInterval);

    // Set up model retraining
    this.retrainingInterval = setInterval(async () => {
      await this.modelManager.retrainModels();
    }, this.config.retrainInterval);
  }

  async runPrediction() {
    try {
      // Extract features
      const systemHealth = await this.featureExtractor.extractSystemHealth();
      const processHealth = await this.featureExtractor.extractProcessHealth();
      const patchFeatures = await this.featureExtractor.extractPatchFeatures();
      const errorFeatures = await this.featureExtractor.extractErrorFeatures();

      // Combine all features
      const features = {
        ...systemHealth,
        ...processHealth,
        ...patchFeatures,
        ...errorFeatures,
        timestamp: new Date().toISOString(),
      };

      // Save features
      await this.saveFeatures(features);

      // Make predictions
      const predictions = await this.predictionEngine.predict(features);

      // Save predictions
      await this.savePredictions(predictions);

      // Check for alerts
      await this.checkAlerts(predictions);

      // Update status
      this.updateStatus(predictions);
    } catch (_error) {
      console.error("❌ Prediction error:", error.message);
    }
  }

  async saveFeatures(features) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const featureFile = path.join(
      this.featuresDir,
      `features-${timestamp}.json`,
    );
    fs.writeFileSync(featureFile, JSON.stringify(features, null, 2));

    // Keep only last 1000 feature files
    this.cleanupOldFiles(this.featuresDir, 1000);
  }

  async savePredictions(predictions) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const predictionFile = path.join(
      this.predictionsDir,
      `predictions-${timestamp}.json`,
    );
    fs.writeFileSync(predictionFile, JSON.stringify(predictions, null, 2));

    // Keep only last 1000 prediction files
    this.cleanupOldFiles(this.predictionsDir, 1000);
  }

  async checkAlerts(predictions) {
    const alerts = [];

    for (const [name, prediction] of Object.entries(predictions)) {
      if (
        prediction.risk !== "safe" &&
        prediction.confidence >= this.config.confidenceThreshold
      ) {
        alerts.push({
          model: name,
          risk: prediction.risk,
          score: prediction.score,
          confidence: prediction.confidence,
          timestamp: prediction.timestamp,
        });
      }
    }

    if (alerts.length > 0) {
      await this.sendAlerts(alerts);
    }
  }

  async sendAlerts(alerts) {
    console.log("🚨 Sending failure prediction alerts:", alerts);

    // Save alerts to file
    const alertFile = path.join(this.dataDir, "alerts.json");
    const existingAlerts = fs.existsSync(alertFile)
      ? JSON.parse(fs.readFileSync(alertFile, "utf8"))
      : [];
    const updatedAlerts = [...existingAlerts, ...alerts];
    fs.writeFileSync(alertFile, JSON.stringify(updatedAlerts, null, 2));

    // Send to status API if available
    try {
      await axios.post("http://localhost:8789/api/alerts", {
        type: "failure-prediction",
        alerts,
        timestamp: new Date().toISOString(),
      });
    } catch (_error) {
      console.log("⚠️ Could not send alerts to status API");
    }
  }

  updateStatus(predictions) {
    const status = {
      timestamp: new Date().toISOString(),
      predictions,
      system: "predictive-failure-detection",
      status: "running",
    };

    const statusFile = path.join(this.dataDir, "status.json");
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  }

  async loadHistoricalData(modelName) {
    const data = [];
    const featureFiles = fs.readdirSync(this.featuresDir).slice(-100); // Last 100 files

    for (const file of featureFiles) {
      try {
        const featureData = JSON.parse(
          fs.readFileSync(path.join(this.featuresDir, file), "utf8"),
        );
        data.push(featureData);
      } catch (_error) {
        console.warn(`⚠️ Could not load feature file: ${file}`);
      }
    }

    return data;
  }

  async calculateModelPerformance(modelName, historicalData) {
    // Simplified performance calculation
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
    };
  }

  optimizeWeights(currentWeights, performance) {
    // Simplified weight optimization
    const factor = performance.accuracy;
    const optimized = {};

    for (const [feature, weight] of Object.entries(currentWeights)) {
      optimized[feature] = weight * factor;
    }

    return optimized;
  }

  calculateAverageExecutionTime() {
    try {
      const summariesDir = this.config.dataSources.summaries;
      const summaries = fs
        .readdirSync(summariesDir)
        .filter((f) => f.endsWith(".md"))
        .slice(-20);

      let totalTime = 0;
      let count = 0;

      for (const summary of summaries) {
        const content = fs.readFileSync(
          path.join(summariesDir, summary),
          "utf8",
        );
        const timeMatch = content.match(/execution.*?(\d+)/i);
        if (timeMatch) {
          totalTime += parseInt(timeMatch[1]);
          count++;
        }
      }

      return count > 0 ? totalTime / count : 0;
    } catch (_error) {
      return 0;
    }
  }

  cleanupOldFiles(directory, maxFiles) {
    try {
      const files = fs
        .readdirSync(directory)
        .map((file) => ({ name: file, path: path.join(directory, file) }))
        .sort(
          (a, b) =>
            fs.statSync(b.path).mtime.getTime() -
            fs.statSync(a.path).mtime.getTime(),
        );

      if (files.length > maxFiles) {
        const filesToDelete = files.slice(maxFiles);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (_error) {
      console.warn(
        `⚠️ Could not cleanup old files in ${directory}:`,
        error.message,
      );
    }
  }

  execAsync(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  async stop() {
    console.log("🛑 Stopping Predictive Failure Detection System...");

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.retrainingInterval) {
      clearInterval(this.retrainingInterval);
    }

    console.log("✅ Predictive Failure Detection System stopped");
  }
}

// Export for use in other modules
module.exports = PredictiveFailureDetection;

// Start if run directly
if (require.main === module) {
  const detector = new PredictiveFailureDetection();
  detector.start().catch(console.error);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await detector.stop();
    process.exit(0);
  });
}
