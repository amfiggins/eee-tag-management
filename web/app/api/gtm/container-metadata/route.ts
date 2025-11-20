/**
 * GTM Container Metadata API Route
 * Gets container metadata including permissions, last updated date, etc.
 * 
 * Author: Anthony Figgins
 * Version: 2.0.0
 * Date Updated: 2025-11-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync, existsSync, unlinkSync } from 'fs';
import { findPythonExecutable } from '@/utils/python-executor';
import { getContainerFromCache, updateContainerMetadataInCache } from '@/utils/cache-manager';

interface ContainerMetadata {
  containerId: string;
  name?: string;
  accountId: string;
  lastUpdated?: string;
  permissions: {
    canRead: boolean;
    canEdit: boolean;
    canPublish: boolean;
  };
}

/**
 * Get container metadata
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { containerId, accountId, credentialsPath, allAccounts } = body;

    if (!containerId || !accountId || !credentialsPath) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Container ID, Account ID, and credentials path are required' 
        },
        { status: 400 }
      );
    }

    // Check unified cache first
    const allAccountsBool = allAccounts === true || allAccounts === 'true';
    const cachedContainer = await getContainerFromCache(containerId, accountId, allAccountsBool);
    if (cachedContainer && cachedContainer.metadata) {
      console.log(`[CACHE HIT] Returning cached metadata for container ${containerId}`);
      return NextResponse.json({
        success: true,
        metadata: cachedContainer.metadata as ContainerMetadata,
        fromCache: true,
      });
    }
    
    console.log(`[CACHE MISS] Fetching metadata for container ${containerId}`);

    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }

    // Use spawn to execute Python script properly
    return new Promise<NextResponse>((resolve) => {
      const tmpScriptPath = join(process.cwd(), '..', 'automation', '.tmp_get_metadata.py');
      
      const pythonCode = `import sys
import os
import json
# Redirect all print() statements to stderr so they don't interfere with JSON output
sys.stdout = sys.stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from gtm_tag_updater import GTMTagUpdater
    updater = GTMTagUpdater('${fixedCredentialsPath}', '${accountId}')
    metadata = updater.get_container_metadata('${containerId}', account_id='${accountId}')
    # Write JSON directly to stdout file descriptor (fd 1) to bypass the stdout redirection
    result = json.dumps({"success": True, "metadata": metadata})
    os.write(1, result.encode('utf-8'))
    os.write(1, b'\\n')
except Exception as e:
    # Return error details as JSON
    error_msg = str(e)
    error_type = type(e).__name__
    result = json.dumps({"success": False, "error": error_msg, "error_type": error_type})
    os.write(1, result.encode('utf-8'))
    os.write(1, b'\\n')
`;

      try {
        writeFileSync(tmpScriptPath, pythonCode, 'utf8');
        
        const pythonExecutable = findPythonExecutable();
        const pythonProcess = spawn(pythonExecutable, ['-u', tmpScriptPath], {
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

          // Check for errors
          const errorLines = stderr.split('\n').filter((line: string) => 
            line.trim() && 
            !line.includes('FutureWarning') &&
            (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('ERROR'))
          );

          if (code !== 0 || errorLines.length > 0) {
            let errorMessage = 'Unknown error';
            if (errorLines.length > 0) {
              errorMessage = errorLines.join('\n');
            } else if (stderr) {
              errorMessage = stderr.substring(0, 200);
            }
            
            resolve(NextResponse.json(
              { 
                success: false,
                error: `Python script error: ${errorMessage}`,
                details: `Exit code: ${code}\n\nSTDERR:\n${stderr.substring(0, 1000)}`
              },
              { status: 500 }
            ));
            return;
          }

          // Try to parse JSON output
          try {
            if (!stdout.trim()) {
              throw new Error('No output from Python script');
            }

            const result = JSON.parse(stdout.trim());
            
            if (result.success === false) {
              resolve(NextResponse.json(
                { 
                  success: false,
                  error: result.error || 'Python script returned an error',
                  errorType: result.error_type,
                },
                { status: 500 }
              ));
              return;
            }

            const metadata: ContainerMetadata = result.metadata;

            // Save to unified cache
            updateContainerMetadataInCache(containerId, accountId, allAccountsBool, metadata)
              .then(() => {
                console.log(`[CACHE] Saved metadata for container ${containerId} to unified cache`);
              })
              .catch((err) => {
                console.error(`[CACHE] Failed to save metadata for container ${containerId}:`, err);
              });

            resolve(NextResponse.json({
              success: true,
              metadata,
              fromCache: false,
            }));
          } catch (parseError: any) {
            resolve(NextResponse.json(
              { 
                success: false,
                error: `Failed to parse metadata: ${parseError.message}`,
                details: `STDOUT (first 500 chars): ${stdout.substring(0, 500)}\n\nSTDERR: ${stderr.substring(0, 500)}`
              },
              { status: 500 }
            ));
          }
        });

        pythonProcess.on('error', (error: Error) => {
          if (resolved) return;
          resolved = true;
          
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
            },
            { status: 500 }
          ));
        });
      } catch (writeError: any) {
        resolve(NextResponse.json(
          { 
            success: false,
            error: `Failed to create temporary script: ${writeError.message}`,
          },
          { status: 500 }
        ));
      }
    });
  } catch (error: any) {
    console.error('Error getting container metadata:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get container metadata',
      },
      { status: 500 }
    );
  }
}
