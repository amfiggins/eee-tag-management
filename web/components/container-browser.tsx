/**
 * Container Browser Component
 * Container search interface - find containers and view their tags
 * When a container is expanded, tags are loaded on-demand
 * Includes filter for 3E_ tags only
 * Containers sorted by name (then ID if no name)
 * 
 * Author: Anthony Figgins
 * Version: 2.3.0
 * Date Updated: 2025-11-17
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
  repoVersion?: string; // Version from tags folder
  repoTagName?: string; // Actual tag name in repo (may differ from container tag name)
  repoDateUpdated?: string;
  isUpToDate?: boolean; // true if versions match
  needsUpdate?: boolean; // true if repo version is newer
  updating?: boolean; // true if update is in progress
}

interface ContainerListItem {
  containerId: string;
  containerName?: string;
  accountId?: string;
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
  const [error, setError] = useState('');
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [filter3EOnly, setFilter3EOnly] = useState(true); // Filter for 3E_ tags only
  const [allAccounts, setAllAccounts] = useState(false); // Search all accounts or just the specified one

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

  // Load tags for a container when it's expanded
  const loadTagsForContainer = async (containerId: string, forceReload = false) => {
    // Find the container to get its accountId (if different from primary account)
    const container = containerList.find(c => c.containerId === containerId);
    const containerAccountId = container?.accountId || accountId; // Use container's accountId if available
    
    // Check cache first (unless forcing reload)
    if (!forceReload) {
      const cachedTags = loadTagsFromCache(containerId);
      if (cachedTags) {
        // Load from cache immediately
        setContainerTags(prev => {
          const newMap = new Map(prev);
          newMap.set(containerId, cachedTags);
          return newMap;
        });
        // Still fetch fresh data in background (silently update cache)
        // Don't show loading indicator for background refresh
      } else if (containerTags.has(containerId)) {
        // Already loaded in memory, don't reload
        return;
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
          filter3E: filter3EOnly,
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

  // When a container is expanded, load its tags
  useEffect(() => {
    expandedContainers.forEach(containerId => {
      loadTagsForContainer(containerId, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedContainers]); // Load tags when containers are expanded

  // When filter changes, clear cache and reload tags for all expanded containers
  useEffect(() => {
    if (expandedContainers.size > 0) {
      // Clear in-memory cache
      setContainerTags(new Map());
      // Clear localStorage cache for all expanded containers
      expandedContainers.forEach(containerId => {
        try {
          const cacheKey = `gtm_tags_${accountId}_${containerId}_${!filter3EOnly}`; // Old filter value
          localStorage.removeItem(cacheKey);
        } catch (error) {
          // Ignore cache clear errors
        }
      });
      // Reload all expanded containers with new filter
      expandedContainers.forEach(containerId => {
        loadTagsForContainer(containerId, true);
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

        if (data.success && data.containers) {
          console.log(`Loaded ${data.containers.length} containers from API`);
          setContainerList(data.containers);
          setError(''); // Clear any previous errors
          if (data.partial) {
            setError(`⚠️ Partial results: ${data.note || 'Some containers may be missing.'}`);
          } else {
            console.log('All containers loaded successfully');
          }
        } else {
          console.error('API returned success=false or no containers:', data);
          throw new Error(data.error || 'Failed to load containers');
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

  // Update a tag in a container
  const updateTag = async (containerId: string, tagName: string) => {
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tag');
      }

      // Reload tags to get updated version
      await loadTagsForContainer(containerId, true);
    } catch (err: any) {
      setError(`Failed to update tag ${tagName} in ${containerId}: ${err.message}`);
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
        <Button
          onClick={searchContainers}
          disabled={loadingContainers}
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
              
              return (
                <div key={container.containerId} className="border-b border-gray-200 last:border-b-0">
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
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Container Name - Main, Bold */}
                          {container.containerName ? (
                            <div className="font-semibold text-base text-gray-900 truncate" title={container.containerName}>
                              {container.containerName}
                            </div>
                          ) : (
                            <div className="font-semibold text-base text-gray-900">
                              {container.containerId}
                            </div>
                          )}
                          {/* Container ID - Smaller, Not Bold */}
                          {container.containerName && (
                            <div className="font-mono text-xs text-gray-500 flex-shrink-0">
                              ({container.containerId})
                            </div>
                          )}
                          {/* Account ID - Show if different from primary account or if allAccounts is enabled */}
                          {container.accountId && (allAccounts || container.accountId !== accountId) && (
                            <div className="text-xs text-gray-400 flex-shrink-0">
                              Account: {container.accountId}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
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
                          {[...tags].sort((a, b) => a.tagName.localeCompare(b.tagName)).map((tag, idx) => (
                            <div
                              key={idx}
                              className={`bg-white border rounded-md p-3 ${
                                tag.isUpToDate 
                                  ? 'border-green-300 bg-green-50' 
                                  : tag.needsUpdate 
                                  ? 'border-yellow-300 bg-yellow-50' 
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                {/* Tag Name */}
                                <div className="flex-shrink-0 w-48">
                                  <div className="font-medium text-sm text-gray-900 truncate" title={tag.tagName}>
                                    {tag.tagName}
                                  </div>
                                </div>
                                
                                {/* Versions - Horizontal Layout */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {tag.version && (
                                    <div className="text-xs text-gray-600 whitespace-nowrap">
                                      <span className="font-medium">Container:</span> <span className="font-semibold">{tag.version}</span>
                                    </div>
                                  )}
                                  {tag.repoVersion && tag.repoVersion !== 'Unknown' && (
                                    <div className="text-xs text-gray-600 whitespace-nowrap">
                                      <span className="font-medium">Repo:</span> <span className="font-semibold">{tag.repoVersion}</span>
                                    </div>
                                  )}
                                  
                                  {/* Status Badge */}
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
                                  {(!tag.repoVersion || tag.repoVersion === 'Unknown') && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                                      <AlertCircle className="h-3 w-3" />
                                      <span>Not in repo</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Update Button */}
                                {tag.needsUpdate && (
                                  <div className="flex-shrink-0">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateTag(container.containerId, tag.tagName);
                                      }}
                                      disabled={tag.updating}
                                      className="h-8 text-xs whitespace-nowrap bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold border-0"
                                    >
                                      {tag.updating ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Updating...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-3 w-3 mr-1" />
                                          Update
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
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


