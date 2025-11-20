# GTM Cache Directory

This directory contains server-side cache files for GTM tag search results and container data.

## Purpose

Cache files are stored here to:
- Speed up repeated searches
- Share cache across all users
- Reduce API calls to Google Tag Manager
- Make cache easily maintainable and viewable
- Enable data sharing between Container Browser and Tag Search

## Cache File Structure

### Unified Account Cache (Primary)

The main cache files use a unified structure where all container data for an account is stored in a single file:

- **`container_data_{accountId}.json`** - All containers for a specific account
- **`container_data_all.json`** - All containers across all accounts (when searching all accounts)

Each account cache file contains:
```json
{
  "accountId": "4702086067",
  "allAccounts": false,
  "containers": [
    {
      "containerId": "31734165",
      "containerName": "Example Container",
      "accountId": "4702086067",
      "metadata": {
        "lastUpdated": "2025-01-20",
        "permissions": {
          "canRead": true,
          "canEdit": true,
          "canPublish": true
        }
      },
      "tags": [
        {
          "tagId": "123",
          "tagName": "3E_RFI Submit",
          "version": "1.2.9",
          "repoVersion": "1.2.9",
          "isUpToDate": true,
          "needsUpdate": false
        }
      ],
      "cachedAt": 1705780800000,
      "lastRefreshed": 1705780800000
    }
  ],
  "cachedAt": 1705780800000,
  "lastRefreshed": 1705780800000
}
```

### Legacy Cache Files (Backward Compatibility)

For backward compatibility, some legacy cache files may still exist:
- `container_list_{accountId}_{allAccounts}.json` - Legacy container lists
- `container_metadata_{accountId}_{containerId}.json` - Legacy container metadata
- `container_tags_{accountId}_{containerId}_{filter3E}.json` - Legacy container tags
- `tag_search_{accountId}_{tagName}.json` - Legacy tag search results

These will be automatically migrated to the unified structure over time.

## How It Works

### Container Browser - Refresh All
1. Creates/updates `container_data_{accountId}.json` or `container_data_all.json`
2. Stores all containers with basic info (ID, name, account)
3. Each container refresh updates metadata and tags in the same file

### Container Browser - Refresh Tags
1. Updates the container's `tags` array in the account cache file
2. Adds metadata like version, repo version, last updated, etc.

### Tag Search
1. Reads from the account cache file to find containers with the tag
2. If tag is found in a container, updates that container's tags in the cache
3. No separate tag search cache file needed - all data is in the unified cache

## Benefits

- **Shared Data**: Container Browser and Tag Search use the same cache
- **Fewer Files**: One file per account instead of many per-container files
- **Searchable**: All container data in one place
- **Efficient**: Tag search can use cached container data without API calls
- **Maintainable**: Easy to view/edit JSON files

## Cache Duration

Cache files are valid for 12 months. After that, they are automatically regenerated.

## Maintenance

- Cache files can be safely deleted to force fresh data
- Cache files are automatically created when data is fetched
- Cache files are in JSON format for easy viewing and editing
- **Cache files are tracked in git** - commit and push to share with team
- Cache files are shared across all users for faster access

## File Format

Each unified cache file contains:
```json
{
  "accountId": "4702086067",
  "allAccounts": false,
  "containers": [ /* array of container objects */ ],
  "cachedAt": 1234567890123,
  "lastRefreshed": 1234567890123
}
```

Each container object contains:
- `containerId`: Container ID
- `containerName`: Container name (optional)
- `accountId`: Account ID
- `metadata`: Container metadata (lastUpdated, permissions, etc.)
- `tags`: Array of tags with versions, repo info, etc.
- `cachedAt`: When this container was cached
- `lastRefreshed`: When this container was last refreshed from API
