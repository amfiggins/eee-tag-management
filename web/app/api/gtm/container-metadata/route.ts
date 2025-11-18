/**
 * GTM Container Metadata API Route
 * Gets container metadata including fingerprint for change detection
 * 
 * Author: Anthony Figgins
 * Version: 1.0.0
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

interface ContainerMetadata {
  containerId: string;
  fingerprint?: string;
  name?: string;
  accountId?: string;
}

/**
 * Get metadata for a single container or all containers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { containerId, accountId, credentialsPath, getAll } = body;

    if (!accountId || !credentialsPath) {
      return NextResponse.json(
        { error: 'Account ID and credentials path are required' },
        { status: 400 }
      );
    }

    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }

    // For now, we'll parse container metadata from the list_containers output
    // In the future, we could add a Python method to get individual container details
    const listCommand = `python3 "${pythonScript}" --tag-name "3E_Pop-up" --account-id "${accountId}" --credentials "${fixedCredentialsPath}" --list-only --delay 1.0`;
    
    try {
      const result = await Promise.race([
        execAsync(listCommand, {
          cwd: join(process.cwd(), '..', 'automation'),
          maxBuffer: 10 * 1024 * 1024,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 60000)
        )
      ]) as { stdout: string; stderr: string };

      // Parse container IDs from output
      const lines = result.stdout.split('\n');
      const containers: ContainerMetadata[] = [];
      
      for (const line of lines) {
        // Look for "Container ID: XXXXX" or "Processing container: XXXXX"
        const containerMatch = line.match(/(?:Container ID:|Processing container:)\s*(\d+)/);
        if (containerMatch) {
          const id = containerMatch[1];
          // Check if we already have this container
          if (!containers.find(c => c.containerId === id)) {
            containers.push({
              containerId: id,
            });
          }
        }
      }

      // If a specific container ID was requested, return just that one
      if (containerId && !getAll) {
        const container = containers.find(c => c.containerId === containerId);
        if (container) {
          return NextResponse.json({
            success: true,
            container,
          });
        } else {
          return NextResponse.json(
            { error: 'Container not found' },
            { status: 404 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        containers,
      });
    } catch (execError: any) {
      console.error('Command execution error:', execError);
      
      let errorMessage = 'Failed to get container metadata';
      if (execError.stderr) {
        const errorLines = String(execError.stderr).split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FutureWarning') &&
          (line.includes('Error') || line.includes('Traceback') || line.includes('Exception'))
        );
        if (errorLines.length > 0) {
          errorMessage = errorLines.slice(-3).join('\n');
        }
      } else if (execError.message) {
        errorMessage = execError.message;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error getting container metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get container metadata' },
      { status: 500 }
    );
  }
}

