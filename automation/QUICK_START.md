# Quick Start - OAuth Setup

## Your Information

- **GTM Account ID**: `4702086067`
- **Google Cloud Project**: `eee-tag-management`
- **Project ID**: `eee-tag-management`

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **eee-tag-management**
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**

### If you see "Configure Consent Screen" prompt:

1. Click **Configure Consent Screen**
2. Choose **Internal** (if using Google Workspace) or **External**
3. Fill in:
   - **App name**: `GTM Tag Updater`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue** through all steps
5. Click **Back to Dashboard**

### Create OAuth Client:

1. Click **Create Credentials** > **OAuth client ID**
2. **Application type**: **Desktop app**
3. **Name**: `GTM Tag Updater`
4. Click **Create**
5. Click **Download JSON**
6. Save as `gtm-oauth-credentials.json` in the `automation/` folder

## Step 2: Enable GTM API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Tag Manager API"
3. Click **Enable**

## Step 3: Test Connection

```bash
cd automation
python3 gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up.html" \
  --account-id "4702086067" \
  --credentials "gtm-oauth-credentials.json" \
  --dry-run
```

**First time**: A browser window will open asking you to:
1. Sign in with your Google account
2. Grant permission to access GTM
3. The token will be saved for future use

## Why OAuth Instead of Service Account?

✅ **Uses your existing GTM access** - No need to add service accounts  
✅ **Works with all accounts** - Any GTM account you have access to  
✅ **No client approval needed** - No security concerns about adding new users  
✅ **Simpler setup** - Just authenticate once  

## Next Steps

Once the dry run works:
1. Test on one container: Add `--containers "GTM-XXXXX" --no-publish`
2. Verify the update in GTM manually
3. Then run full updates across all containers

## Troubleshooting

**"Failed to load credentials"**: Make sure the OAuth JSON file is in the `automation/` folder

**"API not enabled"**: Enable Google Tag Manager API in Google Cloud Console

**"Permission denied"**: Make sure you're signed in with an account that has GTM access

