# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
# Patch Classifier for GPT-Cursor Runner.
# Classifies patches based on content, complexity, and risk level.

from enum import Enum
from typing import Any


class PatchType(Enum):
    """Enumeration of patch types."""

    BUGFIX = "bugfix"
    FEATURE = "feature"
    REFACTOR = "refactor"
    DOCUMENTATION = "documentation"
    TEST = "test"
    CONFIG = "config"
    SECURITY = "security"
    PERFORMANCE = "performance"
    UNKNOWN = "unknown"


class RiskLevel(Enum):
    """Enumeration of risk levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PatchClassifier:
    """Classifies patches based on content analysis."""

    # Type hints for class attributes
    security_keywords: set[str]
    performance_keywords: set[str]
    bugfix_keywords: set[str]
    feature_keywords: set[str]
    refactor_keywords: set[str]
    documentation_keywords: set[str]
    test_keywords: set[str]
    config_keywords: set[str]

    def __init__(self) -> None:
        """Initialize the patch classifier with keyword sets."""
        self.security_keywords = {
            "security",
            "vulnerability",
            "auth",
            "authentication",
            "authorization",
            "encrypt",
            "decrypt",
            "hash",
            "salt",
            "token",
            "jwt",
            "oauth",
            "ssl",
            "tls",
            "cors",
            "csrf",
            "xss",
            "sql injection",
            "sanitize",
            "validate",
        }

        self.performance_keywords = {
            "performance",
            "optimize",
            "cache",
            "memory",
            "cpu",
            "latency",
            "throughput",
            "efficiency",
            "speed",
            "fast",
            "slow",
            "bottleneck",
            "profiling",
            "benchmark",
        }

        self.bugfix_keywords = {
            "bug",
            "fix",
            "bugfix",
            "issue",
            "error",
            "exception",
            "crash",
            "fail",
            "broken",
            "defect",
            "problem",
            "resolve",
            "correct",
            "repair",
            "patch",
            "hotfix",
        }

        self.feature_keywords = {
            "feature",
            "new",
            "add",
            "implement",
            "enhancement",
            "improvement",
            "upgrade",
            "update",
            "enhance",
            "extend",
            "functionality",
            "capability",
            "support",
            "enable",
        }

        self.refactor_keywords = {
            "refactor",
            "refactoring",
            "restructure",
            "reorganize",
            "cleanup",
            "clean up",
            "improve",
            "optimize",
            "simplify",
            "modernize",
            "update",
            "migrate",
            "consolidate",
        }

        self.documentation_keywords = {
            "doc",
            "documentation",
            "comment",
            "readme",
            "guide",
            "manual",
            "tutorial",
            "example",
            "sample",
            "note",
        }

        self.test_keywords = {
            "test",
            "testing",
            "unit test",
            "integration test",
            "e2e",
            "end to end",
            "spec",
            "specification",
            "assert",
            "mock",
            "stub",
            "fixture",
            "coverage",
        }

        self.config_keywords = {
            "config",
            "configuration",
            "setting",
            "option",
            "param",
            "environment",
            "env",
            "flag",
            "toggle",
            "switch",
        }

    def classify_patch(
        self, description: str, mutations: list[Any], files_modified: list[str]
    ) -> dict[str, Any]:
        """Classify a patch based on its content and metadata."""
        patch_type = self._determine_patch_type(description, mutations, files_modified)
        risk_level = self._determine_risk_level(description, mutations, files_modified)
        complexity = self._determine_complexity(description, mutations, files_modified)
        components = self._identify_components(files_modified)

        return {
            "type": patch_type.value,
            "risk_level": risk_level.value,
            "complexity": complexity,
            "components": list(components),
            "confidence": self._calculate_confidence(
                description, mutations, files_modified
            ),
        }

    def _determine_patch_type(
        self, description: str, mutations: list[Any], files_modified: list[str]
    ) -> PatchType:
        """Determine the type of patch based on content."""
        desc_lower = description.lower()

        # Check for security-related content
        if any(keyword in desc_lower for keyword in self.security_keywords):
            return PatchType.SECURITY

        # Check for performance-related content
        if any(keyword in desc_lower for keyword in self.performance_keywords):
            return PatchType.PERFORMANCE

        # Check for bugfix content
        if any(keyword in desc_lower for keyword in self.bugfix_keywords):
            return PatchType.BUGFIX

        # Check for feature content
        if any(keyword in desc_lower for keyword in self.feature_keywords):
            return PatchType.FEATURE

        # Check for refactor content
        if any(keyword in desc_lower for keyword in self.refactor_keywords):
            return PatchType.REFACTOR

        # Check for documentation content
        if any(keyword in desc_lower for keyword in self.documentation_keywords):
            return PatchType.DOCUMENTATION

        # Check for test content
        if any(keyword in desc_lower for keyword in self.test_keywords):
            return PatchType.TEST

        # Check for config content
        if any(keyword in desc_lower for keyword in self.config_keywords):
            return PatchType.CONFIG

        return PatchType.UNKNOWN

    def _determine_risk_level(
        self, description: str, mutations: list[Any], files_modified: list[str]
    ) -> RiskLevel:
        """Determine the risk level of the patch."""
        # Simple risk assessment based on file count and mutation count
        file_count = len(files_modified)
        mutation_count = len(mutations)

        if file_count > 10 or mutation_count > 20:
            return RiskLevel.CRITICAL
        elif file_count > 5 or mutation_count > 10:
            return RiskLevel.HIGH
        elif file_count > 2 or mutation_count > 5:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _determine_complexity(
        self, description: str, mutations: list[Any], files_modified: list[str]
    ) -> str:
        """Determine the complexity of the patch."""
        file_count = len(files_modified)
        mutation_count = len(mutations)

        if file_count > 10 or mutation_count > 20:
            return "high"
        elif file_count > 5 or mutation_count > 10:
            return "medium"
        else:
            return "low"

    def _identify_components(self, files_modified: list[str]) -> set[str]:
        """Identify components affected by the patch."""
        components: set[str] = set()

        for file_path in files_modified:
            # Extract component from file path
            if "/" in file_path:
                component = file_path.split("/")[0]
                components.add(component)

        return components

    def _calculate_confidence(
        self, description: str, mutations: list[Any], files_modified: list[str]
    ) -> float:
        """Calculate confidence in the classification."""
        # Simple confidence calculation based on keyword matches
        desc_lower = description.lower()
        keyword_matches = 0

        for keyword_set in [
            self.security_keywords,
            self.performance_keywords,
            self.bugfix_keywords,
            self.feature_keywords,
            self.refactor_keywords,
            self.documentation_keywords,
            self.test_keywords,
            self.config_keywords,
        ]:
            if any(keyword in desc_lower for keyword in keyword_set):
                keyword_matches += 1

        # Higher confidence if we have clear keyword matches
        if keyword_matches > 0:
            return min(0.9, 0.3 + (keyword_matches * 0.1))
        else:
            return 0.3  # Low confidence for unknown patches
