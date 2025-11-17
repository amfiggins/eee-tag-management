# GTM Tag Updater Setup Guide

This guide explains how to set up and use the GTM Tag Updater script to automatically update tags across multiple Google Tag Manager containers.

## Prerequisites

1. **Google Cloud Project** with GTM API enabled
2. **Python 3.7+** installed
3. **Required Python packages** (install with pip)

## Step 1: Install Python Dependencies

```bash
cd "Tag Manager"
pip install -r requirements-gtm.txt
```

Or install directly:
```bash
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

## Step 2: Set Up Google Cloud Project

### 2.1 Create or Select a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID**

### 2.2 Enable GTM API

1. Navigate to **APIs & Services** > **Library**
2. Search for "Google Tag Manager API"
3. Click **Enable**

### 2.3 Create Credentials

You have two options for authentication:

#### Option A: Service Account (Recommended for Automation)

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - **Name**: `gtm-tag-updater`
   - **Description**: `Service account for GTM tag updates`
4. Click **Create and Continue**
5. Skip role assignment (click **Continue**)
6. Click **Done**
7. Click on the created service account
8. Go to **Keys** tab
9. Click **Add Key** > **Create new key**
10. Select **JSON** format
11. Download the JSON file and save it securely (e.g., `gtm-service-account.json`)

**Important**: You'll need to grant this service account access to your GTM account (see Step 3).

#### Option B: OAuth 2.0 Client (For Interactive Use)

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: Internal (if using Google Workspace) or External
   - Fill in required fields
   - Add scopes: `https://www.googleapis.com/auth/tagmanager.edit.containers`
4. Create OAuth client:
   - **Application type**: Desktop app
   - **Name**: `GTM Tag Updater`
5. Download the JSON file (e.g., `gtm-oauth-credentials.json`)

## Step 3: Grant Access to GTM Account

### For Service Account:

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Select your account
3. Click **Admin** tab
4. Under **User Management**, click **Add users**
5. Enter the service account email (found in the JSON file: `client_email`)
6. Grant **Edit** permissions
7. Click **Invite**

### For OAuth Client:

No additional setup needed - you'll authenticate interactively when running the script.

## Step 4: Get Your GTM Account ID

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Select your account
3. The Account ID is shown in the URL: `https://tagmanager.google.com/#/container/accounts/XXXXXXX/containers/...`
   - The `XXXXXXX` is your Account ID
4. Note this ID (you'll need it for the script)

## Step 5: Prepare Your Script File

Ensure your updated script file is ready. The script will read the entire content of the file and use it to update the tag.

Example file structure:
```
Tag Manager/
  Deployed/
    3E_Pop-up
    3E_Form Validation
    ...
  gtm_tag_updater.py
  requirements-gtm.txt
```

## Step 6: Run the Script

Run the script from the Tag Manager folder:

```bash
cd "Tag Manager"
```

### Basic Usage

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "Deployed/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-service-account.json"
```

### Dry Run (Test Without Making Changes)

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "Deployed/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-service-account.json" \
  --dry-run
```

### Update Specific Containers Only

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "Deployed/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-service-account.json" \
  --containers "GTM-XXXXX,GTM-YYYYY"
```

### Update Without Publishing (For Testing)

```bash
python gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "Deployed/3E_Pop-up" \
  --account-id "1234567" \
  --credentials "gtm-service-account.json" \
  --no-publish
```

## Command Line Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--tag-name` | Yes | Name of the tag to update (must match exactly) |
| `--script-file` | Yes | Path to the updated script file (relative to Tag Manager folder, e.g., "Deployed/3E_Pop-up") |
| `--account-id` | Yes | GTM Account ID (numeric) |
| `--credentials` | Yes | Path to service account JSON or OAuth credentials |
| `--containers` | No | Comma-separated list of container IDs (e.g., "GTM-XXXXX,GTM-YYYYY"). If omitted, updates all containers. |
| `--dry-run` | No | Show what would be updated without making changes |
| `--no-publish` | No | Update tags but don't publish versions (for testing) |

## How It Works

1. **Authentication**: Connects to GTM API using provided credentials
2. **Container Discovery**: Lists all containers (or uses specified ones)
3. **Tag Search**: For each container, finds the tag by name in the default workspace
4. **Tag Update**: Updates the tag's HTML content with the new script
5. **Version Creation**: Creates a new container version with the changes
6. **Publishing**: Publishes the version (unless `--no-publish` is used)

## Important Notes

### Tag Type Requirements

- The script is designed for **Custom HTML** tags
- The tag must have an HTML parameter that contains the script content
- If your tag uses a different structure, you may need to modify the `update_tag()` method

### Workspace Handling

- The script uses the **default workspace** (first workspace) in each container
- If you need to update tags in a specific workspace, you'll need to modify the code

### Version Management

- Each update creates a new container version
- Versions are automatically published unless `--no-publish` is used
- Published versions are live immediately

### Error Handling

- Containers without the specified tag are skipped (not an error)
- Failed updates are reported but don't stop the process
- Check the summary at the end for success/failure counts

## Troubleshooting

### "Failed to initialize GTM service"

- Verify your credentials file path is correct
- Check that the GTM API is enabled in your Google Cloud project
- For service accounts, ensure the account has been granted access to GTM

### "Tag not found"

- Verify the tag name matches exactly (case-sensitive)
- Check that the tag exists in the container's default workspace
- Use `--dry-run` to see which containers have the tag

### "Failed to publish version"

- Check that you have publish permissions in GTM
- Verify the container isn't in a locked state
- Try updating without publishing first (`--no-publish`)

### Authentication Issues

**Service Account:**
- Ensure the service account email has been added to GTM with Edit permissions
- Verify the JSON file is valid and not corrupted

**OAuth:**
- The first run will open a browser for authentication
- Save the token for future use (it's stored locally)

## Security Best Practices

1. **Store credentials securely**: Never commit credential files to version control
2. **Use service accounts**: For automation, service accounts are more secure than OAuth
3. **Limit permissions**: Grant only the minimum required permissions
4. **Rotate credentials**: Regularly rotate service account keys
5. **Use environment variables**: Consider storing sensitive paths in environment variables

## Example Workflow

1. **Update script locally**: Make changes to your tag script file in `Deployed/`
2. **Test in one container**: Use `--containers` to test on a single container first
3. **Dry run**: Use `--dry-run` to verify what will be updated
4. **Update all**: Run without `--containers` to update all containers
5. **Verify**: Check GTM to confirm updates were applied correctly

## Advanced Usage

### Finding Container IDs

If you need to find container IDs, you can modify the script to list them:

```python
updater = GTMTagUpdater(credentials_path, account_id)
containers = updater.list_containers()
for c in containers:
    print(f"{c['name']}: {c['containerId']} (GTM-{c['publicId']})")
```

### Custom Tag Types

If you need to update tags other than Custom HTML, modify the `update_tag()` method to handle different tag types and parameter structures.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review GTM API documentation: https://developers.google.com/tag-platform/tag-manager/api/v2
3. Verify your setup matches the requirements in this guide

