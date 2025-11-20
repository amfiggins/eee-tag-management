/**
 * GTM Container Tags API Route
 * Gets all tags from a specific container, optionally filtered for 3E tags
 * Uses temporary file to avoid shell escaping issues
 * Improved error handling to always return valid JSON
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
import { getContainerFromCache, updateContainerTagsInCache } from '@/utils/cache-manager';

interface ContainerTag {
  tagId: string;
  tagName: string;
  version?: string;
  paused?: boolean; // Tag paused status
}

/**
 * Get tags from a specific container
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { containerId, accountId, credentialsPath, filter3E, allAccounts } = body;
    
    // Debug logging
    console.log(`[API] Getting tags for container ${containerId}, filter3E: ${filter3E} (type: ${typeof filter3E})`);
    console.log(`[API] filter3E === true: ${filter3E === true}, filter3E === 'true': ${filter3E === 'true'}`);
    const filterValue = filter3E === true || filter3E === 'true' ? 'True' : 'False';
    console.log(`[API] Passing filter_3e=${filterValue} to Python`);

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
    const filter3EBool = filter3E === true || filter3E === 'true';
    const allAccountsBool = allAccounts === true || allAccounts === 'true';
    const cachedContainer = await getContainerFromCache(containerId, accountId, allAccountsBool);
    
    if (cachedContainer) {
      // Check if we have cached tags for the requested filter
      const cachedTags = filter3EBool 
        ? (cachedContainer.tagsFilter3E || cachedContainer.tags)
        : cachedContainer.tags;
      
      if (cachedTags && cachedTags.length > 0) {
        console.log(`[CACHE HIT] Returning ${cachedTags.length} cached tags for container ${containerId} (filter3E=${filter3EBool})`);
        return NextResponse.json({
          success: true,
          containerId,
          tags: cachedTags as ContainerTag[],
          count: cachedTags.length,
          fromCache: true,
        });
      }
    }
    
    console.log(`[CACHE MISS] Fetching tags for container ${containerId}`);

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
# Redirect all print() statements to stderr so they don't interfere with JSON output
sys.stdout = sys.stderr

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from gtm_tag_updater import GTMTagUpdater
    updater = GTMTagUpdater('${fixedCredentialsPath}', '${accountId}')
    # Use the container's accountId if different from the primary account
    # Pass accountId to get_tags_in_container so it uses the correct account
    filter_3e_value = ${filter3E === true || filter3E === 'true' ? 'True' : 'False'}
    print(f"[DEBUG] filter_3e parameter: {filter_3e_value}", file=sys.stderr)
    tags = updater.get_tags_in_container('${containerId}', filter_3e=filter_3e_value, account_id='${accountId}')
    # Write JSON directly to stdout file descriptor (fd 1) to bypass the stdout redirection
    result = json.dumps({"success": True, "tags": tags})
    os.write(1, result.encode('utf-8'))
    os.write(1, b'\\n')
except Exception as e:
    # Return error details as JSON
    error_msg = str(e)
    error_type = type(e).__name__
    # Check for Python version compatibility issues
    if "packages_distributions" in error_msg or "importlib.metadata" in error_msg:
        error_msg = "Python version compatibility error: This requires Python 3.10+. You are using Python " + str(sys.version_info.major) + "." + str(sys.version_info.minor) + ". Please upgrade Python or use a virtual environment with Python 3.10+."
    result = json.dumps({"success": False, "error": error_msg, "error_type": error_type})
    os.write(1, result.encode('utf-8'))
    os.write(1, b'\\n')
`;

      try {
        // Write temporary script
        writeFileSync(tmpScriptPath, pythonCode, 'utf8');
        
        // Execute it with the best available Python
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
            const result = JSON.parse(stdoutTrimmed);
            
            // Check if Python script returned an error
            if (result.success === false) {
              resolve(NextResponse.json(
                { 
                  success: false,
                  error: result.error || 'Python script returned an error',
                  errorType: result.error_type,
                  details: `STDERR: ${stderr.substring(0, 1000)}`
                },
                { status: 500 }
              ));
              return;
            }

            // Extract tags from result (could be direct array or in result.tags)
            const tags: ContainerTag[] = Array.isArray(result) ? result : (result.tags || []);

            // Save to unified cache
            updateContainerTagsInCache(containerId, accountId, allAccountsBool, tags, filter3EBool)
              .then(() => {
                console.log(`[CACHE] Saved ${tags.length} tags for container ${containerId} to unified cache (filter3E=${filter3EBool})`);
              })
              .catch((cacheError) => {
                console.error('Error saving tags to unified cache:', cacheError);
                // Don't fail the request if cache save fails
              });

            resolve(NextResponse.json({
              success: true,
              containerId,
              tags,
              count: tags.length,
              fromCache: false,
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

