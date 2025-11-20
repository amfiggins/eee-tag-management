# GTM Tag Management Web Interface

Modern web interface for managing Google Tag Manager tags across multiple containers with a user-friendly UI.

## Features

### Container Browser
- **Container Search**: Search and filter containers by ID or name
- **Multi-Account Support**: Search across all accounts or a specific account
- **Tag Management**: View tags within each container with version comparison
- **Column Layout**: Organized display with aligned columns for Container ID, Account ID, Cached date, Last Updated
- **Bulk Operations**: 
  - Refresh all containers at once
  - Update multiple tags in a container
  - Select all updatable tags
- **Smart Caching**: 
  - Server-side cache shared across all users
  - Visual indicators for containers without cache (gold refresh button)
  - Automatic cache refresh after updates
- **Version Comparison**: See container version vs. repo version at a glance
- **Auto-Refresh**: Tags automatically refresh after successful updates

### Tag Search
- **Tag Selection**: Browse and select tags by category
- **Cross-Container Search**: Search for tags across all containers
- **Version Detection**: Automatically detect and compare tag versions
- **Column Layout**: Organized display with aligned columns for Version and Last Updated
- **Cached Results**: Fast loading from server-side cache

### Performance
- **Server-Side Caching**: JSON cache files in `.cache/` directory
- **Shared Cache**: All users benefit from cached results
- **Extended Timeouts**: 20-minute timeout for large container lists (200+ containers)
- **Rate Limiting**: Automatic delays to respect GTM API limits

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   - Place your OAuth credentials file in `../automation/gtm-oauth-credentials.json`
   - Or update the default path in the search interface

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   - Navigate to `http://localhost:3000`

## Usage

### Container Browser

1. **Search Containers**: Click "Search Containers" to load all containers
2. **Filter**: Use search box to filter by container ID or name
3. **View Tags**: Expand a container to see its tags
4. **Update Tags**: Click "Update & Publish" on individual tags or use bulk update
5. **Refresh**: Use refresh button to reload container metadata (gold button = no cache)

### Tag Search

1. **Select Tag**: Browse and select a tag from the list
2. **Search**: Click "Search Selected Tags" to find all containers with that tag
3. **Review Results**: See which containers have the tag and their versions
4. **Update**: Use the container browser to update tags as needed

## API Endpoints

- `POST /api/gtm/search` - Search for a tag across containers (cached)
- `POST /api/gtm/update` - Update tags in selected containers
- `GET /api/gtm/tags` - List all available tags
- `POST /api/gtm/container-tags` - Get tags for a specific container (cached)
- `POST /api/gtm/container-metadata` - Get container metadata (cached)
- `POST /api/gtm/containers-only` - List containers only (fast, cached)
- `POST /api/gtm/tag-info` - Get tag information from repository

## Caching

The web interface uses **server-side caching** for improved performance:
- Cache files stored in `.cache/` directory (JSON format)
- Shared across all users
- 12-month cache duration
- Cache is automatically managed by the API routes
- Delete cache files in `.cache/` to force fresh data

## Requirements

- Node.js 18+
- Python 3.7+ (for backend script execution)
- GTM API credentials (OAuth or Service Account)

