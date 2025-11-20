/**
 * GTM Tag Search API Route
 * Searches for a specific tag across all GTM containers
 * 
 * Author: Anthony Figgins
 * Version: 2.0.0
 * Date Updated: 2025-11-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { extractVersion } from '@/utils/version-detector';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { loadAccountCache, searchTagInCachedContainers, updateContainerTagsInCache, getContainerFromCache } from '@/utils/cache-manager';

const execAsync = promisify(exec);

interface ContainerInfo {
  containerId: string;
  containerName?: string;
  hasTag: boolean;
  tagVersion?: string;
  tagId?: string;
  status: 'found' | 'not-found' | 'error';
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagName, accountId, credentialsPath } = body;
    
    if (!tagName || !accountId || !credentialsPath) {
      return NextResponse.json(
        { error: 'Missing required parameters: tagName, accountId, credentialsPath' },
        { status: 400 }
      );
    }
    
    // Get script file path for the tag
    const scriptPath = join(process.cwd(), '..', 'tags', getTagCategory(tagName), tagName);
    
    // Read repository version first
    let repoVersion = null;
    try {
      const scriptContent = await readFile(scriptPath, 'utf-8');
      repoVersion = extractVersion(scriptContent);
    } catch (error) {
      console.error('Error reading script file:', error);
    }
    
    // Check unified cache first - search for tag in cached containers
    // Note: allAccounts parameter not currently passed from frontend, defaulting to false
    // TODO: Add allAccounts support to tag search
    const allAccountsBool = false; // Will be updated when frontend supports it
    const cachedContainers = await searchTagInCachedContainers(tagName, accountId, allAccountsBool);
    if (cachedContainers.length > 0) {
      console.log(`[CACHE HIT] Found ${cachedContainers.length} containers with tag ${tagName} in unified cache`);
      const containers = cachedContainers.map(c => ({
        containerId: c.containerId,
        containerName: c.containerName,
        hasTag: true,
        tagVersion: c.tagVersion,
        tagId: c.tagId,
        status: 'found' as const,
      }));
      
      return NextResponse.json({
        success: true,
        containers,
        repoVersion,
        totalContainers: containers.length,
        foundCount: containers.length,
        fromCache: true,
      });
    }
    
    console.log(`[CACHE MISS] Running search for ${tagName} in account ${accountId}`);
    
    // Run Python script to search for tag
    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    // Fix credentials path - if it starts with "automation/", remove that since we're running from automation directory
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }
    
    const command = `python3 "${pythonScript}" --tag-name "${tagName}" --account-id "${accountId}" --credentials "${fixedCredentialsPath}" --list-only --delay 1.0`;
    
    try {
      // Add timeout of 20 minutes (1200 seconds) for large container lists (200+ containers)
      // With 200 containers and 1.0s delay, this should be enough: 200 * 1.0s = 200s + overhead
      const { stdout, stderr } = await Promise.race([
        execAsync(command, {
          cwd: join(process.cwd(), '..', 'automation'),
          maxBuffer: 10 * 1024 * 1024, // 10MB
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout: Script took longer than 20 minutes to complete')), 1200000)
        )
      ]) as { stdout: string; stderr: string };
      
      // Check if there's an error in stderr (Python errors go to stderr)
      if (stderr && !stderr.includes('FutureWarning')) {
        // Filter out warnings, but keep actual errors
        const errorLines = stderr.split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FutureWarning') && 
          !line.includes('warnings.warn') &&
          (line.includes('Error') || line.includes('Traceback') || line.includes('Exception'))
        );
        
        if (errorLines.length > 0) {
          const errorMessage = errorLines.join('\n');
          console.error('Python script error:', errorMessage);
          return NextResponse.json(
            { error: `Python script error: ${errorMessage}` },
            { status: 500 }
          );
        }
      }
      
      // Parse output to extract container information
      const containers = parseContainerOutput(stdout, tagName);
      
      // Update unified cache with tag information found
      // For each container that has the tag, update its tags array in the cache
      const containersWithTag = containers.filter(c => c.hasTag);
      for (const container of containersWithTag) {
        try {
          // Get existing container data from cache
          const existingContainer = await getContainerFromCache(container.containerId, accountId, allAccountsBool);
          if (existingContainer) {
            // Update tags array with this tag (unfiltered - all tags)
            const existingTags = existingContainer.tags || [];
            const tagIndex = existingTags.findIndex(t => t.tagName === tagName);
            const tagData = {
              tagId: container.tagId || '',
              tagName: tagName,
              version: container.tagVersion,
              repoVersion: repoVersion,
              isUpToDate: container.tagVersion === repoVersion,
              needsUpdate: container.tagVersion !== repoVersion && repoVersion !== null,
            };
            
            if (tagIndex >= 0) {
              existingTags[tagIndex] = { ...existingTags[tagIndex], ...tagData };
            } else {
              existingTags.push(tagData);
            }
            
            await updateContainerTagsInCache(container.containerId, accountId, allAccountsBool, existingTags, false);
          } else {
            // Container not in cache yet, create it with just this tag
            await updateContainerTagsInCache(container.containerId, accountId, allAccountsBool, [{
              tagId: container.tagId || '',
              tagName: tagName,
              version: container.tagVersion,
              repoVersion: repoVersion,
              isUpToDate: container.tagVersion === repoVersion,
              needsUpdate: container.tagVersion !== repoVersion && repoVersion !== null,
            }], false);
          }
        } catch (cacheError) {
          console.error(`Error updating cache for container ${container.containerId}:`, cacheError);
          // Don't fail the request if cache update fails
        }
      }
      
      const result = {
        success: true,
        containers,
        repoVersion,
        totalContainers: containers.length,
        foundCount: containersWithTag.length,
      };
      
      console.log(`[CACHE] Updated unified cache with tag ${tagName} for ${containersWithTag.length} containers`);
      
      return NextResponse.json({
        ...result,
        fromCache: false,
      });
    } catch (execError: any) {
      // execAsync throws an error if the command fails
      const errorOutput = execError.stderr || execError.stdout || execError.message;
      console.error('Command execution error:', errorOutput);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to execute Python script';
      if (errorOutput) {
        const errorLines = String(errorOutput).split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FutureWarning') &&
          (line.includes('Error') || line.includes('Traceback') || line.includes('Exception') || line.includes('failed'))
        );
        if (errorLines.length > 0) {
          errorMessage = errorLines.slice(-3).join('\n'); // Get last 3 error lines
        } else {
          errorMessage = String(errorOutput).split('\n').slice(-5).join('\n'); // Get last 5 lines
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error searching for tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search for tag' },
      { status: 500 }
    );
  }
}

function getTagCategory(tagName: string): string {
  // Map tag names to their solution folders (new structure)
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
    '3E_3EI Recruiter Unified': 'chatbot-solutions',
    '3E_Insights Pixel': 'chatbot-solutions',
    // Pop-up Solutions
    '3E_Pop-up': 'pop-up-solutions',
    '3E_Pop-up Marketo Form': 'pop-up-solutions',
    '3E_Pop-up Tracking': 'pop-up-solutions',
  };
  
  return categoryMap[tagName] || 'base-solutions';
}

function parseContainerOutput(output: string, tagName: string): ContainerInfo[] {
  const containers: ContainerInfo[] = [];
  const lines = output.split('\n');
  
  let currentContainer: Partial<ContainerInfo> | null = null;
  
  for (const line of lines) {
    // Match container processing line
    const containerMatch = line.match(/\[LIST ONLY\]\s*Processing container:\s*(\d+)/);
    if (containerMatch) {
      if (currentContainer) {
        containers.push({
          containerId: currentContainer.containerId!,
          hasTag: currentContainer.hasTag || false,
          tagVersion: currentContainer.tagVersion,
          tagId: currentContainer.tagId,
          status: currentContainer.status || 'not-found',
          error: currentContainer.error,
        });
      }
      currentContainer = {
        containerId: containerMatch[1],
        hasTag: false,
        status: 'not-found',
      };
    }
    
    // Match found tag
    if (currentContainer && line.includes(`Found tag: ${tagName}`)) {
      currentContainer.hasTag = true;
      currentContainer.status = 'found';
      const tagIdMatch = line.match(/ID:\s*(\d+)/);
      if (tagIdMatch) {
        currentContainer.tagId = tagIdMatch[1];
      }
      // Extract version if present
      const versionMatch = line.match(/Version:\s*([^\s\)]+)/);
      if (versionMatch) {
        currentContainer.tagVersion = versionMatch[1];
      }
    }
    
    // Match error
    if (currentContainer && line.includes('ERROR:')) {
      currentContainer.status = 'error';
      currentContainer.error = line.replace('ERROR:', '').trim();
    }
  }
  
  // Add last container
  if (currentContainer) {
    containers.push({
      containerId: currentContainer.containerId!,
      hasTag: currentContainer.hasTag || false,
      tagVersion: currentContainer.tagVersion,
      tagId: currentContainer.tagId,
      status: currentContainer.status || 'not-found',
      error: currentContainer.error,
    });
  }
  
  return containers;
}

