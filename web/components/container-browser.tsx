/**
 * Container Browser Component
 * Container search interface - find containers and view their tags
 * When a container is expanded, tags are loaded on-demand
 * Includes filter for 3E_ tags only
 * Containers sorted by name (then ID if no name)
 * 
 * Author: Anthony Figgins
 * Version: 2.4.0
 * Date Updated: 2025-11-18
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, ChevronRight, RefreshCw, CheckCircle2, AlertCircle, Upload } from 'lucide-react';

interface ContainerTag {
  tagId: string;
  tagName: string;
  version?: string;
  paused?: boolean; // Tag paused status
  repoVersion?: string; // Version from tags folder
  repoTagName?: string; // Actual tag name in repo (may differ from container tag name)
  repoDateUpdated?: string;
  isUpToDate?: boolean; // true if versions match
  needsUpdate?: boolean; // true if repo version is newer
  updating?: boolean; // true if update is in progress
}

interface ContainerMetadata {
  containerId: string;
  name?: string;
  accountId: string;
  lastUpdated?: string;
  permissions: {
    canRead: boolean;
    canEdit: boolean;
    canPublish: boolean;
  };
}

interface ContainerListItem {
  containerId: string;
  containerName?: string;
  accountId?: string;
  accountName?: string;
  archived?: boolean; // true if container no longer exists
  // Cached metadata
  metadata?: ContainerMetadata;
  cachedAt?: number; // Timestamp when metadata was cached
}

interface ContainerBrowserProps {
  accountId: string;
  credentialsPath: string;
}

export default function ContainerBrowser({ accountId, credentialsPath }: ContainerBrowserProps) {
  const [containerList, setContainerList] = useState<ContainerListItem[]>([]);
  const [containerTags, setContainerTags] = useState<Map<string, ContainerTag[]>>(new Map()); // containerId -> tags
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingTags, setLoadingTags] = useState<Set<string>>(new Set()); // Set of container IDs loading tags
  const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set()); // Set of container IDs loading metadata
  const [refreshingAll, setRefreshingAll] = useState(false); // Track if we're refreshing all containers
  const [updatingAllOutOfDate, setUpdatingAllOutOfDate] = useState(false); // Track if we're updating all out-of-date tags
  const [containersWithPermissionErrors, setContainersWithPermissionErrors] = useState<Set<string>>(new Set()); // Track containers with API permission errors
  const [error, setError] = useState('');
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [filter3EOnly, setFilter3EOnly] = useState(true); // Filter for 3E_ tags only
  const [allAccounts, setAllAccounts] = useState(true); // Search all accounts or just the specified one (default: true)
  const [selectedTags, setSelectedTags] = useState<Map<string, Set<string>>>(new Map()); // containerId -> Set of tagNames

  // Cache duration: 12 months in milliseconds
  const CACHE_DURATION = 12 * 30 * 24 * 60 * 60 * 1000; // 12 months

  // Load container list from cache
  const loadContainerListFromCache = (): ContainerListItem[] | null => {
    try {
      const cacheKey = `gtm_container_list_${accountId}_${allAccounts}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is less than 12 months old
        const cacheAge = Date.now() - data.cachedAt;
        if (cacheAge < CACHE_DURATION) {
          return data.containers;
        }
      }
    } catch (error) {
      console.error('Error reading container list cache:', error);
    }
    return null;
  };

  // Save container list to cache
  const saveContainerListToCache = (containers: ContainerListItem[]) => {
    try {
      const cacheKey = `gtm_container_list_${accountId}_${allAccounts}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        containers,
        cachedAt: Date.now(),
      }));
    } catch (error) {
      console.error('Error saving container list to cache:', error);
    }
  };

  // Load container metadata from cache
  const loadContainerMetadataFromCache = (containerId: string): ContainerMetadata | null => {
    try {
      const cacheKey = `gtm_container_metadata_${containerId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is less than 12 months old
        const cacheAge = Date.now() - data.cachedAt;
        if (cacheAge < CACHE_DURATION) {
          return data.metadata;
        }
      }
    } catch (error) {
      console.error('Error reading container metadata cache:', error);
    }
    return null;
  };

  // Save container metadata to cache
  const saveContainerMetadataToCache = (containerId: string, metadata: ContainerMetadata) => {
    try {
      const cacheKey = `gtm_container_metadata_${containerId}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        metadata,
        cachedAt: Date.now(),
      }));
    } catch (error) {
      console.error('Error saving container metadata to cache:', error);
    }
  };

  // Load tags from cache
  const loadTagsFromCache = (containerId: string): ContainerTag[] | null => {
    try {
      const cacheKey = `gtm_tags_${accountId}_${containerId}_${filter3EOnly}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        const cacheAge = Date.now() - data.timestamp;
        if (cacheAge < 3600000) { // 1 hour
          return data.tags;
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  // Save tags to cache
  const saveTagsToCache = (containerId: string, tags: ContainerTag[]) => {
    try {
      const cacheKey = `gtm_tags_${accountId}_${containerId}_${filter3EOnly}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        tags,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Load container metadata
  const loadContainerMetadata = async (containerId: string, forceReload = false): Promise<ContainerMetadata | null> => {
    // Check cache first (unless forcing reload)
    if (!forceReload) {
      const cached = loadContainerMetadataFromCache(containerId);
      if (cached) {
        // Update container list with cached metadata
        setContainerList(prev => prev.map(c => 
          c.containerId === containerId 
            ? { ...c, metadata: cached, cachedAt: Date.now() }
            : c
        ));
        return cached;
      }
    }

    // Find container to get accountId
    const container = containerList.find(c => c.containerId === containerId);
    const containerAccountId = container?.accountId || accountId;

    setLoadingMetadata(prev => new Set(prev).add(containerId));

    try {
      const response = await fetch('/api/gtm/container-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId,
          accountId: containerAccountId,
          credentialsPath,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.metadata) {
        const metadata = data.metadata;
        // Save to cache
        saveContainerMetadataToCache(containerId, metadata);
        // Update container list
        setContainerList(prev => prev.map(c => 
          c.containerId === containerId 
            ? { ...c, metadata, cachedAt: Date.now() }
            : c
        ));
        return metadata;
      }
      return null;
    } catch (err: any) {
      console.error('Error loading container metadata:', err);
      return null;
    } finally {
      setLoadingMetadata(prev => {
        const newSet = new Set(prev);
        newSet.delete(containerId);
        return newSet;
      });
    }
  };

  // Load tags for a container when it's expanded
  const loadTagsForContainer = async (containerId: string, forceReload = false) => {
    // Find the container to get its accountId (if different from primary account)
    const container = containerList.find(c => c.containerId === containerId);
    const containerAccountId = container?.accountId || accountId; // Use container's accountId if available
    
    // Check cache first (unless forcing reload)
    // IMPORTANT: Always check cache with current filter3EOnly value to ensure we get the right cached data
    if (!forceReload) {
      const cachedTags = loadTagsFromCache(containerId);
      if (cachedTags && cachedTags.length > 0) {
        console.log(`[DEBUG] Loading ${cachedTags.length} tags from cache for container ${containerId} (filter3EOnly: ${filter3EOnly})`);
        // Load from cache immediately
        setContainerTags(prev => {
          const newMap = new Map(prev);
          newMap.set(containerId, cachedTags);
          return newMap;
        });
        // Still fetch fresh data in background (silently update cache)
        // Don't show loading indicator for background refresh
      } else if (containerTags.has(containerId)) {
        // Already loaded in memory, but check if it matches current filter
        const currentTags = containerTags.get(containerId) || [];
        // If filter changed, we need to reload
        // For now, just reload if cache miss
        if (currentTags.length === 0) {
          // Empty tags in memory, reload
        } else {
          // Tags in memory, but might be from different filter - reload to be safe
          console.log(`[DEBUG] Tags in memory for ${containerId}, but reloading to ensure filter matches`);
        }
      }
    }

    setLoadingTags(prev => new Set(prev).add(containerId));
    setError('');

    try {
      const response = await fetch('/api/gtm/container-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId,
          accountId: containerAccountId, // Use the container's accountId
          credentialsPath,
          filter3E: filter3EOnly, // true = show only 3E tags, false = show all tags
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for permission errors (404 or 403)
        const errorMsg = data.error || 'Failed to load tags';
        if (errorMsg.includes('404') || errorMsg.includes('403') || errorMsg.includes('permission denied') || errorMsg.includes('Not found')) {
          throw new Error(`⚠️ No API permissions for this container. The container belongs to account ${containerAccountId}, but you may not have access to view its tags.`);
        }
        throw new Error(errorMsg);
      }

      if (data.success && data.tags) {
        console.log(`[DEBUG] Loaded ${data.tags.length} tags from API for container ${containerId} (filter3EOnly: ${filter3EOnly}, filter3E sent to API: ${filter3EOnly})`);
        console.log(`[DEBUG] Tag names:`, data.tags.map((t: ContainerTag) => t.tagName));
        console.log(`[DEBUG] Tags with 3E:`, data.tags.filter((t: ContainerTag) => t.tagName.includes('3E') || t.tagName.includes('Template')).map((t: ContainerTag) => t.tagName));
        
        // For each tag, fetch repo version info and compare
        const tagsWithRepoInfo = await Promise.all(
          data.tags.map(async (tag: ContainerTag) => {
            try {
              // Fetch tag info from repo
              const tagInfoResponse = await fetch('/api/gtm/tag-info', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  tagName: tag.tagName,
                }),
              });

              if (tagInfoResponse.ok) {
                const tagInfoData = await tagInfoResponse.json();
                if (tagInfoData.success && tagInfoData.tag) {
                  const repoVersion = tagInfoData.tag.version;
                  const containerVersion = tag.version || '';
                  
                  // Compare versions (simple string comparison for now)
                  const isUpToDate = repoVersion === containerVersion && repoVersion !== 'Unknown' && containerVersion !== '';
                  const needsUpdate = !isUpToDate && repoVersion !== 'Unknown' && containerVersion !== '';
                  
                  return {
                    ...tag,
                    repoVersion: tagInfoData.tag.version,
                    repoTagName: tagInfoData.tag.name, // Store the actual repo tag name
                    repoDateUpdated: tagInfoData.tag.dateUpdated,
                    isUpToDate,
                    needsUpdate,
                  };
                }
              }
            } catch (err) {
              // If tag not found in repo, that's okay - just return tag as-is
              console.warn(`Tag ${tag.tagName} not found in repo:`, err);
            }
            
            // Return tag without repo info if fetch failed
            return {
              ...tag,
              isUpToDate: false,
              needsUpdate: false,
            };
          })
        );
        
        // Save to cache
        saveTagsToCache(containerId, tagsWithRepoInfo);
        
        // Update state
        setContainerTags(prev => {
          const newMap = new Map(prev);
          newMap.set(containerId, tagsWithRepoInfo);
          return newMap;
        });
      }
    } catch (err: any) {
      setError(`Failed to load tags for ${containerId}: ${err.message}`);
      console.error('Error loading tags:', err);
    } finally {
      setLoadingTags(prev => {
        const newSet = new Set(prev);
        newSet.delete(containerId);
        return newSet;
      });
    }
  };

  // When a container is expanded, load tags from cache first, then refresh metadata and tags
  useEffect(() => {
    expandedContainers.forEach(async (containerId) => {
      // Load tags from cache immediately (if available) - but only if cache matches current filter
      // The cache key includes the filter value, so we should get the right cached data
      const cachedTags = loadTagsFromCache(containerId);
      if (cachedTags && cachedTags.length > 0) {
        console.log(`[DEBUG] Loading ${cachedTags.length} cached tags for ${containerId} with filter3EOnly=${filter3EOnly}`);
        setContainerTags(prev => {
          const newMap = new Map(prev);
          newMap.set(containerId, cachedTags);
          return newMap;
        });
      }
      
      // Load container metadata (only once, not on every filter change)
      await loadContainerMetadata(containerId, false); // Use cache if available
      
      // Only load tags if not in cache - no auto-refresh
      if (!cachedTags || cachedTags.length === 0) {
        loadTagsForContainer(containerId, false); // Will check cache first, then fetch if needed
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedContainers]); // Only reload when containers are expanded/collapsed, NOT on filter change

  // Load container list from cache on mount
  useEffect(() => {
    const cached = loadContainerListFromCache();
    if (cached && cached.length > 0) {
      console.log(`Loaded ${cached.length} containers from cache`);
      setContainerList(cached);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Reload cache when accountId or allAccounts changes
  useEffect(() => {
    const cached = loadContainerListFromCache();
    if (cached && cached.length > 0) {
      console.log(`Loaded ${cached.length} containers from cache (account/allAccounts changed)`);
      setContainerList(cached);
    } else {
      // Clear container list if cache doesn't match current settings
      setContainerList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, allAccounts]);

  // When filter changes, clear cache and reload tags for all expanded containers
  useEffect(() => {
    if (expandedContainers.size > 0) {
      console.log(`[DEBUG] Filter changed to filter3EOnly=${filter3EOnly}, clearing cache and reloading`);
      // Clear in-memory cache
      setContainerTags(new Map());
      // Clear localStorage cache for all expanded containers (both filter values)
      expandedContainers.forEach(containerId => {
        try {
          // Clear cache for both filter values (true and false) to ensure clean reload
          const trueKey = `gtm_tags_${accountId}_${containerId}_true`;
          const falseKey = `gtm_tags_${accountId}_${containerId}_false`;
          localStorage.removeItem(trueKey);
          localStorage.removeItem(falseKey);
          console.log(`[DEBUG] Cleared cache keys: ${trueKey}, ${falseKey}`);
        } catch (error) {
          // Ignore cache clear errors
        }
      });
      // Reload all expanded containers with new filter (force reload to bypass cache)
      expandedContainers.forEach(containerId => {
        console.log(`[DEBUG] Force reloading tags for ${containerId} with filter3EOnly=${filter3EOnly}`);
        loadTagsForContainer(containerId, true); // Force reload, bypass cache
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter3EOnly]); // Reload when filter changes

  const searchContainers = async () => {
    setLoadingContainers(true);
    setError('');

    try {
      // Use the fast containers-only endpoint that just lists IDs without processing tags
      const controller = new AbortController();
      // Longer timeout when searching all accounts (more API calls due to rate limiting)
      const timeoutDuration = allAccounts ? 300000 : 60000; // 5 minutes for all accounts, 1 minute for single account
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      try {
        const response = await fetch('/api/gtm/containers-only', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            credentialsPath,
            allAccounts,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

      let data: any = {};
      try {
        const text = await response.text();
        if (!text || text.trim() === '') {
          throw new Error(`Server returned empty response (${response.status}): ${response.statusText}`);
        }
        try {
          data = JSON.parse(text);
        } catch (jsonError: any) {
          console.error('Response is not JSON:', text.substring(0, 200));
          throw new Error(`Server returned invalid JSON: ${text.substring(0, 100)}...`);
        }
      } catch (parseError: any) {
        console.error('Failed to parse response:', parseError);
        throw new Error(parseError.message || `Failed to parse server response: ${parseError.toString()}`);
      }

      if (!response.ok) {
        console.error('API Error Response:', response.status, data);
        // Build comprehensive error message
        let errorMsg = data?.error || data?.message || `Server error (${response.status}): ${response.statusText}`;
        if (data?.details) {
          errorMsg += `\n\nDetails:\n${data.details}`;
        }
        throw new Error(errorMsg);
      }

        if (data.success) {
          if (data.containers && data.containers.length > 0) {
            console.log(`Loaded ${data.containers.length} containers from API`);
            
            // Load cached metadata for each container
            const containersWithCache = data.containers.map((container: ContainerListItem) => {
              const cached = loadContainerMetadataFromCache(container.containerId);
              return {
                ...container,
                metadata: cached || undefined,
                cachedAt: cached ? Date.now() : undefined,
              };
            });
            
            // Filter out archived containers from display (but they remain in cache)
            const activeContainers = containersWithCache.filter(c => !c.archived);
            setContainerList(activeContainers);
            // Save to cache (including archived containers)
            saveContainerListToCache(containersWithCache);
            setError(''); // Clear any previous errors
            if (data.partial) {
              setError(`⚠️ Partial results: ${data.note || 'Some containers may be missing.'}`);
            } else {
              console.log('All containers loaded successfully');
            }
            
            // Refresh metadata for all active containers (in background, sequentially)
            // This ensures we have fresh metadata after searching
            console.log(`Refreshing metadata for ${activeContainers.length} containers...`);
            for (let i = 0; i < activeContainers.length; i++) {
              const container = activeContainers[i];
              try {
                await loadContainerMetadata(container.containerId, true); // Force reload, bypass cache
                // Small delay between requests to respect rate limits
                if (i < activeContainers.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } catch (err) {
                // Log error but continue with other containers
                console.warn(`Failed to refresh metadata for container ${container.containerId}:`, err);
              }
            }
            console.log('Metadata refresh complete');
          } else {
            // Success but no containers - show helpful message
            console.warn('API returned success but no containers:', data);
            setContainerList([]);
            if (data.note) {
              setError(`No containers found. ${data.note}`);
            } else if (data.error) {
              setError(`No containers found. ${data.error}`);
            } else {
              setError('No containers found. This could mean:\n- The account ID is incorrect\n- You don\'t have access to any containers in this account\n- The Python script encountered an error (check server logs)');
            }
          }
        } else {
          console.error('API returned success=false:', data);
          throw new Error(data.error || data.message || 'Failed to load containers');
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          const timeoutMinutes = allAccounts ? '5 minutes' : '1 minute';
          throw new Error(`Request timeout: Loading container list took longer than ${timeoutMinutes}. ${allAccounts ? 'Listing from all accounts can take longer due to rate limiting.' : ''}`);
        }
        throw fetchError;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error loading container list:', err);
    } finally {
      setLoadingContainers(false);
    }
  };

  const toggleContainer = (containerId: string) => {
    const newExpanded = new Set(expandedContainers);
    if (newExpanded.has(containerId)) {
      newExpanded.delete(containerId);
    } else {
      newExpanded.add(containerId);
    }
    setExpandedContainers(newExpanded);
  };

  // Refresh all containers metadata and tags
  const refreshAllContainers = async () => {
    if (containerList.length === 0) {
      setError('No containers to refresh. Please search for containers first.');
      return;
    }

    setRefreshingAll(true);
    setError('');

    try {
      // Refresh all containers sequentially to avoid overwhelming the API
      for (let i = 0; i < containerList.length; i++) {
        const container = containerList[i];
        // Refresh both metadata and tags
        await loadContainerMetadata(container.containerId, true);
        await loadTagsForContainer(container.containerId, true);
        // Small delay between requests to respect rate limits
        if (i < containerList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (err: any) {
      setError(`Error refreshing containers: ${err.message}`);
      console.error('Error refreshing all containers:', err);
    } finally {
      setRefreshingAll(false);
    }
  };

  // Toggle tag selection for bulk update
  const toggleTagSelection = (containerId: string, tagName: string) => {
    setSelectedTags(prev => {
      const newMap = new Map(prev);
      const containerTags = newMap.get(containerId) || new Set<string>();
      const newContainerTags = new Set(containerTags);
      
      if (newContainerTags.has(tagName)) {
        newContainerTags.delete(tagName);
      } else {
        newContainerTags.add(tagName);
      }
      
      if (newContainerTags.size === 0) {
        newMap.delete(containerId);
      } else {
        newMap.set(containerId, newContainerTags);
      }
      
      return newMap;
    });
  };

  // Update a tag in a container
  const updateTag = async (containerId: string, tagName: string, publish: boolean = true) => {
    // Get the tag to find the repo tag name
    const tags = containerTags.get(containerId) || [];
    const tag = tags.find(t => t.tagName === tagName);
    const repoTagName = tag?.repoTagName || tagName; // Use repo tag name if available, otherwise use container tag name
    
    // Mark tag as updating
    setContainerTags(prev => {
      const newMap = new Map(prev);
      const tags = newMap.get(containerId) || [];
      const updatedTags = tags.map(t => 
        t.tagName === tagName ? { ...t, updating: true } : t
      );
      newMap.set(containerId, updatedTags);
      return newMap;
    });

    try {
      const response = await fetch('/api/gtm/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagName: tagName, // Container tag name (for finding tag in GTM)
          repoTagName: repoTagName, // Repo tag name (for finding file)
          accountId,
          credentialsPath,
          containerIds: [containerId],
          publish,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract detailed error message
        let errorMsg = data.error || 'Failed to update tag';
        if (data.details) {
          // Try to extract meaningful error from Python output
          const details = String(data.details);
          
          // Look for the full error block (from ERROR: to the end of instructions)
          const errorBlockMatch = details.match(/ERROR:.*?(?=\n\n\[|$)/s);
          if (errorBlockMatch) {
            // Extract the full error block, including all instructions
            const fullErrorBlock = errorBlockMatch[0];
            // Filter out debug lines but keep all error and instruction lines
            const errorLines = fullErrorBlock.split('\n').filter((line: string) => 
              line.trim() && 
              !line.includes('FutureWarning') &&
              !line.includes('warnings.warn') &&
              !line.includes('[DEBUG]')
            );
            if (errorLines.length > 0) {
              errorMsg = errorLines.join('\n'); // Show all error lines (not just first 5)
            }
          } else {
            // Fallback: extract error lines
            const errorLines = details.split('\n').filter((line: string) => 
              line.trim() && 
              !line.includes('FutureWarning') &&
              !line.includes('warnings.warn') &&
              !line.includes('[DEBUG]') &&
              (line.includes('Error') || line.includes('ERROR') || line.includes('Traceback') || 
               line.includes('Exception') || line.includes('Failed') || line.includes('❌') ||
               line.includes('⚠️') || line.includes('REQUIRED FIX') || line.includes('Also verify'))
            );
            if (errorLines.length > 0) {
              errorMsg = errorLines.join('\n'); // Show all relevant error lines
            } else {
              errorMsg = `${errorMsg}\n\nDetails: ${details.substring(0, 1000)}`;
            }
          }
        }
        throw new Error(errorMsg);
      }

      // Small delay to ensure GTM has processed the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload tags and metadata to get updated version (bypass cache)
      await loadContainerMetadata(containerId, true);
      await loadTagsForContainer(containerId, true);
      
      // Clear updating flag on success
      setContainerTags(prev => {
        const newMap = new Map(prev);
        const tags = newMap.get(containerId) || [];
        const updatedTags = tags.map(tag => 
          tag.tagName === tagName ? { ...tag, updating: false } : tag
        );
        newMap.set(containerId, updatedTags);
        return newMap;
      });
      
      // Remove from selected tags if it was selected
      setSelectedTags(prev => {
        const newMap = new Map(prev);
        const containerTags = newMap.get(containerId);
        if (containerTags) {
          const newContainerTags = new Set(containerTags);
          newContainerTags.delete(tagName);
          if (newContainerTags.size === 0) {
            newMap.delete(containerId);
          } else {
            newMap.set(containerId, newContainerTags);
          }
        }
        return newMap;
      });
    } catch (err: any) {
      setError(`Failed to update tag ${tagName} in ${containerId}:\n${err.message}`);
      console.error('Error updating tag:', err);
      
      // Remove updating flag on error
      setContainerTags(prev => {
        const newMap = new Map(prev);
        const tags = newMap.get(containerId) || [];
        const updatedTags = tags.map(tag => 
          tag.tagName === tagName ? { ...tag, updating: false } : tag
        );
        newMap.set(containerId, updatedTags);
        return newMap;
      });
    }
  };

  // Helper functions for tag name mapping (same as API route)
  const getRepoTagName = (gtmTagName: string): string => {
    const tagNameMap: Record<string, string> = {
      '3E_3EI Recruiter': '3E_3EI Recruiter Unified',
    };
    return tagNameMap[gtmTagName] || gtmTagName;
  };

  const getTagCategory = (tagName: string): string => {
    const repoTagName = getRepoTagName(tagName);
    const categoryMap: Record<string, string> = {
      'Template - 3E Config': 'base-solutions',
      '3E_Analytics Tracking': 'base-solutions',
      '3E_Page Activity': 'base-solutions',
      '3E_Form Validation': 'base-solutions',
      '3E_RFI Submit': 'base-solutions',
      '3E_Favicon Injection': 'base-solutions',
      '3E_Sticky Buttons': 'base-solutions',
      '3E_Cloudflare Beacon': 'base-solutions',
      '3E_3EI Recruiter Activity': 'chatbot-solutions',
      '3E_3EI Recruiter Conversion': 'chatbot-solutions',
      '3E_3EI Recruiter Tracking': 'chatbot-solutions',
      '3E_3EI Recruiter': 'chatbot-solutions',
      '3E_3EI Recruiter Unified': 'chatbot-solutions',
      '3E_Insights Pixel': 'chatbot-solutions',
      '3E_Pop-up': 'pop-up-solutions',
      '3E_Pop-up Marketo Form': 'pop-up-solutions',
      '3E_Pop-up Tracking': 'pop-up-solutions',
    };
    return categoryMap[repoTagName] || categoryMap[tagName] || 'base-solutions';
  };

  // Update multiple selected tags in a container using batch update
  const updateSelectedTags = async (containerId: string, tagNamesOverride?: string[]) => {
    // Use provided tag names if available, otherwise read from state
    const tagsToUpdate = tagNamesOverride || Array.from(selectedTags.get(containerId) || []);
    if (tagsToUpdate.length === 0) return;
    
    // Use batch update if multiple tags, otherwise use single update
    if (tagsToUpdate.length === 1) {
      // Single tag: use existing updateTag function
      await updateTag(containerId, tagsToUpdate[0], true);
      return;
    }
    
    // Batch update: collect all tag information
    const tags = containerTags.get(containerId) || [];
    const batchTags: Array<{tagName: string, repoTagName?: string, scriptPath: string}> = [];
    
    // Mark all tags as updating
    setContainerTags(prev => {
      const newMap = new Map(prev);
      const containerTags = newMap.get(containerId) || [];
      const updatedTags = containerTags.map(t => 
        tagsToUpdate.includes(t.tagName) ? { ...t, updating: true } : t
      );
      newMap.set(containerId, updatedTags);
      return newMap;
    });
    
    try {
      // Build script paths for all tags
      for (const tagName of tagsToUpdate) {
        const tag = tags.find(t => t.tagName === tagName);
        const repoTagName = tag?.repoTagName || getRepoTagName(tagName);
        const category = getTagCategory(repoTagName);
        
        // Build script path (same logic as update route)
        const fileTagNameWithExt = repoTagName.endsWith('.html') || repoTagName.endsWith('.js') 
          ? repoTagName 
          : `${repoTagName}.html`;
        
        // Construct path for server-side (API route will handle path resolution)
        // The API route expects paths relative to the project root
        const scriptPath = `../tags/${category}/${fileTagNameWithExt}`;
        
        batchTags.push({
          tagName: tagName,
          repoTagName: repoTagName,
          scriptPath: scriptPath
        });
      }
      
      const response = await fetch('/api/gtm/update-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId,
          tags: batchTags,
          accountId,
          credentialsPath,
          publish: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract detailed error message (similar to updateTag)
        let errorMsg = data.error || 'Failed to update tags';
        if (data.details) {
          const details = String(data.details);
          const errorBlockMatch = details.match(/ERROR:.*?(?=\n\n\[|$)/s);
          if (errorBlockMatch) {
            const fullErrorBlock = errorBlockMatch[0];
            const errorLines = fullErrorBlock.split('\n').filter((line: string) => 
              line.trim() && 
              !line.includes('FutureWarning') &&
              !line.includes('warnings.warn') &&
              !line.includes('[DEBUG]')
            );
            if (errorLines.length > 0) {
              errorMsg = errorLines.join('\n');
            }
          } else {
            const errorLines = details.split('\n').filter((line: string) => 
              line.trim() && 
              !line.includes('FutureWarning') &&
              !line.includes('warnings.warn') &&
              !line.includes('[DEBUG]') &&
              (line.includes('Error') || line.includes('ERROR') || line.includes('Traceback') || 
               line.includes('Exception') || line.includes('Failed') || line.includes('❌') ||
               line.includes('⚠️') || line.includes('REQUIRED FIX') || line.includes('Also verify'))
            );
            if (errorLines.length > 0) {
              errorMsg = errorLines.join('\n');
            } else {
              errorMsg = `${errorMsg}\n\nDetails: ${details.substring(0, 1000)}`;
            }
          }
        }
        throw new Error(errorMsg);
      }

      // Small delay to ensure GTM has processed the update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload tags and metadata to get updated versions (bypass cache)
      await loadContainerMetadata(containerId, true);
      await loadTagsForContainer(containerId, true);
      
      // Clear updating flags on success
      setContainerTags(prev => {
        const newMap = new Map(prev);
        const tags = newMap.get(containerId) || [];
        const updatedTags = tags.map(tag => 
          tagsToUpdate.includes(tag.tagName) ? { ...tag, updating: false } : tag
        );
        newMap.set(containerId, updatedTags);
        return newMap;
      });
      
      // Clear selected tags after successful batch update
      setSelectedTags(prev => {
        const newMap = new Map(prev);
        newMap.delete(containerId);
        return newMap;
      });
    } catch (err: any) {
      setError(`Failed to batch update tags in ${containerId}:\n${err.message}`);
      console.error('Error batch updating tags:', err);
      
      // Remove updating flags on error
      setContainerTags(prev => {
        const newMap = new Map(prev);
        const tags = newMap.get(containerId) || [];
        const updatedTags = tags.map(tag => 
          tagsToUpdate.includes(tag.tagName) ? { ...tag, updating: false } : tag
        );
        newMap.set(containerId, updatedTags);
        return newMap;
      });
    }
  };

  // Update all out-of-date tags across all containers
  const updateAllOutOfDateTags = async () => {
    setUpdatingAllOutOfDate(true);
    setError('');
    setContainersWithPermissionErrors(new Set()); // Clear permission errors state
    
    try {
      const totalContainers = containerList.length;
      let containersProcessed = 0;
      let containersWithUpdates = 0;
      let successCount = 0;
      let failedCount = 0;
      const failedContainers: string[] = [];
      const permissionErrorContainers: string[] = [];
      
      // Process all containers sequentially
      for (let i = 0; i < containerList.length; i++) {
        const container = containerList[i];
        const containerId = container.containerId;
        const containerName = container.containerName || containerId;
        
        // Show progress: checking container
        setError(`Checking container ${containerName}... (${i + 1}/${totalContainers})`);
        
        try {
          // Load tags for this container (force reload to get fresh data)
          await loadTagsForContainer(containerId, true);
          
          // Wait for React to update state - loadTagsForContainer updates state asynchronously
          // Give React time to process the state update (React batches updates)
          // We need to wait for the next render cycle to see updated tags
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get the loaded tags from containerTags state
          // Note: This reads from closure, but after the delay React should have updated
          // If tags aren't available yet, the container might not have any tags or had an error
          const tags = containerTags.get(containerId) || [];
          
          // Filter for out-of-date tags
          const outOfDateTags = tags.filter(t => t.needsUpdate);
          
          if (outOfDateTags.length > 0) {
            containersWithUpdates++;
            const tagNames = outOfDateTags.map(t => t.tagName);
            
            // Show progress: updating container
            setError(`Updating container ${containerName} - ${outOfDateTags.length} tag${outOfDateTags.length > 1 ? 's' : ''}... (${i + 1}/${totalContainers})`);
            
            try {
              // Use existing updateSelectedTags function which handles batch/single updates
              // Pass tag names directly to avoid state timing issues
              await updateSelectedTags(containerId, tagNames);
              successCount += outOfDateTags.length;
            } catch (err: any) {
              failedCount += outOfDateTags.length;
              failedContainers.push(containerName);
              console.error(`Error updating tags in container ${containerId}:`, err);
              // Continue with next container even if this one failed
            }
          } else {
            // No out-of-date tags, skip to next container
            // (could show "No updates needed" but that might be too verbose)
          }
          
          containersProcessed++;
          
          // Small delay between containers to avoid overwhelming the API
          if (i < containerList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err: any) {
          // Check if this is a permission error
          const errorMessage = err.message || err.toString() || '';
          const isPermissionError = 
            errorMessage.includes('No API permissions') ||
            errorMessage.includes('403') ||
            errorMessage.includes('404') ||
            errorMessage.includes('permission denied') ||
            errorMessage.includes('Not found') ||
            errorMessage.includes('Permission denied') ||
            errorMessage.toLowerCase().includes('access denied');
          
          if (isPermissionError) {
            // Flag container with permission error
            setContainersWithPermissionErrors(prev => new Set(prev).add(containerId));
            permissionErrorContainers.push(containerName);
            console.error(`Permission error for container ${containerId}:`, err);
          } else {
            // Other errors (not permission-related)
            console.error(`Error processing container ${containerId}:`, err);
          }
          // Continue with next container even if this one failed
          containersProcessed++;
        }
      }
      
      // Show summary
      let summaryMessage = '';
      if (containersWithUpdates === 0) {
        summaryMessage = `✓ Processed ${containersProcessed} container${containersProcessed !== 1 ? 's' : ''}. No out-of-date tags found.`;
      } else if (failedCount === 0) {
        summaryMessage = `✓ Processed ${containersProcessed} container${containersProcessed !== 1 ? 's' : ''}, updated ${successCount} tag${successCount !== 1 ? 's' : ''} in ${containersWithUpdates} container${containersWithUpdates !== 1 ? 's' : ''}`;
      } else {
        summaryMessage = `Processed ${containersProcessed} container${containersProcessed !== 1 ? 's' : ''}, updated ${successCount} tag${successCount !== 1 ? 's' : ''} in ${containersWithUpdates} container${containersWithUpdates !== 1 ? 's' : ''}. ` +
          `Failed: ${failedCount} tag${failedCount !== 1 ? 's' : ''} in container${failedContainers.length !== 1 ? 's' : ''} ${failedContainers.join(', ')}`;
      }
      
      // Add permission errors to summary if any
      if (permissionErrorContainers.length > 0) {
        summaryMessage += `. Permission errors: ${permissionErrorContainers.length} container${permissionErrorContainers.length !== 1 ? 's' : ''} (${permissionErrorContainers.join(', ')})`;
      }
      
      setError(summaryMessage);
      
      // Refresh all containers to get updated tag versions
      await refreshAllContainers();
      
    } catch (err: any) {
      setError(`Error updating all out-of-date tags: ${err.message}`);
      console.error('Error updating all out-of-date tags:', err);
    } finally {
      setUpdatingAllOutOfDate(false);
    }
  };

  const filteredContainers = containerList
    .filter(container => {
      if (!searchFilter) return true;
      const filter = searchFilter.toLowerCase();
      return container.containerId.toLowerCase().includes(filter) ||
             (container.containerName && container.containerName.toLowerCase().includes(filter));
    })
    .sort((a, b) => {
      // Sort by name first, then by ID if names are the same or missing
      const nameA = (a.containerName || '').toLowerCase();
      const nameB = (b.containerName || '').toLowerCase();
      if (nameA && nameB) {
        return nameA.localeCompare(nameB);
      }
      if (nameA) return -1;
      if (nameB) return 1;
      // Both have no name, sort by ID
      return a.containerId.localeCompare(b.containerId);
    });

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">Container Search</h2>
        <div className="flex items-center gap-2">
          {containerList.length > 0 && (
            <>
              <Button
                onClick={refreshAllContainers}
                disabled={refreshingAll || loadingContainers || updatingAllOutOfDate}
                variant="outline"
                className="text-gray-700"
                title="Refresh metadata and tags for all containers"
              >
                {refreshingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing All...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All Containers
                  </>
                )}
              </Button>
              <Button
                onClick={updateAllOutOfDateTags}
                disabled={updatingAllOutOfDate || loadingContainers || refreshingAll || containerList.length === 0}
                className="bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold"
                title="Update all out-of-date tags across all containers"
              >
                {updatingAllOutOfDate ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating All...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Update All Out-of-Date Tags
                  </>
                )}
              </Button>
            </>
          )}
          <Button
            onClick={searchContainers}
            disabled={loadingContainers || refreshingAll}
            className="bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold"
          >
            {loadingContainers ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Search Containers
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Input
          placeholder="Search containers by ID or name..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="flex-1"
        />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allAccounts}
              onChange={(e) => setAllAccounts(e.target.checked)}
              id="all-accounts"
            />
            <label htmlFor="all-accounts" className="text-sm text-gray-700 cursor-pointer">
              All Accounts
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={filter3EOnly}
              onChange={(e) => {
                setFilter3EOnly(e.target.checked);
                // useEffect will handle clearing cache and reloading
              }}
              id="filter-3e"
            />
            <label htmlFor="filter-3e" className="text-sm text-gray-700 cursor-pointer">
              Show only 3E_ tags
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-700 p-3 rounded-lg text-sm">
          <div className="font-semibold mb-2">Error:</div>
          <pre className="whitespace-pre-wrap text-xs font-mono overflow-x-auto">{error}</pre>
        </div>
      )}

      {loadingContainers && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="flex items-center mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-600">Searching for containers...</span>
          </div>
          {allAccounts && (
            <p className="text-xs text-gray-500 mt-2">
              This may take several minutes when searching all accounts due to API rate limits...
            </p>
          )}
        </div>
      )}

      {!loadingContainers && containerList.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No containers found. Click "Search Containers" to load the container list.
        </div>
      )}

      {!loadingContainers && filteredContainers.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="p-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
            Found {filteredContainers.length} container{filteredContainers.length !== 1 ? 's' : ''}
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {filteredContainers.map((container) => {
              const isExpanded = expandedContainers.has(container.containerId);
              const isLoadingTags = loadingTags.has(container.containerId);
              const tags = containerTags.get(container.containerId) || [];
              const updatableTagsCount = tags.filter(t => t.needsUpdate).length;
              const hasPermissionError = containersWithPermissionErrors.has(container.containerId);
              
              return (
                <div 
                  key={container.containerId} 
                  className={`border-b border-gray-200 last:border-b-0 ${hasPermissionError ? 'bg-red-50 border-red-200' : ''}`}
                >
                  <div className="flex items-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => toggleContainer(container.containerId)}
                      className="flex-1 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors -m-4 p-4"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        )}
                        {/* Container Name with Account Name - Main, Bold */}
                        {container.containerName ? (
                          <div className="font-semibold text-base text-gray-900 truncate flex items-center gap-2" title={container.containerName}>
                            {hasPermissionError && (
                              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" title="No API Access" />
                            )}
                            <span>{container.containerName}</span>
                            {container.accountName && (
                              <span className="text-gray-500 font-normal ml-2">
                                ({container.accountName})
                              </span>
                            )}
                            {hasPermissionError && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                No API Access
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="font-semibold text-base text-gray-900 flex items-center gap-2">
                            {hasPermissionError && (
                              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" title="No API Access" />
                            )}
                            <span>{container.containerId}</span>
                            {container.accountName && (
                              <span className="text-gray-500 font-normal ml-2">
                                ({container.accountName})
                              </span>
                            )}
                            {hasPermissionError && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                No API Access
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                    
                    {/* Right Side Columns: Container ID, Account ID, Cached, Last Updated, Refresh */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {/* Container ID Column */}
                      <div className="w-28 text-xs text-gray-600 text-right">
                        <div className="flex flex-col">
                          <span className="font-medium">Container ID:</span>
                          <span className="font-mono">{container.containerId}</span>
                        </div>
                      </div>
                      
                      {/* Account ID Column */}
                      <div className="w-28 text-xs text-gray-600 text-right">
                        {container.accountId && (allAccounts || container.accountId !== accountId) ? (
                          <div className="flex flex-col">
                            <span className="font-medium">Account ID:</span>
                            <span>{container.accountId}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">Account ID:</span>
                            <span className="text-gray-400">-</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Cached Date Column */}
                      <div className="w-28 text-xs text-gray-600 text-right">
                        {container.cachedAt ? (
                          <div className="flex flex-col">
                            <span className="font-medium">Cached:</span>
                            <span>{new Date(container.cachedAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">Cached:</span>
                            <span className="text-gray-400">-</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Last Updated Column */}
                      <div className="w-32 text-xs text-gray-600 text-right">
                        {container.metadata?.lastUpdated ? (
                          <div className="flex flex-col">
                            <span className="font-medium">Last Updated:</span>
                            <span>
                              {(() => {
                                // Try to parse as timestamp (milliseconds)
                                const lastUpdated = container.metadata.lastUpdated;
                                if (typeof lastUpdated === 'string' && /^\d+$/.test(lastUpdated)) {
                                  const timestamp = parseInt(lastUpdated, 10);
                                  // Check if it's a reasonable timestamp (after 2000-01-01)
                                  if (timestamp > 946684800000) {
                                    return new Date(timestamp).toLocaleDateString();
                                  }
                                }
                                // If it's already a date string, return as-is
                                return lastUpdated;
                              })()}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">Last Updated:</span>
                            <span className="text-gray-400">-</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Refresh Button Column */}
                      <div className="w-10 flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadContainerMetadata(container.containerId, true);
                          }}
                          disabled={loadingMetadata.has(container.containerId)}
                          className={`h-8 text-xs flex-shrink-0 ${
                            !container.cachedAt 
                              ? 'bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold border-0' 
                              : ''
                          }`}
                          title={!container.cachedAt ? "No cache - click to load metadata" : "Refresh container metadata"}
                        >
                          {loadingMetadata.has(container.containerId) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-gray-50 px-4 pb-4">
                      <div className="flex items-center justify-between pt-2 mb-2">
                        <span className="text-xs text-gray-600">
                          {isLoadingTags ? (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading tags...
                            </span>
                          ) : (
                            <span>
                              {tags.length} {filter3EOnly ? '3E ' : ''}tag{tags.length !== 1 ? 's' : ''} found
                            </span>
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadTagsForContainer(container.containerId, true);
                          }}
                          disabled={isLoadingTags}
                          className="h-7 text-xs"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingTags ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                      {!isLoadingTags && tags.length === 0 ? (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          No {filter3EOnly ? '3E ' : ''}tags found in this container.
                        </div>
                      ) : !isLoadingTags && tags.length > 0 ? (
                        <div className="space-y-2">
                          {/* Bulk Update Button */}
                          {(() => {
                            const selected = selectedTags.get(container.containerId);
                            const selectedCount = selected?.size || 0;
                            const hasSelected = selectedCount > 0;
                            const hasUpdatableTags = tags.some(t => t.needsUpdate);
                            const updatableCount = tags.filter(t => t.needsUpdate).length;
                            
                            // Only show bulk update controls if there are multiple updatable tags
                            if (!hasUpdatableTags || updatableCount <= 1) return null;
                            
                            return (
                              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-300">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={hasSelected && selectedCount === tags.filter(t => t.needsUpdate).length}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        // Select all updatable tags
                                        const updatableTags = tags.filter(t => t.needsUpdate).map(t => t.tagName);
                                        setSelectedTags(prev => {
                                          const newMap = new Map(prev);
                                          newMap.set(container.containerId, new Set(updatableTags));
                                          return newMap;
                                        });
                                      } else {
                                        // Deselect all
                                        setSelectedTags(prev => {
                                          const newMap = new Map(prev);
                                          newMap.delete(container.containerId);
                                          return newMap;
                                        });
                                      }
                                    }}
                                    id={`select-all-${container.containerId}`}
                                  />
                                  <label 
                                    htmlFor={`select-all-${container.containerId}`} 
                                    className="text-sm text-gray-700 cursor-pointer"
                                  >
                                    Select all updatable tags
                                  </label>
                                </div>
                                {hasSelected && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateSelectedTags(container.containerId);
                                    }}
                                    disabled={tags.some(t => selected?.has(t.tagName) && t.updating)}
                                    className="h-8 text-xs whitespace-nowrap bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold border-0"
                                    title={`Update and publish ${selectedCount} selected tag${selectedCount !== 1 ? 's' : ''}`}
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    Update & Publish Selected ({selectedCount})
                                  </Button>
                                )}
                              </div>
                            );
                          })()}
                          {[...tags].sort((a, b) => {
                            // Helper function to check if tag is managed (3E_ or Template)
                            const isManaged = (tagName: string) => 
                              tagName.startsWith('3E_') || tagName.startsWith('Template');
                            
                            const aManaged = isManaged(a.tagName);
                            const bManaged = isManaged(b.tagName);
                            
                            // Managed tags first
                            if (aManaged && !bManaged) return -1;
                            if (!aManaged && bManaged) return 1;
                            
                            // Within same group, sort alphabetically
                            return a.tagName.localeCompare(b.tagName);
                          }).map((tag, idx) => (
                            <div
                              key={idx}
                              className={`bg-white border rounded-md p-3 ${
                                tag.isUpToDate 
                                  ? 'border-green-300 bg-green-50' 
                                  : tag.needsUpdate 
                                  ? 'border-yellow-300 bg-yellow-50' 
                                  : 'border-gray-200'
                              } ${selectedTags.get(container.containerId)?.has(tag.tagName) ? 'ring-2 ring-blue-400' : ''}`}
                            >
                              <div className="flex items-center gap-4">
                                {/* Left Side: Tag Name */}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 truncate" title={tag.tagName}>
                                    {tag.tagName}
                                  </div>
                                </div>
                                
                                {/* Right Side: Checkbox, Update Button, then Aligned Columns */}
                                <div className="flex items-center justify-end gap-4 flex-shrink-0 ml-auto">
                                  {/* Checkbox and Update Button (left side of right section) */}
                                  {tag.needsUpdate && (
                                    <>
                                      {updatableTagsCount > 1 && (
                                        <Checkbox
                                          checked={selectedTags.get(container.containerId)?.has(tag.tagName) || false}
                                          onChange={() => toggleTagSelection(container.containerId, tag.tagName)}
                                          id={`tag-${container.containerId}-${idx}`}
                                          className="flex-shrink-0"
                                        />
                                      )}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateTag(container.containerId, tag.tagName, true); // Update and publish
                                        }}
                                        disabled={tag.updating}
                                        className="h-8 text-xs whitespace-nowrap bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold border-0 flex-shrink-0"
                                        title="Update tag and publish to live"
                                      >
                                        {tag.updating ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            Updating...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="h-3 w-3 mr-1" />
                                            Update & Publish
                                          </>
                                        )}
                                      </Button>
                                    </>
                                  )}
                                  {/* Status Column: Active/Paused */}
                                  <div className="w-20 flex justify-center">
                                    {tag.paused !== undefined && (
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                        tag.paused 
                                          ? 'bg-gray-200 text-gray-700' 
                                          : 'bg-green-100 text-green-700'
                                      }`}>
                                        {tag.paused ? 'Paused' : 'Active'}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Container Version Column */}
                                  <div className="w-32 text-xs text-gray-600 whitespace-nowrap text-right">
                                    {tag.version ? (
                                      <>
                                        <span className="font-medium">Container:</span> <span className="font-semibold">{tag.version}</span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Repo Version Column */}
                                  <div className="w-32 text-xs text-gray-600 whitespace-nowrap text-right">
                                    {tag.repoVersion && tag.repoVersion !== 'Unknown' ? (
                                      <>
                                        <span className="font-medium">Repo:</span> <span className="font-semibold">{tag.repoVersion}</span>
                                      </>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Status Badge Column */}
                                  <div className="w-32 flex justify-center">
                                    {tag.isUpToDate && (
                                      <div className="flex items-center gap-1 text-xs text-green-700 whitespace-nowrap">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Up to date</span>
                                      </div>
                                    )}
                                    {tag.needsUpdate && (
                                      <div className="flex items-center gap-1 text-xs text-yellow-700 whitespace-nowrap">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>Update available</span>
                                      </div>
                                    )}
                                    {(!tag.repoVersion || tag.repoVersion === 'Unknown') && !tag.isUpToDate && !tag.needsUpdate && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                                        <AlertCircle className="h-3 w-3" />
                                        <span>Not in repo</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


