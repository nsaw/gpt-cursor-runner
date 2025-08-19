# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Request Validator Module for ***REMOVED*** 2.0.

Provides comprehensive request validation and schema checking.
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class ValidationErrorType(Enum):
    """Types of validation errors."""

    TYPE_MISMATCH = "type_mismatch"
    LENGTH_TOO_SHORT = "length_too_short"
    LENGTH_TOO_LONG = "length_too_long"
    PATTERN_MISMATCH = "pattern_mismatch"
    REQUIRED_MISSING = "required_missing"
    INVALID_VALUE = "invalid_value"


@dataclass
class ValidationError:
    """Validation error details."""

    field_name: str
    error_type: ValidationErrorType
    message: str
    value: Optional[Any] = None


@dataclass
class ValidationWarning:
    """Validation warning details."""

    field_name: str
    warning_type: str
    message: str
    value: Optional[Any] = None


@dataclass
class ValidationRule:
    """Validation rule configuration."""

    field_name: str
    field_type: str
    required: bool = True
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None
    allowed_values: Optional[List[Any]] = None
    default_value: Optional[Any] = None


@dataclass
class ValidationReport:
    """Validation report with results."""

    is_valid: bool
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[ValidationWarning] = field(default_factory=list)
    validated_data: Dict[str, Any] = field(default_factory=dict)


