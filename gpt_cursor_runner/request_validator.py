#!/usr/bin/env python3
"""
Request Validator Module for GHOST 2.0.

Validates incoming requests and ensures data integrity.
"""

import re
import json
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    """Validation levels."""
    BASIC = "basic"
    STRICT = "strict"
    CUSTOM = "custom"


class ValidationResult(Enum):
    """Validation result types."""
    VALID = "valid"
    INVALID = "invalid"
    WARNING = "warning"


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
    custom_validator: Optional[callable] = None


@dataclass
class ValidationError:
    """Validation error information."""
    field_name: str
    error_type: str
    message: str
    value: Any = None


@dataclass
class ValidationReport:
    """Validation report for a request."""
    is_valid: bool
    errors: List[ValidationError]
    warnings: List[ValidationError]
    validated_data: Dict[str, Any]


class RequestValidator:
    """Validates incoming requests and ensures data integrity."""
    
    def __init__(self):
        self.validation_rules: Dict[str, List[ValidationRule]] = {}
        self.custom_validators: Dict[str, callable] = {}
        
        # Register default validation rules
        self._register_default_rules()
    
    def _register_default_rules(self):
        """Register default validation rules."""
        # Webhook validation rules
        self.validation_rules["webhook"] = [
            ValidationRule("source", "string", required=True),
            ValidationRule("data", "dict", required=True),
            ValidationRule("timestamp", "string", required=False),
            ValidationRule("version", "string", required=False)
        ]
        
        # Patch validation rules
        self.validation_rules["patch"] = [
            ValidationRule("patch", "dict", required=True),
            ValidationRule("target", "string", required=True),
            ValidationRule("version", "string", required=True),
            ValidationRule("description", "string", required=False, max_length=500),
            ValidationRule("author", "string", required=False),
            ValidationRule("timestamp", "string", required=False)
        ]
        
        # Slack command validation rules
        self.validation_rules["slack_command"] = [
            ValidationRule("command", "string", required=True),
            ValidationRule("text", "string", required=False),
            ValidationRule("user_id", "string", required=True),
            ValidationRule("channel_id", "string", required=True),
            ValidationRule("team_id", "string", required=True),
            ValidationRule("response_url", "string", required=False)
        ]
        
        # Slack event validation rules
        self.validation_rules["slack_event"] = [
            ValidationRule("type", "string", required=True),
            ValidationRule("event", "dict", required=True),
            ValidationRule("team_id", "string", required=True),
            ValidationRule("event_id", "string", required=True),
            ValidationRule("event_time", "integer", required=True)
        ]
        
        # Health check validation rules
        self.validation_rules["health_check"] = [
            ValidationRule("component", "string", required=False),
            ValidationRule("detailed", "boolean", required=False)
        ]
        
        # Resource check validation rules
        self.validation_rules["resource_check"] = [
            ValidationRule("metrics", "list", required=False),
            ValidationRule("thresholds", "dict", required=False)
        ]
        
        # Process check validation rules
        self.validation_rules["process_check"] = [
            ValidationRule("filters", "dict", required=False),
            ValidationRule("include_history", "boolean", required=False)
        ]
        
        # Processor validation rules
        self.validation_rules["processor"] = [
            ValidationRule("type", "string", required=True),
            ValidationRule("data", "dict", required=True),
            ValidationRule("priority", "integer", required=False)
        ]
        
        # Sequential processor validation rules
        self.validation_rules["sequential"] = [
            ValidationRule("workflow", "string", required=True),
            ValidationRule("data", "dict", required=True),
            ValidationRule("priority", "integer", required=False)
        ]
    
    def validate_request(self, request_type: str, data: Dict[str, Any], 
                        level: ValidationLevel = ValidationLevel.STRICT) -> ValidationReport:
        """Validate a request based on its type."""
        rules = self.validation_rules.get(request_type, [])
        errors = []
        warnings = []
        validated_data = {}
        
        for rule in rules:
            field_value = data.get(rule.field_name)
            
            # Check if required field is present
            if rule.required and field_value is None:
                errors.append(ValidationError(
                    field_name=rule.field_name,
                    error_type="missing_required_field",
                    message=f"Required field '{rule.field_name}' is missing"
                ))
                continue
            
            # Skip validation if field is not present and not required
            if field_value is None:
                continue
            
            # Validate field type
            type_error = self._validate_field_type(rule, field_value)
            if type_error:
                errors.append(type_error)
                continue
            
            # Validate field length
            length_error = self._validate_field_length(rule, field_value)
            if length_error:
                if level == ValidationLevel.STRICT:
                    errors.append(length_error)
                else:
                    warnings.append(length_error)
            
            # Validate field pattern
            pattern_error = self._validate_field_pattern(rule, field_value)
            if pattern_error:
                if level == ValidationLevel.STRICT:
                    errors.append(pattern_error)
                else:
                    warnings.append(pattern_error)
            
            # Validate allowed values
            values_error = self._validate_allowed_values(rule, field_value)
            if values_error:
                if level == ValidationLevel.STRICT:
                    errors.append(values_error)
                else:
                    warnings.append(values_error)
            
            # Custom validation
            custom_error = self._validate_custom(rule, field_value)
            if custom_error:
                if level == ValidationLevel.STRICT:
                    errors.append(custom_error)
                else:
                    warnings.append(custom_error)
            
            # Add to validated data if no errors
            if not any(e.field_name == rule.field_name for e in errors):
                validated_data[rule.field_name] = field_value
        
        is_valid = len(errors) == 0
        
        return ValidationReport(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            validated_data=validated_data
        )
    
    def _validate_field_type(self, rule: ValidationRule, value: Any) -> Optional[ValidationError]:
        """Validate field type."""
        expected_type = rule.field_type
        
        if expected_type == "string" and not isinstance(value, str):
            return ValidationError(
                field_name=rule.field_name,
                error_type="type_mismatch",
                message=f"Field '{rule.field_name}' must be a string, got {type(value).__name__}",
                value=value
            )
        elif expected_type == "integer" and not isinstance(value, int):
            return ValidationError(
                field_name=rule.field_name,
                error_type="type_mismatch",
                message=f"Field '{rule.field_name}' must be an integer, got {type(value).__name__}",
                value=value
            )
        elif expected_type == "boolean" and not isinstance(value, bool):
            return ValidationError(
                field_name=rule.field_name,
                error_type="type_mismatch",
                message=f"Field '{rule.field_name}' must be a boolean, got {type(value).__name__}",
                value=value
            )
        elif expected_type == "dict" and not isinstance(value, dict):
            return ValidationError(
                field_name=rule.field_name,
                error_type="type_mismatch",
                message=f"Field '{rule.field_name}' must be a dictionary, got {type(value).__name__}",
                value=value
            )
        elif expected_type == "list" and not isinstance(value, list):
            return ValidationError(
                field_name=rule.field_name,
                error_type="type_mismatch",
                message=f"Field '{rule.field_name}' must be a list, got {type(value).__name__}",
                value=value
            )
        
        return None
    
    def _validate_field_length(self, rule: ValidationRule, value: Any) -> Optional[ValidationError]:
        """Validate field length."""
        if not isinstance(value, str):
            return None
        
        if rule.min_length is not None and len(value) < rule.min_length:
            return ValidationError(
                field_name=rule.field_name,
                error_type="length_too_short",
                message=f"Field '{rule.field_name}' must be at least {rule.min_length} characters long",
                value=value
            )
        
        if rule.max_length is not None and len(value) > rule.max_length:
            return ValidationError(
                field_name=rule.field_name,
                error_type="length_too_long",
                message=f"Field '{rule.field_name}' must be no more than {rule.max_length} characters long",
                value=value
            )
        
        return None
    
    def _validate_field_pattern(self, rule: ValidationRule, value: Any) -> Optional[ValidationError]:
        """Validate field pattern."""
        if not isinstance(value, str) or rule.pattern is None:
            return None
        
        if not re.match(rule.pattern, value):
            return ValidationError(
                field_name=rule.field_name,
                error_type="pattern_mismatch",
                message=f"Field '{rule.field_name}' does not match required pattern",
                value=value
            )
        
        return None
    
    def _validate_allowed_values(self, rule: ValidationRule, value: Any) -> Optional[ValidationError]:
        """Validate allowed values."""
        if rule.allowed_values is None:
            return None
        
        if value not in rule.allowed_values:
            return ValidationError(
                field_name=rule.field_name,
                error_type="invalid_value",
                message=f"Field '{rule.field_name}' must be one of {rule.allowed_values}",
                value=value
            )
        
        return None
    
    def _validate_custom(self, rule: ValidationRule, value: Any) -> Optional[ValidationError]:
        """Validate using custom validator."""
        if rule.custom_validator is None:
            return None
        
        try:
            result = rule.custom_validator(value)
            if result is not True:
                return ValidationError(
                    field_name=rule.field_name,
                    error_type="custom_validation_failed",
                    message=str(result) if result else f"Custom validation failed for field '{rule.field_name}'",
                    value=value
                )
        except Exception as e:
            return ValidationError(
                field_name=rule.field_name,
                error_type="custom_validation_error",
                message=f"Custom validation error for field '{rule.field_name}': {str(e)}",
                value=value
            )
        
        return None
    
    def add_validation_rule(self, request_type: str, rule: ValidationRule):
        """Add a validation rule for a request type."""
        if request_type not in self.validation_rules:
            self.validation_rules[request_type] = []
        
        self.validation_rules[request_type].append(rule)
        logger.info(f"Added validation rule for {request_type}: {rule.field_name}")
    
    def remove_validation_rule(self, request_type: str, field_name: str):
        """Remove a validation rule."""
        if request_type in self.validation_rules:
            self.validation_rules[request_type] = [
                rule for rule in self.validation_rules[request_type]
                if rule.field_name != field_name
            ]
        logger.info(f"Removed validation rule for {request_type}: {field_name}")
    
    def get_validation_rules(self, request_type: str) -> List[ValidationRule]:
        """Get validation rules for a request type."""
        return self.validation_rules.get(request_type, [])
    
    def validate_json_schema(self, data: Dict[str, Any], schema: Dict[str, Any]) -> ValidationReport:
        """Validate data against a JSON schema."""
        # This is a simplified JSON schema validation
        # In a real implementation, you might use a library like jsonschema
        errors = []
        warnings = []
        validated_data = {}
        
        for field_name, field_schema in schema.get("properties", {}).items():
            field_value = data.get(field_name)
            required = field_name in schema.get("required", [])
            
            if required and field_value is None:
                errors.append(ValidationError(
                    field_name=field_name,
                    error_type="missing_required_field",
                    message=f"Required field '{field_name}' is missing"
                ))
                continue
            
            if field_value is not None:
                # Basic type validation
                expected_type = field_schema.get("type")
                if expected_type and not self._check_json_type(field_value, expected_type):
                    errors.append(ValidationError(
                        field_name=field_name,
                        error_type="type_mismatch",
                        message=f"Field '{field_name}' must be of type {expected_type}",
                        value=field_value
                    ))
                    continue
                
                validated_data[field_name] = field_value
        
        return ValidationReport(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            validated_data=validated_data
        )
    
    def _check_json_type(self, value: Any, expected_type: str) -> bool:
        """Check if value matches JSON schema type."""
        if expected_type == "string":
            return isinstance(value, str)
        elif expected_type == "number":
            return isinstance(value, (int, float))
        elif expected_type == "integer":
            return isinstance(value, int)
        elif expected_type == "boolean":
            return isinstance(value, bool)
        elif expected_type == "object":
            return isinstance(value, dict)
        elif expected_type == "array":
            return isinstance(value, list)
        return True


# Global request validator instance
request_validator = RequestValidator()

def get_request_validator() -> RequestValidator:
    """Get the global request validator instance."""
    return request_validator 