# GTM Cache Directory

This directory contains server-side cache files for GTM tag search results and container data.

## Purpose

Cache files are stored here to:
- Speed up repeated searches
- Share cache across all users
- Reduce API calls to Google Tag Manager
- Make cache easily maintainable and viewable

## Cache Files

Cache files are stored as JSON files with the following naming pattern:
- `tag_search_{accountId}_{tagName}.json` - Tag search results
- `container_list_{accountId}_{allAccounts}.json` - Container lists
- `container_metadata_{containerId}.json` - Container metadata
- `container_tags_{accountId}_{containerId}_{filter3E}.json` - Container tags

## Cache Duration

Cache files are valid for 12 months. After that, they are automatically regenerated.

## Maintenance

- Cache files can be safely deleted to force fresh data
- Cache files are automatically created when data is fetched
- Cache files are in JSON format for easy viewing and editing
- **Cache files are tracked in git** - commit and push to share with team
- Cache files are shared across all users for faster access

## File Format

Each cache file contains:
```json
{
  "data": { /* actual cached data */ },
  "cachedAt": 1234567890123  /* timestamp in milliseconds */
}
```

