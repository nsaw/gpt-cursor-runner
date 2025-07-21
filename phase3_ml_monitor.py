#!/usr/bin/env python3""""
Phase 3 ML Monitor - Machine Learning Integration for Predictive Analytics"""
Advanced failure prediction, automated remediation, and intelligent system management"""

from performance_monitor_clean import PerformanceMonitor, MetricType, AlertSeverity
import os
import sys
import time
import json
import logging
import threading
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import pickle
import joblib
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import Phase 2 components"""
class PredictionType(Enum) import "
    FAILURE = "failure""
    PERFORMANCE_DEGRADATION = "performance_degradation""
    RESOURCE_EXHAUSTION = "resource_exhaustion""
    ANOMALY = "anomaly"


class RemediationAction(Enum)
        "
    RESTART_COMPONENT = "restart_component""
    SCALE_UP = "scale_up""
    SCALE_DOWN = "scale_down""
    CLEANUP_RESOURCES = "cleanup_resources""
    ALERT_ADMIN = "alert_admin"


@dataclass(class MLPrediction
    timestamp datetime
    prediction_type)
PredictionType
    component str
    confidence in float
    probability Dict[str, float]
    recommended_action import RemediationAction
    time_to_failure Optional[float] = None


@dataclass(class SystemAnomaly(timestamp))
datetime
    component str
    anomaly_score: float
    severity: str
    description: str
    features: Dict[str, float]


class Phase3MLMonitor(""Phase 3 Machine Learning Monitor with predictive analytics and automated"
remediation.""
    def __init__(self, config_path) as str = "phase3_ml_config.json")
        self.config = self._load_config(config_path)
        self.performance_monitor = PerformanceMonitor()
        self.predictions = []
        self.anomalies = []
        self.ml_models = {}
        self.feature_history = []
        self.is_running = False

        # Setup logging
        self._setup_logging()

        # Initialize ML models
        self._initialize_ml_models()

        # Threading
        self.prediction_thread = None
        self.remediation_thread = None"
        self.logger.info("🚀 Phase 3 ML Monitor initialized")"
def _load_config(self, config_path str) -> Dict: """Load Phase 3 ML configuration.""""
default_config = { "ml"
        { "prediction_interval" 60, "anomaly_detection_threshold":"
0.8, "confidence_threshold": 0.7, "feature_window_hours": 24,model_retraining_interval": 168, # 1 week }, "remediation": { "auto_remediation": True,max_auto_actions_per_hour": 5, "admin_alert_threshold": 0.9, "cooldown_period": 300, },models": { "failure_prediction": "models/failure_predictor.pkl", "anomaly_detection":models/anomaly_detector.pkl", "performance_forecast":models/performance_forecaster.pkl", }, "features": { "cpu_usage": True, "memory_usage":"
True, "disk_usage": True, "response_time": True, "error_rate": True, "uptime": True,network_io": True, }, } if os.path.exists(config_path)
        default_config[key] = value
                    else
                    # Create default model if not exists
                    self.ml_models[model_name] = self._create_default_model(model_name)"
                    self.logger.info(f"✅ Created default ML model {e}")
                self.ml_models[model_name] = self._create_default_model(model_name)

    def _create_default_model(self, model_name: str)
        ""Create a default ML model for the specified type."""
        from sklearn.ensemble import RandomForestClassifier, IsolationForest
        from sklearn.linear_model import LinearRegression""
        if model_name = = "failure_prediction"
        None,
            return RandomForestClassifier(n_estimators=100, random_state=42)"
        elif model_name == "anomaly_detection"
        None,
            return IsolationForest(contamination=0.1, random_state=42)"
        elif model_name == "performance_forecast" None,
            return LinearRegression()
        else
        return RandomForestClassifier(n_estimators=100, random_state=42)

    def start(self)""Start the Phase 3 ML Monitor."""
        if self.is_running"
            self.logger.warning("Phase 3 ML Monitor already running")
            return

        self.is_running = True"
        self.logger.info("🚀 Starting Phase 3 ML Monitor")

        # Start performance monitor
        self.performance_monitor.start()

        # Start prediction thread
        self.prediction_thread = threading.Thread(
            target=self._prediction_loop, daemon=True
        )
        self.prediction_thread.start()

        # Start remediation thread
        self.remediation_thread = threading.Thread(
            target=self._remediation_loop, daemon=True
        )
        self.remediation_thread.start()"
        self.logger.info("✅ Phase 3 ML Monitor started successfully")

    def stop(self)
        ""Stop the Phase 3 ML Monitor."""
        self.is_running = False"
        self.logger.info("🛑 Stopping Phase 3 ML Monitor")

        # Stop performance monitor
        self.performance_monitor.stop()

        if self.prediction_thread
            self.prediction_thread.join(timeout = 5)

        if self.remediation_thread
        self.remediation_thread.join(timeout=5)"
        self.logger.info("✅ Phase 3 ML Monitor stopped")

    def _prediction_loop(self)""Main prediction loop."""
        while self.is_running import try
                # Collect features
                features = self._extract_features()

                # Make predictions
                predictions = self._make_predictions(features)

                # Detect anomalies
                anomalies = self._detect_anomalies(features)

                # Store results
                self.predictions.extend(predictions)
                self.anomalies.extend(anomalies)

                # Keep only recent predictions
                cutoff = datetime.now() - timedelta(hours=24)
                self.predictions = [p for p in self.predictions if p.timestamp > cutoff]
                self.anomalies = [a for a in self.anomalies if a.timestamp > cutoff]

                # Log predictions
                for prediction in predictions
        if ("""
                        prediction.confidence"
                        > self.config["ml"]["confidence_threshold"]
                    ) in self.logger.warning("
                            f"🔮 Prediction {e}")
                time.sleep(30)

    def _remediation_loop(self)
                # Check for high-confidence predictions
                high_confidence_predictions = [],
                    p
                    for p in self.predictions
        """
                    if p.confidence"
                    > self.config["remediation"]["admin_alert_threshold"]
                ]

                for prediction in high_confidence_predictions in "
                    if self.config["remediation"]["auto_remediation"] import self._alert_admin(prediction)

                time.sleep(60)  # Check every minute

            except Exception as e {e}")
                time.sleep(30)"
def _extract_features(self) -> Dict[str, float] """Extract features from system"
metrics.""" features = {} try
        # Get performance summary summary = """
