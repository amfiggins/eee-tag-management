/**
 * Cache Manager Utility
 * Manages shared cache between container browser and tag search
 * Uses JSON files stored on the server for easy sharing and maintenance
 * 
 * Author: Anthony Figgins
 * Version: 1.0.0
 * Date Updated: 2025-01-20
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
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
 * Get cache file path for a given cache type and key
 */
function getCacheFilePath(cacheType: string, key: string): string {
  // Sanitize key for filename (replace special chars with underscores)
  const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_');
  return join(CACHE_DIR, `${cacheType}_${sanitizedKey}.json`);
}

/**
 * Load data from cache
 */
export async function loadFromCache<T>(cacheType: string, key: string): Promise<T | null> {
  try {
    await ensureCacheDir();
    const cachePath = getCacheFilePath(cacheType, key);
    
    if (!existsSync(cachePath)) {
      return null;
    }
    
    const fileContent = await readFile(cachePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Check if cache is expired
    const cacheAge = Date.now() - data.cachedAt;
    if (cacheAge >= CACHE_DURATION) {
      // Cache expired, delete it
      await writeFile(cachePath, JSON.stringify({}), 'utf-8');
      return null;
    }
    
    return data.data as T;
  } catch (error) {
    console.error(`Error loading cache for ${cacheType}/${key}:`, error);
    return null;
  }
}

/**
 * Save data to cache
 */
export async function saveToCache<T>(cacheType: string, key: string, data: T): Promise<void> {
  try {
    await ensureCacheDir();
    const cachePath = getCacheFilePath(cacheType, key);
    
    const cacheData = {
      data,
      cachedAt: Date.now(),
    };
    
    await writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error saving cache for ${cacheType}/${key}:`, error);
    throw error;
  }
}

/**
 * Clear cache for a specific type and key
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

/**
 * Clear all caches of a specific type
 */
export async function clearAllCachesOfType(cacheType: string): Promise<void> {
  try {
    await ensureCacheDir();
    // This would require listing files in the cache directory
    // For now, we'll implement per-key clearing
    console.log(`Note: clearAllCachesOfType(${cacheType}) - implement file listing if needed`);
  } catch (error) {
    console.error(`Error clearing all caches of type ${cacheType}:`, error);
  }
}

// Cache type constants
export const CACHE_TYPES = {
  CONTAINER_LIST: 'container_list',
  CONTAINER_METADATA: 'container_metadata',
  CONTAINER_TAGS: 'container_tags',
  TAG_SEARCH: 'tag_search',
} as const;

