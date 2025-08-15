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
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any

"""
Script to read and display saved patches from the patches/ directory.
"""


class PatchReader:
    """Reads and displays saved patches."""

    def __init__(self, patches_dir: str = "patches") -> None:
        self.patches_dir = Path(patches_dir)
        self.patches_dir.mkdir(exist_ok=True)

    def list_patches(self) -> List[Dict[str, Any]]:
        """
        List all patches in the patches directory.

        Returns:
            List of patch information dictionaries
        """
        patches = []

        for patch_file in self.patches_dir.glob("*.json"):
            try:
                patch_info = self._read_patch_file(patch_file)
                if patch_info:
                    patches.append(patch_info)
            except Exception as e:
                print(f"Warning: Could not read {patch_file}: {e}")

        # Sort by timestamp (newest first)
        patches.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return patches

    def read_patch(self, patch_id: str) -> Optional[Dict[str, Any]]:
        """
        Read a specific patch by ID.

        Args:
            patch_id: The patch ID to read

        Returns:
            Patch data or None if not found
        """
        for patch_file in self.patches_dir.glob("*.json"):
            try:
                with open(patch_file, "r") as f:
                    patch_data = json.load(f)

                if patch_data.get("id") == patch_id:
                    return self._enrich_patch_data(patch_data, patch_file)
            except Exception as e:
                print(f"Warning: Could not read {patch_file}: {e}")

        return None

    def read_latest_patch(self) -> Optional[Dict[str, Any]]:
        """
        Read the most recent patch.

        Returns:
            Latest patch data or None if no patches exist
        """
        patches = self.list_patches()
        if patches:
            return patches[0]
        return None

    def search_patches(self, query: str) -> List[Dict[str, Any]]:
        """
        Search patches by query string.

        Args:
            query: Search query string

        Returns:
            List of matching patches
        """
        query_lower = query.lower()
        matching_patches = []

        for patch_file in self.patches_dir.glob("*.json"):
            try:
                with open(patch_file, "r") as f:
                    patch_data = json.load(f)

                # Search in various fields
                searchable_text = " ".join(
                    [
                        str(patch_data.get("id", "")),
                        str(patch_data.get("description", "")),
                        str(patch_data.get("role", "")),
                        str(patch_data.get("target_file", "")),
                        str(patch_data.get("metadata", {}).get("author", "")),
                    ]
                ).lower()

                if query_lower in searchable_text:
                    enriched_data = self._enrich_patch_data(patch_data, patch_file)
                    matching_patches.append(enriched_data)

            except Exception as e:
                print(f"Warning: Could not read {patch_file}: {e}")

        return matching_patches

    def get_patch_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about all patches.

        Returns:
            Statistics dictionary
        """
        patches = self.list_patches()

        if not patches:
            return {
                "total_patches": 0,
                "patches_by_role": {},
                "patches_by_author": {},
                "recent_activity": {},
            }

        # Count by role
        roles: Dict[str, int] = {}
        authors: Dict[str, int] = {}

        for patch in patches:
            role = patch.get("role", "unknown")
            roles[role] = roles.get(role, 0) + 1

            author = patch.get("metadata", {}).get("author", "unknown")
            authors[author] = authors.get(author, 0) + 1

        # Recent activity (last 7 days)
        recent_patches = [p for p in patches if self._is_recent(p.get("timestamp", ""))]

        return {
            "total_patches": len(patches),
            "patches_by_role": roles,
            "patches_by_author": authors,
            "recent_activity": {
                "last_7_days": len(recent_patches),
                "last_24_hours": len(
                    [
                        p
                        for p in patches
                        if self._is_recent(p.get("timestamp", ""), days=1)
                    ]
                ),
            },
        }

    def _read_patch_file(self, patch_file: Path) -> Optional[Dict[str, Any]]:
        """Read and enrich a patch file."""
        try:
            with open(patch_file, "r") as f:
                patch_data = json.load(f)

            return self._enrich_patch_data(patch_data, patch_file)
        except Exception as e:
            print(f"Error reading {patch_file}: {e}")
            return None

    def _enrich_patch_data(
        self, patch_data: Dict[str, Any], patch_file: Path
    ) -> Dict[str, Any]:
        """Enrich patch data with file information."""
        stat = patch_file.stat()

        enriched_data = patch_data.copy()
        enriched_data.update(
            {
                "file_path": str(patch_file),
                "file_size": stat.st_size,
                "file_modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "file_created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            }
        )

        return enriched_data

    def _is_recent(self, timestamp: str, days: int = 7) -> bool:
        """Check if timestamp is within specified days."""
        try:
            patch_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            cutoff_time = datetime.now().replace(tzinfo=patch_time.tzinfo) - timedelta(
                days=days
            )
            return patch_time >= cutoff_time
        except Exception:
            return False

    def display_patch(self, patch_data: Dict[str, Any], detailed: bool = False) -> None:
        """
        Display patch information in a formatted way.

        Args:
            patch_data: Patch data to display
            detailed: Whether to show detailed information
        """
        print(f"\n📋 Patch: {patch_data.get('id', 'Unknown')}")
        print(f"📝 Description: {patch_data.get('description', 'No description')}")
        print(f"🎯 Target: {patch_data.get('target_file', 'No target')}")
        print(f"🏷️  Role: {patch_data.get('role', 'Unknown')}")

        metadata = patch_data.get("metadata", {})
        if metadata:
            print(f"👤 Author: {metadata.get('author', 'Unknown')}")
            print(f"📅 Created: {metadata.get('timestamp', 'Unknown')}")
            print(f"🎯 Confidence: {metadata.get('confidence', 'Unknown')}")

        if detailed:
            print(f"📁 File: {patch_data.get('file_path', 'Unknown')}")
            print(f"📊 Size: {patch_data.get('file_size', 0)} bytes")
            print(f"🕒 Modified: {patch_data.get('file_modified', 'Unknown')}")

            patch = patch_data.get("patch", {})
            if patch:
                print(f"🔍 Pattern: {patch.get('pattern', 'No pattern')}")
                print(f"🔄 Replacement: {patch.get('replacement', 'No replacement')}")

    def display_patches_summary(self, patches: List[Dict[str, Any]]) -> None:
        """
        Display a summary of multiple patches.

        Args:
            patches: List of patches to summarize
        """
        if not patches:
            print("📭 No patches found")
            return

        print(f"\n📊 Found {len(patches)} patches:")
        print("-" * 80)

        for i, patch in enumerate(patches, 1):
            print(
                f"{i:2d}. {patch.get('id', 'Unknown'):<30} | "
                f"{patch.get('role', 'Unknown'):<15} | "
                f"{patch.get('target_file', 'Unknown'):<25}"
            )

        print("-" * 80)


def main() -> None:
    """Main function to demonstrate patch reading."""
    reader = PatchReader()

    print("📖 GPT-Cursor Runner - Patch Reader")
    print("=" * 50)

    # Get statistics
    stats = reader.get_patch_statistics()
    print("\n📊 Statistics:")
    print(f"Total patches: {stats['total_patches']}")
    print(f"Last 7 days: {stats['recent_activity']['last_7_days']}")
    print(f"Last 24 hours: {stats['recent_activity']['last_24_hours']}")

    # List all patches
    patches = reader.list_patches()
    reader.display_patches_summary(patches)

    # Show latest patch details
    if patches:
        print("\n🔍 Latest patch details:")
        reader.display_patch(patches[0], detailed=True)

    # Show patches by role
    if stats["patches_by_role"]:
        print("\n🏷️  Patches by role:")
        for role, count in stats["patches_by_role"].items():
            print(f"  {role}: {count}")

    # Show patches by author
    if stats["patches_by_author"]:
        print("\n👤 Patches by author:")
        for author, count in stats["patches_by_author"].items():
            print(f"  {author}: {count}")


if __name__ == "__main__":
    main()
