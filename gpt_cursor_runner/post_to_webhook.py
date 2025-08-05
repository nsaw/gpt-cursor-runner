"""
Post hybrid blocks to the GPT-Cursor Runner webhook endpoint.
"""

import requests
import os
from typing import Dict, Any, Optional
from datetime import datetime


class WebhookPoster:
    """Posts hybrid blocks to the webhook endpoint."""

    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url or os.getenv("ENDPOINT_URL")
        if not self.endpoint_url:
            raise ValueError("ENDPOINT_URL not configured")

    def post_hybrid_block(self, hybrid_block: Dict[str, Any]) -> Dict[str, Any]:
        """
        Post a hybrid block to the webhook endpoint.

        Args:
            hybrid_block: The hybrid block data to post

        Returns:
            Response from the webhook
        """
        try:
            response = requests.post(
                self.endpoint_url,
                json=hybrid_block,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "status_code": response.status_code,
                    "response": response.json(),
                    "message": "Hybrid block posted successfully",
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": f"HTTP {response.status_code}: {response.text}",
                    "message": "Failed to post hybrid block",
                }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Request timeout",
                "message": "Webhook request timed out",
            }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "Connection error",
                "message": "Could not connect to webhook endpoint",
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Unexpected error occurred",
            }

    def post_test_block(self) -> Dict[str, Any]:
        """
        Post a test hybrid block to verify webhook functionality.

        Returns:
            Response from the webhook
        """
        test_block = {
            "id": "test-block-001",
            "role": "test",
            "description": "Test hybrid block for webhook verification",
            "target_file": "test_file.py",
            "patch": {
                "pattern": "test_pattern",
                "replacement": "test_replacement",
            },
            "metadata": {
                "author": "webhook-tester",
                "timestamp": datetime.now().isoformat(),
                "confidence": 0.95,
            },
        }

        return self.post_hybrid_block(test_block)

    def post_button_styling_fix(self) -> Dict[str, Any]:
        """
        Post a sample button styling fix hybrid block.

        Returns:
            Response from the webhook
        """
        button_fix_block = {
            "id": "button-styling-fix",
            "role": "ui_improvement",
            "description": "Improve button styling with better padding and colors",
            "target_file": "src/components/Button.tsx",
            "patch": {
                "pattern": "style={{ padding: 10 }}",
                "replacement": """style={{
  padding: 12,
  backgroundColor: '#007AFF',
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center'
}}""",
            },
            "metadata": {
                "author": "gpt-4",
                "timestamp": datetime.now().isoformat(),
                "confidence": 0.95,
            },
        }

        return self.post_hybrid_block(button_fix_block)

    def post_navigation_fix(self) -> Dict[str, Any]:
        """
        Post a sample navigation fix hybrid block.

        Returns:
            Response from the webhook
        """
        navigation_fix_block = {
            "id": "navigation-fix",
            "role": "navigation",
            "description": "Fix navigation header styling and behavior",
            "target_file": "src/components/Navigation.tsx",
            "patch": {
                "pattern": "headerStyle: {",
                "replacement": """headerStyle: {
  backgroundColor: '#FFFFFF',
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1,
  borderBottomColor: '#E5E5E5',
}""",
            },
            "metadata": {
                "author": "gpt-4",
                "timestamp": datetime.now().isoformat(),
                "confidence": 0.9,
            },
        }

        return self.post_hybrid_block(navigation_fix_block)

    def post_form_validation(self) -> Dict[str, Any]:
        """
        Post a sample form validation hybrid block.

        Returns:
            Response from the webhook
        """
        form_validation_block = {
            "id": "form-validation",
            "role": "form",
            "description": "Add form validation for email input",
            "target_file": "src/components/Form.tsx",
            "patch": {
                "pattern": "onSubmit={handleSubmit}",
                "replacement": """onSubmit={handleSubmit}
onChangeText={(text) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  setIsValidEmail(emailRegex.test(text));
}}""",
            },
            "metadata": {
                "author": "gpt-4",
                "timestamp": datetime.now().isoformat(),
                "confidence": 0.85,
            },
        }

        return self.post_hybrid_block(form_validation_block)


def main():
    """Main function to demonstrate webhook posting."""
    try:
        poster = WebhookPoster()

        print("🚀 Testing webhook posting functionality...")

        # Test basic functionality
        print("\n📤 Posting test block...")
        result = poster.post_test_block()
        print(f"Result: {result['success']}")
        if not result["success"]:
            print(f"Error: {result['error']}")

        # Test button styling fix
        print("\n📤 Posting button styling fix...")
        result = poster.post_button_styling_fix()
        print(f"Result: {result['success']}")
        if not result["success"]:
            print(f"Error: {result['error']}")

        # Test navigation fix
        print("\n📤 Posting navigation fix...")
        result = poster.post_navigation_fix()
        print(f"Result: {result['success']}")
        if not result["success"]:
            print(f"Error: {result['error']}")

        # Test form validation
        print("\n📤 Posting form validation...")
        result = poster.post_form_validation()
        print(f"Result: {result['success']}")
        if not result["success"]:
            print(f"Error: {result['error']}")

        print("\n✅ Webhook posting test completed!")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()
