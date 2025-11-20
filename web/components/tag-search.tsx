/**
 * Tag Search Component
 * Allows users to select and search for GTM tags across containers
 * 
 * Author: Anthony Figgins
 * Version: 1.0.3
 * Date Updated: 2025-11-17
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

interface Tag {
  name: string;
  category: string;
  version: string;
  dateUpdated: string;
  description?: string;
}

interface TagSearchProps {
  accountId: string;
  credentialsPath: string;
  onSearchComplete: (results: any, tagNames: string[]) => void;
}

export default function TagSearch({ accountId, credentialsPath, onSearchComplete }: TagSearchProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(true);
  const [error, setError] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchStatus, setSearchStatus] = useState<string>('');

  // Note: Caching is now handled server-side via cache-manager.ts
  // Cache files are stored in .cache/ directory and shared across all users

  // Load available tags on mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await fetch('/api/gtm/tags');
        const data = await response.json();
        
        if (data.success && data.tags) {
          // Sort tags by name
          const sorted = data.tags.sort((a: Tag, b: Tag) => a.name.localeCompare(b.name));
          setAvailableTags(sorted);
          
          // Keep categories collapsed by default (empty set)
          setExpandedCategories(new Set());
        }
      } catch (err: any) {
        console.error('Error loading tags:', err);
        setError('Failed to load available tags');
      } finally {
        setLoadingTags(false);
      }
    };
    
    loadTags();
  }, []);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    const allCategories = Array.from(new Set(availableTags.map(t => t.category)));
    setExpandedCategories(new Set(allCategories));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const toggleTag = (tagName: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagName)) {
      newSelected.delete(tagName);
    } else {
      newSelected.add(tagName);
    }
    setSelectedTags(newSelected);
  };

  const selectAll = () => {
    const filtered = getFilteredTags();
    setSelectedTags(new Set(filtered.map(t => t.name)));
  };

  const deselectAll = () => {
    setSelectedTags(new Set());
  };

  const getFilteredTags = () => {
    if (!searchFilter) return availableTags;
    const filter = searchFilter.toLowerCase();
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(filter) ||
      tag.category.toLowerCase().includes(filter) ||
      (tag.description && tag.description.toLowerCase().includes(filter))
    );
  };

  const handleSearch = async () => {
    if (selectedTags.size === 0) {
      setError('Please select at least one tag');
      return;
    }

    setLoading(true);
    setError('');
    
    // For now, search for the first selected tag
    // TODO: Support multiple tags in search
    const tagName = Array.from(selectedTags)[0];
    
    // Note: Server-side caching is handled automatically by the API route
    // If cache exists, the API will return it immediately; otherwise it will search and cache
    setSearchStatus('Searching for tag in all containers... This may take several minutes for large container lists.');
    console.log('Starting search for tag:', tagName);
    
    try {
      const response = await fetch('/api/gtm/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagName: tagName,
          accountId,
          credentialsPath,
        }),
      });
      
      console.log('Search response status:', response.status);

      const data = await response.json();

      if (!response.ok) {
        // Extract error message - could be a string or an object
        const errorMsg = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || JSON.stringify(data.error) || 'Failed to search for tag';
        throw new Error(errorMsg);
      }

      // Cache is automatically saved by the API route
      // Check if this was from cache
      if (data.fromCache) {
        setSearchStatus('Loaded from cache');
        setTimeout(() => setSearchStatus(''), 2000);
      } else {
        setSearchStatus('');
      }
      
      onSearchComplete(data, Array.from(selectedTags));
    } catch (err: any) {
      // Show the full error message
      const errorMsg = err.message || err.toString() || 'An error occurred';
      setError(errorMsg);
      setSearchStatus('');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = getFilteredTags();
  const categories = Array.from(new Set(availableTags.map(t => t.category))).sort();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">
          Select Tags to Search
        </label>
        
        {/* Search filter */}
        <Input
          type="text"
          placeholder="Search tags by name, category, or description..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full mb-3"
        />

        {/* Tag selection area */}
        <div className="border border-gray-200 rounded-lg bg-white max-h-96 overflow-y-auto p-4">
          {loadingTags ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-600">Loading tags...</span>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchFilter ? 'No tags found matching your search' : 'No tags available'}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick actions */}
              <div className="flex gap-2 pb-2 border-b border-gray-200 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  className="text-xs"
                >
                  Deselect All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="text-xs"
                >
                  Expand All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="text-xs"
                >
                  Collapse All
                </Button>
                <div className="ml-auto text-xs text-gray-600 flex items-center">
                  {selectedTags.size} selected
                </div>
              </div>

              {/* Tags by category */}
              {categories.map(category => {
                const categoryTags = filteredTags.filter(t => t.category === category);
                if (categoryTags.length === 0) return null;
                const isExpanded = expandedCategories.has(category);

                return (
                  <div key={category} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-2 w-full text-left text-sm font-semibold text-gray-700 capitalize mb-2 hover:text-gray-900 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>{category.replace(/-/g, ' ')}</span>
                      <span className="text-xs font-normal text-gray-500">
                        ({categoryTags.length})
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="space-y-2 pl-6">
                      {categoryTags.map(tag => {
                        const isSelected = selectedTags.has(tag.name);
                        return (
                          <div
                            key={tag.name}
                            className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-yellow-50 border-yellow-300'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleTag(tag.name)}
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-sm">
                                  {tag.name}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                )}
                              </div>
                              {tag.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {tag.description}
                                </p>
                              )}
                            </div>
                            
                            {/* Right Side Columns: Version and Last Updated */}
                            <div className="flex items-center gap-4 flex-shrink-0">
                              {/* Version Column */}
                              <div className="w-28 text-xs text-gray-600 text-right">
                                <div className="flex flex-col">
                                  <span className="font-medium">Version:</span>
                                  <span>{tag.version}</span>
                                </div>
                              </div>
                              
                              {/* Last Updated Column */}
                              <div className="w-32 text-xs text-gray-600 text-right">
                                <div className="flex flex-col">
                                  <span className="font-medium">Last Updated:</span>
                                  <span>{tag.dateUpdated}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {searchStatus && (
        <div className="bg-blue-50 border-2 border-blue-500 text-blue-700 p-3 rounded-lg text-sm">
          {searchStatus}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-500 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Button 
        onClick={handleSearch} 
        disabled={loading || selectedTags.size === 0}
        className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold py-3 rounded-lg shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Search Selected Tags ({selectedTags.size})
          </>
        )}
      </Button>
    </div>
  );
}
