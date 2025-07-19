#!/usr/bin/env python3
"""
Phase 3 ML Monitor - Machine Learning Integration for Predictive Analytics
Advanced failure prediction, automated remediation, and intelligent system management
"""

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

# Import Phase 2 components


class PredictionType(Enum):
    FAILURE = "failure"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    ANOMALY = "anomaly"


class RemediationAction(Enum):
    RESTART_COMPONENT = "restart_component"
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    CLEANUP_RESOURCES = "cleanup_resources"
    ALERT_ADMIN = "alert_admin"


@dataclass
class MLPrediction:
    timestamp: datetime
    prediction_type: PredictionType
    component: str
    confidence: float
    probability: float
    features: Dict[str, float]
    recommended_action: RemediationAction
    time_to_failure: Optional[float] = None


@dataclass
class SystemAnomaly:
    timestamp: datetime
    component: str
    anomaly_score: float
    severity: str
    description: str
    features: Dict[str, float]


class Phase3MLMonitor:
    """Phase 3 Machine Learning Monitor with predictive analytics and automated remediation."""

    def __init__(self, config_path: str = "phase3_ml_config.json"):
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
        self.remediation_thread = None

        self.logger.info("🚀 Phase 3 ML Monitor initialized")

    def _load_config(self, config_path: str) -> Dict:
        """Load Phase 3 ML configuration."""
        default_config = {
            "ml": {
                "prediction_interval": 60,
                "anomaly_detection_threshold": 0.8,
                "confidence_threshold": 0.7,
                "feature_window_hours": 24,
                "model_retraining_interval": 168,  # 1 week
            },
            "remediation": {
                "auto_remediation": True,
                "max_auto_actions_per_hour": 5,
                "admin_alert_threshold": 0.9,
                "cooldown_period": 300,
            },
            "models": {
                "failure_prediction": "models/failure_predictor.pkl",
                "anomaly_detection": "models/anomaly_detector.pkl",
                "performance_forecast": "models/performance_forecaster.pkl",
            },
            "features": {
                "cpu_usage": True,
                "memory_usage": True,
                "disk_usage": True,
                "response_time": True,
                "error_rate": True,
                "uptime": True,
                "network_io": True,
            },
        }

        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                user_config = json.load(f)
                # Merge with defaults
                for key, value in user_config.items():
                    if key in default_config:
                        if isinstance(value, dict):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value
                    else:
                        default_config[key] = value

        return default_config

    def _setup_logging(self):
        """Setup structured logging."""
        log_dir = "logs"
        os.makedirs(log_dir, exist_ok=True)

        self.logger = logging.getLogger("Phase3MLMonitor")
        self.logger.setLevel(logging.INFO)

        # File handler
        fh = logging.FileHandler(f"{log_dir}/phase3_ml_monitor.log")
        fh.setLevel(logging.INFO)

        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)

        self.logger.addHandler(fh)
        self.logger.addHandler(ch)

    def _initialize_ml_models(self):
        """Initialize machine learning models."""
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)

        # Initialize or load models
        for model_name, model_path in self.config["models"].items():
            try:
                if os.path.exists(model_path):
                    self.ml_models[model_name] = joblib.load(model_path)
                    self.logger.info(f"✅ Loaded ML model: {model_name}")
                else:
                    # Create default model if not exists
                    self.ml_models[model_name] = self._create_default_model(model_name)
                    self.logger.info(f"✅ Created default ML model: {model_name}")
            except Exception as e:
                self.logger.error(f"❌ Error loading ML model {model_name}: {e}")
                self.ml_models[model_name] = self._create_default_model(model_name)

    def _create_default_model(self, model_name: str):
        """Create a default ML model for the specified type."""
        from sklearn.ensemble import RandomForestClassifier, IsolationForest
        from sklearn.linear_model import LinearRegression

        if model_name == "failure_prediction":
            return RandomForestClassifier(n_estimators=100, random_state=42)
        elif model_name == "anomaly_detection":
            return IsolationForest(contamination=0.1, random_state=42)
        elif model_name == "performance_forecast":
            return LinearRegression()
        else:
            return RandomForestClassifier(n_estimators=100, random_state=42)

    def start(self):
        """Start the Phase 3 ML Monitor."""
        if self.is_running:
            self.logger.warning("Phase 3 ML Monitor already running")
            return

        self.is_running = True
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
        self.remediation_thread.start()

        self.logger.info("✅ Phase 3 ML Monitor started successfully")

    def stop(self):
        """Stop the Phase 3 ML Monitor."""
        self.is_running = False
        self.logger.info("🛑 Stopping Phase 3 ML Monitor")

        # Stop performance monitor
        self.performance_monitor.stop()

        if self.prediction_thread:
            self.prediction_thread.join(timeout=5)

        if self.remediation_thread:
            self.remediation_thread.join(timeout=5)

        self.logger.info("✅ Phase 3 ML Monitor stopped")

    def _prediction_loop(self):
        """Main prediction loop."""
        while self.is_running:
            try:
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
                for prediction in predictions:
                    if (
                        prediction.confidence
                        > self.config["ml"]["confidence_threshold"]
                    ):
                        self.logger.warning(
                            f"🔮 Prediction: {prediction.prediction_type.value} "
                            f"for {prediction.component} "
                            f"(confidence: {prediction.confidence:.2f})"
                        )

                time.sleep(self.config["ml"]["prediction_interval"])

            except Exception as e:
                self.logger.error(f"Error in prediction loop: {e}")
                time.sleep(30)

    def _remediation_loop(self):
        """Automated remediation loop."""
        while self.is_running:
            try:
                # Check for high-confidence predictions
                high_confidence_predictions = [
                    p
                    for p in self.predictions
                    if p.confidence
                    > self.config["remediation"]["admin_alert_threshold"]
                ]

                for prediction in high_confidence_predictions:
                    if self.config["remediation"]["auto_remediation"]:
                        self._execute_remediation(prediction)
                    else:
                        self._alert_admin(prediction)

                time.sleep(60)  # Check every minute

            except Exception as e:
                self.logger.error(f"Error in remediation loop: {e}")
                time.sleep(30)

    def _extract_features(self) -> Dict[str, float]:
        """Extract features from system metrics."""
        features = {}

        try:
            # Get performance summary
            summary = self.performance_monitor.get_performance_summary()

            # Extract system metrics
            system_metrics = summary.get("system_metrics", {})
            for metric_name, metric_data in system_metrics.items():
                if metric_data and "value" in metric_data:
                    features[f"{metric_name}_value"] = metric_data["value"]
                    features[f"{metric_name}_status"] = (
                        1.0 if metric_data.get("status") == "normal" else 0.0
                    )

            # Extract component metrics
            component_performance = summary.get("component_performance", {})
            for component_name, component_data in component_performance.items():
                features[f"{component_name}_cpu"] = component_data.get("cpu_usage", 0.0)
                features[f"{component_name}_memory"] = component_data.get(
                    "memory_usage", 0.0
                )
                features[f"{component_name}_response_time"] = component_data.get(
                    "response_time", 0.0
                )
                features[f"{component_name}_error_count"] = component_data.get(
                    "error_count", 0
                )
                features[f"{component_name}_uptime"] = component_data.get("uptime", 0.0)
                features[f"{component_name}_status"] = (
                    1.0 if component_data.get("status") == "running" else 0.0
                )

            # Add time-based features
            now = datetime.now()
            features["hour_of_day"] = now.hour
            features["day_of_week"] = now.weekday()
            features["is_weekend"] = 1.0 if now.weekday() >= 5 else 0.0

            # Add historical features
            if self.feature_history:
                recent_features = self.feature_history[-10:]  # Last 10 samples
                for i, hist_features in enumerate(recent_features):
                    for key, value in hist_features.items():
                        features[f"{key}_lag_{i + 1}"] = value

            # Store current features
            self.feature_history.append(features.copy())

            # Keep only recent history
            max_history = (
                self.config["ml"]["feature_window_hours"] * 60
            )  # Convert to minutes
            if len(self.feature_history) > max_history:
                self.feature_history = self.feature_history[-max_history:]

        except Exception as e:
            self.logger.error(f"Error extracting features: {e}")
            features = {"error": 1.0}

        return features

    def _make_predictions(self, features: Dict[str, float]) -> List[MLPrediction]:
        """Make predictions using ML models."""
        predictions = []

        try:
            # Prepare feature vector
            feature_vector = self._prepare_feature_vector(features)

            # Failure prediction
            if "failure_prediction" in self.ml_models:
                model = self.ml_models["failure_prediction"]
                if hasattr(model, 'predict_proba'):
                    proba = model.predict_proba([feature_vector])[0]
                    confidence = max(proba)
                    prediction_type = PredictionType.FAILURE

                    if confidence > self.config["ml"]["confidence_threshold"]:
                        prediction = MLPrediction(
                            timestamp=datetime.now(),
                            prediction_type=prediction_type,
                            component="system",
                            confidence=confidence,
                            probability=proba[1] if len(proba) > 1 else confidence,
                            features=features,
                            recommended_action=RemediationAction.RESTART_COMPONENT,
                        )
                        predictions.append(prediction)

            # Performance forecast
            if "performance_forecast" in self.ml_models:
                model = self.ml_models["performance_forecast"]
                if hasattr(model, 'predict'):
                    forecast = model.predict([feature_vector])[0]

                    if forecast > 80.0:  # High resource usage predicted
                        prediction = MLPrediction(
                            timestamp=datetime.now(),
                            prediction_type=PredictionType.PERFORMANCE_DEGRADATION,
                            component="system",
                            confidence=0.8,
                            probability=forecast / 100.0,
                            features=features,
                            recommended_action=RemediationAction.SCALE_UP,
                            time_to_failure=24.0,  # 24 hours
                        )
                        predictions.append(prediction)

        except Exception as e:
            self.logger.error(f"Error making predictions: {e}")

        return predictions

    def _detect_anomalies(self, features: Dict[str, float]) -> List[SystemAnomaly]:
        """Detect anomalies using ML models."""
        anomalies = []

        try:
            # Prepare feature vector
            feature_vector = self._prepare_feature_vector(features)

            # Anomaly detection
            if "anomaly_detection" in self.ml_models:
                model = self.ml_models["anomaly_detection"]
                if hasattr(model, 'predict'):
                    # Isolation Forest returns -1 for anomalies, 1 for normal
                    prediction = model.predict([feature_vector])[0]

                    if prediction == -1:  # Anomaly detected
                        # Calculate anomaly score
                        if hasattr(model, 'score_samples'):
                            score = model.score_samples([feature_vector])[0]
                            anomaly_score = 1.0 - (score + 0.5)  # Normalize to 0-1
                        else:
                            anomaly_score = 0.8

                        if (
                            anomaly_score
                            > self.config["ml"]["anomaly_detection_threshold"]
                        ):
                            anomaly = SystemAnomaly(
                                timestamp=datetime.now(),
                                component="system",
                                anomaly_score=anomaly_score,
                                severity="high" if anomaly_score > 0.9 else "medium",
                                description="ML model detected system anomaly",
                                features=features,
                            )
                            anomalies.append(anomaly)

        except Exception as e:
            self.logger.error(f"Error detecting anomalies: {e}")

        return anomalies

    def _prepare_feature_vector(self, features: Dict[str, float]) -> List[float]:
        """Prepare feature vector for ML models."""
        # Convert features to numerical vector
        feature_vector = []

        # Standard features
        standard_features = [
            "cpu_value",
            "memory_value",
            "disk_value",
            "network_value",
            "hour_of_day",
            "day_of_week",
            "is_weekend",
        ]

        for feature in standard_features:
            feature_vector.append(features.get(feature, 0.0))

        # Component features
        components = ["python_runner", "node_server", "braun_daemon", "cyops_daemon"]
        for component in components:
            for metric in [
                "cpu",
                "memory",
                "response_time",
                "error_count",
                "uptime",
                "status",
            ]:
                feature_vector.append(features.get(f"{component}_{metric}", 0.0))

        return feature_vector

    def _execute_remediation(self, prediction: MLPrediction):
        """Execute automated remediation action."""
        try:
            self.logger.info(
                f"🔧 Executing remediation: {prediction.recommended_action.value}"
            )

            if prediction.recommended_action == RemediationAction.RESTART_COMPONENT:
                self._restart_component(prediction.component)
            elif prediction.recommended_action == RemediationAction.SCALE_UP:
                self._scale_up_resources()
            elif prediction.recommended_action == RemediationAction.SCALE_DOWN:
                self._scale_down_resources()
            elif prediction.recommended_action == RemediationAction.CLEANUP_RESOURCES:
                self._cleanup_resources()

            # Log remediation action
            self._log_remediation_action(prediction)

        except Exception as e:
            self.logger.error(f"Error executing remediation: {e}")

    def _restart_component(self, component: str):
        """Restart a specific component."""
        try:
            if component == "python_runner":
                os.system("pkill -f 'python3.*gpt_cursor_runner'")
                time.sleep(2)
                os.system("python3 -m gpt_cursor_runner.main &")
            elif component == "node_server":
                os.system("pkill -f 'node.*server/index.js'")
                time.sleep(2)
                os.system("cd server && node index.js &")

            self.logger.info(f"✅ Restarted component: {component}")

        except Exception as e:
            self.logger.error(f"Error restarting component {component}: {e}")

    def _scale_up_resources(self):
        """Scale up system resources."""
        # This would typically involve cloud provider APIs
        self.logger.info("🔧 Scaling up resources (placeholder)")

    def _scale_down_resources(self):
        """Scale down system resources."""
        # This would typically involve cloud provider APIs
        self.logger.info("🔧 Scaling down resources (placeholder)")

    def _cleanup_resources(self):
        """Clean up system resources."""
        try:
            # Clear old log files
            os.system("find logs -name '*.log' -mtime +7 -delete")

            # Clear old metrics
            cutoff = datetime.now() - timedelta(hours=24)
            self.predictions = [p for p in self.predictions if p.timestamp > cutoff]
            self.anomalies = [a for a in self.anomalies if a.timestamp > cutoff]

            self.logger.info("✅ Cleaned up system resources")

        except Exception as e:
            self.logger.error(f"Error cleaning up resources: {e}")

    def _alert_admin(self, prediction: MLPrediction):
        """Alert administrator about high-confidence prediction."""
        alert_message = (
            f"🚨 HIGH CONFIDENCE PREDICTION: {prediction.prediction_type.value} "
            f"for {prediction.component} (confidence: {prediction.confidence:.2f})"
        )

        self.logger.critical(alert_message)

        # Send to Slack if configured
        if self.config.get("alerts", {}).get("slack_webhook"):
            self._send_slack_alert(alert_message, prediction)

    def _log_remediation_action(self, prediction: MLPrediction):
        """Log remediation action for audit trail."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "action": prediction.recommended_action.value,
            "component": prediction.component,
            "prediction_type": prediction.prediction_type.value,
            "confidence": prediction.confidence,
            "features": prediction.features,
        }

        # Save to log file
        with open("logs/remediation_actions.json", "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    def _send_slack_alert(self, message: str, prediction: MLPrediction):
        """Send Slack alert for high-confidence prediction."""
        try:
            import requests

            payload = {
                "attachments": [
                    {
                        "color": "#ff0000",
                        "title": "🚨 Phase 3 ML Alert",
                        "text": message,
                        "fields": [
                            {
                                "title": "Prediction Type",
                                "value": prediction.prediction_type.value,
                                "short": True,
                            },
                            {
                                "title": "Component",
                                "value": prediction.component,
                                "short": True,
                            },
                            {
                                "title": "Confidence",
                                "value": f"{prediction.confidence:.2f}",
                                "short": True,
                            },
                            {
                                "title": "Recommended Action",
                                "value": prediction.recommended_action.value,
                                "short": True,
                            },
                        ],
                        "footer": "Phase 3 ML Monitor",
                    }
                ]
            }

            response = requests.post(
                self.config["alerts"]["slack_webhook"], json=payload, timeout=10
            )

            if response.status_code == 200:
                self.logger.info("Slack alert sent successfully")
            else:
                self.logger.error(f"Failed to send Slack alert: {response.status_code}")

        except Exception as e:
            self.logger.error(f"Error sending Slack alert: {e}")

    def get_ml_summary(self) -> Dict:
        """Get ML monitoring summary."""
        return {
            "timestamp": datetime.now().isoformat(),
            "predictions": [
                {
                    "timestamp": p.timestamp.isoformat(),
                    "type": p.prediction_type.value,
                    "component": p.component,
                    "confidence": p.confidence,
                    "recommended_action": p.recommended_action.value,
                }
                for p in self.predictions[-10:]  # Last 10 predictions
            ],
            "anomalies": [
                {
                    "timestamp": a.timestamp.isoformat(),
                    "component": a.component,
                    "anomaly_score": a.anomaly_score,
                    "severity": a.severity,
                    "description": a.description,
                }
                for a in self.anomalies[-10:]  # Last 10 anomalies
            ],
            "models": {
                name: "loaded" if model else "not_loaded"
                for name, model in self.ml_models.items()
            },
            "feature_count": (
                len(self.feature_history[-1]) if self.feature_history else 0
            ),
        }


def main():
    """Main entry point."""
    ml_monitor = Phase3MLMonitor()

    try:
        ml_monitor.start()

        # Keep main thread alive
        while ml_monitor.is_running:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🛑 Shutting down Phase 3 ML Monitor...")
    finally:
        ml_monitor.stop()


if __name__ == "__main__":
    main()
