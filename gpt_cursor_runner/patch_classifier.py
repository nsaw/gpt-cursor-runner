"""
Patch Classifier for GPT-Cursor Runner.

Auto-labels patches by UI role (button, modal, nav, etc.) and applies role-specific rules.
"""

import re
from typing import Dict, Any, List
from dataclasses import dataclass

@dataclass
class PatchRole:
    """Defines a patch role with its characteristics."""
    name: str
    patterns: List[str]
    file_patterns: List[str]
    safety_level: str  # "safe", "medium", "dangerous"
    auto_approve: bool
    requires_review: bool
    description: str

class PatchClassifier:
    """Classifies patches by UI role and applies role-specific rules."""
    
    def __init__(self):
        self.roles = self._define_roles()
    
    def _define_roles(self) -> Dict[str, PatchRole]:
        """Define patch roles and their characteristics."""
        return {
            "button": PatchRole(
                name="button",
                patterns=[
                    r"<Button",
                    r"onPress",
                    r"TouchableOpacity",
                    r"TouchableHighlight",
                    r"button",
                    r"Button\."
                ],
                file_patterns=[
                    r".*button.*\.tsx?$",
                    r".*Button.*\.tsx?$",
                    r".*Touchable.*\.tsx?$"
                ],
                safety_level="safe",
                auto_approve=True,
                requires_review=False,
                description="Button component modifications"
            ),
            "modal": PatchRole(
                name="modal",
                patterns=[
                    r"<Modal",
                    r"Modal\.",
                    r"modal",
                    r"Dialog",
                    r"Overlay"
                ],
                file_patterns=[
                    r".*modal.*\.tsx?$",
                    r".*Modal.*\.tsx?$",
                    r".*dialog.*\.tsx?$"
                ],
                safety_level="medium",
                auto_approve=False,
                requires_review=True,
                description="Modal and dialog modifications"
            ),
            "navigation": PatchRole(
                name="navigation",
                patterns=[
                    r"<Navigation",
                    r"navigator",
                    r"router",
                    r"Stack\.",
                    r"Tab\.",
                    r"Drawer\."
                ],
                file_patterns=[
                    r".*nav.*\.tsx?$",
                    r".*navigation.*\.tsx?$",
                    r".*router.*\.tsx?$"
                ],
                safety_level="dangerous",
                auto_approve=False,
                requires_review=True,
                description="Navigation component modifications"
            ),
            "form": PatchRole(
                name="form",
                patterns=[
                    r"<Form",
                    r"<Input",
                    r"<TextInput",
                    r"onSubmit",
                    r"handleSubmit",
                    r"validation"
                ],
                file_patterns=[
                    r".*form.*\.tsx?$",
                    r".*input.*\.tsx?$",
                    r".*Form.*\.tsx?$"
                ],
                safety_level="medium",
                auto_approve=False,
                requires_review=True,
                description="Form and input modifications"
            ),
            "layout": PatchRole(
                name="layout",
                patterns=[
                    r"<View",
                    r"<Container",
                    r"<Layout",
                    r"flexDirection",
                    r"justifyContent",
                    r"alignItems",
                    r"position"
                ],
                file_patterns=[
                    r".*layout.*\.tsx?$",
                    r".*container.*\.tsx?$",
                    r".*Layout.*\.tsx?$"
                ],
                safety_level="medium",
                auto_approve=False,
                requires_review=True,
                description="Layout and container modifications"
            ),
            "text": PatchRole(
                name="text",
                patterns=[
                    r"<Text",
                    r"Text\.",
                    r"label",
                    r"title",
                    r"heading",
                    r"paragraph"
                ],
                file_patterns=[
                    r".*text.*\.tsx?$",
                    r".*label.*\.tsx?$",
                    r".*typography.*\.tsx?$"
                ],
                safety_level="safe",
                auto_approve=True,
                requires_review=False,
                description="Text and label modifications"
            ),
            "image": PatchRole(
                name="image",
                patterns=[
                    r"<Image",
                    r"Image\.",
                    r"src=",
                    r"source=",
                    r"require\("
                ],
                file_patterns=[
                    r".*image.*\.tsx?$",
                    r".*Image.*\.tsx?$",
                    r".*asset.*\.tsx?$"
                ],
                safety_level="safe",
                auto_approve=True,
                requires_review=False,
                description="Image and asset modifications"
            ),
            "icon": PatchRole(
                name="icon",
                patterns=[
                    r"<Icon",
                    r"Icon\.",
                    r"icon",
                    r"svg",
                    r"FontAwesome"
                ],
                file_patterns=[
                    r".*icon.*\.tsx?$",
                    r".*Icon.*\.tsx?$"
                ],
                safety_level="safe",
                auto_approve=True,
                requires_review=False,
                description="Icon modifications"
            ),
            "style": PatchRole(
                name="style",
                patterns=[
                    r"style=",
                    r"StyleSheet",
                    r"backgroundColor",
                    r"color:",
                    r"fontSize",
                    r"margin",
                    r"padding"
                ],
                file_patterns=[
                    r".*style.*\.tsx?$",
                    r".*css.*\.tsx?$"
                ],
                safety_level="safe",
                auto_approve=True,
                requires_review=False,
                description="Style and CSS modifications"
            ),
            "unknown": PatchRole(
                name="unknown",
                patterns=[],
                file_patterns=[],
                safety_level="dangerous",
                auto_approve=False,
                requires_review=True,
                description="Unknown component type"
            )
        }
    
    def classify_patch(self, patch_data: Dict[str, Any]) -> Dict[str, Any]:
        """Classify a patch by its role and characteristics."""
        target_file = patch_data.get("target_file", "")
        pattern = patch_data.get("patch", {}).get("pattern", "")
        replacement = patch_data.get("patch", {}).get("replacement", "")
        
        # Find matching role
        role = self._find_role(target_file, pattern, replacement)
        
        # Get role characteristics
        role_info = self.roles[role]
        
        # Determine if patch should be auto-approved
        auto_approve = role_info.auto_approve and self._is_safe_pattern(pattern)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(target_file, pattern, replacement, role)
        
        return {
            "role": role,
            "confidence": confidence,
            "safety_level": role_info.safety_level,
            "auto_approve": auto_approve,
            "requires_review": role_info.requires_review,
            "description": role_info.description,
            "patterns_matched": self._get_matched_patterns(target_file, pattern, role)
        }
    
    def _find_role(self, target_file: str, pattern: str, replacement: str) -> str:
        """Find the best matching role for the patch."""
        best_role = "unknown"
        best_score = 0
        
        for role_name, role_info in self.roles.items():
            if role_name == "unknown":
                continue
            
            score = 0
            
            # Check file name patterns
            for file_pattern in role_info.file_patterns:
                if re.search(file_pattern, target_file, re.IGNORECASE):
                    score += 2
            
            # Check content patterns
            content = f"{pattern} {replacement}"
            for content_pattern in role_info.patterns:
                if re.search(content_pattern, content, re.IGNORECASE):
                    score += 1
            
            if score > best_score:
                best_score = score
                best_role = role_name
        
        return best_role
    
    def _calculate_confidence(self, target_file: str, pattern: str, replacement: str, role: str) -> float:
        """Calculate confidence score for role classification (0-1)."""
        if role == "unknown":
            return 0.0
        
        role_info = self.roles[role]
        score = 0
        max_score = 0
        
        # File name matching
        for file_pattern in role_info.file_patterns:
            max_score += 2
            if re.search(file_pattern, target_file, re.IGNORECASE):
                score += 2
        
        # Content matching
        content = f"{pattern} {replacement}"
        for content_pattern in role_info.patterns:
            max_score += 1
            if re.search(content_pattern, content, re.IGNORECASE):
                score += 1
        
        return score / max_score if max_score > 0 else 0.0
    
    def _get_matched_patterns(self, target_file: str, pattern: str, role: str) -> List[str]:
        """Get list of patterns that matched for the role."""
        if role == "unknown":
            return []
        
        role_info = self.roles[role]
        matched = []
        
        # Check file patterns
        for file_pattern in role_info.file_patterns:
            if re.search(file_pattern, target_file, re.IGNORECASE):
                matched.append(f"file:{file_pattern}")
        
        # Check content patterns
        content = pattern
        for content_pattern in role_info.patterns:
            if re.search(content_pattern, content, re.IGNORECASE):
                matched.append(f"content:{content_pattern}")
        
        return matched
    
    def _is_safe_pattern(self, pattern: str) -> bool:
        """Check if pattern is considered safe."""
        # Simple patterns are generally safe
        if len(pattern) < 50 and pattern.count('*') == 0 and pattern.count('.') == 0:
            return True
        
        # Patterns with specific text are safer
        if any(word in pattern.lower() for word in ['text', 'label', 'title', 'color', 'style']):
            return True
        
        return False
    
    def get_role_rules(self, role: str) -> Dict[str, Any]:
        """Get rules and characteristics for a specific role."""
        if role not in self.roles:
            return {}
        
        role_info = self.roles[role]
        return {
            "name": role_info.name,
            "safety_level": role_info.safety_level,
            "auto_approve": role_info.auto_approve,
            "requires_review": role_info.requires_review,
            "description": role_info.description,
            "patterns": role_info.patterns,
            "file_patterns": role_info.file_patterns
        }
    
    def get_all_roles(self) -> Dict[str, Dict[str, Any]]:
        """Get all defined roles and their characteristics."""
        return {
            role_name: self.get_role_rules(role_name)
            for role_name in self.roles.keys()
        }

# Global instance
patch_classifier = PatchClassifier() 