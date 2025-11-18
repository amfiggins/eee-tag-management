# GTM Tag Updater - Setup Checklist

Use this checklist to get the automation tool up and running.

## ✅ Step 1: Python Environment

- [ ] Python 3.7+ installed
- [ ] Dependencies installed: `pip install -r requirements-gtm.txt`

**Check status:**
```bash
cd automation
python3 --version
pip3 install -r requirements-gtm.txt
```

---

## ✅ Step 2: Google Cloud Project Setup

### 2.1 Create/Select Project
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project OR select existing project
- [ ] Note your **Project ID**: `_________________`

### 2.2 Enable GTM API
- [ ] Navigate to **APIs & Services** > **Library**
- [ ] Search for "Google Tag Manager API"
- [ ] Click **Enable**
- [ ] Wait for API to enable (may take a minute)

### 2.3 Create Service Account (Recommended)
- [ ] Go to **APIs & Services** > **Credentials**
- [ ] Click **Create Credentials** > **Service Account**
- [ ] Name: `gtm-tag-updater`
- [ ] Description: `Service account for GTM tag updates`
- [ ] Click **Create and Continue**
- [ ] Skip role assignment (click **Continue**)
- [ ] Click **Done**
- [ ] Click on the created service account
- [ ] Go to **Keys** tab
- [ ] Click **Add Key** > **Create new key**
- [ ] Select **JSON** format
- [ ] Download the JSON file
- [ ] Save it securely (e.g., `gtm-service-account.json`)
- [ ] **Note the service account email** (found in JSON as `client_email`): `_________________`

---

## ✅ Step 3: Grant GTM Access

### 3.1 Get GTM Account ID
- [ ] Go to [Google Tag Manager](https://tagmanager.google.com/)
- [ ] Select your account
- [ ] Check the URL: `https://tagmanager.google.com/#/container/accounts/XXXXXXX/containers/...`
- [ ] **Note your Account ID** (the `XXXXXXX`): `_________________`

### 3.2 Add Service Account to GTM
- [ ] In GTM, click **Admin** tab
- [ ] Under **User Management**, click **Add users**
- [ ] Enter the service account email (from Step 2.3)
- [ ] Grant **Edit** permissions
- [ ] Click **Invite**

---

## ✅ Step 4: Test Connection

### 4.1 Place Credentials File
- [ ] Copy your service account JSON file to the `automation/` folder
- [ ] Or note the full path to the file: `_________________`

### 4.2 Test with Dry Run
```bash
cd automation
python3 gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/ui/3E_Pop-up" \
  --account-id "YOUR_ACCOUNT_ID" \
  --credentials "gtm-service-account.json" \
  --dry-run
```

- [ ] Script runs without errors
- [ ] Lists containers successfully
- [ ] Shows which containers have the tag

---

## ✅ Step 5: First Real Update (Optional Test)

Once dry run works, test on a single container:

```bash
python3 gtm_tag_updater.py \
  --tag-name "3E_Pop-up" \
  --script-file "../tags/ui/3E_Pop-up" \
  --account-id "YOUR_ACCOUNT_ID" \
  --credentials "gtm-service-account.json" \
  --containers "GTM-XXXXX" \
  --no-publish
```

- [ ] Update succeeds
- [ ] Tag is updated in GTM (check manually)
- [ ] Version created but not published (safe test)

---

## Information Needed

Fill in these values to get started:

1. **GTM Account ID**: `_________________`
   - Found in GTM URL after `/accounts/`

2. **Service Account Email**: `_________________`
   - Found in the JSON file as `client_email`

3. **Credentials File Path**: `_________________`
   - Full path to your service account JSON file

4. **Test Container ID** (optional): `GTM-_________________`
   - For testing on a single container first

---

## Quick Start Command Template

Once you have everything set up:

```bash
cd automation

# Dry run (safe - no changes)
python3 gtm_tag_updater.py \
  --tag-name "TAG_NAME" \
  --script-file "../tags/CATEGORY/TAG_FILE" \
  --account-id "YOUR_ACCOUNT_ID" \
  --credentials "gtm-service-account.json" \
  --dry-run

# Update specific container (test)
python3 gtm_tag_updater.py \
  --tag-name "TAG_NAME" \
  --script-file "../tags/CATEGORY/TAG_FILE" \
  --account-id "YOUR_ACCOUNT_ID" \
  --credentials "gtm-service-account.json" \
  --containers "GTM-XXXXX" \
  --no-publish

# Update all containers (production)
python3 gtm_tag_updater.py \
  --tag-name "TAG_NAME" \
  --script-file "../tags/CATEGORY/TAG_FILE" \
  --account-id "YOUR_ACCOUNT_ID" \
  --credentials "gtm-service-account.json"
```

---

## Troubleshooting

### "Failed to initialize GTM service"
- Check credentials file path is correct
- Verify GTM API is enabled in Google Cloud
- Ensure service account has been added to GTM

### "Tag not found"
- Verify tag name matches exactly (case-sensitive)
- Check tag exists in container's default workspace
- Use `--dry-run` to see which containers have the tag

### "Failed to publish version"
- Check you have publish permissions in GTM
- Verify container isn't locked
- Try `--no-publish` first to test updates

---

## Next Steps

Once setup is complete:
1. Test with `--dry-run` on a tag
2. Test update on one container with `--no-publish`
3. Verify the update in GTM manually
4. Then run full updates across all containers

