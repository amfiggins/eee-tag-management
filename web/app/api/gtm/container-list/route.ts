/**
 * GTM Container List API Route
 * Lists all container IDs and names quickly (without tags)
 * Uses spawn for real-time processing with comprehensive error reporting
 * Returns partial results on timeout
 * 
 * Author: Anthony Figgins
 * Version: 1.0.5
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

// Increase timeout for this route (default is 10s, we need up to 10 minutes)
export const maxDuration = 600; // 10 minutes in seconds

interface ContainerListItem {
  containerId: string;
  containerName?: string;
}

/**
 * Get a quick list of all containers (just IDs and names, no tags)
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        },
        { status: 400 }
      );
    }

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

    // Use spawn to get real-time output for progress tracking
    return new Promise<NextResponse>((resolve) => {
        const pythonProcess = spawn('python3', [
          pythonScript,
          '--tag-name', '3E_Pop-up',
          '--account-id', accountId,
          '--credentials', fixedCredentialsPath,
          '--list-only',
          '--delay', '0.5'
        ], {
          cwd: join(process.cwd(), '..', 'automation'),
        });

        const containers: ContainerListItem[] = [];
        let stdout = '';
        let stderr = '';
        let totalContainers = 0;
        let timeoutId: NodeJS.Timeout | null = null;

        pythonProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          stdout += chunk;
          
          // Parse container IDs as they come in
          const lines = chunk.split('\n');
          for (const line of lines) {
            // Look for total count
            const totalMatch = line.match(/Found (\d+) container\(s\)/);
            if (totalMatch) {
              totalContainers = parseInt(totalMatch[1], 10);
            }

            // Look for container IDs
            const containerMatch = line.match(/(?:Container ID:|Processing container:|\[LIST ONLY\]\s*Processing container:|\[\d+\/\d+\]\s*Processing container:)\s*(\d+)/);
            if (containerMatch) {
              const containerId = containerMatch[1];
              if (!containers.find(c => c.containerId === containerId)) {
                containers.push({ containerId });
              }
            }
          }
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString();
          stderr += chunk;
          console.log('Python stderr:', chunk.substring(0, 500));
        });

        pythonProcess.on('close', (code: number) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          console.log(`Python process closed with code ${code}, found ${containers.length} containers`);
          
          if (code === 0) {
            resolve(NextResponse.json({
              success: true,
              containers,
              totalContainers: containers.length,
            }));
          } else {
            // Check for errors in stderr
            const errorLines = stderr.split('\n').filter((line: string) => 
              line.trim() && 
              !line.includes('FutureWarning') &&
              !line.includes('warnings.warn') &&
              (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed'))
            );
            
            // Also check stdout for errors
            const stdoutErrorLines = stdout.split('\n').filter((line: string) => 
              line.trim() && 
              (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed') || line.includes('ERROR'))
            );
            
            // Combine error messages
            const allErrorLines = [...errorLines, ...stdoutErrorLines];
            const errorMessage = allErrorLines.length > 0 
              ? allErrorLines.join('\n')
              : `Process exited with code ${code}`;
            
            console.error('Python script error (code', code, '):', errorMessage);
            console.error('Full stderr:', stderr);
            console.error('Full stdout (last 1000 chars):', stdout.substring(Math.max(0, stdout.length - 1000)));
            
            // Return comprehensive error details
            const errorDetails = [
              `Exit code: ${code}`,
              stderr ? `stderr:\n${stderr}` : 'No stderr output',
              stdout ? `stdout (last 500 chars):\n${stdout.substring(Math.max(0, stdout.length - 500))}` : 'No stdout output'
            ].join('\n\n');
            
            resolve(NextResponse.json(
              { 
                success: false,
                error: errorMessage || `Process exited with code ${code}`,
                details: errorDetails.substring(0, 2000) // Limit to 2000 chars
              },
              { status: 500 }
            ));
          }
        });

        pythonProcess.on('error', (error: Error) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          console.error('Failed to start Python process:', error);
          resolve(NextResponse.json(
            { 
              success: false,
              error: `Failed to start Python script: ${error.message}`,
              details: error.stack
            },
            { status: 500 }
          ));
        });

        // Timeout after 10 minutes (increased for 126+ containers)
        timeoutId = setTimeout(() => {
          console.error('Container list request timed out after 10 minutes');
          console.log(`Found ${containers.length} containers before timeout`);
          pythonProcess.kill();
          // Return what we have found so far - better than nothing
          if (containers.length > 0) {
            resolve(NextResponse.json({
              success: true,
              containers,
              totalContainers: containers.length,
              note: `Request timed out after 10 minutes, but found ${containers.length} containers. You can refresh individual containers to get the rest.`,
              partial: true,
            }));
          } else {
            resolve(NextResponse.json(
              { 
                success: false,
                error: 'Request timeout: Script took longer than 10 minutes',
                details: `No containers found before timeout. Check server logs for details.`
              },
              { status: 500 }
            ));
          }
        }, 600000); // 10 minutes
      });
  } catch (error: any) {
    console.error('Error listing containers:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to list containers';
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error?.stack || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

