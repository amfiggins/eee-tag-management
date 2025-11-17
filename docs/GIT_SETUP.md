# Git Repository Setup Guide

This guide explains how to set up the `eee-tag-management` repository with dual remotes (3E GitHub and personal GitHub backup).

## Prerequisites

- Git installed
- Access to 3E GitHub organization
- Personal GitHub account

## Step 1: Initialize Git Repository

If the repository is not already initialized:

```bash
cd eee-tag-management
git init
```

## Step 2: Create Repositories on GitHub

### 2.1 Create Repository on 3E GitHub

1. Go to the 3E GitHub organization
2. Click "New repository"
3. Name it: `eee-tag-management`
4. Set visibility (private recommended)
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Copy the repository URL

### 2.2 Create Repository on Personal GitHub

1. Go to your personal GitHub account
2. Click "New repository"
3. Name it: `eee-tag-management` (or any name you prefer)
4. Set visibility (private recommended)
5. **Do NOT** initialize with README, .gitignore, or license
6. Copy the repository URL

## Step 3: Add Remotes

### Add 3E GitHub as Origin

```bash
git remote add origin <3E_GITHUB_REPO_URL>
```

Example:
```bash
git remote add origin https://github.com/3E-Enrollment/eee-tag-management.git
```

### Add Personal GitHub as Backup

```bash
git remote add backup <PERSONAL_GITHUB_REPO_URL>
```

Example:
```bash
git remote add backup https://github.com/yourusername/eee-tag-management.git
```

### Verify Remotes

```bash
git remote -v
```

You should see:
```
backup    https://github.com/yourusername/eee-tag-management.git (fetch)
backup    https://github.com/yourusername/eee-tag-management.git (push)
origin    https://github.com/3E-Enrollment/eee-tag-management.git (fetch)
origin    https://github.com/3E-Enrollment/eee-tag-management.git (push)
```

## Step 4: Initial Commit and Push

### Stage All Files

```bash
git add .
```

### Create Initial Commit

```bash
git commit -m "Initial commit: GTM tag management automation tools"
```

### Push to Both Remotes

**Option 1: Push to both separately**
```bash
git push -u origin main
git push -u backup main
```

**Option 2: Push to both at once**
```bash
git push -u origin main && git push -u backup main
```

**Note**: If your default branch is `master` instead of `main`, use `master` in the commands above.

## Step 5: Set Up Branch Protection (Optional)

On the 3E GitHub repository, consider setting up:
- Branch protection rules for `main`
- Require pull requests for merges
- Require status checks

## Daily Workflow

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. **Push to origin (3E GitHub):**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create pull request on 3E GitHub**

5. **After merge, update backup:**
   ```bash
   git checkout main
   git pull origin main
   git push backup main
   ```

### Syncing Both Remotes

To keep both remotes in sync:

```bash
# Pull latest from origin
git pull origin main

# Push to both remotes
git push origin main
git push backup main
```

## Troubleshooting

### Wrong Remote URLs

If you need to update a remote URL:

```bash
# Update origin
git remote set-url origin <NEW_3E_GITHUB_URL>

# Update backup
git remote set-url backup <NEW_PERSONAL_GITHUB_URL>
```

### Remove a Remote

If you need to remove a remote:

```bash
git remote remove backup  # or origin
```

### Check Remote Status

```bash
# List all remotes
git remote -v

# Check remote branches
git branch -r

# Fetch from specific remote
git fetch origin
git fetch backup
```

## Best Practices

1. **Always push to origin first** (3E GitHub is primary)
2. **Keep backup in sync** - Push to backup after merging to main
3. **Use feature branches** - Don't commit directly to main
4. **Never commit credentials** - They're in `.gitignore` for a reason
5. **Write clear commit messages** - Follow conventional commit format if possible

## Example Workflow

```bash
# 1. Start new feature
git checkout -b feature/add-new-script

# 2. Make changes
# ... edit files ...

# 3. Commit
git add .
git commit -m "feat: add new tag update script"

# 4. Push to 3E GitHub
git push origin feature/add-new-script

# 5. Create PR on 3E GitHub, get approval, merge

# 6. Update local main
git checkout main
git pull origin main

# 7. Sync backup
git push backup main
```

## Security Reminders

- ✅ Credentials are in `.gitignore`
- ✅ Never commit `.json` credential files
- ✅ Use environment variables for sensitive data
- ✅ Keep repositories private
- ✅ Rotate credentials regularly

