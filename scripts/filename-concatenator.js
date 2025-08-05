#!/usr/bin/env node

/**
 * Filename Concatenator Utility
 * Concatenates long filenames for display in recent activity lists
 * Format: <first 40 characters> . . . <filetype> (time)
 */

/**
 * Concatenate a filename for display
 * @param {string} filename - The full filename
 * @param {number} maxLength - Maximum length before truncation (default: 40)
 * @returns {string} - Concatenated filename
 */
function concatenateFilename(filename, maxLength = 40) {
  if (!filename || filename.length <= maxLength) {
    return filename;
  }
    
  // Extract file extension
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // No extension, just truncate
    return `${filename.substring(0, maxLength - 3)  } . . .`;
  }
    
  const name = filename.substring(0, lastDotIndex);
  const extension = filename.substring(lastDotIndex);
    
  // If name is already short enough, return as is
  if (name.length <= maxLength - 3) {
    return filename;
  }
    
  // Truncate name and add ellipsis
  const truncatedName = `${name.substring(0, maxLength - 6)  } . . .`;
  return truncatedName + extension;
}

/**
 * Format activity item with concatenated filename
 * @param {Object} activity - Activity object with file and time properties
 * @param {number} maxLength - Maximum length before truncation (default: 40)
 * @returns {string} - Formatted activity string
 */
function formatActivityItem(activity, maxLength = 40) {
  const concatenatedFile = concatenateFilename(activity.file, maxLength);
  return `   📄 ${concatenatedFile} (${activity.time})`;
}

/**
 * Format activity list for display
 * @param {Array} activities - Array of activity objects
 * @param {number} maxLength - Maximum length before truncation (default: 40)
 * @returns {Array} - Array of formatted activity strings
 */
function formatActivityList(activities, maxLength = 40) {
  return activities.map(activity => formatActivityItem(activity, maxLength));
}

module.exports = {
  concatenateFilename,
  formatActivityItem,
  formatActivityList
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
    
  if (args.length === 0) {
    console.log('Usage: node filename-concatenator.js <filename> [maxLength]');
    console.log('Example: node filename-concatenator.js "summary-v1.4.40(P1.00.20)_ui-restoration-complete.md" 40');
    process.exit(1);
  }
    
  const filename = args[0];
  const maxLength = args[1] ? parseInt(args[1]) : 40;
    
  const result = concatenateFilename(filename, maxLength);
  console.log(`Original: ${filename}`);
  console.log(`Concatenated: ${result}`);
} 