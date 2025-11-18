/**
 * GTM Container Stream API Route
 * Streams container processing with real-time progress updates
 * Caches containers incrementally as they're processed
 * Includes timeout detection and detailed error reporting
 * 
 * Author: Anthony Figgins
 * Version: 1.1.1
 * Date Updated: 2025-11-17
 */

import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

// Increase timeout for this route (default is 10s, we need up to 10 minutes for streaming)
export const maxDuration = 600; // 10 minutes in seconds

interface ContainerInfo {
  containerId: string;
  containerName?: string;
  tags: any[];
  lastUpdated?: string;
  fingerprint?: string;
}

/**
 * Stream container processing with progress updates
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const { accountId, credentialsPath, containerIds } = body;

        if (!accountId || !credentialsPath) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Account ID and credentials path are required' })}\n\n`));
          controller.close();
          return;
        }

        const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
        
        let fixedCredentialsPath = credentialsPath;
        if (credentialsPath.startsWith('automation/')) {
          fixedCredentialsPath = credentialsPath.replace('automation/', '');
        }

        // If specific container IDs provided, process only those
        // Otherwise, process all containers
        const containersToProcess = containerIds || [];
        
        // Send initial progress
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Starting container processing...', total: containersToProcess.length || 'unknown' })}\n\n`));

        // Build Python command arguments
        const pythonArgs = [
          pythonScript,
          '--tag-name', '3E_Pop-up',
          '--account-id', accountId,
          '--credentials', fixedCredentialsPath,
          '--list-only',
          '--verbose',
          '--delay', '1.0'
        ];

        // Add --containers if specific containers are requested
        if (containersToProcess.length > 0) {
          pythonArgs.push('--containers', containersToProcess.join(','));
        }

        console.log('Starting Python process with args:', pythonArgs);
        
        const pythonProcess = spawn('python3', pythonArgs, {
          cwd: join(process.cwd(), '..', 'automation'),
        });

        let stdout = '';
        let stderr = '';
        let currentContainer: ContainerInfo | null = null;
        let processedCount = 0;
        let totalContainers = 0;
        let hasReceivedOutput = false;
        let lastOutputTime = Date.now();
        const OUTPUT_TIMEOUT = 30000; // 30 seconds without output = stuck
        let heartbeatInterval: NodeJS.Timeout | null = null;
        let outputTimeout: NodeJS.Timeout | null = null;

        // Send heartbeat every 5 seconds to show we're alive
        heartbeatInterval = setInterval(() => {
          if (!hasReceivedOutput) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              message: 'Waiting for Python script to start...',
              current: 0,
              total: 0
            })}\n\n`));
          } else {
            const timeSinceLastOutput = Date.now() - lastOutputTime;
            if (timeSinceLastOutput > OUTPUT_TIMEOUT) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                error: `No output received for ${Math.floor(timeSinceLastOutput / 1000)} seconds. Process may be stuck.`,
                details: `Last output: ${stdout.substring(stdout.length - 200)}`
              })}\n\n`));
              if (heartbeatInterval) clearInterval(heartbeatInterval);
              if (outputTimeout) clearTimeout(outputTimeout);
              pythonProcess.kill();
              controller.close();
              return;
            }
          }
        }, 5000);

        // Reset output timeout whenever we get output
        const resetOutputTimeout = () => {
          if (outputTimeout) clearTimeout(outputTimeout);
          outputTimeout = setTimeout(() => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'No output received for 30 seconds. Process may be stuck.',
              details: `stdout: ${stdout.substring(Math.max(0, stdout.length - 500))}\nstderr: ${stderr.substring(Math.max(0, stderr.length - 500))}`
            })}\n\n`));
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            pythonProcess.kill();
            controller.close();
          }, OUTPUT_TIMEOUT);
        };

        // Initialize the timeout
        resetOutputTimeout();

        pythonProcess.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          stdout += chunk;
          hasReceivedOutput = true;
          lastOutputTime = Date.now();
          resetOutputTimeout();
          
          // Log ALL output for debugging
          console.log('Python stdout chunk:', chunk);
          
          // Send raw output as progress update so user can see what's happening
          if (chunk.trim()) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              message: `Received output: ${chunk.substring(0, 100).replace(/\n/g, ' ')}...`,
              current: 0,
              total: 0,
              raw: chunk.substring(0, 500)
            })}\n\n`));
          }
          
          const lines = chunk.split('\n');
          for (const line of lines) {
            // Detect total container count - try multiple patterns
            const totalMatch = line.match(/Found (\d+) container\(s\)/);
            if (totalMatch) {
              totalContainers = parseInt(totalMatch[1], 10);
              console.log(`Detected ${totalContainers} containers`);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: `Found ${totalContainers} containers`, total: totalContainers, current: 0 })}\n\n`));
            }
            
            // Also look for "Fetching all containers..." to show we're starting
            if (line.includes('Fetching all containers')) {
              console.log('Detected: Fetching all containers');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: 'Fetching all containers...', current: 0, total: 0 })}\n\n`));
            }
            
            // Look for LIST ONLY mode message
            if (line.includes('[LIST ONLY]')) {
              console.log('Detected: LIST ONLY mode');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', message: line.trim(), current: 0, total: 0 })}\n\n`));
            }

            // Detect container start - try multiple patterns
            let containerMatch = line.match(/\[(\d+)\/(\d+)\]\s*Processing container:\s*(\d+)/);
            if (!containerMatch) {
              // Try without brackets
              containerMatch = line.match(/Processing container:\s*(\d+)/);
              if (containerMatch) {
                // Extract from context if available
                const current = processedCount + 1;
                const total = totalContainers || 0;
                const containerId = containerMatch[1];
                containerMatch = [null, current.toString(), total.toString(), containerId];
              }
            }
            
            if (containerMatch) {
              const current = parseInt(containerMatch[1], 10);
              const total = parseInt(containerMatch[2], 10);
              const containerId = containerMatch[3];
              console.log(`Processing container ${current}/${total}: ${containerId}`);
              
              // Save previous container if it had tags
              if (currentContainer && currentContainer.tags.length > 0) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'container', 
                  container: currentContainer,
                  progress: { current, total }
                })}\n\n`));
                processedCount++;
              }
              
              currentContainer = {
                containerId,
                tags: [],
                lastUpdated: new Date().toISOString(),
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                message: `Processing container ${current} of ${total}: ${containerId}`,
                current,
                total
              })}\n\n`));
            }

            // Look for tags
            if (line.includes('All tags in container') && currentContainer) {
              // Tags will be in subsequent lines
            }
            
            if (line.trim().startsWith('-') && currentContainer) {
              const tagNameMatch = line.match(/^-\s+(.+)$/);
              if (tagNameMatch) {
                const tagName = tagNameMatch[1].trim();
                if (tagName.includes('3E') || tagName.includes('Template')) {
                  currentContainer.tags.push({
                    tagId: '',
                    tagName,
                  });
                }
              }
            }

            // Look for "Found tag" with version
            if (line.includes('Found tag:') && currentContainer) {
              const foundMatch = line.match(/Found tag:\s*([^\s\(]+).*Version:\s*([^\s\)]+)/);
              if (foundMatch) {
                const tagName = foundMatch[1];
                const version = foundMatch[2];
                const existingTag = currentContainer.tags.find(t => t.tagName === tagName);
                if (existingTag) {
                  existingTag.version = version;
                } else if (tagName.includes('3E') || tagName.includes('Template')) {
                  currentContainer.tags.push({
                    tagId: '',
                    tagName,
                    version,
                  });
                }
              }
            }
          }
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString();
          stderr += chunk;
          hasReceivedOutput = true;
          lastOutputTime = Date.now();
          resetOutputTimeout();
          
          console.log('Python stderr chunk:', chunk.substring(0, 200));
          
          // Filter out FutureWarning
          if (!chunk.includes('FutureWarning') && !chunk.includes('warnings.warn')) {
            const errorLines = chunk.split('\n').filter((line: string) => 
              line.trim() && 
              (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed'))
            );
            if (errorLines.length > 0) {
              console.error('Python error detected:', errorLines);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'error', 
                error: errorLines.join('\n'),
                details: stderr.substring(stderr.length - 1000)
              })}\n\n`));
              if (heartbeatInterval) clearInterval(heartbeatInterval);
              if (outputTimeout) clearTimeout(outputTimeout);
              pythonProcess.kill();
              controller.close();
              return;
            }
          }
        });

        pythonProcess.on('close', (code) => {
          console.log(`Python process closed with code ${code}`);
          
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          if (outputTimeout) clearTimeout(outputTimeout);
          
          // Send last container if it has tags
          if (currentContainer && currentContainer.tags.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'container', 
              container: currentContainer,
              progress: { current: processedCount + 1, total: totalContainers || processedCount + 1 }
            })}\n\n`));
            processedCount++;
          }

          if (code === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'complete', 
              message: `Processed ${processedCount} containers`,
              total: processedCount
            })}\n\n`));
          } else {
            const errorDetails = stderr || stdout.substring(stdout.length - 500);
            console.error(`Process exited with code ${code}, stderr:`, stderr);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: `Process exited with code ${code}`,
              details: errorDetails.substring(0, 1000)
            })}\n\n`));
          }
          controller.close();
        });

        pythonProcess.on('error', (error) => {
          console.error('Python process error:', error);
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          if (outputTimeout) clearTimeout(outputTimeout);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: `Failed to start Python process: ${error.message}`,
            details: error.stack || error.toString()
          })}\n\n`));
          controller.close();
        });

      } catch (error: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          error: error.message || 'Unknown error'
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

