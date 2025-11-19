# GTM API Publish Permission Issue - Debug Summary

## 1. GTM API Endpoints in Use

### File: `automation/gtm_tag_updater.py`

#### a) Create Workspace
- **Function**: `create_workspace()` (lines 535-564)
- **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces`
- **HTTP Method**: POST
- **Code Snippet**:
```python
workspace = self._api_call_with_retry(
    self.service.accounts().containers().workspaces().create(
        parent=f'accounts/{target_account_id}/containers/{container_id}',
        body={'name': workspace_name}
    )
)
```

#### b) Update Tag
- **Function**: `update_tag()` (lines 622-660)
- **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/tags/{tagId}`
- **HTTP Method**: PUT (via `.update()`)
- **Code Snippet**:
```python
updated_tag = self._api_call_with_retry(
    self.service.accounts().containers().workspaces().tags().update(
        path=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}/tags/{tag["tagId"]}',
        body=tag
    )
)
```

#### c) Create Version (from Workspace)
- **Function**: `create_version()` (lines 662-765)
- **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:createVersion`
- **HTTP Method**: POST (via `.create_version()`)
- **Code Snippet**:
```python
version = self._api_call_with_retry(
    self.service.accounts().containers().workspaces().create_version(
        path=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}',
        body={
            'name': version_name,
            'notes': version_notes
        }
    )
)
```

#### d) Publish Version
- **Function**: `publish_version()` (lines 767-793)
- **Endpoint**: `accounts/{accountId}/containers/{containerId}/versions/{versionId}:publish`
- **HTTP Method**: POST (via `.publish()`)
- **Code Snippet**:
```python
self._api_call_with_retry(
    self.service.accounts().containers().versions().publish(
        path=f'accounts/{target_account_id}/containers/{container_id}/versions/{version_id}'
    )
)
```

#### e) Delete Workspace
- **Function**: `delete_workspace()` (lines 566-600)
- **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}`
- **HTTP Method**: DELETE
- **Code Snippet**:
```python
self._api_call_with_retry(
    self.service.accounts().containers().workspaces().delete(
        path=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
    )
)
```

---

## 2. Auth Method and Scopes

### Authentication Method
- **Dual Support**: The code supports both **Service Account** and **User OAuth 2.0** flows
- **Detection**: Automatically detects credential type by checking for `type: "service_account"` in the JSON file
- **Location**: `_build_service()` method (lines 131-247)

### Service Account Flow
- **Code Path**: Lines 141-146
- **Loading**: `service_account.Credentials.from_service_account_file(credentials_path, scopes=self.SCOPES)`

### User OAuth 2.0 Flow
- **Code Path**: Lines 148-221
- **Loading**: Uses `InstalledAppFlow.from_client_secrets_file()` with `run_local_server()`
- **Token Storage**: Saves OAuth token to `token.json` in the same directory as credentials file
- **Token Refresh**: Automatically refreshes expired tokens if `refresh_token` is available

### OAuth Scopes Used
**Exact scopes defined in `SCOPES` class variable (lines 76-79):**
```python
SCOPES = [
    'https://www.googleapis.com/auth/tagmanager.edit.containers',
    'https://www.googleapis.com/auth/tagmanager.publish'
]
```

### Scope Validation
- The code checks if loaded OAuth tokens have all required scopes (lines 167-178)
- If scopes are missing, it deletes the token file to force re-authentication
- Token scopes are logged during initialization for debugging

---

## 3. Publish Flow Sequence

### Main Entry Point
- **Function**: `update_tag_in_container()` (lines 945-1073)
- **Called from**: `main()` function when updating tags (line 1353)

### Step-by-Step Sequence

1. **Get Default Workspace** (read-only)
   - **Function**: `get_workspace()`
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces` (GET)
   - **Purpose**: Find the tag in the default workspace

2. **Find Tag in Default Workspace** (read-only)
   - **Function**: `find_tag()`
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/tags` (GET)
   - **Purpose**: Locate the tag to update

