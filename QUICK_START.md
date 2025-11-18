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

1. **Search for a tag:**
   - Enter tag name (e.g., "3E_Pop-up")
   - Click "Search"
   - Wait for results

2. **Review containers:**
   - See which containers have the tag
   - View version numbers
   - Identify outdated containers

3. **Update tags:**
   - Select containers to update
   - Click "Update Selected"
   - Confirm and wait for completion

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

## Need Help?

- See [Web Interface Setup](web/SETUP.md) for detailed instructions
- See [Automation Setup](automation/README.md) for Python setup
- See [OAuth Setup](automation/OAUTH_SETUP.md) for credentials

