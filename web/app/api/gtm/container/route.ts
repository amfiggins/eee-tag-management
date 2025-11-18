/**
 * GTM Single Container API Route
 * Gets tags for a single container
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

interface ContainerTag {
  tagId: string;
  tagName: string;
  version?: string;
}

interface ContainerInfo {
  containerId: string;
  containerName?: string;
  tags: ContainerTag[];
  lastUpdated?: string;
}

/**
 * Get tags for a single container
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { containerId, accountId, credentialsPath } = body;

    if (!containerId || !accountId || !credentialsPath) {
      return NextResponse.json(
        { error: 'Container ID, Account ID, and credentials path are required' },
        { status: 400 }
      );
    }

    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }

    // Search for a 3E tag in this specific container with verbose mode
    const searchTagCommand = `python3 "${pythonScript}" --tag-name "3E_Pop-up" --account-id "${accountId}" --credentials "${fixedCredentialsPath}" --containers "${containerId}" --list-only --verbose --delay 1.0 2>&1`;
    
    try {
      const { stdout: tagsOutput } = await Promise.race([
        execAsync(searchTagCommand, {
          cwd: join(process.cwd(), '..', 'automation'),
          maxBuffer: 10 * 1024 * 1024,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout getting tags')), 60000)
        )
      ]) as { stdout: string; stderr: string };

      // Parse the output to extract tags
      const lines = tagsOutput.split('\n');
      const container: ContainerInfo = {
        containerId,
        tags: [],
        lastUpdated: new Date().toISOString(), // Use current time as last updated
      };
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Look for "All tags in container" section
        if (line.includes('All tags in container') && container) {
          // Read the next lines to get tag names
          i++;
          while (i < lines.length && lines[i].trim().startsWith('-')) {
            const tagLine = lines[i].trim();
            const tagNameMatch = tagLine.match(/^-\s+(.+)$/);
            if (tagNameMatch) {
              const tagName = tagNameMatch[1].trim();
              // Only include tags with "3E" or "Template" in the name
              if (tagName.includes('3E') || tagName.includes('Template')) {
                container.tags.push({
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
        if (line.includes('Found tag:') && container) {
          const foundMatch = line.match(/Found tag:\s*([^\s\(]+).*Version:\s*([^\s\)]+)/);
          if (foundMatch) {
            const tagName = foundMatch[1];
            const version = foundMatch[2];
            // Update existing tag or add new one
            const existingTag = container.tags.find(t => t.tagName === tagName);
            if (existingTag) {
              existingTag.version = version;
            } else if (tagName.includes('3E') || tagName.includes('Template')) {
              container.tags.push({
                tagId: '',
                tagName,
                version,
              });
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        container,
      });
    } catch (execError: any) {
      const errorOutput = execError.stderr || execError.stdout || execError.message;
      console.error('Command execution error:', errorOutput);
      
      let errorMessage = 'Failed to get container tags';
      if (errorOutput) {
        const errorLines = String(errorOutput).split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FutureWarning') &&
          (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed'))
        );
        if (errorLines.length > 0) {
          errorMessage = errorLines.slice(-3).join('\n');
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error getting container:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get container' },
      { status: 500 }
    );
  }
}

