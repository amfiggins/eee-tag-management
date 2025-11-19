# GTM Tag Management Web Interface - Feature Plan

## Core Requirements ✅

### 1. Tag Search & Discovery
- **Search by tag name**: Query all containers for a specific tag
- **Version detection**: Extract and display version from tag script header
- **Container listing**: Show which containers have the tag
- **Version comparison**: Compare container versions vs. repository version

### 2. Selective Updates
- **Container selection**: Multi-select containers to update
- **Bulk update**: Update selected containers with one click
- **Update preview**: Show what will change before applying
- **Update execution**: Send updated tag to selected containers

## Nice to Have Features 🎯

### 3. Container Management
- **Container browser**: List all containers with their tags
- **Tag inventory**: See all tags in each container
- **Version matrix**: Table showing tag versions across containers
- **Container filtering**: Filter by name, tags, or other criteria

### 4. Smart Update Features
- **Version-aware updates**: Skip containers that already have latest version
- **Single tag update**: Update one tag in one container
- **Bulk tag updates**: Push one tag to all containers (or selected)
- **Update history**: Track what was updated and when

## Advanced Features 💡

### 5. Version Management
- **Version extraction**: Parse version from script headers automatically
- **Version comparison**: Visual diff between versions
- **Version history**: Track version changes over time
- **Rollback capability**: Revert to previous version

### 6. Change Management
- **Preview changes**: See diff before applying updates
- **Change log**: What changed in each version
- **Approval workflow**: Require approval before publishing (optional)
- **Dry-run mode**: Test updates without applying

### 7. Container & Tag Analytics
- **Tag usage stats**: How many containers use each tag
- **Version distribution**: Chart showing version spread
- **Update frequency**: Track how often tags are updated
- **Container health**: Identify containers with outdated tags

### 8. Search & Filtering
- **Advanced search**: Search by tag name, version, container name
- **Tag filtering**: Filter containers by which tags they have
- **Version filtering**: Find containers with specific versions
- **Container grouping**: Group by client, project, etc.

### 9. Bulk Operations
- **Multi-tag updates**: Update multiple tags at once
- **Multi-container updates**: Update multiple containers simultaneously
- **Batch operations**: Queue multiple updates
- **Scheduled updates**: Schedule updates for later

### 10. Safety Features
- **Confirmation dialogs**: Confirm before making changes
- **Backup before update**: Save current version before updating
- **Error handling**: Graceful error handling with rollback
- **Rate limiting**: Respect API rate limits automatically

### 11. Reporting & Audit
- **Update reports**: Generate reports of what was updated
- **Audit log**: Track all changes with user, timestamp, details
- **Export functionality**: Export container/tag data to CSV/JSON
- **Change notifications**: Email/Slack notifications on updates

### 12. User Experience
- **Dashboard**: Overview of containers, tags, recent updates
- **Real-time status**: Live updates during bulk operations
- **Progress tracking**: Show progress for long-running operations
- **Error reporting**: Clear error messages and recovery suggestions

### 13. Advanced Tag Management
- **Tag dependencies**: Show which tags depend on others
- **Tag templates**: Create tag templates for common patterns
- **Tag validation**: Validate tag code before deployment
- **Tag testing**: Test tags in staging before production

### 14. Multi-Account Support
- **Account switching**: Switch between GTM accounts
- **Account comparison**: Compare tags across accounts
- **Cross-account updates**: Update tags across multiple accounts

### 15. Integration Features
- **API access**: REST API for programmatic access
- **Webhook support**: Webhooks for update events
- **CI/CD integration**: Integrate with deployment pipelines
- **Slack/Teams integration**: Notifications to chat platforms

## Technical Architecture

### Frontend Options
1. **Next.js** (React) - Modern, fast, good for dashboards
2. **Flask + Jinja2** - Simple, Python-native
3. **FastAPI + React** - Modern API + frontend separation
4. **Streamlit** - Quick Python-based UI (fastest to build)

### Backend
- **FastAPI** or **Flask** - Python web framework
- **Existing Python script** - Reuse `gtm_tag_updater.py` logic
- **SQLite/PostgreSQL** - Store update history, versions
- **Redis** (optional) - Caching and job queues

### Recommended Stack
**FastAPI + React** for a modern, scalable solution
**OR**
**Streamlit** for rapid prototyping and deployment

## Implementation Phases

### Phase 1: MVP (Core Requirements)
1. Tag search interface
2. Container listing with tag presence
3. Version detection and display
4. Container selection
5. Update execution

### Phase 2: Enhanced Features
1. Container browser
2. Version comparison
3. Smart update (skip if up-to-date)
4. Update history

### Phase 3: Advanced Features
1. Dashboard
2. Analytics
3. Bulk operations
4. Reporting

## UI Mockup Ideas

### Main Dashboard
```
┌─────────────────────────────────────────────────┐
│  GTM Tag Management Dashboard                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Search Tag] [3E_Pop-up] [Search]             │
│                                                 │
│  Found in 45 containers                        │
│                                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ Container Name    │ Version │ Status     │ │
│  ├──────────────────────────────────────────┤ │
│  │ ☑ Client A       │ 2.3.1   │ Up to date │ │
│  │ ☐ Client B       │ 2.2.0   │ Outdated   │ │
│  │ ☑ Client C       │ 2.3.1   │ Up to date │ │
│  │ ☐ Client D       │ 2.1.0   │ Outdated   │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  [Update Selected] [Update All] [Export]        │
└─────────────────────────────────────────────────┘
```

### Container Browser
```
┌─────────────────────────────────────────────────┐
│  Container: Client A (GTM-XXXXX)               │
├─────────────────────────────────────────────────┤
│  Tags in this container:                        │
│                                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ Tag Name          │ Version │ Last Update│ │
│  ├──────────────────────────────────────────┤ │
│  │ 3E_Pop-up         │ 2.3.1   │ 2025-11-17 │ │
│  │ 3E_Form Validation│ 7.2.0   │ 2025-10-28 │ │
│  │ 3E_Analytics      │ 1.2.0   │ 2025-10-03 │ │
│  └──────────────────────────────────────────┘ │
│                                                 │
│  [Update Tag] [View Diff] [View History]       │
└─────────────────────────────────────────────────┘
```

## Next Steps

1. Choose tech stack (recommend FastAPI + React or Streamlit)
2. Create API endpoints wrapping existing Python script
3. Build frontend interface
4. Add version detection logic
5. Implement update functionality
6. Add safety features and confirmations

