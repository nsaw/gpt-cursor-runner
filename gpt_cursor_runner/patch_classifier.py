"""
Patch Classifier for GPT-Cursor Runner.
Classifies patches based on content, complexity, and risk level.
"""

import re
from typing import Dict, List, Any
from enum import Enum


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

    def __init__(self):
        self.keywords = {
            PatchType.BUGFIX: [
                "fix",
                "bug",
                "error",
                "issue",
                "problem",
                "crash",
                "exception",
                "resolve",
                "correct",
                "repair",
                "patch",
            ],
            PatchType.FEATURE: [
                "add",
                "new",
                "feature",
                "implement",
                "create",
                "introduce",
                "enable",
                "support",
                "enhance",
                "extend",
            ],
            PatchType.REFACTOR: [
                "refactor",
                "restructure",
                "reorganize",
                "cleanup",
                "simplify",
                "optimize",
                "improve",
                "modernize",
                "update",
            ],
            PatchType.DOCUMENTATION: [
                "doc",
                "documentation",
                "comment",
                "readme",
                "guide",
                "manual",
                "explain",
                "describe",
                "clarify",
            ],
            PatchType.TEST: [
                "test",
                "spec",
                "specification",
                "assert",
                "verify",
                "validate",
                "check",
                "ensure",
                "coverage",
            ],
            PatchType.CONFIG: [
                "config",
                "configuration",
                "setting",
                "option",
                "parameter",
                "env",
                "environment",
                "setup",
            ],
            PatchType.SECURITY: [
                "security",
                "vulnerability",
                "exploit",
                "attack",
                "breach",
                "secure",
                "protect",
                "defend",
                "harden",
            ],
            PatchType.PERFORMANCE: [
                "performance",
                "speed",
                "fast",
                "slow",
                "optimize",
                "efficient",
                "cache",
                "memory",
                "cpu",
                "latency",
            ],
        }

        self.risk_indicators = {
            RiskLevel.LOW: [
                "comment",
                "doc",
                "readme",
                "test",
                "spec",
                "typo",
                "format",
            ],
            RiskLevel.MEDIUM: ["refactor", "cleanup", "update", "improve", "enhance"],
            RiskLevel.HIGH: [
                "fix",
                "bug",
                "error",
                "issue",
                "problem",
                "add",
                "new",
                "feature",
            ],
            RiskLevel.CRITICAL: [
                "security",
                "vulnerability",
                "exploit",
                "attack",
                "breach",
                "delete",
                "remove",
                "drop",
                "truncate",
                "reset",
            ],
        }

    def classify_patch(self, patch_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classify a patch based on its content and metadata.

        Args:
            patch_data: Patch data dictionary

        Returns:
            Classification results
        """
        content = self._extract_content(patch_data)

        patch_type = self._determine_patch_type(content)
        risk_level = self._determine_risk_level(content, patch_data)
        complexity = self._calculate_complexity(patch_data)

        return {
            "patch_type": patch_type.value,
            "risk_level": risk_level.value,
            "complexity": complexity,
            "confidence": self._calculate_confidence(content, patch_type, risk_level),
            "tags": self._extract_tags(content),
            "summary": self._generate_summary(patch_type, risk_level, complexity),
        }

    def _extract_content(self, patch_data: Dict[str, Any]) -> str:
        """Extract text content from patch data."""
        content_parts = []

        # Extract from various fields
        for field in ["description", "title", "summary", "message", "text"]:
            if field in patch_data:
                content_parts.append(str(patch_data[field]))

        # Extract from mutations if present
        if "mutations" in patch_data:
            for mutation in patch_data["mutations"]:
                if "contents" in mutation:
                    content_parts.append(str(mutation["contents"]))
                if "description" in mutation:
                    content_parts.append(str(mutation["description"]))

        return " ".join(content_parts).lower()

    def _determine_patch_type(self, content: str) -> PatchType:
        """Determine the type of patch based on content."""
        scores = {patch_type: 0 for patch_type in PatchType}

        for patch_type, keywords in self.keywords.items():
            for keyword in keywords:
                if keyword in content:
                    scores[patch_type] += 1

        # Find the patch type with highest score
        best_type = max(scores, key=scores.get)
        return best_type if scores[best_type] > 0 else PatchType.UNKNOWN

    def _determine_risk_level(
        self, content: str, patch_data: Dict[str, Any]
    ) -> RiskLevel:
        """Determine the risk level of the patch."""
        scores = {risk_level: 0 for risk_level in RiskLevel}

        # Check content for risk indicators
        for risk_level, indicators in self.risk_indicators.items():
            for indicator in indicators:
                if indicator in content:
                    scores[risk_level] += 1

        # Check for high-risk operations
        if self._has_destructive_operations(patch_data):
            scores[RiskLevel.CRITICAL] += 3

        # Check for file deletions
        if self._has_file_deletions(patch_data):
            scores[RiskLevel.HIGH] += 2

        # Find the risk level with highest score
        best_risk = max(scores, key=scores.get)
        return best_risk if scores[best_risk] > 0 else RiskLevel.MEDIUM

    def _has_destructive_operations(self, patch_data: Dict[str, Any]) -> bool:
        """Check if patch contains destructive operations."""
        destructive_keywords = [
            "delete",
            "remove",
            "drop",
            "truncate",
            "reset",
            "clear",
            "wipe",
            "destroy",
            "purge",
            "erase",
        ]

        content = self._extract_content(patch_data)
        return any(keyword in content for keyword in destructive_keywords)

    def _has_file_deletions(self, patch_data: Dict[str, Any]) -> bool:
        """Check if patch deletes files."""
        if "mutations" in patch_data:
            for mutation in patch_data["mutations"]:
                if mutation.get("operation") == "delete":
                    return True
        return False

    def _calculate_complexity(self, patch_data: Dict[str, Any]) -> int:
        """Calculate patch complexity score."""
        complexity = 0

        # Base complexity
        complexity += 1

        # Add complexity for mutations
        if "mutations" in patch_data:
            complexity += len(patch_data["mutations"]) * 2

        # Add complexity for file changes
        if "mutations" in patch_data:
            files_changed = set()
            for mutation in patch_data["mutations"]:
                if "path" in mutation:
                    files_changed.add(mutation["path"])
            complexity += len(files_changed)

        # Add complexity for large content changes
        if "mutations" in patch_data:
            for mutation in patch_data["mutations"]:
                if "contents" in mutation:
                    content_length = len(str(mutation["contents"]))
                    if content_length > 1000:
                        complexity += 2
                    elif content_length > 500:
                        complexity += 1

        return min(complexity, 10)  # Cap at 10

    def _calculate_confidence(
        self, content: str, patch_type: PatchType, risk_level: RiskLevel
    ) -> float:
        """Calculate confidence in classification."""
        confidence = 0.5  # Base confidence

        # Increase confidence based on keyword matches
        type_keywords = self.keywords.get(patch_type, [])
        type_matches = sum(1 for keyword in type_keywords if keyword in content)
        confidence += min(type_matches * 0.1, 0.3)

        # Increase confidence for clear risk indicators
        risk_indicators = self.risk_indicators.get(risk_level, [])
        risk_matches = sum(1 for indicator in risk_indicators if indicator in content)
        confidence += min(risk_matches * 0.1, 0.2)

        return min(confidence, 1.0)

    def _extract_tags(self, content: str) -> List[str]:
        """Extract relevant tags from content."""
        tags = []

        # Extract common patterns
        patterns = [
            r"#(\w+)",  # Hashtags
            r"@(\w+)",  # Mentions
            r"`([^`]+)`",  # Code blocks
            r"\[([^\]]+)\]",  # Bracketed terms
        ]

        for pattern in patterns:
            matches = re.findall(pattern, content)
            tags.extend(matches)

        # Add common technical terms
        tech_terms = [
            "api",
            "database",
            "frontend",
            "backend",
            "ui",
            "ux",
            "mobile",
            "web",
            "server",
            "client",
            "auth",
            "security",
            "performance",
        ]

        for term in tech_terms:
            if term in content:
                tags.append(term)

        return list(set(tags))[:10]  # Limit to 10 unique tags

    def _generate_summary(
        self, patch_type: PatchType, risk_level: RiskLevel, complexity: int
    ) -> str:
        """Generate a human-readable summary."""
        type_desc = {
            PatchType.BUGFIX: "bug fix",
            PatchType.FEATURE: "new feature",
            PatchType.REFACTOR: "code refactoring",
            PatchType.DOCUMENTATION: "documentation update",
            PatchType.TEST: "test addition",
            PatchType.CONFIG: "configuration change",
            PatchType.SECURITY: "security update",
            PatchType.PERFORMANCE: "performance improvement",
            PatchType.UNKNOWN: "code change",
        }

        risk_desc = {
            RiskLevel.LOW: "low risk",
            RiskLevel.MEDIUM: "medium risk",
            RiskLevel.HIGH: "high risk",
            RiskLevel.CRITICAL: "critical risk",
        }

        complexity_desc = (
            "simple"
            if complexity <= 3
            else "moderate" if complexity <= 6 else "complex"
        )

        return f"{type_desc[patch_type]} ({risk_desc[risk_level]}, {complexity_desc})"


# Global instance
patch_classifier = PatchClassifier()
