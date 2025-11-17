# 3E Tag Management Automation

Automation tools for managing Google Tag Manager (GTM) tags across multiple containers.

## Overview

This repository contains tools and scripts for automating GTM tag updates across multiple containers, eliminating the need for manual updates in each container.

## Features

- **Automated Tag Updates**: Update tags across all GTM containers with a single command
- **Dry Run Mode**: Test updates before applying them
- **Selective Updates**: Update specific containers or all containers
- **Version Management**: Automatically creates and publishes container versions

## Repository Structure

```
eee-tag-management/
├── gtm_tag_updater.py          # Main automation script
├── requirements-gtm.txt        # Python dependencies
├── GTM_TAG_UPDATER_SETUP.md   # Detailed setup guide
├── GTM_TAG_UPDATER_QUICKSTART.md  # Quick start guide
├── README.md                   # This file
└── .gitignore                  # Git ignore rules
```

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements-gtm.txt
   ```

2. **Set up Google Cloud credentials** (see `GTM_TAG_UPDATER_SETUP.md`)

3. **Run a dry run:**
   ```bash
   python gtm_tag_updater.py \
     --tag-name "3E_Pop-up" \
     --script-file "path/to/script" \
     --account-id "YOUR_ACCOUNT_ID" \
     --credentials "credentials.json" \
     --dry-run
   ```

For detailed instructions, see [GTM_TAG_UPDATER_QUICKSTART.md](GTM_TAG_UPDATER_QUICKSTART.md).

## Documentation

- **[Quick Start Guide](GTM_TAG_UPDATER_QUICKSTART.md)** - Get up and running quickly
- **[Setup Guide](GTM_TAG_UPDATER_SETUP.md)** - Detailed setup instructions

## Requirements

- Python 3.7+
- Google Cloud Project with GTM API enabled
- GTM Account with appropriate permissions
- Service Account or OAuth credentials

## Git Repository Setup

This repository is configured with dual remotes:

- **origin**: 3E GitHub organization repository
- **backup**: Personal GitHub repository (backup)

### Initial Setup

```bash
# Initialize git (if not already done)
git init

# Add 3E GitHub as origin
git remote add origin <3E_GITHUB_REPO_URL>

# Add personal GitHub as backup
git remote add backup <PERSONAL_GITHUB_REPO_URL>

# Verify remotes
git remote -v
```

### Pushing to Both Remotes

```bash
# Push to 3E GitHub (origin)
git push origin main

# Push to personal GitHub (backup)
git push backup main
```

Or push to both at once:
```bash
git push origin main && git push backup main
```

## Contributing

1. Make changes in a feature branch
2. Test thoroughly with `--dry-run` flag
3. Commit and push to both remotes
4. Create pull request in 3E GitHub

## Security Notes

- **Never commit credentials files** - They are in `.gitignore`
- Store credentials securely outside the repository
- Use service accounts for automation when possible
- Rotate credentials regularly

## License

Internal use only - 3E Enrollment

## Maintainer

Anthony Figgins

