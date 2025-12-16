/**
 * GTM Tag Update API Route
 * Handles tag updates across multiple GTM containers
 * 
 * Author: Anthony Figgins
 * Version: 1.3.0
 * Date Updated: 2025-11-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { findPythonExecutable } from '@/utils/python-executor';
import { invalidateContainerTagsCache } from '@/utils/cache-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tagName, // Container tag name (for finding tag in GTM)
      repoTagName, // Repo tag name (for finding file) - optional, defaults to tagName
      accountId, 
      credentialsPath, 
      containerIds, 
      skipIfUpToDate = true,
      publish = true // Whether to publish the change (default: true)
    } = body;
    
    if (!tagName || !accountId || !credentialsPath || !containerIds || !Array.isArray(containerIds)) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Use repo tag name if provided, otherwise map GTM tag name to repo tag name
    const fileTagName = repoTagName || getRepoTagName(tagName);
    
    // Get script file path using the repo tag name (add .html extension if not present)
    const fileTagNameWithExt = fileTagName.endsWith('.html') || fileTagName.endsWith('.js') 
      ? fileTagName 
      : `${fileTagName}.html`;
    const scriptPath = join(process.cwd(), '..', 'tags', getTagCategory(fileTagName), fileTagNameWithExt);
    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    // Debug: Log the paths being used
    console.log('[GTM Update API] Script file path:', scriptPath);
    console.log('[GTM Update API] Python script path:', pythonScript);
    console.log('[GTM Update API] Tag name:', tagName);
    console.log('[GTM Update API] Repo tag name:', fileTagName);
    console.log('[GTM Update API] Category:', getTagCategory(fileTagName));
    
    // Fix credentials path - if it starts with "automation/", remove that since we're running from automation directory
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }
    
    // Use spawn to execute Python script
    const pythonExecutable = findPythonExecutable();
    const containersStr = containerIds.join(',');
    
    return new Promise<NextResponse>((resolve) => {
      const args = [
        '-u', // Unbuffered
        pythonScript,
        '--tag-name', tagName,
        '--script-file', scriptPath,
        '--account-id', accountId,
        '--credentials', fixedCredentialsPath,
        '--containers', containersStr,
        '--delay', '1.0',
      ];
      
      // Add --no-publish flag if publish is false
      if (!publish) {
        args.push('--no-publish');
      }
      
      const pythonProcess = spawn(pythonExecutable, args, {
        cwd: join(process.cwd(), '..', 'automation'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code: number) => {
        if (code !== 0) {
          // Combine stdout and stderr for error analysis
          const fullOutput = (stdout + '\n' + stderr).trim();
          
          // Extract meaningful error lines
          const errorLines = fullOutput.split('\n').filter((line: string) => 
            line.trim() && 
            !line.includes('FutureWarning') &&
            !line.includes('warnings.warn') &&
            !line.includes('[DEBUG]') &&
            (line.includes('Error') || line.includes('ERROR') || line.includes('Traceback') || 
             line.includes('Exception') || line.includes('Failed') || line.includes('not found') ||
             line.includes('❌') || line.includes('⚠️'))
          );
          
          let errorMessage = `Python script exited with code ${code}`;
          
          // If we found specific error lines, use those
          if (errorLines.length > 0) {
            errorMessage = errorLines.slice(0, 15).join('\n'); // Show first 15 error lines
          } else {
            // Otherwise, show the last 20 lines of output (most recent errors are usually at the end)
            const allLines = fullOutput.split('\n').filter(l => l.trim());
            const lastLines = allLines.slice(-20);
            if (lastLines.length > 0) {
              errorMessage = `${errorMessage}\n\nLast output:\n${lastLines.join('\n')}`;
            } else if (stderr) {
              errorMessage = `${errorMessage}\n\nSTDERR:\n${stderr.substring(0, 1000)}`;
            } else if (stdout) {
              errorMessage = `${errorMessage}\n\nSTDOUT:\n${stdout.substring(0, 1000)}`;
            }
          }
          
          resolve(NextResponse.json(
            { 
              success: false,
              error: errorMessage,
              details: fullOutput.length > 0 ? fullOutput : (stderr || stdout || 'No output from Python script')
            },
            { status: 500 }
          ));
          return;
        }

        // Parse results
        const results = parseUpdateOutput(stdout);
        
        // Debug: Log the full output for troubleshooting
        console.log('[GTM Update API] Python script output:', stdout);
        console.log('[GTM Update API] Parsed results:', results);
        
        // Invalidate cache for all containers that were attempted to be updated
        // This ensures next fetch gets fresh tag data, even if we can't parse success status
        // We invalidate for all containers since the update process may have modified them
        // Use Promise.allSettled to not block response if cache invalidation fails
        Promise.allSettled(
          containerIds.map((containerId: string) =>
            invalidateContainerTagsCache(containerId, accountId, false)
              .catch((err) => {
                console.error(`[CACHE] Failed to invalidate cache for container ${containerId}:`, err);
              })
          )
        ).then(() => {
          console.log(`[CACHE] Invalidated tags cache for ${containerIds.length} container(s) after update`);
        });
        
        resolve(NextResponse.json({
          success: true,
          results,
          output: stdout,
        }));
      });

      pythonProcess.on('error', (error: Error) => {
        resolve(NextResponse.json(
          { 
            success: false,
            error: `Failed to start Python process: ${error.message}`,
            details: error.stack
          },
          { status: 500 }
        ));
      });
    });
  } catch (error: any) {
    console.error('Error updating tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tags' },
      { status: 500 }
    );
  }
}

// Map GTM tag names to repository file names (handles naming mismatches)
function getRepoTagName(gtmTagName: string): string {
  const tagNameMap: Record<string, string> = {
    // GTM tag name -> Repo file name
    '3E_3EI Recruiter': '3E_3EI Recruiter Unified', // GTM uses shorter name, repo has "Unified"
  };
  
  return tagNameMap[gtmTagName] || gtmTagName;
}

function getTagCategory(tagName: string): string {
  // Map tag names to their solution folders (new structure)
  // Use repo tag name for category lookup
  const repoTagName = getRepoTagName(tagName);
  
  const categoryMap: Record<string, string> = {
    // Base Solutions
    'Template - 3E Config': 'base-solutions',
    '3E_Analytics Tracking': 'base-solutions',
    '3E_Page Activity': 'base-solutions',
    '3E_Form Validation': 'base-solutions',
    '3E_RFI Submit': 'base-solutions',
    '3E_Favicon Injection': 'base-solutions',
    '3E_Sticky Buttons': 'base-solutions',
    '3E_Cloudflare Beacon': 'base-solutions',
    // Chatbot Solutions
    '3E_3EI Recruiter Activity': 'chatbot-solutions',
    '3E_3EI Recruiter Conversion': 'chatbot-solutions',
    '3E_3EI Recruiter Tracking': 'chatbot-solutions',
    '3E_3EI Recruiter': 'chatbot-solutions', // GTM name
    '3E_3EI Recruiter Unified': 'chatbot-solutions', // Repo name
    '3E_Insights Pixel': 'chatbot-solutions',
    // Pop-up Solutions
    '3E_Pop-up': 'pop-up-solutions',
    '3E_Pop-up Marketo Form': 'pop-up-solutions',
    '3E_Pop-up Tracking': 'pop-up-solutions',
  };
  
  // Try repo tag name first, then original tag name
  return categoryMap[repoTagName] || categoryMap[tagName] || 'base-solutions';
}

function parseUpdateOutput(output: string): any {
  const lines = output.split('\n');
  const results: any[] = [];
  let currentContainerId: string | null = null;
  
  for (const line of lines) {
    // Look for container ID in various formats
    const containerMatch = line.match(/Processing container:\s*(\d+)|Container\s+(\d+):|container\s+(\d+)/i);
    if (containerMatch) {
      currentContainerId = containerMatch[1] || containerMatch[2] || containerMatch[3];
      results.push({
        containerId: currentContainerId,
        status: 'processing',
      });
    }
    
    // Look for success indicators
    if (line.includes('✓ Success') || 
        line.includes('Version published successfully') ||
        line.includes('Successfully published') ||
        line.includes('published successfully') ||
        (line.includes('Success:') && line.includes('1'))) {
      const lastResult = results[results.length - 1];
      if (lastResult) {
        lastResult.status = 'success';
      } else if (currentContainerId) {
        // If we have a container ID but no result yet, create one
        results.push({
          containerId: currentContainerId,
          status: 'success',
        });
      }
    }
    
    // Look for failure indicators
    if (line.includes('Failed to update') ||
        line.includes('❌ Failed') ||
        line.includes('ERROR:') ||
        (line.includes('Failed:') && line.includes('1'))) {
      const lastResult = results[results.length - 1];
      if (lastResult) {
        lastResult.status = 'failed';
      } else if (currentContainerId) {
        results.push({
          containerId: currentContainerId,
          status: 'failed',
        });
      }
    }
  }
  
  return results;
}

