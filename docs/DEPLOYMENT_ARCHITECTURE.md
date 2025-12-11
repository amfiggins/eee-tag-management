# GTM Tag Management - Deployment Architecture

## Executive Summary

This document outlines the recommended architecture for making the GTM Tag Management tool available to team members without requiring GitHub access. Three deployment options are presented, with **Option 2 (Hybrid: Self-Updating Client + AWS API)** recommended as the best balance of security, maintainability, and user experience.

## Current State

- **Tool**: Python-based GTM tag updater with Next.js web interface
- **Access**: Team members need GitHub access to pull latest code
- **Problem**: Not all team members have GitHub repo access
- **Requirements**: 
  - Auto-update mechanism
  - No GitHub access required
  - Secure credential management
  - Centralized or distributed deployment

## Architecture Options

### Option 1: Fully Centralized (AWS Lambda + API Gateway)

**Architecture:**
```
Team Members → API Gateway → Lambda Functions → GTM API
                      ↓
                  Secrets Manager (OAuth credentials)
```

**Components:**
- **AWS Lambda**: Python runtime for `gtm_tag_updater.py`
- **API Gateway**: REST API endpoints for tag operations
- **Secrets Manager**: Store OAuth credentials securely
- **S3**: Store tag source files (read-only)
- **CloudFront**: CDN for fast tag file delivery
- **IAM**: Role-based access control

**Pros:**
- ✅ Fully centralized - no local code needed
- ✅ Automatic updates (deploy once, everyone uses latest)
- ✅ Centralized credential management
- ✅ No local dependencies (Python, Node.js)
- ✅ Audit trail via CloudWatch
- ✅ Scalable

**Cons:**
- ❌ Requires AWS setup and maintenance
- ❌ Higher AWS costs (Lambda invocations, API Gateway)
- ❌ More complex deployment
- ❌ Team members need AWS authentication
- ❌ No offline capability

**Best For:** Teams that want zero local setup and centralized control

---

### Option 2: Hybrid - Self-Updating Client + AWS API (RECOMMENDED)

**Architecture:**
```
Team Members → start-web.py (auto-updates) → Local Next.js Web UI
                                                      ↓
                                              AWS API Gateway → Lambda
                                                      ↓
                                              Secrets Manager
```

**Components:**
- **Self-Updating Client**: `start-web.py` checks for updates from S3/CloudFront
- **Local Web Interface**: Next.js runs locally (faster, offline-capable)
- **AWS Lambda**: Optional centralized API for credential management
- **S3 + CloudFront**: Distribute code updates and tag files
- **Secrets Manager**: Optional centralized credential storage

**Pros:**
- ✅ Fast local execution (no Lambda cold starts)
- ✅ Works offline (after initial setup)
- ✅ Auto-updates without GitHub access
- ✅ Lower AWS costs (only for updates, not execution)
- ✅ Familiar workflow (local web interface)
- ✅ Can fall back to local credentials if AWS unavailable

**Cons:**
- ⚠️ Requires local Python/Node.js
- ⚠️ Initial setup needed per machine
- ⚠️ Some AWS infrastructure still needed

**Best For:** Teams that want local performance with centralized updates

---

### Option 3: Fully Distributed (Self-Updating Only)

**Architecture:**
```
Team Members → start-web.py (auto-updates from S3) → Local Execution
```

**Components:**
- **S3 + CloudFront**: Public or signed URL for code distribution
- **Self-Updating Client**: `start-web.py` downloads latest from S3
- **Local Execution**: Everything runs locally

**Pros:**
- ✅ Minimal infrastructure (just S3)
- ✅ Very low AWS costs
- ✅ Simple deployment
- ✅ Works completely offline after setup

**Cons:**
- ❌ No centralized credential management
- ❌ No audit trail
- ❌ Each user manages their own OAuth credentials
- ❌ No centralized logging

**Best For:** Small teams with simple needs

---

## Recommended Solution: Option 2 (Hybrid)

### Implementation Overview

1. **Code Distribution (S3 + CloudFront)**
   - Package entire repo as versioned ZIP files
   - Upload to S3 on each commit (via CI/CD)
   - CloudFront distribution for fast downloads
   - Version manifest JSON for update checking

2. **Self-Updating Client**
   - `start-web.py` checks version on startup
   - Downloads and extracts updates if newer version available
   - Validates checksums for security
   - Preserves local credentials and config

3. **Optional Centralized API**
   - Lambda function for credential management
   - API Gateway for secure access
   - Secrets Manager for OAuth credentials
   - Team members authenticate via API key or IAM

### Security Considerations

1. **Code Integrity**
   - SHA-256 checksums for all downloads
   - Signed version manifest
   - HTTPS-only downloads

2. **Credential Management**
   - Option A: Local OAuth credentials (current approach)
   - Option B: AWS Secrets Manager (centralized)
   - Option C: Hybrid (local with AWS backup)

3. **Access Control**
   - S3 bucket with IAM policies
   - CloudFront signed URLs (optional)
   - API Gateway API keys or IAM roles

### Cost Estimate (Option 2)

**Monthly Costs (10 team members, 100 updates/month):**
- S3 Storage: ~$0.10 (1GB code storage)
- CloudFront: ~$0.50 (100GB transfer)
- Lambda (optional): ~$0.20 (1000 invocations)
- API Gateway (optional): ~$0.35 (1000 requests)
- **Total: ~$1.15/month** (vs ~$50-100/month for fully centralized)

