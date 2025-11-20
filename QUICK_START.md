# Quick Start Guide

## 🚀 Fastest Way to Get Started

### Option 1: One-Command Launch (Recommended)

**Mac/Linux:**
```bash
./start-web.sh
```

**Windows:**
```bash
start-web.bat
```

This script will:
- ✅ Check for Node.js and Python
- ✅ Install all dependencies automatically
- ✅ Start the web interface
- ✅ Open in your browser (optional)

### Option 2: Manual Setup

1. **Install Node.js** (if not installed):
   - Download from https://nodejs.org/
   - Version 18+ required

2. **Install dependencies:**
   ```bash
   # Python dependencies
   cd automation
   pip install -r requirements-gtm.txt
   
   # Node.js dependencies
   cd ../web
   npm install
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   - Navigate to `http://localhost:3000`

## First Time Setup

Before using the web interface, you need:

1. **OAuth Credentials** (see `automation/OAUTH_SETUP.md`)
   - Create OAuth 2.0 credentials in Google Cloud Console
   - Save as `automation/gtm-oauth-credentials.json`

2. **GTM Account ID**
   - Found in GTM URL: `.../accounts/XXXXXXX/...`
   - Default is pre-filled: `4702086067`

## Using the Interface

### Container Browser (Recommended)

1. **Search Containers:**
   - Click "Search Containers" to load all containers
   - Use "All Accounts" to search across all accounts
   - Filter by container ID or name

2. **View Tags:**
   - Expand a container to see its tags
   - View version comparison (Container vs. Repo)
   - Outdated tags are highlighted in yellow

3. **Update Tags:**
   - Click "Update & Publish" on individual tags
   - Or select multiple tags and use bulk update
   - Tags automatically refresh after update

### Tag Search

1. **Select Tag:**
   - Browse tags by category
   - Select a tag to search for

2. **Search:**
   - Click "Search Selected Tags"
   - Results load from cache if available (instant)
   - First search may take several minutes for 200+ containers

3. **Review Results:**
   - See which containers have the tag
   - Navigate to container browser for updates

## Troubleshooting

### "Node.js not found"
- Install Node.js from https://nodejs.org/
- Restart terminal after installation

### "Python not found"
- Install Python 3.7+ from https://www.python.org/
- Ensure `python3` is in your PATH

### "Dependencies failed to install"
- Check internet connection
- Try running `npm install` manually in `web/` directory
- For Python: `pip install -r automation/requirements-gtm.txt`

### "Credentials not found"
- Set up OAuth credentials (see `automation/OAUTH_SETUP.md`)
- Ensure file is at `automation/gtm-oauth-credentials.json`

## Performance Tips

- **First Search**: May take several minutes for 200+ containers (20-minute timeout)
- **Cached Results**: Subsequent searches load instantly from unified server-side cache
- **Unified Cache**: One file per account (`container_data_{accountId}.json`) contains all container data
- **Shared Data**: Container Browser and Tag Search share the same cache files
- **Cache Location**: Cache files stored in `.cache/` directory (JSON format)
- **Refresh Cache**: Delete cache files in `.cache/` to force fresh data
- **Efficient**: Tag search uses cached container data, avoiding duplicate API calls

## Need Help?

- See [Web Interface Setup](web/SETUP.md) for detailed instructions
- See [Automation Setup](automation/README.md) for Python setup
- See [OAuth Setup](automation/OAUTH_SETUP.md) for credentials
- See [Documentation Index](docs/README.md) for all documentation

