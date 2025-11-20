# GTM Tag Updater - Quick Start

## What You Need

To push an updated script to all GTM containers that have a specific tag, you need:

### 1. **Google Cloud Project Setup**
   - ✅ Google Cloud Project created
   - ✅ Google Tag Manager API enabled
   - ✅ Service Account or OAuth credentials created
   - ✅ Credentials file downloaded (JSON)

### 2. **GTM Access**
   - ✅ GTM Account ID (found in GTM URL)
   - ✅ Service account email added to GTM with Edit permissions (if using service account)

### 3. **Python Environment**
   - ✅ Python 3.7+ installed
   - ✅ Required packages installed: `pip install -r requirements-gtm.txt`

## Quick Setup Steps

1. **Navigate to automation folder:**
   ```bash
   cd automation
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements-gtm.txt
   ```

3. **Set up Google Cloud credentials** (see [OAuth Setup Guide](../automation/OAUTH_SETUP.md) or [Detailed Setup Guide](GTM_TAG_UPDATER_SETUP.md))

4. **Get your GTM Account ID:**
   - Go to GTM → Your Account
   - Check the URL: `.../accounts/XXXXXXX/...`
   - `XXXXXXX` is your Account ID

5. **Run the script:**
   ```bash
   python gtm_tag_updater.py \
     --tag-name "3E_Pop-up" \
     --script-file "../tags/pop-up-solutions/3E_Pop-up" \
     --account-id "YOUR_ACCOUNT_ID" \
     --credentials "gtm-oauth-credentials.json" \
     --dry-run  # Remove this to actually update
   ```

## What the Script Does

1. **Connects** to GTM API using your credentials
2. **Finds** all containers (or specified ones) that have the tag
3. **Updates** the tag's content with your new script
4. **Creates** a new container version
5. **Publishes** the version (makes it live)

## Common Use Cases

### Test on One Container First
```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --containers "GTM-XXXXX"
```

### Update All Containers
```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json"
```

### Update Without Publishing (Testing)
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

### List Container Versions
```bash
python gtm_tag_updater.py \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --list-versions \
  --containers "31734165"
```

Lists all versions for the specified container(s), sorted by version ID.

### Publish Specific Version
```bash
python gtm_tag_updater.py \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --publish-version "123" \
  --containers "31734165"
```

Publishes a specific container version by ID.

### List All Containers (Discovery Mode)
```bash
python gtm_tag_updater.py \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --all-accounts
```

Lists all containers from all accounts the user has access to (read-only discovery mode).

### Update Across All Accounts
```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-oauth-credentials.json" \
  --all-accounts
```

Updates the tag across all containers in all accessible accounts.

## Important Notes

- **Tag Name Must Match Exactly**: The tag name in GTM must match exactly (case-sensitive)
- **Tag Type**: Currently designed for Custom HTML tags
- **Workspace**: Uses the default workspace in each container
- **Dry Run**: Always test with `--dry-run` first!
- **Script File Path**: Use relative paths from the automation folder (e.g., `"../tags/pop-up-solutions/3E_Pop-up"`)

## Files in Automation Folder

- `gtm_tag_updater.py` - Main script
- `requirements-gtm.txt` - Python dependencies
- `gtm-oauth-credentials.json` - OAuth credentials (create this)
- `token.json` - OAuth token (created automatically)

## Tag Files

Tag scripts are located in the `../tags/` directory, organized by solution type:
- `tags/base-solutions/` - Core functionality tags
- `tags/pop-up-solutions/` - Pop-up related tags
- `tags/chatbot-solutions/` - Chatbot integration tags

For detailed setup instructions, see [GTM_TAG_UPDATER_SETUP.md](GTM_TAG_UPDATER_SETUP.md) or [OAuth Setup Guide](../automation/OAUTH_SETUP.md).