class RequestValidator:
    """Comprehensive request validator."""

    def __init__(self) -> None:
        self.validation_rules: Dict[str, ValidationRule] = {}
        self.custom_validators: Dict[
            str, Callable[[Any], Optional[ValidationError]]
        ] = {}

    def add_validation_rule(self, rule: ValidationRule) -> None:
        """Add a validation rule."""
        self.validation_rules[rule.field_name] = rule
        logger.info(f"Added validation rule for field: {rule.field_name}")

    def add_custom_validator(
        self,
        field_name: str,
        validator_func: Callable[[Any], Optional[ValidationError]],
    ) -> None:
        """Add a custom validator function."""
        self.custom_validators[field_name] = validator_func
        logger.info(f"Added custom validator for field: {field_name}")

    def validate_request(self, data: Dict[str, Any]) -> ValidationReport:
        """Validate a request against all rules."""
        errors: List[ValidationError] = []
        warnings: List[ValidationWarning] = []
        validated_data: Dict[str, Any] = {}

        # Check for required fields
        for field_name, rule in self.validation_rules.items():
            if rule.required and field_name not in data:
                errors.append(
                    ValidationError(
                        field_name=field_name,
                        error_type=ValidationErrorType.REQUIRED_MISSING,
                        message=f"Required field '{field_name}' is missing",
                    )
                )
                continue

            # Get field value or use default
            value = data.get(field_name, rule.default_value)

            # Skip validation if field is not present and not required
            if value is None and not rule.required:
                continue

            # Validate field
            field_errors = self._validate_field(rule, value)
            errors.extend(field_errors)

            # Add to validated data if no errors
            if not any(e.field_name == field_name for e in field_errors):
                validated_data[field_name] = value

        # Check for unknown fields
        for field_name in data:
            if field_name not in self.validation_rules:
                warnings.append(
                    ValidationWarning(
                        field_name=field_name,
                        warning_type="unknown_field",
                        message=f"Unknown field '{field_name}' in request",
                        value=data[field_name],
                    )
                )

        is_valid = len(errors) == 0

        return ValidationReport(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            validated_data=validated_data,
        )

    def _validate_field(
        self, rule: ValidationRule, value: Any
    ) -> List[ValidationError]:
        """Validate a single field."""
        errors: List[ValidationError] = []

        # Validate field type
        type_error = self._validate_field_type(rule, value)
        if type_error:
            errors.append(type_error)
            return errors  # Stop validation if type is wrong

        # Validate field length
        length_error = self._validate_field_length(rule, value)
        if length_error:
            errors.append(length_error)

        # Validate field pattern
        pattern_error = self._validate_field_pattern(rule, value)
        if pattern_error:
            errors.append(pattern_error)

        # Validate allowed values
        values_error = self._validate_allowed_values(rule, value)
        if values_error:
            errors.append(values_error)

        # Run custom validator if exists
        custom_error = self._run_custom_validator(rule.field_name, value)
        if custom_error:
            errors.append(custom_error)

        return errors

    def _validate_field_type(
        self, rule: ValidationRule, value: Any
    ) -> Optional[ValidationError]:
        """Validate field type."""
        expected_type = rule.field_type

        if expected_type == "string" and not isinstance(value, str):
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.TYPE_MISMATCH,
                message=f"Field '{rule.field_name}' must be a string, got {type(value).__name__}",
                value=value,
            )
        elif expected_type == "integer" and not isinstance(value, int):
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.TYPE_MISMATCH,
                message=f"Field '{rule.field_name}' must be an integer, got {type(value).__name__}",
                value=value,
            )
        elif expected_type == "boolean" and not isinstance(value, bool):
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.TYPE_MISMATCH,
                message=f"Field '{rule.field_name}' must be a boolean, got {type(value).__name__}",
                value=value,
            )
        elif expected_type == "dict" and not isinstance(value, dict):
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.TYPE_MISMATCH,
                message=f"Field '{rule.field_name}' must be a dictionary, got {type(value).__name__}",
                value=value,
            )
        elif expected_type == "list" and not isinstance(value, list):
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.TYPE_MISMATCH,
                message=f"Field '{rule.field_name}' must be a list, got {type(value).__name__}",
                value=value,
            )

        return None

    def _validate_field_length(
        self, rule: ValidationRule, value: Any
    ) -> Optional[ValidationError]:
        """Validate field length."""
        if not isinstance(value, str):
            return None

        if rule.min_length is not None and len(value) < rule.min_length:
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.LENGTH_TOO_SHORT,
                message=f"Field '{rule.field_name}' must be at least {rule.min_length} characters long",
                value=value,
            )

        if rule.max_length is not None and len(value) > rule.max_length:
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.LENGTH_TOO_LONG,
                message=f"Field '{rule.field_name}' must be no more than {rule.max_length} characters long",
                value=value,
            )

        return None

    def _validate_field_pattern(
        self, rule: ValidationRule, value: Any
    ) -> Optional[ValidationError]:
        """Validate field pattern."""
        if not isinstance(value, str) or rule.pattern is None:
            return None

        if not re.match(rule.pattern, value):
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.PATTERN_MISMATCH,
                message=f"Field '{rule.field_name}' does not match required pattern",
                value=value,
            )

        return None

    def _validate_allowed_values(
        self, rule: ValidationRule, value: Any
    ) -> Optional[ValidationError]:
        """Validate allowed values."""
        if rule.allowed_values is None:
            return None

        if value not in rule.allowed_values:
            return ValidationError(
                field_name=rule.field_name,
                error_type=ValidationErrorType.INVALID_VALUE,
                message=f"Field '{rule.field_name}' must be one of {rule.allowed_values}",
                value=value,
            )

        return None

    def _run_custom_validator(
        self, field_name: str, value: Any
    ) -> Optional[ValidationError]:
        """Run custom validator if exists."""
        if field_name not in self.custom_validators:
            return None

        try:
            validator_func = self.custom_validators[field_name]
            result = validator_func(value)

            if isinstance(result, ValidationError):
                return result

        except Exception as e:
            return ValidationError(
                field_name=field_name,
                error_type=ValidationErrorType.INVALID_VALUE,
                message=f"Custom validation failed: {str(e)}",
                value=value,
            )

        return None

    def validate_json_schema(
        self, data: Dict[str, Any], schema: Dict[str, Any]
    ) -> ValidationReport:
        """Validate data against JSON schema."""
        errors: List[ValidationError] = []
        warnings: List[ValidationWarning] = []
        validated_data: Dict[str, Any] = {}

        # Validate required fields
        required_fields = schema.get("required", [])
        for field_name in required_fields:
            if field_name not in data:
                errors.append(
                    ValidationError(
                        field_name=field_name,
                        error_type=ValidationErrorType.REQUIRED_MISSING,
                        message=f"Required field '{field_name}' is missing",
                    )
                )

        # Validate field types
        properties = schema.get("properties", {})
        for field_name, field_schema in properties.items():
            if field_name not in data:
                continue

            value = data[field_name]
            expected_type = field_schema.get("type")

            if expected_type:
                type_error = self._check_json_type(field_name, value, expected_type)
                if type_error:
                    errors.append(type_error)
                else:
                    validated_data[field_name] = value

        # Check for unknown fields
        for field_name in data:
            if field_name not in properties:
                warnings.append(
                    ValidationWarning(
                        field_name=field_name,
                        warning_type="unknown_field",
                        message=f"Unknown field '{field_name}' in request",
                        value=data[field_name],
                    )
                )

        is_valid = len(errors) == 0

        return ValidationReport(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            validated_data=validated_data,
        )

    def _check_json_type(
        self, field_name: str, value: Any, expected_type: str
    ) -> Optional[ValidationError]:
        """Check if value matches expected JSON type."""
        if expected_type == "string":
            if not isinstance(value, str):
                return ValidationError(
                    field_name=field_name,
                    error_type=ValidationErrorType.TYPE_MISMATCH,
                    message=f"Field '{field_name}' must be of type {expected_type}, got {type(value).__name__}",
                    value=value,
                )
        elif expected_type == "integer":
            if not isinstance(value, int):
                return ValidationError(
                    field_name=field_name,
                    error_type=ValidationErrorType.TYPE_MISMATCH,
                    message=f"Field '{field_name}' must be of type {expected_type}, got {type(value).__name__}",
                    value=value,
                )
        elif expected_type == "number":
            if not isinstance(value, (int, float)):
                return ValidationError(
                    field_name=field_name,
                    error_type=ValidationErrorType.TYPE_MISMATCH,
                    message=f"Field '{field_name}' must be of type {expected_type}, got {type(value).__name__}",
                    value=value,
                )
        elif expected_type == "boolean":
            if not isinstance(value, bool):
                return ValidationError(
                    field_name=field_name,
                    error_type=ValidationErrorType.TYPE_MISMATCH,
                    message=f"Field '{field_name}' must be of type {expected_type}, got {type(value).__name__}",
                    value=value,
                )
        elif expected_type == "object":
            if not isinstance(value, dict):
                return ValidationError(
                    field_name=field_name,
                    error_type=ValidationErrorType.TYPE_MISMATCH,
                    message=f"Field '{field_name}' must be of type {expected_type}, got {type(value).__name__}",
                    value=value,
                )
        elif expected_type == "array":
            if not isinstance(value, list):
                return ValidationError(
                    field_name=field_name,
                    error_type=ValidationErrorType.TYPE_MISMATCH,
                    message=f"Field '{field_name}' must be of type {expected_type}, got {type(value).__name__}",
                    value=value,
                )

        return None


# Global validator instance
request_validator = RequestValidator()


def get_request_validator() -> RequestValidator:
    """Get the global request validator instance."""
    return request_validator
