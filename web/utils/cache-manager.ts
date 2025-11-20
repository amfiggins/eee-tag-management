/**
 * Cache Manager Utility
 * Manages shared cache between container browser and tag search
 * Uses JSON files stored on the server for easy sharing and maintenance
 * 
 * Cache Structure:
 * - container_data_{accountId}.json: All containers for an account with metadata and tags
 * - container_data_all.json: All containers across all accounts (when allAccounts=true)
 * 
 * Each container object contains:
 * - containerId, containerName, accountId
 * - metadata: { lastUpdated, permissions, etc. }
 * - tags: Array of tags with versions, repo info, etc.
 * - cachedAt: When this container data was cached
 * - lastRefreshed: When this container was last refreshed from API
 * 
 * Author: Anthony Figgins
 * Version: 2.1.0
 * Date Updated: 2025-11-20
 */

import { readFile, writeFile, mkdir, rename, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Cache directory - same level as tags folder
const CACHE_DIR = join(process.cwd(), '..', '.cache');
const CACHE_DURATION = 12 * 30 * 24 * 60 * 60 * 1000; // 12 months

// Ensure cache directory exists
async function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

/**
 * Container data structure for unified cache
 */
export interface ContainerCacheData {
  containerId: string;
  containerName?: string;
  accountId: string;
  accountName?: string;
  archived?: boolean; // true if container no longer exists (was removed/deleted)
  archivedAt?: number; // timestamp when container was archived
  metadata?: {
    lastUpdated?: string;
    permissions?: {
      canRead: boolean;
      canEdit: boolean;
      canPublish: boolean;
    };
  };
  tags?: Array<{
    tagId: string;
    tagName: string;
    version?: string;
    paused?: boolean;
    repoVersion?: string;
    repoTagName?: string;
    repoDateUpdated?: string;
    isUpToDate?: boolean;
    needsUpdate?: boolean;
  }>;
  tagsFilter3E?: Array<{
    tagId: string;
    tagName: string;
    version?: string;
    paused?: boolean;
    repoVersion?: string;
    repoTagName?: string;
    repoDateUpdated?: string;
    isUpToDate?: boolean;
    needsUpdate?: boolean;
  }>; // Tags filtered for 3E_ only
  cachedAt: number; // Timestamp when this container was cached
  lastRefreshed: number; // Timestamp when this container was last refreshed from API
}

/**
 * Account-level cache structure
 */
interface AccountCacheData {
  accountId: string;
  allAccounts: boolean; // true if this cache includes containers from all accounts
  containers: ContainerCacheData[];
  cachedAt: number;
  lastRefreshed: number;
}

/**
 * Get cache file path for account-level container data
 */
function getAccountCacheFilePath(accountId: string, allAccounts: boolean): string {
  const key = allAccounts ? 'all' : accountId;
  return join(CACHE_DIR, `container_data_${key}.json`);
}

/**
 * Load account-level container cache
 */
export async function loadAccountCache(accountId: string, allAccounts: boolean): Promise<AccountCacheData | null> {
  try {
    await ensureCacheDir();
    const cachePath = getAccountCacheFilePath(accountId, allAccounts);
    
    if (!existsSync(cachePath)) {
      return null;
    }
    
    const fileContent = await readFile(cachePath, 'utf-8');
    
    // Try to parse JSON, handle corrupted files
    let data: AccountCacheData;
    try {
      data = JSON.parse(fileContent);
    } catch (parseError) {
      // Corrupted JSON - delete and return null
      console.error(`[CACHE] Corrupted cache file detected, deleting: ${cachePath}`, parseError);
      try {
        await unlink(cachePath);
      } catch (unlinkError) {
        // Ignore unlink errors (file might not exist)
        console.error(`[CACHE] Failed to delete corrupted cache file:`, unlinkError);
      }
      return null;
    }
    
    // Check if cache is expired
    const cacheAge = Date.now() - data.cachedAt;
    if (cacheAge >= CACHE_DURATION) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error loading account cache for ${accountId} (allAccounts=${allAccounts}):`, error);
    return null;
  }
}

/**
 * Save account-level container cache
 * Uses atomic write to prevent race conditions and corruption
 */
export async function saveAccountCache(accountId: string, allAccounts: boolean, containers: ContainerCacheData[]): Promise<void> {
  try {
    await ensureCacheDir();
    const cachePath = getAccountCacheFilePath(accountId, allAccounts);
    const tempPath = cachePath + '.tmp';
    
    const cacheData: AccountCacheData = {
      accountId,
      allAccounts,
      containers,
      cachedAt: Date.now(),
      lastRefreshed: Date.now(),
    };
    
    // Write to temp file first, then atomically rename
    // This prevents corruption if process crashes during write
    await writeFile(tempPath, JSON.stringify(cacheData, null, 2), 'utf-8');
    await rename(tempPath, cachePath); // Atomic operation
    
    console.log(`[CACHE] Saved ${containers.length} containers to account cache: ${cachePath}`);
  } catch (error) {
    // Clean up temp file on error
    const cachePath = getAccountCacheFilePath(accountId, allAccounts);
    const tempPath = cachePath + '.tmp';
    try {
      if (existsSync(tempPath)) {
        await unlink(tempPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    console.error(`Error saving account cache for ${accountId} (allAccounts=${allAccounts}):`, error);
    throw error;
  }
}

/**
 * Get a specific container from account cache
 */
export async function getContainerFromCache(
  containerId: string, 
  accountId: string, 
  allAccounts: boolean
): Promise<ContainerCacheData | null> {
  const accountCache = await loadAccountCache(accountId, allAccounts);
  if (!accountCache) {
    return null;
  }
  
  // Find container in cache
  const container = accountCache.containers.find(c => c.containerId === containerId);
  return container || null;
}

/**
 * Update a specific container in account cache
 */
export async function updateContainerInCache(
  containerId: string,
  accountId: string,
  allAccounts: boolean,
  updates: Partial<ContainerCacheData>
): Promise<void> {
  const accountCache = await loadAccountCache(accountId, allAccounts);
  if (!accountCache) {
    // If cache doesn't exist, create it with just this container
    const newContainer: ContainerCacheData = {
      containerId,
      accountId,
      ...updates,
      cachedAt: Date.now(),
      lastRefreshed: Date.now(),
    };
    await saveAccountCache(accountId, allAccounts, [newContainer]);
    return;
  }
  
  // Find and update container
  const containerIndex = accountCache.containers.findIndex(c => c.containerId === containerId);
  if (containerIndex >= 0) {
    // Update existing container
    accountCache.containers[containerIndex] = {
      ...accountCache.containers[containerIndex],
      ...updates,
      lastRefreshed: Date.now(),
    };
  } else {
    // Add new container
    const newContainer: ContainerCacheData = {
      containerId,
      accountId,
      ...updates,
      cachedAt: Date.now(),
      lastRefreshed: Date.now(),
    };
    accountCache.containers.push(newContainer);
  }
  
  // Save updated cache
  accountCache.lastRefreshed = Date.now();
  await saveAccountCache(accountId, allAccounts, accountCache.containers);
}

/**
 * Add or update tags for a container in cache
 * Stores both filtered (3E only) and unfiltered tags
 */
export async function updateContainerTagsInCache(
  containerId: string,
  accountId: string,
  allAccounts: boolean,
  tags: ContainerCacheData['tags'],
  filter3E?: boolean
): Promise<void> {
  // Store tags based on filter
  if (filter3E === true) {
    // Store as filtered tags
    await updateContainerInCache(containerId, accountId, allAccounts, {
      tagsFilter3E: tags,
    });
  } else {
    // Store as unfiltered tags (all tags)
    await updateContainerInCache(containerId, accountId, allAccounts, {
      tags,
    });
  }
}

/**
 * Update container metadata in cache
 */
export async function updateContainerMetadataInCache(
  containerId: string,
  accountId: string,
  allAccounts: boolean,
  metadata: ContainerCacheData['metadata']
): Promise<void> {
  await updateContainerInCache(containerId, accountId, allAccounts, {
    metadata,
  });
}

/**
 * Invalidate tags cache for a container (clears tags so next fetch gets fresh data)
 * This should be called after a tag is updated to ensure cache reflects latest state
 */
export async function invalidateContainerTagsCache(
  containerId: string,
  accountId: string,
  allAccounts: boolean
): Promise<void> {
  const accountCache = await loadAccountCache(accountId, allAccounts);
  if (!accountCache) {
    return; // No cache to invalidate
  }
  
  const containerIndex = accountCache.containers.findIndex(c => c.containerId === containerId);
  if (containerIndex >= 0) {
    // Clear tags arrays to force refresh on next fetch
    accountCache.containers[containerIndex].tags = undefined;
    accountCache.containers[containerIndex].tagsFilter3E = undefined;
    accountCache.containers[containerIndex].lastRefreshed = Date.now();
    
    // Save updated cache
    accountCache.lastRefreshed = Date.now();
    await saveAccountCache(accountId, allAccounts, accountCache.containers);
    console.log(`[CACHE] Invalidated tags cache for container ${containerId}`);
  }
}

/**
 * Search for containers that have a specific tag
 * Uses cached data if available
 */
export async function searchTagInCachedContainers(
  tagName: string,
  accountId: string,
  allAccounts: boolean
): Promise<Array<{ containerId: string; containerName?: string; accountId: string; tagVersion?: string; tagId?: string }>> {
  const accountCache = await loadAccountCache(accountId, allAccounts);
  if (!accountCache) {
    return [];
  }
  
  const results: Array<{ containerId: string; containerName?: string; accountId: string; tagVersion?: string; tagId?: string }> = [];
  
  for (const container of accountCache.containers) {
    if (container.tags) {
      const tag = container.tags.find(t => t.tagName === tagName);
      if (tag) {
        results.push({
          containerId: container.containerId,
          containerName: container.containerName,
          accountId: container.accountId,
          tagVersion: tag.version,
          tagId: tag.tagId,
        });
      }
    }
  }
  
  return results;
}

/**
 * Legacy cache functions for backward compatibility
 * These are used by existing routes that haven't been migrated yet
 */

// Legacy cache type constants
export const CACHE_TYPES = {
  CONTAINER_LIST: 'container_list',
  CONTAINER_METADATA: 'container_metadata',
  CONTAINER_TAGS: 'container_tags',
  TAG_SEARCH: 'tag_search',
} as const;

/**
 * Legacy: Get cache file path for a given cache type and key
 */
function getCacheFilePath(cacheType: string, key: string): string {
  // Sanitize key for filename (replace special chars with underscores)
  const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_');
  return join(CACHE_DIR, `${cacheType}_${sanitizedKey}.json`);
}

/**
 * Legacy: Load data from cache (for backward compatibility)
 */
export async function loadFromCache<T>(cacheType: string, key: string): Promise<T | null> {
  try {
    await ensureCacheDir();
    const cachePath = getCacheFilePath(cacheType, key);
    
    if (!existsSync(cachePath)) {
      return null;
    }
    
    const fileContent = await readFile(cachePath, 'utf-8');
    
    // Try to parse JSON, handle corrupted files
    let data;
    try {
      data = JSON.parse(fileContent);
    } catch (parseError) {
      // Corrupted JSON - delete and return null
      console.error(`[CACHE] Corrupted legacy cache file detected, deleting: ${cachePath}`, parseError);
      try {
        await unlink(cachePath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      return null;
    }
    
    // Check if cache is expired
    const cacheAge = Date.now() - data.cachedAt;
    if (cacheAge >= CACHE_DURATION) {
      // Cache expired, delete it
      try {
        await unlink(cachePath);
      } catch (unlinkError) {
        // Ignore unlink errors
      }
      return null;
    }
    
    return data.data as T;
  } catch (error) {
    console.error(`Error loading cache for ${cacheType}/${key}:`, error);
    return null;
  }
}

/**
 * Legacy: Save data to cache (for backward compatibility)
 * Uses atomic write to prevent race conditions
 */
export async function saveToCache<T>(cacheType: string, key: string, data: T): Promise<void> {
  try {
    await ensureCacheDir();
    const cachePath = getCacheFilePath(cacheType, key);
    const tempPath = cachePath + '.tmp';
    
    const cacheData = {
      data,
      cachedAt: Date.now(),
    };
    
    // Write to temp file first, then atomically rename
    await writeFile(tempPath, JSON.stringify(cacheData, null, 2), 'utf-8');
    await rename(tempPath, cachePath); // Atomic operation
  } catch (error) {
    // Clean up temp file on error
    const cachePath = getCacheFilePath(cacheType, key);
    const tempPath = cachePath + '.tmp';
    try {
      if (existsSync(tempPath)) {
        await unlink(tempPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    console.error(`Error saving cache for ${cacheType}/${key}:`, error);
    throw error;
  }
}

/**
 * Legacy: Clear cache for a specific type and key
 */
export async function clearCache(cacheType: string, key: string): Promise<void> {
  try {
    const cachePath = getCacheFilePath(cacheType, key);
    if (existsSync(cachePath)) {
      await writeFile(cachePath, JSON.stringify({}), 'utf-8');
    }
  } catch (error) {
    console.error(`Error clearing cache for ${cacheType}/${key}:`, error);
  }
}
