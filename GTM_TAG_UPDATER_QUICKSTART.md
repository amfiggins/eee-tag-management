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

1. **Navigate to Tag Manager folder:**
   ```bash
   cd "Tag Manager"
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements-gtm.txt
   ```

3. **Set up Google Cloud credentials** (see `GTM_TAG_UPDATER_SETUP.md` for details)

4. **Get your GTM Account ID:**
   - Go to GTM → Your Account
   - Check the URL: `.../accounts/XXXXXXX/...`
   - `XXXXXXX` is your Account ID

5. **Run the script:**
   ```bash
   python gtm_tag_updater.py \
     --tag-name "3E_Pop-up" \
     --script-file "Deployed/3E_Pop-up" \
     --account-id "YOUR_ACCOUNT_ID" \
     --credentials "path/to/credentials.json" \
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
  --script-file "Deployed/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "credentials.json" \
  --containers "GTM-XXXXX"
```

### Update All Containers
```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "Deployed/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "credentials.json"
```

### Update Without Publishing (Testing)
```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "Deployed/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "credentials.json" \
  --no-publish
```

## Important Notes

- **Tag Name Must Match Exactly**: The tag name in GTM must match exactly (case-sensitive)
- **Tag Type**: Currently designed for Custom HTML tags
- **Workspace**: Uses the default workspace in each container
- **Dry Run**: Always test with `--dry-run` first!
- **Script File Path**: Use relative paths from the Tag Manager folder (e.g., `"Deployed/3E_Pop-up"`)

## Files in Tag Manager Folder

- `gtm_tag_updater.py` - Main script
- `GTM_TAG_UPDATER_SETUP.md` - Detailed setup guide
- `GTM_TAG_UPDATER_QUICKSTART.md` - This file
- `requirements-gtm.txt` - Python dependencies
- `Deployed/` - Folder containing your tag scripts

For detailed setup instructions, see `GTM_TAG_UPDATER_SETUP.md`.

