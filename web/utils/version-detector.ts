/**
 * Extract version information from tag script headers
 */

export interface TagVersion {
  version: string;
  dateUpdated: string;
  scriptName: string;
  description?: string;
}

/**
 * Extract version from script content
 * Looks for patterns like:
 * // Version: 2.3.1
 * // Date Updated: 2025-11-17
 */
export function extractVersion(scriptContent: string): TagVersion | null {
  const lines = scriptContent.split('\n');
  
  let version = '';
  let dateUpdated = '';
  let scriptName = '';
  let description = '';
  
  for (const line of lines) {
    // Extract version
    const versionMatch = line.match(/\/\/\s*Version:\s*([^\n]+)/i);
    if (versionMatch && !version) {
      version = versionMatch[1].trim();
    }
    
    // Extract date
    const dateMatch = line.match(/\/\/\s*Date\s+Updated:\s*([^\n]+)/i);
    if (dateMatch && !dateUpdated) {
      dateUpdated = dateMatch[1].trim();
    }
    
    // Extract script name
    const nameMatch = line.match(/\/\/\s*Script\s+Name:\s*([^\n]+)/i);
    if (nameMatch && !scriptName) {
      scriptName = nameMatch[1].trim();
    }
    
    // Extract description
    const descMatch = line.match(/\/\/\s*Description:\s*([^\n]+)/i);
    if (descMatch && !description) {
      description = descMatch[1].trim();
    }
  }
  
  if (!version) {
    return null;
  }
  
  return {
    version,
    dateUpdated: dateUpdated || 'Unknown',
    scriptName: scriptName || 'Unknown',
    description: description || undefined,
  };
}

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

