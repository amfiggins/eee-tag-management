# GTM Tag Automation Tools

Automation tools for managing and updating Google Tag Manager tags across multiple containers via the GTM API.

## Overview

The `gtm_tag_updater.py` script allows you to update tags across all GTM containers (or specific ones) with a single command, eliminating the need for manual updates in each container.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements-gtm.txt
   ```

2. **Set up Google Cloud credentials** (see [Setup Guide](../docs/GTM_TAG_UPDATER_SETUP.md))

3. **Run a dry run:**
   ```bash
   python gtm_tag_updater.py \
     --tag-name "3E_Pop-up" \
     --script-file "../tags/ui/3E_Pop-up" \
     --account-id "YOUR_ACCOUNT_ID" \
     --credentials "credentials.json" \
     --dry-run
   ```

## Features

- ✅ **Automated Updates**: Update tags across all containers with one command
- ✅ **Dry Run Mode**: Test updates before applying them
- ✅ **Verify Mode**: Locate and display tag information without making changes
- ✅ **Selective Updates**: Update specific containers or all containers
- ✅ **Multi-Account Support**: Search and update across all accounts with `--all-accounts`
- ✅ **Version Management**: 
  - Automatically creates and publishes container versions with descriptive names
  - List all versions with `--list-versions`
  - Publish specific versions with `--publish-version`
- ✅ **Error Handling**: Comprehensive error reporting with improved diagnostics
- ✅ **Workspace Isolation**: Creates isolated workspaces for each update to prevent conflicts
- ✅ **Default Workspace Sync**: Automatically syncs default workspace after publishing
- ✅ **Account Auto-Detection**: Automatically finds containers in the correct account if not found

## Documentation

- **[Quick Start Guide](../docs/GTM_TAG_UPDATER_QUICKSTART.md)** - Get up and running quickly
- **[Detailed Setup Guide](../docs/GTM_TAG_UPDATER_SETUP.md)** - Complete setup instructions

## Requirements

- Python 3.7+
- Google Cloud Project with GTM API enabled
- GTM Account with appropriate permissions
- Service Account or OAuth credentials

## Usage Examples

### Update All Containers

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json"
```

### Update Specific Containers

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --containers "31734165,48665705"
```

### Test Without Publishing

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --no-publish
```

### Verify Tag (Read-Only)

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --verify \
  --containers "31734165"
```

The `--verify` mode locates tags and displays information without making any changes:
- Shows tag found status
- Displays tag ID
- Shows first 300 characters of HTML content
- No workspace creation or updates performed

## Workflow

1. **Update tag file** in `../tags/` directory
2. **Test with dry run**: `--dry-run` flag
3. **Test on one container**: `--containers "GTM-XXXXX"`
4. **Update all containers**: Remove `--containers` flag
5. **Verify**: Check GTM to confirm updates

## Security

- **Never commit credentials** - They are in `.gitignore`
- Store credentials securely outside the repository
- Use service accounts for automation
- Rotate credentials regularly

## Troubleshooting

See the [Setup Guide](../docs/GTM_TAG_UPDATER_SETUP.md) for detailed troubleshooting information.

