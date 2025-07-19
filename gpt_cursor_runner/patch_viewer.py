#!/usr/bin/env python3
"""
Patch Viewer CLI for browsing and inspecting GPT-Cursor Runner patches.
"""

import os
import json
import glob
from datetime import datetime
from typing import List, Dict, Any, Optional
import argparse

# Import notification system
try:
    from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None


def list_patches(patches_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all patches with metadata."""
    if patches_dir is None:
        # Try to get patches directory from environment or config
        patches_dir = os.getenv("PATCHES_DIRECTORY", "patches")

    patches: List[Dict[str, Any]] = []

    if not os.path.exists(patches_dir):
        print(f"❌ Patches directory not found: {patches_dir}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(
                    f"Patches directory not found: {patches_dir}",
                    context="list_patches",
                )
        except Exception:
            pass
        return patches

    patch_files = sorted(
        glob.glob(os.path.join(patches_dir, "*.json")),
        key=os.path.getmtime,
        reverse=True,
    )

    for patch_file in patch_files:
        try:
            with open(patch_file, "r") as f:
                patch_data = json.load(f)

            # Get file stats
            stat = os.stat(patch_file)
            created = datetime.fromtimestamp(stat.st_mtime)

            patches.append(
                {
                    "file": patch_file,
                    "data": patch_data,
                    "created": created,
                    "size": stat.st_size,
                }
            )
        except Exception as e:
            print(f"⚠️  Error reading {patch_file}: {e}")
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        f"Error reading patch file: {e}", context=patch_file
                    )
            except Exception:
                pass

    return patches


def view_patch(patch_file: str, show_content: bool = False) -> None:
    """View a specific patch."""
    try:
        with open(patch_file, "r") as f:
            patch_data = json.load(f)

        print(f"\n📄 Patch: {os.path.basename(patch_file)}")
        print(f"📅 Created: {datetime.fromtimestamp(os.path.getmtime(patch_file))}")
        print(f"📏 Size: {os.path.getsize(patch_file)} bytes")
        print(f"🎯 Target: {patch_data.get('target_file', 'N/A')}")
        print(f"📝 Description: {patch_data.get('description', 'N/A')}")
        print(f"👤 Author: {patch_data.get('metadata', {}).get('author', 'N/A')}")
        print(f"🔗 Source: {patch_data.get('metadata', {}).get('source', 'N/A')}")

        if show_content:
            print(f"\n🔍 Pattern: {patch_data.get('patch', {}).get('pattern', 'N/A')}")
            print(
                f"🔄 Replacement: {
                    patch_data.get(
                        'patch',
                        {}).get(
                        'replacement',
                        'N/A')}"
            )

        print("-" * 50)

    except Exception as e:
        print(f"❌ Error viewing patch: {e}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(
                    f"Error viewing patch: {e}", context=patch_file
                )
        except Exception:
            pass


def search_patches(patches: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    """Search patches by content."""
    results = []
    query_lower = query.lower()

    for patch in patches:
        data = patch["data"]

        # Search in various fields
        searchable_text = [
            data.get("id", ""),
            data.get("description", ""),
            data.get("target_file", ""),
            data.get("metadata", {}).get("author", ""),
            data.get("metadata", {}).get("source", ""),
            data.get("patch", {}).get("pattern", ""),
            data.get("patch", {}).get("replacement", ""),
        ]

        if any(query_lower in text.lower() for text in searchable_text):
            results.append(patch)

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Patch Viewer for GPT-Cursor Runner")
    parser.add_argument("--patches-dir", default="patches", help="Patches directory")
    parser.add_argument("--view", help="View specific patch file")
    parser.add_argument("--search", help="Search patches by content")
    parser.add_argument(
        "--show-content", action="store_true", help="Show patch content"
    )
    parser.add_argument(
        "--limit", type=int, default=10, help="Limit number of patches shown"
    )

    args = parser.parse_args()

    if args.view:
        view_patch(args.view, args.show_content)
        return

    patches = list_patches(args.patches_dir)

    if not patches:
        print("📭 No patches found.")
        return

    if args.search:
        patches = search_patches(patches, args.search)
        print(f"🔍 Found {len(patches)} patches matching '{args.search}':")

    print(f"\n📦 Found {len(patches)} patches:")
    print("=" * 80)

    for i, patch in enumerate(patches[: args.limit]):
        data = patch["data"]
        print(f"{i + 1:2d}. {os.path.basename(patch['file'])}")
        print(f"    📅 {patch['created'].strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"    🎯 {data.get('target_file', 'N/A')}")
        print(f"    📝 {data.get('description', 'N/A')[:50]}...")
        print(f"    👤 {data.get('metadata', {}).get('author', 'N/A')}")
        print()

    if len(patches) > args.limit:
        print(f"... and {len(patches) - args.limit} more patches")

    print("\n💡 Use --view <filename> to view a specific patch")
    print("💡 Use --search <query> to search patches")
    print("💡 Use --show-content to see pattern and replacement")


if __name__ == "__main__":
    main()
