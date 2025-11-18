/**
 * GTM Test Authentication API Route
 * Tests if we can authenticate and get container count
 * Returns immediately after getting container count (early return)
 * 
 * Author: Anthony Figgins
 * Version: 1.0.1
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

// Increase timeout for this route
export const maxDuration = 60; // 1 minute in seconds

/**
 * Test authentication and basic API access
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, credentialsPath } = body;

    if (!accountId || !credentialsPath) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account ID and credentials path are required' 
        },
        { status: 400 }
      );
    }

    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }
    const fullCredentialsPath = join(process.cwd(), '..', 'automation', fixedCredentialsPath);
    const tokenPath = join(process.cwd(), '..', 'automation', 'token.json');

    // Check if token exists
    const { accessSync, constants } = require('fs');
    let tokenExists = false;
    try {
      accessSync(tokenPath, constants.F_OK);
      tokenExists = true;
    } catch {
      tokenExists = false;
    }

    console.log('Testing authentication...');
    console.log('Account ID:', accountId);
    console.log('Credentials:', fullCredentialsPath);
    console.log('Token file exists:', tokenExists, tokenPath);

    return new Promise<NextResponse>((resolve) => {
      // Run script with minimal options - just try to list containers
      // Use -u flag for unbuffered output so we see output immediately
      const pythonProcess = spawn('python3', [
        '-u', // Unbuffered output
        pythonScript,
        '--tag-name', '3E_Pop-up',
        '--account-id', accountId,
        '--credentials', fixedCredentialsPath,
        '--list-only',
        '--delay', '0.1'
      ], {
        cwd: join(process.cwd(), '..', 'automation'),
        stdio: ['ignore', 'pipe', 'pipe'], // Explicitly set stdio
      });
      
      console.log('Python process spawned, PID:', pythonProcess.pid);

      let stdout = '';
      let stderr = '';
      let outputLines: string[] = [];
      let timeoutId: NodeJS.Timeout | null = null;
      let hasStarted = false;

      // Track output in real-time
      let containerCountFound = false;
      pythonProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        const lines = chunk.split('\n').filter(l => l.trim());
        lines.forEach(line => {
          outputLines.push(`[STDOUT] ${line}`);
          console.log('STDOUT:', line);
        });
        
        // Check for key messages
        if (chunk.includes('Fetching all containers') || chunk.includes('Found') || chunk.includes('container') || 
            chunk.includes('ERROR') || chunk.includes('Failed') || chunk.includes('Please visit')) {
          hasStarted = true;
        }
        
        // If we found the container count and haven't returned yet, return success immediately
        const countMatch = chunk.match(/Found (\d+) container\(s\)/);
        if (countMatch && !containerCountFound) {
          containerCountFound = true;
          const containerCount = parseInt(countMatch[1], 10);
          console.log(`Found container count: ${containerCount}, returning success immediately`);
          
          // Kill the process since we have what we need
          if (timeoutId) clearTimeout(timeoutId);
          pythonProcess.kill('SIGTERM');
          
          // Give it a moment to clean up, then force kill if needed
          setTimeout(() => {
            if (!pythonProcess.killed) {
              pythonProcess.kill('SIGKILL');
            }
          }, 1000);
          
          resolved = true;
          resolve(NextResponse.json({
            success: true,
            message: `Successfully authenticated and found ${containerCount} containers`,
            containerCount,
            note: 'Process stopped early after confirming authentication and container count',
            output: outputLines.slice(-20),
          }));
        }
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        const lines = chunk.split('\n').filter(l => l.trim() && !l.includes('FutureWarning') && !l.includes('warnings.warn'));
        lines.forEach(line => {
          outputLines.push(`[STDERR] ${line}`);
          console.log('STDERR:', line);
        });
      });

      let resolved = false;
      
      pythonProcess.on('close', (code: number) => {
        if (resolved) {
          console.log('Process closed but already resolved, ignoring');
          return;
        }
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        console.log(`Process exited with code ${code}`);
        console.log('Final stdout length:', stdout.length);
        console.log('Final stderr length:', stderr.length);
        
        // Extract container count if available
        const countMatch = stdout.match(/Found (\d+) container\(s\)/);
        const containerCount = countMatch ? parseInt(countMatch[1], 10) : null;
        
        // Extract progress - look for [X/126] pattern
        const progressMatch = stdout.match(/\[(\d+)\/(\d+)\]\s*Processing container:/);
        const currentProgress = progressMatch ? parseInt(progressMatch[1], 10) : null;
        const totalProgress = progressMatch ? parseInt(progressMatch[2], 10) : containerCount;
        
        if (code === 0 && containerCount !== null) {
          resolved = true;
          resolve(NextResponse.json({
            success: true,
            message: `Successfully authenticated and found ${containerCount} containers. Processed all containers.`,
            containerCount,
            progress: currentProgress && totalProgress ? { current: currentProgress, total: totalProgress } : null,
            output: outputLines.slice(-30), // Last 30 lines
          }));
        } else if (code === 0 || containerCount !== null) {
          // Even if process didn't exit cleanly, if we got container count, that's success
          resolved = true;
          resolve(NextResponse.json({
            success: true,
            message: `Successfully authenticated and found ${containerCount} containers${currentProgress ? `. Processed ${currentProgress} of ${totalProgress}` : ''}`,
            containerCount,
            progress: currentProgress && totalProgress ? { current: currentProgress, total: totalProgress } : null,
            output: outputLines.slice(-30),
            note: code !== 0 ? 'Process may have been interrupted but authentication worked' : null,
          }));
        } else {
          // Check for authentication errors
          const authError = stderr.includes('authentication') || stderr.includes('credentials') || stderr.includes('permission') || 
                           stdout.includes('authentication') || stdout.includes('credentials') || stdout.includes('permission');
          
          resolved = true;
          resolve(NextResponse.json(
            { 
              success: false,
              error: `Script completed but no container count found${authError ? ' (possible authentication issue)' : ''}`,
              output: outputLines,
              stdout: stdout.substring(0, 2000),
              stderr: stderr.substring(0, 2000),
            },
            { status: 500 }
          ));
        }
      });

      pythonProcess.on('error', (error: Error) => {
        if (resolved) return;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        console.error('Process error:', error);
        resolved = true;
        resolve(NextResponse.json(
          { 
            success: false,
            error: `Failed to start Python process: ${error.message}`,
            details: error.stack
          },
          { status: 500 }
        ));
      });

      // Check if process is still running after 2 seconds
      const processCheck = setTimeout(() => {
        if (pythonProcess.killed || pythonProcess.exitCode !== null) {
          console.log('Process already exited');
        } else {
          console.log('Process still running after 2 seconds, PID:', pythonProcess.pid);
          console.log('Stdout length:', stdout.length, 'Stderr length:', stderr.length);
        }
      }, 2000);
      
      // Longer timeout - 60 seconds since we're processing many containers
      timeoutId = setTimeout(() => {
        console.error('Auth test timeout after 60 seconds');
        console.log('Has started:', hasStarted);
        console.log('Stdout so far:', stdout.substring(0, 500));
        console.log('Stderr so far:', stderr.substring(0, 500));
        console.log('Process killed:', pythonProcess.killed);
        console.log('Process exit code:', pythonProcess.exitCode);
        
        if (resolved) return;
        pythonProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!pythonProcess.killed) {
            pythonProcess.kill('SIGKILL');
          }
        }, 1000);
        resolved = true;
        resolve(NextResponse.json(
          { 
            success: false,
            error: 'Request timeout: Script took longer than 60 seconds',
            details: {
              hasStarted,
              tokenExists,
              possibleIssue: !tokenExists ? 'OAuth token file missing - script may be waiting for browser authentication' : 'Unknown issue',
              stdout: stdout.substring(0, 1000),
              stderr: stderr.substring(0, 1000),
              outputLines: outputLines.slice(-10),
            }
          },
          { status: 500 }
        ));
        }, 60000);
    });
  } catch (error: any) {
    console.error('Error in auth test:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Unknown error',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

