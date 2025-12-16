/**
 * GTM Batch Tag Update API Route
 * Handles batch tag updates across multiple GTM containers
 * 
 * Author: Anthony Figgins
 * Version: 1.0.0
 * Date Updated: 2025-12-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { findPythonExecutable } from '@/utils/python-executor';
import { invalidateContainerTagsCache } from '@/utils/cache-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      containerId,
      tags, // Array<{tagName: string, repoTagName?: string, scriptPath: string}>
      accountId, 
      credentialsPath, 
      publish = true // Whether to publish the change (default: true)
    } = body;
    
    if (!containerId || !accountId || !credentialsPath || !tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters: containerId, accountId, credentialsPath, and tags array are required' },
        { status: 400 }
      );
    }
    
    // Read all script files and prepare batch update data
    const tagUpdates: Array<{tag_name: string, new_content: string, repo_tag_name?: string}> = [];
    
    for (const tag of tags) {
      const { tagName, repoTagName, scriptPath } = tag;
      
      if (!tagName || !scriptPath) {
        return NextResponse.json(
          { error: `Missing required fields in tag: tagName and scriptPath are required` },
          { status: 400 }
        );
      }
      
      try {
        // Resolve script path (handle relative paths from project root)
        let resolvedScriptPath = scriptPath;
        if (scriptPath.startsWith('../')) {
          // Relative path from web/ directory, resolve to project root
          resolvedScriptPath = join(process.cwd(), '..', scriptPath.replace('../', ''));
        } else if (!scriptPath.startsWith('/')) {
          // Relative path, assume it's relative to project root
          resolvedScriptPath = join(process.cwd(), '..', scriptPath);
        }
        
        const content = await readFile(resolvedScriptPath, 'utf-8');
        tagUpdates.push({
          tag_name: tagName,
          new_content: content,
          repo_tag_name: repoTagName || tagName
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to read script file for tag '${tagName}': ${error.message}` },
          { status: 400 }
        );
      }
    }
    
    // Prepare batch update JSON with resolved script paths
    const batchUpdateJson = JSON.stringify({
      tags: tagUpdates.map(tu => {
        const originalTag = tags.find(t => t.tagName === tu.tag_name);
        let scriptFile = originalTag?.scriptPath || '';
        
        // Resolve script path for Python script (relative to automation directory)
        // Python script runs from automation/ directory, so we need ../tags/... to resolve to project root
        if (scriptFile.startsWith('../')) {
          // Already has ../ prefix, keep it
          // scriptFile stays as is
        } else if (scriptFile.startsWith('/')) {
          // Absolute path, convert to relative from project root with ../ prefix
          const projectRoot = join(process.cwd(), '..');
          const relativePath = scriptFile.replace(projectRoot + '/', '');
          scriptFile = '../' + relativePath;
        } else {
          // Relative path without ../, add it so Python can resolve from automation/
          scriptFile = '../' + scriptFile;
        }
        
        return {
          tag_name: tu.tag_name,
          script_file: scriptFile,
          repo_tag_name: tu.repo_tag_name
        };
      })
    });
    
    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    // Debug: Log the paths being used
    console.log('[GTM Batch Update API] Container ID:', containerId);
    console.log('[GTM Batch Update API] Tag count:', tagUpdates.length);
    console.log('[GTM Batch Update API] Python script path:', pythonScript);
    
    // Fix credentials path - if it starts with "automation/", remove that since we're running from automation directory
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }
    
    // Use spawn to execute Python script
    const pythonExecutable = findPythonExecutable();
    
    return new Promise<NextResponse>((resolve) => {
      const args = [
        '-u', // Unbuffered
        pythonScript,
        '--batch-update', batchUpdateJson,
        '--account-id', accountId,
        '--credentials', fixedCredentialsPath,
        '--containers', containerId,
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
        const results = parseBatchUpdateOutput(stdout, tagUpdates);
        
        // Debug: Log the full output for troubleshooting
        console.log('[GTM Batch Update API] Python script output:', stdout);
        console.log('[GTM Batch Update API] Parsed results:', results);
        
        // Invalidate cache for the container
        invalidateContainerTagsCache(containerId, accountId, false)
          .then(() => {
            console.log(`[CACHE] Invalidated tags cache for container ${containerId} after batch update`);
          })
          .catch((err) => {
            console.error(`[CACHE] Failed to invalidate cache for container ${containerId}:`, err);
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

function parseBatchUpdateOutput(output: string, tagUpdates: Array<{tag_name: string}>): any {
  const lines = output.split('\n');
  const results: any = {
    containerId: null,
    status: 'unknown',
    tags: tagUpdates.map(tu => ({
      tagName: tu.tag_name,
      status: 'unknown'
    }))
  };
  
  // Look for container ID
  const containerMatch = output.match(/Processing container:\s*(\d+)|Container\s+(\d+):|container\s+(\d+)/i);
  if (containerMatch) {
    results.containerId = containerMatch[1] || containerMatch[2] || containerMatch[3];
  }
  
  // Look for success indicators
  if (output.includes('✓ Version published successfully') ||
      output.includes('Successfully published') ||
      output.includes('published successfully') ||
      (output.includes('✓ All') && output.includes('tag(s) updated successfully'))) {
    results.status = 'success';
    // Mark all tags as success if batch succeeded
    results.tags.forEach((tag: any) => {
      tag.status = 'success';
    });
  }
  
  // Look for failure indicators
  if (output.includes('❌ Failed') ||
      output.includes('ERROR:') ||
      output.includes('Failed to update')) {
    results.status = 'failed';
    // Try to identify which tags failed
    for (const tag of results.tags) {
      if (output.includes(`'${tag.tagName}'`) && 
          (output.includes('Failed') || output.includes('❌'))) {
        tag.status = 'failed';
      }
    }
  }
  
  return results;
}
