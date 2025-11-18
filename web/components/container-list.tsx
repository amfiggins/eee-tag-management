'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { compareVersions } from '@/utils/version-detector';

interface Container {
  containerId: string;
  containerName?: string;
  hasTag: boolean;
  tagVersion?: string;
  tagId?: string;
  status: 'found' | 'not-found' | 'error';
  error?: string;
}

interface ContainerListProps {
  containers: Container[];
  tagName: string;
  repoVersion: { version: string; dateUpdated: string } | null;
}

export default function ContainerList({ containers, tagName, repoVersion }: ContainerListProps) {
  const [selectedContainers, setSelectedContainers] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'not-found' | 'outdated'>('all');
  const [updating, setUpdating] = useState(false);
  const [updateResults, setUpdateResults] = useState<any>(null);

  // Filter containers
  const filteredContainers = useMemo(() => {
    let filtered = containers;

    // Search filter
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      filtered = filtered.filter(c => 
        c.containerId.includes(search) || 
        (c.containerName && c.containerName.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (statusFilter === 'found') {
      filtered = filtered.filter(c => c.hasTag);
    } else if (statusFilter === 'not-found') {
      filtered = filtered.filter(c => !c.hasTag && c.status !== 'error');
    } else if (statusFilter === 'outdated') {
      filtered = filtered.filter(c => {
        if (!c.hasTag || !c.tagVersion || !repoVersion) return false;
        return compareVersions(c.tagVersion, repoVersion.version) < 0;
      });
    }

    return filtered;
  }, [containers, searchFilter, statusFilter, repoVersion]);

  // Containers with version comparison
  const containersWithStatus = useMemo(() => {
    return filteredContainers.map(container => {
      let versionStatus: 'up-to-date' | 'outdated' | 'unknown' = 'unknown';
      
      if (container.hasTag && container.tagVersion && repoVersion) {
        const comparison = compareVersions(container.tagVersion, repoVersion.version);
        versionStatus = comparison === 0 ? 'up-to-date' : comparison < 0 ? 'outdated' : 'up-to-date';
      }

      return {
        ...container,
        versionStatus,
      };
    });
  }, [filteredContainers, repoVersion]);

  const toggleContainer = (containerId: string) => {
    const newSelected = new Set(selectedContainers);
    if (newSelected.has(containerId)) {
      newSelected.delete(containerId);
    } else {
      newSelected.add(containerId);
    }
    setSelectedContainers(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(containersWithStatus
      .filter(c => c.hasTag && c.versionStatus === 'outdated')
      .map(c => c.containerId));
    setSelectedContainers(allIds);
  };

  const deselectAll = () => {
    setSelectedContainers(new Set());
  };

  const handleUpdate = async () => {
    if (selectedContainers.size === 0) {
      alert('Please select at least one container to update');
      return;
    }

    if (!confirm(`Update ${selectedContainers.size} container(s)?`)) {
      return;
    }

    setUpdating(true);
    setUpdateResults(null);

    try {
      const response = await fetch('/api/gtm/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagName,
          accountId: '4702086067',
          credentialsPath: 'automation/gtm-oauth-credentials.json',
          containerIds: Array.from(selectedContainers),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update containers');
      }

      setUpdateResults(data);
      alert(`Successfully updated ${data.results?.filter((r: any) => r.status === 'success').length || 0} container(s)`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      console.error('Update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const foundCount = containersWithStatus.filter(c => c.hasTag).length;
  const outdatedCount = containersWithStatus.filter(c => c.versionStatus === 'outdated').length;
  const upToDateCount = containersWithStatus.filter(c => c.versionStatus === 'up-to-date').length;

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Containers with "{tagName}"</h2>
          {repoVersion && (
            <p className="text-sm text-gray-600 mt-1">
              Repository version: <span className="font-semibold">{repoVersion.version}</span> 
              {' '}(Updated: {repoVersion.dateUpdated})
            </p>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {foundCount} found • {outdatedCount} outdated • {upToDateCount} up-to-date
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search containers..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-md border border-input bg-background"
        >
          <option value="all">All</option>
          <option value="found">Has Tag</option>
          <option value="outdated">Outdated</option>
          <option value="not-found">Not Found</option>
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={selectAll}>
          Select All Outdated
        </Button>
        <Button variant="outline" size="sm" onClick={deselectAll}>
          Deselect All
        </Button>
        <Button 
          onClick={handleUpdate} 
          disabled={selectedContainers.size === 0 || updating}
          className="ml-auto bg-gradient-to-r from-[#FFD700] to-[#FFC700] hover:from-[#FFC700] hover:to-[#FFB700] text-gray-900 font-bold shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Selected ({selectedContainers.size})
            </>
          )}
        </Button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium w-12">
                  <Checkbox
                    checked={selectedContainers.size > 0 && selectedContainers.size === containersWithStatus.filter(c => c.hasTag && c.versionStatus === 'outdated').length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAll();
                      } else {
                        deselectAll();
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Container ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Version</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {containersWithStatus.map((container) => {
                const isSelected = selectedContainers.has(container.containerId);
                const canSelect = container.hasTag && container.versionStatus === 'outdated';

                return (
                  <tr 
                    key={container.containerId}
                    className="border-t border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleContainer(container.containerId)}
                        disabled={!canSelect}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">
                      {container.containerId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {container.tagVersion || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {container.status === 'error' ? (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <XCircle className="h-4 w-4" />
                          Error
                        </span>
                      ) : !container.hasTag ? (
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Not Found
                        </span>
                      ) : container.versionStatus === 'up-to-date' ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Up to date
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          Outdated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {containersWithStatus.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No containers found matching your filters
        </div>
      )}
    </div>
  );
}

