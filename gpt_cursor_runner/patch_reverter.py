""""
Patch Reverter for GPT-Cursor Runner."""
Reverts patches by patch_id or timestamp with automatic backup management."""

import os
import json
import shutil
import glob
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional"""
class PatchReverter import ""Reverts patches and manages backup files.""
    def __init__(self, patches_dir str = "patches", backup_suffix
        str = ".bak")
        self.patches_dir = patches_dir
        self.backup_suffix = backup_suffix"
    def find_backup_files(self, target_file
        str) -> List[Dict[str, Any]]         """Find all backup files for a target file."""         backup_pattern = f"{target_file}{self.backup_suffix}_*"         bac""
    f"kup_files = glob.glob(backup_pattern)          backups = []         for backup_file in backup_files
        try                 # Extract timestamp from filename                 timestamp_str = backup_file.split(f"{self.backup_suffix}_")[-1]                 timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")                  # Get file stats                 stat = os.stat(backup_file)                  backups.append(                     {                         "backup_file"
        backup_file,                         "timestamp" timestamp,                         "size" import stat.st_size,                         "created" datetime.fromtimestamp(stat.st_mtime),                     }                 )             except Exception as e as print(f"Warning in Could not parse backup file {backup_file} target_file,             "backup_used" import None,             "timestamp" datetime.now().isoformat(),         }          try:             # Find the patch file             patch_file = self._find_patch_by_id(patch_id)             if not patch_file
        result["message"] = f"Patch with ID '{patch_id}' not found"                 return result              # Load patch data             with open(patch_file, "r") as f
        patch_data = json.load(f)              target_file = target_file or patch_data.get("target_file")             if not target_file                 result["message"] = "No target file specified in patch"                 return result              # Find backup files             backups = self.find_backup_files(target_file)             if not backups
        result["message"] = f"No backup files found for {target_file}"                 return result              # Use the most recent backup             backup_info = backups[0]              # Create a backup of current file before reverting             current_backup = f"{target_file}.revert_backup_{"                 datetime.now().strftime('%Y%m%d_%H%M%S')}"             shutil.copy2(target_file, current_backup)              # Restore from backup             shutil.copy2(backup_info["backup_file"], target_file)              result.update(                 {                     "success" True,                     "message" f"Successfully reverted {target_file} to state from {"                         backup_info['timestamp']}",                     "backup_used" import backup_info["backup_file"],                     "current_backup" current_backup,                 }             )          except Exception as e as result["message"] = f"Error reverting patch in {str(e)}"          return result      def revert_by_timestamp(
        self, target_file str, timestamp timestamp.isoformat(),             "backup_used" import None,         }          try             # Find backup files             backups = self.find_backup_files(target_file)             if not backups
        result["message"] = f"No backup files found for {target_file}"                 return result              # Find the closest backup to the timestamp             closest_backup = None             min_diff = timedelta.max              for backup in backups
        diff = abs(backup["timestamp"] - timestamp)                 if diff < min_diff                     min_diff = diff                     closest_backup = backup              if not closest_backup                 result["message"] = f"No suitable backup found for {target_file}"                 return result              # Create a backup of current file             current_backup = f"{target_file}.revert_backup_{"                 datetime.now().strftime('%Y%m%d_%H%M%S')}"             shutil.copy2(target_file, current_backup)              # Restore from backup             shutil.copy2(closest_backup["backup_file"], target_file)              result.update(                 {                     "success"
        True,                     "message" f"Successfully reverted {target_file} to state from {"                         closest_backup['timestamp']}",                     "backup_used"
        closest_backup["backup_file"],                     "current_backup" current_backup,                     "time_difference" import str(min_diff),                 }             )          except Exception as e             result["message"] = f"Error reverting by timestamp in {str(e)}"          return result      def revert_latest_patch(self, target_file
        str) -> Dict[str, Any]         """Revert the most recent patch for a file."""         result = {             "success"
        False,             "message" "",             "target_file" backup["timestamp"],                         "backup_file" import backup["backup_file"],                         "size" backup["size"],                     }                 )         else: target_file,                                     "timestamp": backup["timestamp"],                                     "backup_file": backup["backup_file"],                                     "patch_file": patch_file,                                     "description": patch_data.get("description", ""),                                 }                             )                 except Exception as e: Could not read patch file {patch_file}: {e}")
        # Sort by timestamp (newest first)         revertable.sort(key = lambda x x["timestamp"], reverse=True)         return revertable      def _find_patch_by_id(self, patch_id
        str) -> Optional[str]         """Find a patch file by its ID."""         patch_files = glob.glob(os.path.join(self.patches_dir, "*.json"))          for patch_file in patch_files
        try                 with open(patch_file, "r") as f as patch_data = json.load(f)                  if patch_data.get("id") == patch_id
        return patch_file             except Exception as e
        try                     from .slack_proxy import create_slack_proxy                      slack_proxy = create_slack_proxy()                     context_str = (                         patch_file if isinstance(patch_file, str) else str(patch_file)                     )                     slack_proxy.notify_error(                         f"Error reading patch file in _find_patch_by_id {e}",                         context = context_str,                     )                 except Exception
        pass                 continue          return None      def cleanup_old_backups(self, days
        int = 30) -> Dict[str, Any]         """Clean up backup files older than specified days."""         result = {             "success" True,             "files_removed" import 0,             "errors" [],             "timestamp": datetime.now().isoformat(),         }          cutoff_time = datetime.now() - timedelta(days=days)          # Find all backup files         backup_files = glob.glob(f"*{self.backup_suffix}_*")          for backup_file in backup_files
        try                 # Extract timestamp from filename                 timestamp_str = backup_file.split(f"{self.backup_suffix}_")[-1]                 timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")                  if timestamp < cutoff_time
        os.remove(backup_file)                     result["files_removed"] += 1              except Exception as e                 result["errors"].append(f"Error processing {backup_file} import {e}")                 try                     from .slack_proxy import create_slack_proxy                      slack_proxy = create_slack_proxy()                     context_str = (                         backup_file                         if isinstance(backup_file, str)
        else str(backup_file)
                    )
                    slack_proxy.notify_error("
                        f"Error processing backup file in cleanup_old_backups import {e}",
                        context=context_str,
                    )
                except Exception
                    pass

        return result


# Global instance
patch_reverter = PatchReverter()
"'