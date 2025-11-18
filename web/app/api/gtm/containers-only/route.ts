/**
 * GTM Containers Only API Route
 * Just lists container IDs and names - no tag processing (fast!)
 * Uses --containers-only flag to skip all tag processing
 * 
 * Author: Anthony Figgins
 * Version: 1.0.2
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

// Increase timeout
export const maxDuration = 60; // 1 minute should be enough for just listing

interface ContainerListItem {
  containerId: string;
  containerName?: string;
}

/**
 * Get just the container list - no tag processing
 * This should be fast since it just calls list_containers() API
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

    return new Promise<NextResponse>((resolve) => {
      // Use the new --containers-only flag - no tag processing at all!
      const pythonProcess = spawn('python3', [
        '-u', // Unbuffered
        pythonScript,
        '--account-id', accountId,
        '--credentials', fixedCredentialsPath,
        '--containers-only', // This flag skips all tag processing
        '--delay', '1.1' // Respect GTM rate limits (100 req/100 sec = 1 req/sec, use 1.1 to be safe)
      ], {
        cwd: join(process.cwd(), '..', 'automation'),
      });

      const containers: ContainerListItem[] = [];
      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;

      let containerCountFound = false;
      let resolved = false;
      
      pythonProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log('STDOUT:', chunk);
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          // Look for container count
          const countMatch = line.match(/Found (\d+) container\(s\)/);
          if (countMatch && !containerCountFound) {
            containerCountFound = true;
            const total = parseInt(countMatch[1], 10);
            console.log(`Found ${total} containers total`);
          }
          
          // Look for "Container ID: XXXXX | Name: YYYY" pattern (from --containers-only mode)
          const containerWithNameMatch = line.match(/^Container ID:\s*(\d+)\s*\|\s*Name:\s*(.+)$/);
          if (containerWithNameMatch) {
            const containerId = containerWithNameMatch[1];
            const containerName = containerWithNameMatch[2].trim();
            if (!containers.find(c => c.containerId === containerId)) {
              containers.push({ containerId, containerName });
              console.log(`Found container: ${containerId} (${containerName}) (${containers.length} so far)`);
            }
          } else {
            // Fallback: Look for "Container ID: XXXXX" pattern (without name)
            const containerIdMatch = line.match(/^Container ID:\s*(\d+)$/);
            if (containerIdMatch) {
              const containerId = containerIdMatch[1];
              if (!containers.find(c => c.containerId === containerId)) {
                containers.push({ containerId });
                console.log(`Found container: ${containerId} (${containers.length} so far)`);
              }
            }
          }
          
          // Also look for "Total containers: X" at the end
          const totalMatch = line.match(/^Total containers:\s*(\d+)$/);
          if (totalMatch) {
            const total = parseInt(totalMatch[1], 10);
            console.log(`Total containers: ${total}`);
          }
        }
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log('STDERR:', chunk);
      });

      pythonProcess.on('close', (code: number) => {
        if (resolved) return;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        resolved = true;
        
        // Even if code is not 0, if we got containers, return them
        if (containers.length > 0) {
          resolve(NextResponse.json({
            success: true,
            containers,
            totalContainers: containers.length,
            note: code !== 0 ? 'Process exited with non-zero code but containers were found' : undefined,
          }));
        } else if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            containers: [],
            totalContainers: 0,
            note: 'No containers found',
          }));
        } else {
          resolve(NextResponse.json(
            { 
              success: false,
              error: `Process exited with code ${code}`,
              details: stderr.substring(0, 1000)
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
        resolved = true;
        resolve(NextResponse.json(
          { 
            success: false,
            error: `Failed to start Python process: ${error.message}`,
          },
          { status: 500 }
        ));
      });

      timeoutId = setTimeout(() => {
        if (resolved) return;
        pythonProcess.kill();
        resolved = true;
        resolve(NextResponse.json(
          { 
            success: containers.length > 0,
            containers,
            totalContainers: containers.length,
            error: containers.length === 0 ? 'Request timeout' : undefined,
            note: containers.length > 0 ? `Found ${containers.length} containers before timeout` : undefined,
          },
          { status: containers.length > 0 ? 200 : 500 }
        ));
      }, 60000);
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

