/**
 * Container Cache Utility
 * Manages caching of container data with dynamic change detection
 * 
 * Author: Anthony Figgins
 * Version: 1.1.0
 * Date Updated: 2025-11-17
 */

interface ContainerTag {
  tagId: string;
  tagName: string;
  version?: string;
}

interface ContainerInfo {
  containerId: string;
  containerName?: string;
  tags: ContainerTag[];
  lastUpdated?: string; // ISO timestamp from API
  cachedAt?: string; // ISO timestamp when cached
  fingerprint?: string; // Container fingerprint for change detection
}

interface CacheEntry {
  container: ContainerInfo;
  cachedAt: string; // ISO timestamp
}

const CACHE_KEY_PREFIX = 'gtm_container_cache_';
// Cache expiry removed - now using dynamic comparison based on container fingerprints/timestamps

/**
 * Get cache key for a container
 */
function getCacheKey(containerId: string, accountId: string): string {
  return `${CACHE_KEY_PREFIX}${accountId}_${containerId}`;
}

/**
 * Get all cache keys for an account
 */
function getAllCacheKeys(accountId: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${CACHE_KEY_PREFIX}${accountId}_`)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Get cached container data
 */
export function getCachedContainer(containerId: string, accountId: string): ContainerInfo | null {
  try {
    const key = getCacheKey(containerId, accountId);
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    
    // Cache no longer expires based on time - it's checked dynamically
    // based on container fingerprints/timestamps when needed
    return entry.container;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Cache container data
 */
export function cacheContainer(container: ContainerInfo, accountId: string): void {
  try {
    const key = getCacheKey(container.containerId, accountId);
    const entry: CacheEntry = {
      container: {
        ...container,
        cachedAt: new Date().toISOString(),
      },
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Error caching container:', error);
  }
}

/**
 * Get all cached containers for an account
 */
export function getAllCachedContainers(accountId: string): ContainerInfo[] {
  const containers: ContainerInfo[] = [];
  const keys = getAllCacheKeys(accountId);
  
  for (const key of keys) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          // Cache no longer expires - all cached containers are returned
          containers.push(entry.container);
        }
      } catch (error) {
        console.error('Error reading cached container:', error);
      }
  }
  
  return containers;
}

/**
 * Check if container needs update by comparing fingerprints or timestamps
 */
export function needsUpdate(
  containerId: string,
  accountId: string,
  apiFingerprint?: string,
  apiLastUpdated?: string
): boolean {
  const cached = getCachedContainer(containerId, accountId);
  if (!cached) {
    return true; // No cache, needs update
  }
  
  // If we have fingerprints, compare them (most reliable)
  if (apiFingerprint && cached.fingerprint) {
    return apiFingerprint !== cached.fingerprint;
  }
  
  // Fall back to timestamp comparison
  if (apiLastUpdated && cached.lastUpdated) {
    const cachedTime = new Date(cached.lastUpdated).getTime();
    const apiTime = new Date(apiLastUpdated).getTime();
    return apiTime > cachedTime; // API is newer, needs update
  }
  
  // If we can't compare, assume it needs update
  return true;
}

/**
 * Get all containers that need updates
 */
export function getOutdatedContainers(
  accountId: string,
  apiContainers: ContainerInfo[]
): ContainerInfo[] {
  const outdated: ContainerInfo[] = [];
  
  for (const apiContainer of apiContainers) {
    if (needsUpdate(
      apiContainer.containerId,
      accountId,
      apiContainer.fingerprint,
      apiContainer.lastUpdated
    )) {
      outdated.push(apiContainer);
    }
  }
  
  return outdated;
}

/**
 * Clear cache for a specific container
 */
export function clearContainerCache(containerId: string, accountId: string): void {
  try {
    const key = getCacheKey(containerId, accountId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all cache for an account
 */
export function clearAllCache(accountId: string): void {
  try {
    const keys = getAllCacheKeys(accountId);
    keys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
}

