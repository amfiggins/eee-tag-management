/**
 * GTM Test Containers API Route
 * Simple test endpoint to just list containers - no tag processing
 * 
 * Author: Anthony Figgins
 * Version: 1.0.0
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

/**
 * Simple test - just get container count
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

    console.log('Testing basic container list...');
    console.log('Account ID:', accountId);
    console.log('Credentials:', fixedCredentialsPath);
    console.log('Python script:', pythonScript);

    return new Promise<NextResponse>((resolve) => {
      // Just list containers - no tag processing, minimal delay
      const pythonProcess = spawn('python3', [
        pythonScript,
        '--tag-name', '3E_Pop-up', // Dummy tag name, we won't process it
        '--account-id', accountId,
        '--credentials', fixedCredentialsPath,
        '--list-only',
        '--delay', '0.1' // Minimal delay
      ], {
        cwd: join(process.cwd(), '..', 'automation'),
      });

      let stdout = '';
      let stderr = '';
      let containers: string[] = [];
      let timeoutId: NodeJS.Timeout | null = null;

      pythonProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log('STDOUT:', chunk);
        
        // Look for container count
        const countMatch = chunk.match(/Found (\d+) container\(s\)/);
        if (countMatch) {
          console.log('Found container count:', countMatch[1]);
        }
        
        // Look for container IDs - any format
        const containerMatches = chunk.matchAll(/(?:Container ID:|Processing container:|\[LIST ONLY\]\s*Processing container:|\[\d+\/\d+\]\s*Processing container:)\s*(\d+)/g);
        for (const match of containerMatches) {
          const containerId = match[1];
          if (!containers.includes(containerId)) {
            containers.push(containerId);
            console.log('Found container:', containerId);
          }
        }
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log('STDERR:', chunk);
      });

      pythonProcess.on('close', (code: number) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        console.log(`Process exited with code ${code}`);
        console.log(`Found ${containers.length} containers`);
        console.log('Full stdout:', stdout.substring(0, 1000));
        console.log('Full stderr:', stderr.substring(0, 1000));
        
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            containerCount: containers.length,
            containers: containers.slice(0, 10), // Just first 10 for testing
            message: `Found ${containers.length} containers`,
            stdout: stdout.substring(0, 500),
          }));
        } else {
          resolve(NextResponse.json(
            { 
              success: false,
              error: `Process exited with code ${code}`,
              details: {
                stdout: stdout.substring(0, 1000),
                stderr: stderr.substring(0, 1000),
                containersFound: containers.length
              }
            },
            { status: 500 }
          ));
        }
      });

      pythonProcess.on('error', (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        console.error('Process error:', error);
        resolve(NextResponse.json(
          { 
            success: false,
            error: `Failed to start Python process: ${error.message}`,
            details: error.stack
          },
          { status: 500 }
        ));
      });

      // Short timeout - 30 seconds for testing
      timeoutId = setTimeout(() => {
        console.error('Test timeout after 30 seconds');
        pythonProcess.kill();
        resolve(NextResponse.json(
          { 
            success: false,
            error: 'Request timeout: Script took longer than 30 seconds',
            details: {
              containersFound: containers.length,
              stdout: stdout.substring(0, 1000),
              stderr: stderr.substring(0, 1000)
            }
          },
          { status: 500 }
        ));
      }, 30000);
    });
  } catch (error: any) {
    console.error('Error in test endpoint:', error);
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

