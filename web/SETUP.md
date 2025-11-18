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

1. **Search for a tag:**
   - Enter tag name (e.g., "3E_Pop-up")
   - Click "Search"
   - Wait for results (may take a minute for many containers)

2. **Review results:**
   - See which containers have the tag
   - View version numbers
   - See which are outdated

3. **Select containers:**
   - Check boxes next to containers you want to update
   - Use "Select All Outdated" to quickly select outdated containers

4. **Update:**
   - Click "Update Selected"
   - Confirm the update
   - Wait for completion

## Features

- ✅ Tag search across all containers
- ✅ Version detection and comparison
- ✅ Container filtering (search, status)
- ✅ Bulk updates
- ✅ Smart selection (select all outdated)

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

## Next Steps

- Add container browser view
- Add update history
- Add version comparison view
- Add export functionality

