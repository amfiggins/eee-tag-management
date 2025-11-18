# GTM Tag Management Web Interface

Web interface for managing Google Tag Manager tags across multiple containers.

## Features

- **Tag Search**: Search for tags across all GTM containers
- **Version Detection**: Automatically detect and compare tag versions
- **Container Selection**: Select specific containers to update
- **Bulk Updates**: Update multiple containers at once
- **Smart Updates**: Skip containers that already have the latest version

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

1. Enter a tag name (e.g., "3E_Pop-up")
2. Click "Search" to find all containers with that tag
3. Review the results - see which containers have the tag and their versions
4. Select containers to update (outdated containers are highlighted)
5. Click "Update Selected" to push the latest version

## API Endpoints

- `POST /api/gtm/search` - Search for a tag across containers
- `POST /api/gtm/update` - Update tags in selected containers
- `GET /api/gtm/tags` - List all available tags

## Requirements

- Node.js 18+
- Python 3.7+ (for backend script execution)
- GTM API credentials (OAuth or Service Account)

