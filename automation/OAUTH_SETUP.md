# OAuth 2.0 Setup Guide

Since you already have access to all GTM accounts, OAuth 2.0 is the better choice - it uses your existing credentials without needing to add service accounts to each client's GTM account.

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **eee-tag-management**
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**

### If prompted to configure OAuth consent screen:

1. Click **Configure Consent Screen**
2. Choose **Internal** (if using Google Workspace) or **External**
3. Fill in required fields:
   - **App name**: `GTM Tag Updater`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**
5. Skip Scopes (click **Save and Continue**)
6. Skip Test Users (click **Save and Continue**)
7. Click **Back to Dashboard**

### Create OAuth Client:

1. Click **Create Credentials** > **OAuth client ID**
2. **Application type**: Select **Desktop app**
3. **Name**: `GTM Tag Updater`
4. Click **Create**
5. Click **Download JSON**
6. Save the file as `gtm-oauth-credentials.json` in the `automation/` folder

## Step 2: Update Script to Use OAuth

The script will automatically use OAuth if the service account fails. However, we can make it prefer OAuth by using the OAuth credentials file directly.

## Step 3: First Run (Authentication)

The first time you run the script with OAuth credentials, it will:
1. Open a browser window
2. Ask you to sign in with your Google account
3. Ask for permission to access GTM
4. Save the token for future use

After the first run, the token is saved and you won't need to authenticate again (until it expires).

## Usage

Once OAuth credentials are set up:

```bash
cd automation
python3 gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/pop-up-solutions/3E_Pop-up.html" \
  --account-id "4702086067" \
  --credentials "gtm-oauth-credentials.json" \
  --dry-run
```

## Advantages of OAuth

✅ Uses your existing GTM access  
✅ No need to add service accounts to client accounts  
✅ Works with all accounts you have access to  
✅ More secure for multi-client scenarios  

## Token Storage

OAuth tokens are stored locally in:
- `~/.config/google-oauthlib-tool/credentials.json` (Linux/Mac)
- Or in the current directory as `token.json`

The token will be reused automatically on subsequent runs.

