# 3E Tag Management

Centralized repository for managing Google Tag Manager (GTM) tags and automation tools for 3E Enrollment's client deployments.

## Overview

This repository contains:
- **Standard GTM Tags**: Production-ready tags for client deployment
- **Automation Tools**: API-based tools for updating tags across multiple containers
- **Web Interface**: Modern web UI for managing tags (recommended)

## Quick Start

### 🚀 Launch Web Interface (Easiest)

**Python (Cross-platform):**
```bash
python3 start-web.py
# or
python start-web.py
```

**Mac/Linux:**
```bash
./start-web.sh
```

**Windows:**
```bash
start-web.bat
```

This will automatically:
- ✅ Check for Node.js and Python
- ✅ Install all dependencies
- ✅ Start the web interface
- ✅ Open in your browser

See [QUICK_START.md](QUICK_START.md) for more details.

## Repository Structure

```
eee-tag-management/
├── tags/                    # Standard GTM tags for client deployment
│   ├── base-solutions/     # Core functionality tags
│   ├── pop-up-solutions/   # Pop-up related tags
│   └── chatbot-solutions/  # Chatbot integration tags
│
├── automation/              # API tools for tag management
│   ├── gtm_tag_updater.py  # Main automation script
│   ├── gtm_rate_limiter.py # Rate limiting utility
│   ├── requirements-gtm.txt # Python dependencies
│   └── *.md                # Automation documentation
│
├── web/                     # Web interface (Next.js)
│   ├── app/                # Next.js app directory
│   ├── components/         # React components
│   └── utils/              # Utilities
│
└── docs/                   # Documentation
    ├── GTM_TAG_UPDATER_SETUP.md
    ├── GTM_TAG_UPDATER_QUICKSTART.md
    ├── GIT_SETUP.md
    ├── GTM_API_DEBUG_SUMMARY.md
    └── archive/            # Archived/outdated docs
```

## Quick Links

- **[Tag Documentation](tags/README.md)** - Complete list of all tags with descriptions
- **[Automation Tools](automation/README.md)** - Command-line tools for updating tags
- **[Web Interface](web/README.md)** - Web UI for managing tags (recommended)
- **[Quick Start Guide](QUICK_START.md)** - Get started quickly
- **[Git Setup Guide](docs/GIT_SETUP.md)** - Repository setup and workflow

## Getting Started

### For Tag Deployment

1. Browse tags in the [`tags/`](tags/) directory
2. Review tag documentation in [`tags/README.md`](tags/README.md)
3. Copy tag code and deploy to GTM
4. Configure triggers and test

### For Tag Updates

**Option 1: Web Interface (Recommended)**
1. Run `./start-web.sh` (Mac/Linux) or `start-web.bat` (Windows)
2. Use the web interface to search and update tags
3. Select containers and update with one click

**Option 2: Command Line**
1. Install automation dependencies:
   ```bash
   cd automation
   pip install -r requirements-gtm.txt
   ```

2. Set up Google Cloud credentials (see [Setup Guide](docs/GTM_TAG_UPDATER_SETUP.md))

3. Update tags:
   ```bash
   python gtm_tag_updater.py \
     --tag-name "3E_Pop-up" \
     --script-file "../tags/ui/3E_Pop-up" \
     --account-id "YOUR_ACCOUNT_ID" \
     --credentials "credentials.json" \
     --list-only
   ```

## Tag Categories

### 📊 Analytics
Tags for tracking user behavior, engagement, and performance metrics.
- 3E_Analytics Tracking
- 3E_Page Activity

### 📝 Forms
Tags for form validation, submission handling, and form-related interactions.
- 3E_Form Validation
- 3E_RFI Submit

### 📡 Tracking
Tags for tracking events, conversions, and integrating with third-party tracking systems.
- 3E_3EI Recruiter Activity
- 3E_3EI Recruiter Conversion
- 3E_3EI Recruiter Tracking
- 3E_3EI Recruiter Unified
- 3E_Insights Pixel
- 3E_Pop-up Tracking

### 🎨 UI
Tags for user interface enhancements, popups, and visual elements.
- 3E_Favicon Injection
- 3E_Pop-up
- 3E_Pop-up Marketo Form
- 3E_Sticky Buttons

### 🔌 Integrations
Tags for integrating with external services and platforms.
- 3E_Cloudflare Beacon

### 📋 Templates
GTM variable templates for configuration management.
- Template - 3E Config

## Common Dependencies

### 3E Config
Most tags depend on the **3E Config** variable template. This must be set up in GTM before deploying dependent tags. See [`tags/templates/Template - 3E Config`](tags/templates/Template%20-%203E%20Config) for setup.

### Marketo Munchkin
Required for tags that send tracking data to Marketo. Ensure Munchkin is loaded or use `3E_Insights Pixel` to load it dynamically.

### Marketo Forms2
Required for tags that interact with Marketo forms. The Forms2 library is typically loaded by Marketo forms themselves.

## Version Management

- Tag versions are tracked in file headers
- Use automation tools to push updates across containers
- Always test with `--list-only` or `--dry-run` before deploying
- Web interface shows version comparison automatically

## Contributing

1. Make changes to tag files
2. Update version numbers and dates
3. Test thoroughly
4. Commit and push to both remotes (3E GitHub and personal backup)
5. Use automation tools to deploy updates

## Security

- **Never commit credentials** - They are in `.gitignore`
- Store credentials securely outside the repository
- Use service accounts for automation
- Rotate credentials regularly

## Repository Management

This repository is configured with dual remotes:
- **origin**: 3E GitHub organization (`3enrollment/eee-tag-management`)
- **backup**: Personal GitHub (`amfiggins/eee-tag-management`)

See [Git Setup Guide](docs/GIT_SETUP.md) for details on managing both remotes.

## Support

For questions or issues:
- Review tag documentation in [`tags/README.md`](tags/README.md)
- Check automation documentation in [`automation/README.md`](automation/README.md)
- See setup guides in [`docs/`](docs/)
- See [Quick Start Guide](QUICK_START.md) for getting started

## License

Internal use only - 3E Enrollment

## Maintainer

Anthony Figgins