---

## Implementation Plan

### Phase 1: Self-Updating Client (Week 1-2)

1. Add version checking to `start-web.py`
2. Implement S3 download mechanism
3. Add update extraction and validation
4. Preserve local credentials during updates
5. Test update flow

### Phase 2: CI/CD Pipeline (Week 2-3)

1. GitHub Actions workflow
2. Package repo as ZIP
3. Upload to S3 with versioning
4. Update version manifest
5. CloudFront cache invalidation

### Phase 3: Optional Centralized API (Week 3-4)

1. Lambda function for credential management
2. API Gateway setup
3. Secrets Manager integration
4. Client-side API integration
5. Fallback to local credentials

### Phase 4: Documentation & Rollout (Week 4)

1. User setup guide
2. Troubleshooting documentation
3. Team training
4. Gradual rollout

---

## Detailed Component Specifications

### 1. Version Manifest Format

```json
{
  "version": "1.2.3",
  "release_date": "2025-01-20T10:00:00Z",
  "download_url": "https://d1234567890.cloudfront.net/releases/v1.2.3/eee-tag-management.zip",
  "checksum": "sha256:abc123...",
  "size": 5242880,
  "changelog": "Added auto-update feature, improved error handling",
  "min_python_version": "3.10",
  "min_node_version": "18.0"
}
```

### 2. Update Check Flow

```
1. start-web.py starts
2. Check local version (from VERSION file or package.json)
3. Fetch version manifest from S3/CloudFront
4. Compare versions
5. If newer version available:
   a. Download ZIP to temp directory
   b. Verify checksum
   c. Extract to temp directory
   d. Backup current installation
   e. Copy new files (preserve credentials/config)
   f. Restore credentials/config
   g. Restart with new version
6. Continue normal startup
```

### 3. S3 Bucket Structure

```
s3://3e-gtm-tag-management/
├── releases/
│   ├── v1.2.3/
│   │   └── eee-tag-management.zip
│   ├── v1.2.4/
│   │   └── eee-tag-management.zip
│   └── latest/
│       └── eee-tag-management.zip (symlink to current)
├── manifests/
│   ├── latest.json
│   └── v1.2.3.json
└── checksums/
    └── v1.2.3.sha256
```

### 4. Lambda Function (Optional)

**Purpose**: Centralized credential management and audit logging

**Endpoints:**
- `GET /credentials` - Retrieve OAuth credentials (encrypted)
- `POST /audit` - Log tag update operations
- `GET /containers` - List accessible containers (cached)

**IAM Permissions:**
- Read from Secrets Manager
- Write to CloudWatch Logs
- Optional: Read from Parameter Store

---

## Migration Path

### For Existing Users

1. **No changes required initially** - current workflow continues
2. **Opt-in to auto-updates** - set `AUTO_UPDATE=true` environment variable
3. **Gradual migration** - team members can switch when ready

### For New Users

1. Download `start-web.py` from S3/CloudFront (one-time)
2. Run `python start-web.py` - auto-updates on first run
3. Set up OAuth credentials (local or via API)
4. Start using the tool

---

## Monitoring & Maintenance

### Metrics to Track

- Update success rate
- Version adoption (how many users on latest)
- Download counts
- Error rates
- API usage (if using centralized API)

### Maintenance Tasks

- Weekly: Review update logs
- Monthly: Audit S3 storage costs
- Quarterly: Review security policies
- As needed: Update dependencies

---

## Security Best Practices

1. **Code Signing**: Sign ZIP files with GPG (optional but recommended)
2. **HTTPS Only**: All downloads via HTTPS
3. **Checksum Verification**: Always verify SHA-256 checksums
4. **Least Privilege**: S3 bucket with minimal public access
5. **Credential Rotation**: Regular OAuth credential rotation
6. **Audit Logging**: Log all update operations

---

## Next Steps

1. Review and approve architecture
2. Set up AWS resources (S3, CloudFront, IAM)
3. Implement self-update mechanism
4. Create CI/CD pipeline
5. Test with beta users
6. Roll out to full team

---

## Questions & Answers

**Q: What if a user's internet is down?**
A: The tool works offline after initial setup. Updates are skipped if network unavailable.

**Q: Can users opt out of auto-updates?**
A: Yes, set `AUTO_UPDATE=false` or use `--no-update` flag.

**Q: What about breaking changes?**
A: Version manifest includes `min_python_version` and `min_node_version` to prevent incompatible updates.

**Q: How do we handle credentials?**
A: Three options: local (current), AWS Secrets Manager (centralized), or hybrid.

**Q: What if S3 is compromised?**
A: Checksum verification prevents malicious code execution. Code signing adds another layer.

---

## Appendix: AWS Resource Costs

### S3 Storage
- Standard storage: $0.023/GB/month
- Requests: $0.005 per 1,000 requests
- Example: 1GB, 10,000 requests/month = $0.07/month

### CloudFront
- Data transfer: $0.085/GB (first 10TB)
- Requests: $0.0075 per 10,000 requests
- Example: 100GB/month, 10,000 requests = $8.58/month

### Lambda (Optional)
- Requests: $0.20 per 1M requests
- Compute: $0.0000166667/GB-second
- Example: 1,000 requests/month, 128MB, 1s = $0.002/month

### API Gateway (Optional)
- REST API: $3.50 per million requests
- Example: 1,000 requests/month = $0.0035/month

**Total Estimated Cost: $1-10/month** depending on usage and which components are enabled.
