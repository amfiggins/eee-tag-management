/**
 * Container Browser Component
 * Container search interface - find containers and view their tags
 * When a container is expanded, tags are loaded on-demand
 * Includes filter for 3E_ tags only
 * Containers sorted by name (then ID if no name)
 * 
 * Author: Anthony Figgins
 * Version: 2.0.1
 * Date Updated: 2025-11-17
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

interface ContainerTag {
  tagId: string;
  tagName: string;
  version?: string;
}

interface ContainerListItem {
  containerId: string;
  containerName?: string;
}

export default function ContainerBrowser() {
  const [containerList, setContainerList] = useState<ContainerListItem[]>([]);
  const [containerTags, setContainerTags] = useState<Map<string, ContainerTag[]>>(new Map()); // containerId -> tags
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingTags, setLoadingTags] = useState<Set<string>>(new Set()); // Set of container IDs loading tags
  const [error, setError] = useState('');
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [filter3EOnly, setFilter3EOnly] = useState(true); // Filter for 3E_ tags only
  const [accountId, setAccountId] = useState('4702086067');
  const [credentialsPath, setCredentialsPath] = useState('automation/gtm-oauth-credentials.json');

  // Load tags for a container when it's expanded
  const loadTagsForContainer = async (containerId: string, forceReload = false) => {
    // Don't reload if we already have tags for this container (unless forcing)
    if (!forceReload && containerTags.has(containerId)) {
      return;
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
          accountId,
          credentialsPath,
          filter3E: filter3EOnly,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tags');
      }

      if (data.success && data.tags) {
        setContainerTags(prev => {
          const newMap = new Map(prev);
          newMap.set(containerId, data.tags);
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
  // When filter changes, reload tags for all expanded containers
  useEffect(() => {
    expandedContainers.forEach(containerId => {
      loadTagsForContainer(containerId, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedContainers]); // Load tags when containers are expanded

  // When filter changes, reload tags for all expanded containers
  useEffect(() => {
    if (expandedContainers.size > 0) {
      // Clear cache and reload all expanded containers
      setContainerTags(new Map());
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
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute should be enough
      
      try {
        const response = await fetch('/api/gtm/containers-only', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            credentialsPath,
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
          throw new Error('Request timeout: Loading container list took longer than 1 minute.');
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
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">GTM Account ID</label>
          <Input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Credentials Path</label>
          <Input
            type="text"
            value={credentialsPath}
            onChange={(e) => setCredentialsPath(e.target.value)}
          />
        </div>
      </div>

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
          placeholder="Search containers by ID..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="flex-1"
        />
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

      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-700 p-3 rounded-lg text-sm">
          <div className="font-semibold mb-2">Error:</div>
          <pre className="whitespace-pre-wrap text-xs font-mono overflow-x-auto">{error}</pre>
        </div>
      )}

      {loadingContainers && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-600">Searching for containers...</span>
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
                      className="flex-1 flex items-center justify-between hover:bg-gray-50 transition-colors -m-4 p-4"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        )}
                        <div className="text-left">
                          <div className="font-mono text-sm font-semibold text-gray-900">
                            {container.containerId}
                          </div>
                          {container.containerName && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {container.containerName}
                            </div>
                          )}
                          {isExpanded && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              {isLoadingTags ? (
                                <span className="flex items-center gap-1 text-blue-600">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Loading tags...
                                </span>
                              ) : (
                                <span>
                                  {tags.length} {filter3EOnly ? '3E ' : ''}tag{tags.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  {isExpanded && !isLoadingTags && (
                    <div className="bg-gray-50 px-4 pb-4">
                      {tags.length === 0 ? (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          No {filter3EOnly ? '3E ' : ''}tags found in this container.
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2">
                          {tags.map((tag, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-gray-200 rounded-md p-3"
                            >
                              <div className="font-medium text-sm text-gray-900">
                                {tag.tagName}
                              </div>
                              {tag.version && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Version: <span className="font-semibold">{tag.version}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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


