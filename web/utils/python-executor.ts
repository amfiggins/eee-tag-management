/**
 * Python Executor Utility
 * Finds the best Python executable (prefers 3.11+, falls back to python3)
 * 
 * Author: Anthony Figgins
 * Version: 1.0.0
 * Date Updated: 2025-11-17
 */

import { execSync } from 'child_process';

let cachedPythonPath: string | null = null;

/**
 * Find the best Python executable
 * Tries python3.11, python3.10, then python3
 * Returns the first one that exists and has version >= 3.10
 */
export function findPythonExecutable(): string {
  if (cachedPythonPath) {
    return cachedPythonPath;
  }

  const candidates = [
    '/opt/homebrew/bin/python3.11', // Homebrew Python 3.11 on Apple Silicon
    '/usr/local/bin/python3.11',   // Homebrew Python 3.11 on Intel
    'python3.11',
    'python3.10',
    'python3',
  ];

  for (const candidate of candidates) {
    try {
      const version = execSync(`"${candidate}" --version`, { 
        encoding: 'utf-8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      
      // Check if version is 3.10 or higher
      const versionMatch = version.match(/Python (\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1], 10);
        const minor = parseInt(versionMatch[2], 10);
        if (major > 3 || (major === 3 && minor >= 10)) {
          cachedPythonPath = candidate;
          return candidate;
        }
      }
    } catch (error) {
      // Candidate doesn't exist or failed, try next one
      continue;
    }
  }

  // Fallback to python3 even if version check failed
  cachedPythonPath = 'python3';
  return 'python3';
}

/**
 * Get Python version string
 */
export function getPythonVersion(executable?: string): string {
  const python = executable || findPythonExecutable();
  try {
    return execSync(`"${python}" --version`, { 
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (error) {
    return 'Unknown';
  }
}

