# Auto-Update Setup Guide

This guide explains how to set up and use the auto-update feature for the GTM Tag Management tool.

## Overview

The auto-update feature allows team members to automatically receive the latest version of the tool without requiring GitHub access. Updates are distributed via AWS S3 and CloudFront.

## How It Works

1. **Version Check**: When you run `start-web.py`, it checks for updates from a remote manifest file
2. **Download**: If a newer version is available, it can be downloaded automatically
3. **Verification**: The downloaded file is verified using SHA-256 checksums
4. **Installation**: The update is extracted, preserving your credentials and configuration
5. **Restart**: You restart the application to use the new version

## Setup for Administrators

### 1. AWS Infrastructure Setup

Run the AWS setup script to create the necessary resources:

```bash
cd deployment
./aws-setup.sh
```

This creates:
- S3 bucket for storing releases
- CloudFront distribution for fast downloads
- Proper IAM policies and bucket configuration

### 2. Configure GitHub Actions

1. Add AWS credentials to GitHub Secrets:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add `AWS_ACCESS_KEY_ID`
   - Add `AWS_SECRET_ACCESS_KEY`

2. Update `.github/workflows/deploy-updates.yml`:
   - Set `S3_BUCKET` to your bucket name
   - Set `CLOUDFRONT_DISTRIBUTION_ID` to your distribution ID

3. Update `automation/auto_updater.py`:
   - Set `DEFAULT_MANIFEST_URL` to your CloudFront manifest URL:
     ```python
     DEFAULT_MANIFEST_URL = 'https://YOUR_DISTRIBUTION_ID.cloudfront.net/manifests/latest.json'
     ```

### 3. Version Management

Update the version number in one of these files:
- `VERSION` (recommended)
- `web/package.json` (fallback)

The CI/CD pipeline will automatically:
- Package the repository
- Upload to S3
- Create a version manifest
- Update the latest manifest

## Usage for Team Members

### Automatic Update Check

By default, `start-web.py` checks for updates on startup:

```bash
python start-web.py
```

If an update is available, you'll see:
```
⬆️  Update available: 1.0.0 → 1.1.0
Run with --update to apply, or set GTM_AUTO_UPDATE=false to disable
```

### Apply Update

To apply an available update:

```bash
python start-web.py --update
```

This will:
1. Download the latest version
2. Verify the checksum
3. Extract the update
4. Preserve your credentials and configuration
5. Prompt you to restart

### Manual Update Check

Check for updates without starting the application:

```bash
python start-web.py --check-update
```

### Disable Auto-Update

You can disable auto-update in several ways:

**Option 1: Environment Variable**
```bash
export GTM_AUTO_UPDATE=false
python start-web.py
```

**Option 2: Command Line Flag**
```bash
python start-web.py --skip-update
# or
python start-web.py --no-update
```

**Option 3: Permanently Disable**
Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
```bash
export GTM_AUTO_UPDATE=false
```

## Update Process Details

### What Gets Preserved

During an update, the following are preserved:
- `automation/gtm-oauth-credentials.json` (OAuth credentials)
- `automation/token.json` (OAuth tokens)
- `.cache/` (cache files)
- `.env` (environment variables)
- `node_modules/` (to avoid re-downloading)

### Backup

Before applying an update, a backup is created in:
```
.backup/YYYYMMDD_HHMMSS/
```

This includes:
- Full repository backup
- Preserved files backup

### Rollback

If an update causes issues, you can rollback:

1. Find the backup directory in `.backup/`
2. Restore the files:
   ```bash
   cp -r .backup/YYYYMMDD_HHMMSS/repo_backup/* .
   ```

## Troubleshooting

### Update Check Fails

**Problem**: "Could not check for updates"

**Solutions**:
- Check your internet connection
- Verify the manifest URL is correct
- Check if CloudFront distribution is deployed (takes 10-15 minutes)

### Checksum Verification Fails

**Problem**: "Checksum verification failed"

**Solutions**:
- The download may be corrupted, try again
- Check if the manifest has the correct checksum
- Contact administrator if issue persists

### Update Fails to Apply

**Problem**: "Error extracting update"

**Solutions**:
- Check disk space
- Verify file permissions
- Check the backup directory for error details
- Try downloading manually from the CloudFront URL

### Credentials Lost After Update

**Problem**: OAuth credentials missing after update

**Solutions**:
- Credentials should be preserved automatically
- Check `.backup/YYYYMMDD_HHMMSS/preserved/` for backup
- Restore from backup if needed
- Re-authenticate if necessary

## Manual Installation

If auto-update doesn't work, you can manually install updates:

1. Download the latest release from:
   ```
   https://YOUR_DISTRIBUTION_ID.cloudfront.net/releases/latest/eee-tag-management-latest.zip
   ```

2. Extract to a temporary directory:
   ```bash
   unzip eee-tag-management-latest.zip -d /tmp/gtm-update
   ```

3. Backup your current installation:
   ```bash
   cp -r . .backup/manual-$(date +%Y%m%d_%H%M%S)
   ```

4. Copy files (preserving credentials):
   ```bash
   # Backup credentials first
   cp automation/gtm-oauth-credentials.json /tmp/
   cp automation/token.json /tmp/ 2>/dev/null || true
   
   # Copy new files
   cp -r /tmp/gtm-update/* .
   
   # Restore credentials
   cp /tmp/gtm-oauth-credentials.json automation/
   cp /tmp/token.json automation/ 2>/dev/null || true
   ```

5. Restart the application

## Security Considerations

### Code Integrity

- All downloads are verified using SHA-256 checksums
- HTTPS-only downloads via CloudFront
- Optional: Code signing with GPG (future enhancement)

### Credential Security

- Credentials are never uploaded to S3
- Credentials are preserved locally during updates
- Consider using AWS Secrets Manager for centralized credential management (optional)

### Access Control

- S3 bucket blocks public access
- CloudFront uses Origin Access Control (OAC)
- Only authorized users can access the distribution

## Advanced Configuration

### Custom Manifest URL

Override the default manifest URL:

```bash
export GTM_UPDATE_MANIFEST_URL="https://your-custom-url.com/manifests/latest.json"
python start-web.py
```

### Force Update Check

Force an update check (ignore cache):

```bash
python automation/auto_updater.py --check --force
```

### Update Without Restart

The update process requires a restart. To apply updates programmatically:

```python
from automation.auto_updater import AutoUpdater
from pathlib import Path

updater = AutoUpdater(Path('.'))
updater.check_and_update(auto_apply=True)
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the architecture document: `docs/DEPLOYMENT_ARCHITECTURE.md`
3. Contact the administrator
