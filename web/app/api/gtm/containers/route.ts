/**
 * GTM Container Browser API Route
 * Lists all containers and their 3E tags with fingerprint support
 * 
 * Author: Anthony Figgins
 * Version: 1.1.3
 * Date Updated: 2025-11-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

interface ContainerTag {
  tagId: string;
  tagName: string;
  version?: string;
}

interface ContainerInfo {
  containerId: string;
  containerName?: string;
  tags: ContainerTag[];
  lastUpdated?: string; // ISO timestamp
  fingerprint?: string; // Container fingerprint for change detection
}

/**
 * Get all containers and their 3E tags
 * Uses the existing Python script with --list-only and --verbose to get all tags
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

    // Run Python script to list all containers first
    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    // Fix credentials path
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }

    // Get list of all containers - use a known 3E tag with verbose mode to get all tags
    const listContainersCommand = `python3 "${pythonScript}" --tag-name "3E_Pop-up" --account-id "${accountId}" --credentials "${fixedCredentialsPath}" --list-only --verbose --delay 1.0`;
    
    try {
      let result: { stdout: string; stderr: string };
      try {
        result = await Promise.race([
          execAsync(listContainersCommand, {
            cwd: join(process.cwd(), '..', 'automation'),
            maxBuffer: 10 * 1024 * 1024,
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout: Script took longer than 10 minutes. This may happen with many containers. Try refreshing individual containers instead.')), 600000)
          )
        ]) as { stdout: string; stderr: string };
      } catch (execError: any) {
        // Handle execution errors (timeout, command not found, etc.)
        const errorMsg = execError?.message || execError?.toString() || 'Failed to execute Python script';
        console.error('Command execution failed:', execError);
        return NextResponse.json(
          { 
            success: false,
            error: `Command execution failed: ${errorMsg}`,
            details: execError?.stack || 'No additional details available'
          },
          { status: 500 }
        );
      }
      
      const containersOutput = result.stdout;
      const stderrOutput = result.stderr;
      
      // Check for errors in stderr (but ignore FutureWarning)
      if (stderrOutput && !stderrOutput.includes('FutureWarning')) {
        const errorLines = stderrOutput.split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FutureWarning') &&
          (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed'))
        );
        
        if (errorLines.length > 0) {
          const errorMessage = errorLines.join('\n');
          console.error('Python script error:', errorMessage);
          return NextResponse.json(
            { 
              success: false,
              error: `Python script error: ${errorMessage}`,
              details: stderrOutput
            },
            { status: 500 }
          );
        }
      }

      // Parse the output to extract containers and their 3E tags directly
      // The script already processes all containers when searching for a tag
      const containers: ContainerInfo[] = [];

      // Parse the output to extract containers and their 3E tags
      const lines = containersOutput.split('\n');
      let currentContainer: ContainerInfo | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect container start
        const containerMatch = line.match(/\[LIST ONLY\]\s*Processing container:\s*(\d+)/);
        if (containerMatch) {
          // Save previous container if it had tags
          if (currentContainer && currentContainer.tags.length > 0) {
            containers.push(currentContainer);
          }
          currentContainer = {
            containerId: containerMatch[1],
            tags: [],
            lastUpdated: new Date().toISOString(), // Use current time as last updated
          };
          continue;
        }
        
        // Look for "All tags in container" section
        if (line.includes('All tags in container') && currentContainer) {
          // Read the next lines to get tag names
          i++;
          while (i < lines.length && lines[i].trim().startsWith('-')) {
            const tagLine = lines[i].trim();
            const tagNameMatch = tagLine.match(/^-\s+(.+)$/);
            if (tagNameMatch) {
              const tagName = tagNameMatch[1].trim();
              // Only include tags with "3E" or "Template" in the name
              if (tagName.includes('3E') || tagName.includes('Template')) {
                currentContainer.tags.push({
                  tagId: '',
                  tagName,
                });
              }
            }
            i++;
          }
          continue;
        }
        
        // Look for "Found tag" with version
        if (line.includes('Found tag:') && currentContainer) {
          const foundMatch = line.match(/Found tag:\s*([^\s\(]+).*Version:\s*([^\s\)]+)/);
          if (foundMatch) {
            const tagName = foundMatch[1];
            const version = foundMatch[2];
            // Update existing tag or add new one
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
      
      // Add last container if it has tags
      if (currentContainer && currentContainer.tags.length > 0) {
        if (!currentContainer.lastUpdated) {
          currentContainer.lastUpdated = new Date().toISOString();
        }
        containers.push(currentContainer);
      }
      
      // Add lastUpdated to all containers
      containers.forEach(container => {
        if (!container.lastUpdated) {
          container.lastUpdated = new Date().toISOString();
        }
      });

      // Extract container IDs from the parsed containers
      const containerIds = containers.map(c => c.containerId);

      return NextResponse.json({
        success: true,
        containers,
        totalContainers: containerIds.length,
        containersWith3ETags: containers.length,
      });
    } catch (execError: any) {
      console.error('Command execution error:', execError);
      
      // Try to extract meaningful error message
      let errorMessage = 'Failed to list containers';
      let errorDetails = 'Unknown error';
      
      if (execError?.stderr) {
        const errorLines = String(execError.stderr).split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FutureWarning') &&
          !line.includes('warnings.warn') &&
          (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed'))
        );
        if (errorLines.length > 0) {
          errorMessage = errorLines.slice(-5).join('\n');
          errorDetails = String(execError.stderr);
        }
      } else if (execError?.stdout) {
        // Sometimes errors are in stdout
        const errorLines = String(execError.stdout).split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FutureWarning') &&
          (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed'))
        );
        if (errorLines.length > 0) {
          errorMessage = errorLines.slice(-5).join('\n');
          errorDetails = String(execError.stdout);
        }
      } else if (execError?.message) {
        errorMessage = execError.message;
        errorDetails = execError.stack || execError.toString();
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          details: errorDetails
        },
        { status: 500 }
      );
    }
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

