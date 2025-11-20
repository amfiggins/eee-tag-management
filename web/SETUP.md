# Web Interface Setup Guide

## Prerequisites

1. **Node.js 18+** installed
2. **Python 3.7+** installed (for backend script execution)
3. **GTM API credentials** set up (see main automation setup)

## Installation

1. **Navigate to web directory:**
   ```bash
   cd web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Ensure Python script is ready:**
   - The Python script should be in `../automation/gtm_tag_updater.py`
   - OAuth credentials should be in `../automation/gtm-oauth-credentials.json`

## Configuration

### Default Settings

The interface uses these defaults (can be changed in the UI):
- **GTM Account ID**: `4702086067`
- **Credentials Path**: `automation/gtm-oauth-credentials.json`

You can change these in the search interface before searching.

## Running the Application

### Development Mode

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Usage

### Container Browser

1. **Search Containers:**
   - Click "Search Containers" to load all containers
   - Use "All Accounts" checkbox to search across all accounts
   - Filter by container ID or name using the search box

2. **View Tags:**
   - Expand a container to see its tags
   - Tags show version comparison (Container vs. Repo)
   - Outdated tags are highlighted in yellow

3. **Update Tags:**
   - Click "Update & Publish" on individual tags
   - Or use bulk update: select multiple tags and click "Update & Publish Selected"
   - Tags automatically refresh after successful update

4. **Refresh Metadata:**
   - Click refresh button on a container to reload metadata
   - Gold refresh button indicates no cache (click to load)
   - Use "Refresh All Containers" to refresh all at once

### Tag Search

1. **Select Tag:**
   - Browse tags by category
   - Use search box to filter tags
   - Select one or more tags

2. **Search:**
   - Click "Search Selected Tags"
   - Results load from cache if available (instant)
   - First search may take several minutes for 200+ containers

3. **Review Results:**
   - See which containers have the tag
   - View version numbers
   - Navigate to container browser for updates

## Features

### Container Browser
- ✅ Container search and filtering
- ✅ Multi-account support (search all accounts or specific account)
- ✅ Tag management with version comparison
- ✅ Organized column layout (Container ID, Account ID, Cached, Last Updated)
- ✅ Bulk operations (refresh all containers, update multiple tags)
- ✅ Visual cache indicators (gold refresh button = no cache)
- ✅ Auto-refresh after updates

### Tag Search
- ✅ Tag selection by category
- ✅ Cross-container search
- ✅ Version detection and comparison
- ✅ Organized column layout (Version, Last Updated)
- ✅ Server-side caching for fast results

### Performance
- ✅ Server-side caching (JSON files in `.cache/` directory)
- ✅ Shared cache across all users
- ✅ Extended timeouts (20 minutes for 200+ containers)
- ✅ Automatic rate limiting

## Troubleshooting

### "Command not found: python3"
- Ensure Python 3 is installed and in PATH
- Try using `python` instead (update API routes if needed)

### "Failed to search for tag"
- Check credentials path is correct
- Verify GTM Account ID is correct
- Ensure OAuth credentials file exists

### Rate limiting errors
- The script automatically handles rate limiting with delays
- Increase `--delay` if you see many 429 errors

## Caching

The web interface uses **server-side caching** for improved performance:
- Cache files stored in `.cache/` directory (JSON format)
- Shared across all users
- 12-month cache duration
- Cache is automatically managed by the API routes
- Delete cache files in `.cache/` to force fresh data

See [`.cache/README.md`](../.cache/README.md) for cache management details.