3. **Create New Workspace**
   - **Function**: `create_workspace()`
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces` (POST)
   - **Payload**: `{'name': 'Tag Update - {tag_name} - {timestamp}'}`
   - **Purpose**: Isolate changes in a new workspace

4. **Find Tag in New Workspace**
   - **Function**: `find_tag()`
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/tags` (GET)
   - **Purpose**: Get the tag object in the new workspace (copied from default)

5. **Update Tag Content**
   - **Function**: `update_tag()`
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}/tags/{tagId}` (PUT)
   - **Payload**: Updated tag object with new HTML content in `parameter[].value`
   - **Purpose**: Modify the tag's HTML content

6. **Create Version from Workspace**
   - **Function**: `create_version()`
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}:createVersion` (POST)
   - **Payload**: 
     ```json
     {
       "name": "Tag Update - {tag_name} - {timestamp}",
       "notes": "Automated update of tag: {tag_name}"
     }
     ```
   - **Purpose**: Create a container version from the workspace
   - **Returns**: `containerVersionId`

7. **Publish Version**
   - **Function**: `publish_version()`
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/versions/{versionId}:publish` (POST)
   - **Purpose**: Publish the created version
   - **Note**: GTM automatically removes the workspace after publishing

8. **Cleanup (if error occurs)**
   - **Function**: `delete_workspace()` (in `finally` block)
   - **Endpoint**: `accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}` (DELETE)
   - **Purpose**: Manually delete workspace if publish fails (to prevent leftover workspaces)

---

## 4. Error Details from Publish Call

### Error Location
- **Primary Error**: `create_version()` method (lines 718-765)
- **Secondary Error**: `publish_version()` method (lines 777-793)

### HTTP Status Code
- **403** (Forbidden) - "Request had insufficient authentication scopes" or "Insufficient Permission"

### Error Handling in `create_version()`

**Error Detection** (lines 719-765):
```python
except HttpError as e:
    if e.resp.status == 403:
        error_msg = str(e)
        error_details = e.error_details if hasattr(e, 'error_details') else []
        
        # Checks for:
        # 1. API_NOT_ENABLED errors
        # 2. "insufficient authentication scopes" or "insufficient permission"
```

**Error Message Structure**:
- **Error Message**: `"Request had insufficient authentication scopes."`
- **Error Details**: `[{'message': 'Insufficient Permission', 'domain': 'global', 'reason': 'insufficientPermissions'}]`

**Error Response Fields**:
- `error.resp.status`: `403`
- `error.error_details`: List of error objects with:
  - `message`: "Insufficient Permission"
  - `domain`: "global"
  - `reason`: "insufficientPermissions"

### Error Handling in `publish_version()`

**Error Detection** (lines 777-793):
```python
except HttpError as e:
    if e.resp.status == 403:
        error_msg = str(e)
        if 'insufficient authentication scopes' in error_msg.lower() or 'insufficient permission' in error_msg.lower():
            # Logs required scopes and instructions
