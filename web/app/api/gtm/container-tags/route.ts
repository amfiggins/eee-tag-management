/**
 * GTM Container Tags API Route
 * Gets all tags from a specific container, optionally filtered for 3E tags
 * Uses temporary file to avoid shell escaping issues
 * Improved error handling to always return valid JSON
 * 
 * Author: Anthony Figgins
 * Version: 1.0.2
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync, existsSync, unlinkSync } from 'fs';

interface ContainerTag {
  tagId: string;
  tagName: string;
  version?: string;
}

/**
 * Get tags from a specific container
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { containerId, accountId, credentialsPath, filter3E } = body;

    if (!containerId || !accountId || !credentialsPath) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Container ID, Account ID, and credentials path are required' 
        },
        { status: 400 }
      );
    }

    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }

    // Use spawn to execute Python script properly and avoid shell escaping issues
    return new Promise<NextResponse>((resolve) => {
      // Create a temporary Python script file to avoid shell escaping issues
      const tmpScriptPath = join(process.cwd(), '..', 'automation', '.tmp_get_tags.py');
      
      const pythonCode = `import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from gtm_tag_updater import GTMTagUpdater
    updater = GTMTagUpdater('${fixedCredentialsPath}', '${accountId}')
    tags = updater.get_tags_in_container('${containerId}', filter_3e=${filter3E ? 'True' : 'False'})
    print(json.dumps(tags))
except Exception as e:
    # Return empty list on error, not an error message
    print(json.dumps([]))
`;

      try {
        // Write temporary script
        writeFileSync(tmpScriptPath, pythonCode, 'utf8');
        
        // Execute it
        const pythonProcess = spawn('python3', ['-u', tmpScriptPath], {
          cwd: join(process.cwd(), '..', 'automation'),
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let resolved = false;

        pythonProcess.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code: number) => {
          // Clean up temp file
          try {
            if (existsSync(tmpScriptPath)) {
              unlinkSync(tmpScriptPath);
            }
          } catch (e) {
            // Ignore cleanup errors
          }

          if (resolved) return;
          resolved = true;

          // Check for errors in stderr first
          const errorLines = stderr.split('\n').filter((line: string) => 
            line.trim() && 
            !line.includes('FutureWarning') &&
            !line.includes('warnings.warn') &&
            (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('ERROR'))
          );

          // Also check stdout for error messages (Python might print errors to stdout)
          const stdoutTrimmed = stdout.trim();
          const hasErrorInStdout = stdoutTrimmed && (
            stdoutTrimmed.startsWith('ERROR:') ||
            stdoutTrimmed.startsWith('Error:') ||
            stdoutTrimmed.startsWith('Traceback') ||
            stdoutTrimmed.includes('An error') ||
            !stdoutTrimmed.startsWith('[') && !stdoutTrimmed.startsWith('{') // Not valid JSON
          );

          if (code !== 0 || errorLines.length > 0 || hasErrorInStdout) {
            // There was an error
            let errorMessage = 'Unknown error';
            
            if (errorLines.length > 0) {
              errorMessage = errorLines.join('\n');
            } else if (hasErrorInStdout) {
              errorMessage = stdoutTrimmed.substring(0, 200);
            } else if (stderr) {
              errorMessage = stderr.substring(0, 200);
            }
            
            resolve(NextResponse.json(
              { 
                success: false,
                error: `Python script error: ${errorMessage}`,
                details: `Exit code: ${code}\n\nSTDERR:\n${stderr.substring(0, 1000)}\n\nSTDOUT:\n${stdout.substring(0, 1000)}`
              },
              { status: 500 }
            ));
            return;
          }

          // Try to parse JSON output
          try {
            if (!stdoutTrimmed) {
              throw new Error('No output from Python script');
            }

            // Parse JSON output
            const tags: ContainerTag[] = JSON.parse(stdoutTrimmed);

            resolve(NextResponse.json({
              success: true,
              containerId,
              tags,
              count: tags.length,
            }));
          } catch (parseError: any) {
            resolve(NextResponse.json(
              { 
                success: false,
                error: `Failed to parse tags: ${parseError.message}`,
                details: `STDOUT (first 500 chars): ${stdout.substring(0, 500)}\n\nSTDERR: ${stderr.substring(0, 500)}`
              },
              { status: 500 }
            ));
          }
        });

        pythonProcess.on('error', (error: Error) => {
          if (resolved) return;
          resolved = true;
          
          // Clean up temp file
          try {
            if (existsSync(tmpScriptPath)) {
              unlinkSync(tmpScriptPath);
            }
          } catch (e) {
            // Ignore cleanup errors
          }

          resolve(NextResponse.json(
            { 
              success: false,
              error: `Failed to start Python process: ${error.message}`,
              details: error.stack
            },
            { status: 500 }
          ));
        });
      } catch (writeError: any) {
        resolve(NextResponse.json(
          { 
            success: false,
            error: `Failed to create temporary script: ${writeError.message}`,
            details: writeError.stack
          },
          { status: 500 }
        ));
      }
    });
  } catch (error: any) {
    console.error('Error getting container tags:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get container tags',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