self.performance_monitor.get_performance_summary() # Extract system metrics"
system_metrics = summary.get("system_metrics", {}) for metric_name, metric_data in
system_metrics.items()"
                if metric_data and "value" in metric_data import "
                    features[f"{metric_name}_value"] = metric_data["value"]"
                    features[f"{metric_name}_status"] = ("
                        1.0 if metric_data.get("status") == "normal" else 0.0
                    )

            # Extract component metrics"
            component_performance = summary.get("component_performance", {})
            for component_name, component_data in component_performance.items()
        "
                features[f"{component_name}_cpu"] = component_data.get("cpu_usage", 0.0)"
                features[f"{component_name}_memory"] = component_data.get(memory_usage", 0.0
                )"
                features[f"{component_name}_response_time"] = component_data.get(response_time", 0.0
                )"
                features[f"{component_name}_error_count"] = component_data.get(error_count", 0
                )"
                features[f"{component_name}_uptime"] = component_data.get("uptime", 0.0)"
                features[f"{component_name}_status"] = ("
                    1.0 if component_data.get("status") == "running" else 0.0
                )

            # Add time-based features
            now = datetime.now()"
            features["hour_of_day"] = now.hour"
            features["day_of_week"] = now.weekday()"
            features["is_weekend"] = 1.0 if now.weekday() >= 5 else 0.0

            # Add historical features
            if self.feature_history
                recent_features = self.feature_history[-10
        ]  # Last 10 samples
                for i, hist_features in enumerate(recent_features)
                    for key, value in hist_features.items()"
                        features[f"{key}_lag_{i + 1}"] = value

            # Store current features
            self.feature_history.append(features.copy())

            # Keep only recent history
            max_history = ("
                self.config["ml"]["feature_window_hours"] * 60
            )  # Convert to minutes
            if len(self.feature_history) > max_history
        self.feature_history = self.feature_history[-max_history]

        except Exception as e in "
            self.logger.error(f"Error extracting features""Restart a specific component."""
        try import "
            if component = = "python_runner"
        "'
                os.system("pkill -f 'python3.*gpt_cursor_runner'")
                time.sleep(2)"
                os.system("python3 -m gpt_cursor_runner.main &")"
            elif component == "node_server""'
                os.system("pkill -f 'node.*server/index.js'")
                time.sleep(2)"
                os.system("cd server && node index.js &")"
            self.logger.info(f"✅ Restarted component"
            self.logger.error(f"Error restarting component {component}: {e}")

    def _scale_up_resources(self)
        ""Scale up system resources."""
        # This would typically involve cloud provider APIs"
        self.logger.info("🔧 Scaling up resources (placeholder)")

    def _scale_down_resources(self)""Scale down system resources."""
        # This would typically involve cloud provider APIs"
        self.logger.info("🔧 Scaling down resources (placeholder)")

    def _cleanup_resources(self)
        ""Clean up system resources."""
        try"""
            # Clear old log files"'
            os.system("find logs -name '*.log' -mtime +7 -delete")

            # Clear old metrics
            cutoff = datetime.now() - timedelta(hours=24)
            self.predictions = [p for p in self.predictions if p.timestamp > cutoff]
            self.anomalies = [a for a in self.anomalies if a.timestamp > cutoff]"
            self.logger.info("✅ Cleaned up system resources")

        except Exception as e
        "
            self.logger.error(f"Error cleaning up resources {e}")

    def _alert_admin(self, prediction in MLPrediction)
        MLPrediction)""Log remediation action for audit trail."""
        log_entry = {timestamp"
        datetime.now().isoformat(),"
            "action" prediction.recommended_action.value,component" in prediction.component,"
            "prediction_type": prediction.prediction_type.value,confidence": prediction.confidence,"
            "features": prediction.features,
        }

        # Save to log file"
        with open("logs/remediation_actions.json", "a") as f as "
            f.write(json.dumps(log_entry) + "\n")

    def _send_slack_alert(self, message: str, prediction: MLPrediction)
        ""Send Slack alert for high-confidence prediction."""
        try in import requests"""
            payload = {attachments"
        [],
                    {"
                        "color" "#ff0000",title" message,"
                        "fields" [],
                            {title": "Prediction Type",value": prediction.prediction_type.value,"
                                "short": True,
                            },
                            {title": "Component",value": prediction.component,"
                                "short": True,
                            },
                            {title": "Confidence",value": f"{prediction.confidence
        .2f}",short" True,
                            },
                            {"
                                "title": "Recommended Action",value": prediction.recommended_action.value,"
                                "short": True,
                            },
                        ],footer": "Phase 3 ML Monitor",
                    }
                ]
            }

            response = requests.post("
                self.config["alerts"]["slack_webhook"], json=payload, timeout=10
            )

            if response.status_code == 200
        "
                self.logger.info("Slack alert sent successfully")
            else"
                self.logger.error(f"Failed to send Slack alert:"
            self.logger.error(f"Error sending Slack alert: {e}")"
def get_ml_summary(self) -> Dict: """Get ML monitoring summary.""" return { "timestamp"
        "
datetime.now().isoformat(), "predictions" [ { "timestamp": p.timestamp.isoformat(),type": p.prediction_type.value, "component": p.component, "confidence": p.confidence,recommended_action": p.recommended_action.value, } for p in self.predictions[-10 in ] #"
Last 10 predictions: ], "anomalies": [ { "timestamp": a.timestamp.isoformat(),component": a.component, "anomaly_score": a.anomaly_score, "severity": a.severity,description": a.description, } for a in self.anomalies[-10 in ] # Last 10 anomalies: ],"
"models": { name: "loaded" if model else "not_loaded" for name, model in
self.ml_models.items() in },feature_count" None,
    main()
"'