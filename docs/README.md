# Documentation Index

This directory contains comprehensive documentation for the GTM Tag Management project.

## Getting Started

- **[Quick Start Guide](../QUICK_START.md)** - Fastest way to get started with the web interface
- **[GTM Tag Updater Quick Start](GTM_TAG_UPDATER_QUICKSTART.md)** - Quick start for command-line automation
- **[GTM Tag Updater Setup](GTM_TAG_UPDATER_SETUP.md)** - Detailed setup guide for automation tools

## Setup Guides

- **[OAuth Setup Guide](../automation/OAUTH_SETUP.md)** - OAuth 2.0 credentials setup (recommended)
- **[Setup Checklist](../automation/SETUP_CHECKLIST.md)** - Step-by-step setup checklist
- **[Git Setup Guide](GIT_SETUP.md)** - Repository setup with dual remotes

## Reference Documentation

- **[GTM API Debug Summary](GTM_API_DEBUG_SUMMARY.md)** - Technical debugging information for GTM API issues
- **[Cache System](../.cache/README.md)** - Server-side caching system documentation
- **[Auto-Update Setup](AUTO_UPDATE_SETUP.md)** - Auto-update feature guide
- **[Deployment Architecture](DEPLOYMENT_ARCHITECTURE.md)** - Deployment architecture options
- **[Documentation Review](DOCUMENTATION_REVIEW.md)** - Latest documentation review and cleanup summary

## System Features

### Caching
- **Unified Cache Structure**: One JSON file per account (`container_data_{accountId}.json`)
- **Shared Data**: Container Browser and Tag Search share the same cache files
- **Efficient**: Tag search uses cached container data without API calls
- **Server-Side Caching**: JSON cache files in `.cache/` directory
- **Shared Cache**: All users benefit from cached results
- **12-Month Duration**: Cache files valid for 12 months
- **Easy Maintenance**: View, edit, or delete cache files as needed

### CLI Features
- **Read-Only Modes**: `--verify`, `--list-only`, `--list-versions`, `--containers-only`
- **Version Management**: `--list-versions`, `--publish-version`
- **Multi-Account**: `--all-accounts` for discovery and cross-account updates
- **Account Auto-Detection**: Automatically finds containers in correct account

### Web Interface Features
- **Container Browser**: Search, filter, and manage containers
- **Tag Search**: Cross-container tag search with caching
- **Bulk Operations**: Refresh all containers, update multiple tags
- **Column Layouts**: Organized display with aligned columns
- **Auto-Refresh**: Tags refresh automatically after updates

## Archived Documentation

- **[archive/](archive/)** - Historical planning, implementation summaries, and outdated documents
  - Web interface planning documents (historical)
  - Implementation summaries (auto-update, cache fixes)
  - Cache review documentation (historical)

## Related Documentation

- **[Main README](../README.md)** - Project overview and quick links
- **[Tag Documentation](../tags/README.md)** - Complete tag reference
- **[Automation README](../automation/README.md)** - Automation tools overview
- **[Web Interface README](../web/README.md)** - Web interface documentation

