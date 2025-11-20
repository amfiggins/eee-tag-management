/**
 * GTM Containers Only API Route
 * Just lists container IDs and names - no tag processing (fast!)
 * Uses --containers-only flag to skip all tag processing
 * 
 * Author: Anthony Figgins
 * Version: 2.0.0
 * Date Updated: 2025-11-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { findPythonExecutable } from '@/utils/python-executor';
import { loadAccountCache, saveAccountCache, ContainerCacheData } from '@/utils/cache-manager';

// Increase timeout - longer when listing all accounts
export const maxDuration = 300; // 5 minutes (all accounts can take longer due to rate limiting)

interface ContainerListItem {
  containerId: string;
  containerName?: string;
  accountId?: string;
  accountName?: string;
}

/**
 * Get just the container list - no tag processing
 * This should be fast since it just calls list_containers() API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, credentialsPath, allAccounts } = body;

    if (!accountId || !credentialsPath) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account ID and credentials path are required' 
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedData = await loadAccountCache(accountId, allAccounts || false);
    if (cachedData && cachedData.containers.length > 0) {
      // Filter out archived containers from response (but keep them in cache)
      const activeContainers = cachedData.containers.filter(c => !c.archived);
      console.log(`[CACHE HIT] Returning ${activeContainers.length} active containers from cache (${cachedData.containers.length - activeContainers.length} archived)`);
      // Convert to ContainerListItem format for response
      const containers: ContainerListItem[] = activeContainers.map(c => ({
        containerId: c.containerId,
        containerName: c.containerName,
        accountId: c.accountId,
        accountName: c.accountName,
        archived: c.archived,
      }));
      return NextResponse.json({
        success: true,
        containers,
        totalContainers: containers.length,
        fromCache: true,
      });
    }

    console.log(`[CACHE MISS] Fetching containers from API`);

    const pythonScript = join(process.cwd(), '..', 'automation', 'gtm_tag_updater.py');
    
    let fixedCredentialsPath = credentialsPath;
    if (credentialsPath.startsWith('automation/')) {
      fixedCredentialsPath = credentialsPath.replace('automation/', '');
    }

    return new Promise<NextResponse>((resolve) => {
      // Use the new --containers-only flag - no tag processing at all!
      const pythonExecutable = findPythonExecutable();
      const args = [
        '-u', // Unbuffered
        pythonScript,
        '--account-id', accountId,
        '--credentials', fixedCredentialsPath,
        '--containers-only', // This flag skips all tag processing
        '--delay', '1.1' // Respect GTM rate limits (100 req/100 sec = 1 req/sec, use 1.1 to be safe)
      ];
      
      // Add --all-accounts flag if requested
      if (allAccounts) {
        args.push('--all-accounts');
      }
      
      const pythonProcess = spawn(pythonExecutable, args, {
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
          
          // Look for "Container ID: XXXXX | Name: YYYY | Account: ZZZZZ | Account Name: AAAA" pattern (with account name)
          const containerWithAccountNameMatch = line.match(/^Container ID:\s*(\d+)\s*\|\s*Name:\s*(.+?)\s*\|\s*Account:\s*(\d+)\s*\|\s*Account Name:\s*(.+)$/);
          if (containerWithAccountNameMatch) {
            const containerId = containerWithAccountNameMatch[1];
            const containerName = containerWithAccountNameMatch[2].trim();
            const accountId = containerWithAccountNameMatch[3];
            const accountName = containerWithAccountNameMatch[4].trim();
            if (!containers.find(c => c.containerId === containerId)) {
              containers.push({ containerId, containerName, accountId, accountName });
              console.log(`Found container: ${containerId} (${containerName}) in account ${accountName} (${accountId}) (${containers.length} so far)`);
            }
          } else {
            // Look for "Container ID: XXXXX | Name: YYYY | Account: ZZZZZ" pattern (from --containers-only mode with --all-accounts)
            const containerWithAllMatch = line.match(/^Container ID:\s*(\d+)\s*\|\s*Name:\s*(.+?)\s*\|\s*Account:\s*(\d+)$/);
            if (containerWithAllMatch) {
              const containerId = containerWithAllMatch[1];
              const containerName = containerWithAllMatch[2].trim();
              const accountId = containerWithAllMatch[3];
              if (!containers.find(c => c.containerId === containerId)) {
                containers.push({ containerId, containerName, accountId });
                console.log(`Found container: ${containerId} (${containerName}) in account ${accountId} (${containers.length} so far)`);
              }
            } else {
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
                // Look for "Container ID: XXXXX | Account: ZZZZZ" pattern (with account but no name)
                const containerWithAccountMatch = line.match(/^Container ID:\s*(\d+)\s*\|\s*Account:\s*(\d+)$/);
                if (containerWithAccountMatch) {
                  const containerId = containerWithAccountMatch[1];
                  const accountId = containerWithAccountMatch[2];
                  if (!containers.find(c => c.containerId === containerId)) {
                    containers.push({ containerId, accountId });
                    console.log(`Found container: ${containerId} in account ${accountId} (${containers.length} so far)`);
                  }
                } else {
                  // Fallback: Look for "Container ID: XXXXX" pattern (without name or account)
                  const containerIdMatch = line.match(/^Container ID:\s*(\d+)$/);
                  if (containerIdMatch) {
                    const containerId = containerIdMatch[1];
                    if (!containers.find(c => c.containerId === containerId)) {
                      containers.push({ containerId });
                      console.log(`Found container: ${containerId} (${containers.length} so far)`);
                    }
                  } else {
                    // Fallback: Look for discovery format "  - XXXXX: YYYY" (from list_containers_for_account)
                    const discoveryMatch = line.match(/^\s*-\s*(\d+):\s*(.+)$/);
                    if (discoveryMatch) {
                      const containerId = discoveryMatch[1];
                      const containerName = discoveryMatch[2].trim();
                      if (!containers.find(c => c.containerId === containerId)) {
                        containers.push({ containerId, containerName, accountId: accountId }); // Use provided accountId
                        console.log(`Found container (discovery format): ${containerId} (${containerName}) (${containers.length} so far)`);
                      }
                    }
                  }
                }
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

      pythonProcess.on('close', async (code: number) => {
        if (resolved) return;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        resolved = true;
        
        // Even if code is not 0, if we got containers, return them
        if (containers.length > 0) {
          // Load existing cache to preserve archived containers
          const existingCache = await loadAccountCache(accountId, allAccounts || false);
          const existingContainerIds = new Set(
            existingCache?.containers.map(c => c.containerId) || []
          );
          const newContainerIds = new Set(containers.map(c => c.containerId));
          
          // Find containers that were removed (exist in cache but not in new list)
          const archivedContainers: ContainerCacheData[] = [];
          if (existingCache) {
            for (const existingContainer of existingCache.containers) {
              if (!newContainerIds.has(existingContainer.containerId) && !existingContainer.archived) {
                // Container was removed - archive it
                archivedContainers.push({
                  ...existingContainer,
                  archived: true,
                  archivedAt: Date.now(),
                });
              } else if (existingContainer.archived) {
                // Keep already archived containers
                archivedContainers.push(existingContainer);
              }
            }
          }
          
          // Convert new containers to ContainerCacheData format
          const newCacheData: ContainerCacheData[] = containers.map(c => ({
            containerId: c.containerId,
            containerName: c.containerName,
            accountId: c.accountId || accountId,
            accountName: c.accountName,
            cachedAt: Date.now(),
            lastRefreshed: Date.now(),
            archived: false, // New containers are not archived
          }));
          
          // Combine new containers with archived containers
          const allCacheData = [...newCacheData, ...archivedContainers];
          
          // Save to unified cache
          saveAccountCache(accountId, allAccounts || false, allCacheData)
            .then(() => {
              console.log(`[CACHE] Saved ${allCacheData.length} containers to account cache`);
            })
            .catch((err) => {
              console.error(`[CACHE] Failed to save containers to cache:`, err);
            });
          
          resolve(NextResponse.json({
            success: true,
            containers,
            totalContainers: containers.length,
            fromCache: false,
            note: code !== 0 ? 'Process exited with non-zero code but containers were found' : undefined,
          }));
        } else if (code === 0) {
          // Process succeeded but no containers found
          console.log(`[CONTAINERS-ONLY] Python script exited with code 0 but found 0 containers`);
          console.log(`[CONTAINERS-ONLY] STDOUT (last 500 chars): ${stdout.substring(Math.max(0, stdout.length - 500))}`);
          console.log(`[CONTAINERS-ONLY] STDERR (last 500 chars): ${stderr.substring(Math.max(0, stderr.length - 500))}`);
          resolve(NextResponse.json({
            success: true,
            containers: [],
            totalContainers: 0,
            note: 'No containers found. Check server logs for Python script output.',
            details: `STDOUT: ${stdout.substring(Math.max(0, stdout.length - 1000))}\nSTDERR: ${stderr.substring(Math.max(0, stderr.length - 1000))}`
          }));
        } else {
          // Process failed
          console.error(`[CONTAINERS-ONLY] Python script exited with code ${code}`);
          console.error(`[CONTAINERS-ONLY] STDOUT: ${stdout}`);
          console.error(`[CONTAINERS-ONLY] STDERR: ${stderr}`);
          resolve(NextResponse.json(
            { 
              success: false,
              error: `Process exited with code ${code}`,
              details: `STDOUT:\n${stdout.substring(0, 2000)}\n\nSTDERR:\n${stderr.substring(0, 2000)}`
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

      // Longer timeout when listing all accounts (more API calls due to rate limiting)
      const timeoutDuration = allAccounts ? 300000 : 60000; // 5 minutes for all accounts, 1 minute for single account
      timeoutId = setTimeout(async () => {
        if (resolved) return;
        pythonProcess.kill();
        resolved = true;
        // Save containers to cache if we got any before timeout
        if (containers.length > 0) {
          // Load existing cache to preserve archived containers
          const existingCache = await loadAccountCache(accountId, allAccounts || false);
          const existingContainerIds = new Set(
            existingCache?.containers.map(c => c.containerId) || []
          );
          const newContainerIds = new Set(containers.map(c => c.containerId));
          
          // Find containers that were removed
          const archivedContainers: ContainerCacheData[] = [];
          if (existingCache) {
            for (const existingContainer of existingCache.containers) {
              if (!newContainerIds.has(existingContainer.containerId) && !existingContainer.archived) {
                archivedContainers.push({
                  ...existingContainer,
                  archived: true,
                  archivedAt: Date.now(),
                });
              } else if (existingContainer.archived) {
                archivedContainers.push(existingContainer);
              }
            }
          }
          
          const newCacheData: ContainerCacheData[] = containers.map(c => ({
            containerId: c.containerId,
            containerName: c.containerName,
            accountId: c.accountId || accountId,
            accountName: c.accountName,
            cachedAt: Date.now(),
            lastRefreshed: Date.now(),
            archived: false,
          }));
          
          const allCacheData = [...newCacheData, ...archivedContainers];
          
          saveAccountCache(accountId, allAccounts || false, allCacheData)
            .catch((err) => {
              console.error(`[CACHE] Failed to save containers to cache:`, err);
            });
        }
        
        resolve(NextResponse.json(
          { 
            success: containers.length > 0,
            containers,
            totalContainers: containers.length,
            fromCache: false,
            error: containers.length === 0 ? 'Request timeout' : undefined,
            note: containers.length > 0 ? `Found ${containers.length} containers before timeout` : undefined,
          },
          { status: containers.length > 0 ? 200 : 500 }
        ));
      }, timeoutDuration);
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