```

### Diagnostic Messages Generated

When a 403 error occurs during `create_version()`, the code outputs:

```
ERROR: Permission denied when creating version
  OAuth scopes are correct and API is enabled, but GTM is rejecting the request.

  ROOT CAUSE: The 'create_version' operation requires 'Publish' permission in GTM.
  Even with correct OAuth scopes, you must have 'Publish' access at the container level.

  REQUIRED FIX - Grant Publish Permission in GTM:
    1. Go to: https://tagmanager.google.com/
    2. Select container {container_id}
    3. Click 'Admin' (gear icon) in the top menu
    4. Click 'User Management'
    5. Find your account in the list
    6. Change permission from 'Edit' to 'Publish' (or ensure it's already 'Publish')
    7. Click 'Save'
    8. Try the update again

  NOTE: 'Edit' permission is NOT sufficient for creating versions.
        You MUST have 'Publish' permission to use create_version API.

  Current token scopes: [list of scopes]
  Required scopes: ['https://www.googleapis.com/auth/tagmanager.edit.containers', 'https://www.googleapis.com/auth/tagmanager.publish']
```

---

## 5. Configuration and Permission Assumptions

### Configuration

**Account/Container IDs**:
- **Account ID**: Required command-line argument `--account-id` (numeric, e.g., "1234567")
- **Container IDs**: Either:
  - Specified via `--containers` argument (comma-separated list)
  - Auto-discovered by listing all containers in the account
  - Can list from all accounts with `--all-accounts` flag

**Credentials File**:
- **Path**: Required command-line argument `--credentials`
- **Location**: Can be service account JSON or OAuth client credentials JSON
- **Token File**: OAuth tokens saved to `token.json` in same directory as credentials file

**GCP Project**:
- **Assumed Project**: `eee-tag-management` (mentioned in error messages, line 729)
- **API Enablement**: Code assumes Tag Manager API is enabled in the GCP project

### Identity Calling the API

**Current Configuration** (Based on Web Interface Default):
- **Credential File Used**: `gtm-oauth-credentials.json` (OAuth client credentials)
- **Credential Type**: OAuth 2.0 User Authentication (NOT service account)
- **Token File**: `token.json` (contains OAuth user token)
- **GCP Project**: `eee-tag-management`

**How Identity is Determined**:
1. Code reads the credentials file specified by `--credentials` argument
2. **If file contains `"type": "service_account"`**: Uses service account authentication
3. **If file does NOT contain service account type** (like `gtm-oauth-credentials.json`): Uses OAuth 2.0 user flow
4. The code now includes identity detection that will log the authenticated identity during initialization

**Current Setup**:
- Web interface defaults to: `automation/gtm-oauth-credentials.json`
- This file is an OAuth client credentials file (has `"installed"` with `client_id` and `client_secret`)
- The system uses the OAuth user token from `token.json` for authentication
- **The OAuth user account** (not the service account) is the identity making API calls

**Important for OAuth User**:
- The OAuth user account (the Google account that authenticated) must be:
- Added as a user to each GTM container where updates are needed
- Granted "Publish" permission (not just "Edit") at the container level
- The user's email can be found in the OAuth token or will be logged during initialization

**Note**: There is also a service account file (`eee-tag-management-8784eacb2d9f.json`) in the directory, but it is NOT being used when `gtm-oauth-credentials.json` is specified.

### Permission Assumptions

**From Code Comments and Error Messages**:

1. **OAuth Scopes Required**:
   - `tagmanager.edit.containers` - For editing tags and creating workspaces
   - `tagmanager.publish` - For creating versions and publishing

2. **GTM Container-Level Permissions**:
   - **Minimum Required**: "Publish" permission at the container level
   - **Not Sufficient**: "Edit" permission alone (explicitly stated in error messages, line 750)
   - **Assumption**: The authenticated user/service account must be added to the GTM container with "Publish" role

3. **Service Account Assumption**:
   - If using service account, it must be added as a user to each GTM container with "Publish" permissions
   - Service accounts do not automatically inherit permissions

4. **OAuth Consent Screen**:
   - Code assumes OAuth consent screen is properly configured
   - If app is in "Testing" mode, user email must be in "Test users" list
   - Error messages reference: `https://console.cloud.google.com/apis/credentials/consent`

5. **API Enablement**:
   - Code assumes Tag Manager API (`tagmanager.googleapis.com`) is enabled in the GCP project
   - Error messages reference: `https://console.cloud.google.com/apis/library/tagmanager.googleapis.com`

### Workspace Management Assumptions

- **Automatic Cleanup**: Code assumes GTM automatically removes workspaces after publishing (line 1053)
- **Manual Cleanup**: Code includes `finally` block to manually delete workspace if publish fails (lines 1069-1073)
- **Workspace Naming**: Workspace names must not contain colons (format: `YYYY-MM-DD HH-MM-SS`)

---

## Summary

The publish flow uses a two-step process:
1. **Create Version** (`:createVersion`) - This is where the 403 error occurs
2. **Publish Version** (`:publish`) - Called after version creation succeeds

The error indicates that even though OAuth scopes are correct (`tagmanager.edit.containers` and `tagmanager.publish`), the GTM API is rejecting the `create_version` call with "insufficient authentication scopes" / "Insufficient Permission".

The code explicitly states that "Publish" permission at the GTM container level is required for `create_version`, and that "Edit" permission alone is not sufficient.

