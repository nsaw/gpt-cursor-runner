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
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

"""
Patch Reverter for GPT-Cursor Runner.
Reverts patches by patch_id or timestamp with automatic backup management.
"""


class PatchReverter:
    """Handles patch reversion with backup management."""

    def __init__(self, backup_dir: str = "backups", max_backups: int = 100) -> None:
        self.backup_dir = Path(backup_dir)
        self.max_backups = max_backups
        self.backup_dir.mkdir(exist_ok=True)

    def revert_patch_by_id(self, patch_id: str, target_file: str) -> Dict[str, Any]:
        """
        Revert a specific patch by ID.

        Args:
            patch_id: The patch ID to revert
            target_file: The file to revert

        Returns:
            Result dictionary with success status and details
        """
        try:
            # Find backup for this patch
            backup_file = self._find_backup_by_patch_id(patch_id, target_file)
            if not backup_file:
                return {
                    "success": False,
                    "error": f"No backup found for patch {patch_id}",
                }

            # Create current state backup before reverting
            current_backup = self._create_backup(target_file, f"pre_revert_{patch_id}")

            # Restore from backup
            shutil.copy2(backup_file, target_file)

            return {
                "success": True,
                "patch_id": patch_id,
                "target_file": target_file,
                "backup_used": str(backup_file),
                "current_backup": str(current_backup),
                "timestamp": datetime.now().isoformat(),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "patch_id": patch_id,
                "target_file": target_file,
            }

    def revert_patch_by_timestamp(
        self, target_file: str, timestamp: datetime
    ) -> Dict[str, Any]:
        """
        Revert a file to its state at a specific timestamp.

        Args:
            target_file: The file to revert
            timestamp: The timestamp to revert to

        Returns:
            Result dictionary with success status and details
        """
        try:
            # Find the closest backup before the timestamp
            backup_file = self._find_backup_by_timestamp(target_file, timestamp)
            if not backup_file:
                return {
                    "success": False,
                    "error": f"No backup found before {timestamp}",
                }

            # Create current state backup before reverting
            current_backup = self._create_backup(
                target_file, f"pre_revert_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            )

            # Restore from backup
            shutil.copy2(backup_file, target_file)

            return {
                "success": True,
                "target_file": target_file,
                "timestamp": timestamp.isoformat(),
                "backup_used": str(backup_file),
                "current_backup": str(current_backup),
                "reverted_at": datetime.now().isoformat(),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "target_file": target_file,
                "timestamp": timestamp.isoformat(),
            }

    def create_backup(self, file_path: str, patch_id: str) -> str:
        """
        Create a backup of a file before applying a patch.

        Args:
            file_path: Path to the file to backup
            patch_id: Patch ID for naming the backup

        Returns:
            Path to the created backup file
        """
        return str(self._create_backup(file_path, patch_id))

    def _create_backup(self, file_path: str, patch_id: str) -> Path:
        """Internal method to create a backup."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        # Create backup filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.basename(file_path)
        backup_filename = f"{timestamp}_{patch_id}_{filename}.bak"
        backup_path = self.backup_dir / backup_filename

        # Copy file to backup
        shutil.copy2(file_path, backup_path)

        # Clean up old backups
        self._cleanup_old_backups()

        return backup_path

    def _find_backup_by_patch_id(
        self, patch_id: str, target_file: str
    ) -> Optional[Path]:
        """Find backup file by patch ID."""
        filename = os.path.basename(target_file)
        pattern = f"*_{patch_id}_{filename}.bak"

        for backup_file in self.backup_dir.glob(pattern):
            return backup_file

        return None

    def _find_backup_by_timestamp(
        self, target_file: str, timestamp: datetime
    ) -> Optional[Path]:
        """Find the closest backup before the given timestamp."""
        filename = os.path.basename(target_file)
        pattern = f"*_{filename}.bak"

        backups = []
        for backup_file in self.backup_dir.glob(pattern):
            try:
                # Extract timestamp from filename
                parts = backup_file.stem.split("_")
                if len(parts) >= 2:
                    backup_timestamp = datetime.strptime(
                        f"{parts[0]}_{parts[1]}", "%Y%m%d_%H%M%S"
                    )
                    if backup_timestamp <= timestamp:
                        backups.append((backup_file, backup_timestamp))
            except ValueError:
                continue

        if not backups:
            return None

        # Return the backup closest to but not after the timestamp
        backups.sort(key=lambda x: x[1], reverse=True)
        return backups[0][0]

    def _cleanup_old_backups(self) -> None:
        """Remove old backups to stay within max_backups limit."""
        backup_files = list(self.backup_dir.glob("*.bak"))

        if len(backup_files) <= self.max_backups:
            return

        # Sort by modification time (oldest first)
        backup_files.sort(key=lambda x: x.stat().st_mtime)

        # Remove oldest backups
        files_to_remove = backup_files[: len(backup_files) - self.max_backups]
        for backup_file in files_to_remove:
            try:
                backup_file.unlink()
            except Exception:
                pass  # Ignore errors during cleanup

    def list_backups(self, target_file: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List available backups.

        Args:
            target_file: Optional file to filter backups for

        Returns:
            List of backup information dictionaries
        """
        backups = []

        if target_file:
            filename = os.path.basename(target_file)
            pattern = f"*_{filename}.bak"
            backup_files = list(self.backup_dir.glob(pattern))
        else:
            backup_files = list(self.backup_dir.glob("*.bak"))

        for backup_file in backup_files:
            try:
                stat = backup_file.stat()
                parts = backup_file.stem.split("_")

                backup_info = {
                    "file": str(backup_file),
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                }

                # Try to extract patch ID and timestamp
                if len(parts) >= 3:
                    backup_info["patch_id"] = parts[1]
                    backup_info["original_file"] = "_".join(parts[2:])
                elif len(parts) >= 2:
                    backup_info["timestamp"] = f"{parts[0]}_{parts[1]}"
                    backup_info["original_file"] = "_".join(parts[2:])

                backups.append(backup_info)

            except Exception:
                continue

        # Sort by modification time (newest first)
        backups.sort(key=lambda x: str(x["modified"]), reverse=True)
        return backups

    def get_backup_info(self, backup_file: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific backup.

        Args:
            backup_file: Path to the backup file

        Returns:
            Backup information dictionary or None if not found
        """
        backup_path = Path(backup_file)
        if not backup_path.exists():
            return None

        try:
            stat = backup_path.stat()
            parts = backup_path.stem.split("_")

            info = {
                "file": str(backup_path),
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            }

            # Extract metadata from filename
            if len(parts) >= 3:
                info["patch_id"] = parts[1]
                info["original_file"] = "_".join(parts[2:])
            elif len(parts) >= 2:
                info["timestamp"] = f"{parts[0]}_{parts[1]}"
                info["original_file"] = "_".join(parts[2:])

            return info

        except Exception:
            return None

    def restore_backup(self, backup_file: str, target_file: str) -> Dict[str, Any]:
        """
        Restore a file from a specific backup.

        Args:
            backup_file: Path to the backup file
            target_file: Path to restore to

        Returns:
            Result dictionary with success status and details
        """
        try:
            backup_path = Path(backup_file)
            if not backup_path.exists():
                return {
                    "success": False,
                    "error": f"Backup file not found: {backup_file}",
                }

            # Create current state backup before restoring
            current_backup = self._create_backup(
                target_file, f"pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )

            # Restore from backup
            shutil.copy2(backup_path, target_file)

            return {
                "success": True,
                "backup_file": str(backup_path),
                "target_file": target_file,
                "current_backup": str(current_backup),
                "restored_at": datetime.now().isoformat(),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "backup_file": backup_file,
                "target_file": target_file,
            }

    def delete_backup(self, backup_file: str) -> Dict[str, Any]:
        """
        Delete a specific backup file.

        Args:
            backup_file: Path to the backup file to delete

        Returns:
            Result dictionary with success status
        """
        try:
            backup_path = Path(backup_file)
            if not backup_path.exists():
                return {
                    "success": False,
                    "error": f"Backup file not found: {backup_file}",
                }

            backup_path.unlink()

            return {
                "success": True,
                "deleted_file": str(backup_path),
                "deleted_at": datetime.now().isoformat(),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "backup_file": backup_file,
            }


# Global instance
patch_reverter = PatchReverter()
