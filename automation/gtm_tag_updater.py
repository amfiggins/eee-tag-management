#!/usr/bin/env python3
"""
GTM Tag Updater Script
Updates a specific tag across multiple Google Tag Manager containers.

    Author: Anthony Figgins
    Version: 1.2.3
    Date Updated: 2025-11-19

Requirements:
- Google Cloud Project with GTM API enabled
- OAuth 2.0 credentials (service account or OAuth client)
- Python packages: google-api-python-client, google-auth-httplib2, google-auth-oauthlib

Usage:
    python gtm_tag_updater.py --tag-name "3E_Pop-up" --script-file "Deployed/3E_Pop-up" [--dry-run] [--containers GTM-XXXXX,GTM-YYYYY]
"""

import argparse
import json
import os
import re
import sys
import time
import warnings
from pathlib import Path
from typing import List, Dict, Optional

# Check Python version early - Google API libraries require Python 3.10+ for some features
if sys.version_info < (3, 10):
    print("WARNING: Python 3.10 or higher is recommended for full compatibility.", file=sys.stderr)
    print(f"Current version: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", file=sys.stderr)
    print("You may encounter errors with 'importlib.metadata.packages_distributions'.", file=sys.stderr)
    print("To upgrade on macOS: brew install python@3.11", file=sys.stderr)

# Suppress Python version warnings from Google API
warnings.filterwarnings('ignore', category=FutureWarning, module='google.api_core')

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError as e:
    error_msg = str(e)
    if "packages_distributions" in error_msg or "importlib.metadata" in error_msg:
        print("ERROR: Python version compatibility issue detected.", file=sys.stderr)
        print(f"Current Python version: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", file=sys.stderr)
        print("The Google API libraries require Python 3.10+ for full compatibility.", file=sys.stderr)
        print("To upgrade on macOS:", file=sys.stderr)
        print("  1. Install Homebrew if not already installed: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"", file=sys.stderr)
        print("  2. Install Python 3.11: brew install python@3.11", file=sys.stderr)
        print("  3. Use Python 3.11: python3.11 gtm_tag_updater.py ...", file=sys.stderr)
        sys.exit(1)
    else:
        print("ERROR: Required packages not installed.", file=sys.stderr)
        print("Install with: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib", file=sys.stderr)
        sys.exit(1)

# Import rate limiter
try:
    from gtm_rate_limiter import GTMRateLimiter
except ImportError:
    # If import fails, create a dummy rate limiter
    class GTMRateLimiter:
        def wait_if_needed(self):
            time.sleep(4.0)  # Default to 4 seconds
        def get_stats(self):
            return {}
        def reset(self):
            pass


class GTMTagUpdater:
    """Manages GTM tag updates across multiple containers."""
    
    SCOPES = [
        'openid',
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.publish',
        'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/tagmanager.manage.users'
    ]
    
    def __init__(self, credentials_path: str, account_id: str, delay: float = None):
        """
        Initialize GTM Tag Updater.
        
        Args:
            credentials_path: Path to service account JSON or OAuth credentials
            account_id: GTM Account ID (e.g., '1234567')
            delay: DEPRECATED - Rate limiting is now handled automatically by GTMRateLimiter
                   Kept for backward compatibility but ignored
        """
        self.account_id = account_id
        self.credentials_path = credentials_path  # Store for later use in error messages
        self.rate_limiter = GTMRateLimiter()  # Use proper rate limiter
        self.service = self._build_service(credentials_path)
        
        # Debug: Print user permissions (called after service is built, before email is overwritten)
        try:
            self.debug_print_user_permissions()
        except Exception as e:
            print(f"[GTM DEBUG] Error while printing user permissions: {e}", flush=True)
        
        self._authenticated_user_email = None  # Cache the authenticated user email
    
    def _now_str(self) -> str:
        """Get current timestamp as a formatted string."""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def _api_call_with_retry(self, api_call, max_retries: int = 3):
        """
        Execute API call with retry logic and proper rate limiting.
        
        Uses GTMRateLimiter to enforce GTM API limits:
        - 0.25 QPS (1 request every 4 seconds minimum)
        - 25 requests per 100 seconds (sliding window)
        """
        for attempt in range(max_retries):
            try:
                # Wait if needed to respect rate limits (enforces 4s minimum interval and 25/100s limit)
                wait_time = self.rate_limiter.wait_if_needed()
                if wait_time > 0 and attempt == 0:  # Only log on first attempt
                    stats = self.rate_limiter.get_stats()
                    if stats.get('requests_in_window', 0) > 20:
                        print(f"  ⏳ Rate limiter: {stats['requests_in_window']}/25 requests in window, waited {wait_time:.1f}s", flush=True)
                
                result = api_call.execute()
                return result
            except HttpError as e:
                if e.resp.status == 429:  # Rate limit exceeded
                    if attempt < max_retries - 1:
                        # Exponential backoff: 10s, 20s, 40s (longer waits for rate limits)
                        wait_time = (2 ** attempt) * 10
                        print(f"  ⚠️  Rate limit hit (429), waiting {wait_time}s before retry...", flush=True)
                        time.sleep(wait_time)
                        # Reset rate limiter window after hitting 429
                        self.rate_limiter.reset()
                        continue
                    else:
                        print(f"  ❌ Rate limit exceeded after {max_retries} retries", flush=True)
                        raise
                else:
                    raise
        return None
    
    def debug_print_user_permissions(self):
        """Debug helper to print user permissions for the authenticated user."""
        try:
            permissions_response = self._api_call_with_retry(
                self.service.accounts().user_permissions().list(
                    parent=f"accounts/{self.account_id}"
                )
            )
        except HttpError as e:
            print(f"[GTM DEBUG] Failed to list user permissions: {e}", flush=True)
            return
        
        if not permissions_response:
            return
        
        user_permissions = permissions_response.get("userPermission", [])
        if not user_permissions:
            return
        
        authenticated_email = getattr(self, "_authenticated_user_email", None)
        if not authenticated_email:
            return
        
        for perm in user_permissions:
            email = perm.get("emailAddress")
            if email == authenticated_email:
                account_access = perm.get("accountAccess", {})
                container_access_list = perm.get("containerAccess", [])
                
                print(f"[GTM DEBUG] User permissions for {email}:", flush=True)
                print(f"[GTM DEBUG]   Account access: {account_access}", flush=True)
                
                for container_access in container_access_list:
                    container_id = container_access.get("containerId", "Unknown")
                    permission = container_access.get("permission", "Unknown")
                    print(f"[GTM DEBUG]   Container {container_id}: {permission}", flush=True)
                break
        
    def _build_service(self, credentials_path: str):
        """Build and return GTM API service."""
        print(f"[DEBUG] Building service with credentials: {credentials_path}", flush=True)
        # Detect credential type by reading the JSON file
        try:
            print(f"[DEBUG] Reading credentials file...", flush=True)
            with open(credentials_path, 'r') as f:
                creds_data = json.load(f)
            
            # Check if it's a service account (has 'type' field with value 'service_account')
            if creds_data.get('type') == 'service_account':
                print(f"[DEBUG] Using service account credentials", flush=True)
                # Use service account
                credentials = service_account.Credentials.from_service_account_file(
                    credentials_path, scopes=self.SCOPES
                )
            else:
                print(f"[DEBUG] Using OAuth 2.0 credentials", flush=True)
                # Use OAuth 2.0 (OAuth client credentials)
                from google_auth_oauthlib.flow import InstalledAppFlow
                from google.auth.transport.requests import Request
                
                # Token file for storing OAuth tokens
                token_file = os.path.join(os.path.dirname(credentials_path), 'token.json')
                print(f"[DEBUG] Token file path: {token_file}", flush=True)
                
                # Check if we have a saved token
                credentials = None
                if os.path.exists(token_file):
                    print(f"[DEBUG] Found existing token file", flush=True)
                    from google.oauth2.credentials import Credentials as OAuthCredentials
                    try:
                        credentials = OAuthCredentials.from_authorized_user_file(token_file, self.SCOPES)
                        print(f"[DEBUG] Loaded credentials from token file, valid: {credentials.valid if credentials else 'None'}", flush=True)
                        
                        # Check if token has all required scopes
                        if credentials and credentials.scopes:
                            required_scopes = set(self.SCOPES)
                            token_scopes = set(credentials.scopes)
                            if not required_scopes.issubset(token_scopes):
                                print(f"[DEBUG] Token missing required scopes. Required: {self.SCOPES}, Token has: {list(token_scopes)}", flush=True)
                                print(f"[DEBUG] Deleting old token file to force re-authentication with new scopes", flush=True)
                                try:
                                    os.remove(token_file)
                                    print(f"[DEBUG] Old token file deleted", flush=True)
                                except Exception as e:
                                    print(f"[DEBUG] Warning: Could not delete token file: {e}", flush=True)
                                credentials = None  # Force re-authentication
                    except Exception as e:
                        print(f"[DEBUG] Error loading token file: {e}, will re-authenticate", flush=True)
                        credentials = None
                else:
                    print(f"[DEBUG] No token file found at {token_file}", flush=True)
                
                # If no valid credentials, get new ones
                if not credentials or not credentials.valid:
                    if credentials and credentials.expired and credentials.refresh_token:
                        print(f"[DEBUG] Token expired, attempting refresh...", flush=True)
                        try:
                            credentials.refresh(Request())
                            print(f"[DEBUG] Token refreshed successfully", flush=True)
                        except Exception as e:
                            print(f"[DEBUG] Token refresh failed: {e}, will re-authenticate", flush=True)
                            credentials = None
                    
                    if not credentials or not credentials.valid:
                        print(f"[DEBUG] No valid credentials, starting OAuth flow...", flush=True)
                        print(f"[DEBUG] WARNING: This will try to open a browser. In headless environments, this will hang!", flush=True)
                        print(f"[DEBUG] Requesting scopes: {self.SCOPES}", flush=True)
                        flow = InstalledAppFlow.from_client_secrets_file(
                            credentials_path, self.SCOPES
                        )
                        print(f"[DEBUG] Starting local server for OAuth...", flush=True)
                        credentials = flow.run_local_server(port=0)
                        print(f"[DEBUG] OAuth flow completed", flush=True)
                    
                    # Save credentials for next time
                    print(f"[DEBUG] Saving token to {token_file}", flush=True)
                    with open(token_file, 'w') as token:
                        token.write(credentials.to_json())
                    print(f"[DEBUG] Token saved successfully", flush=True)
                    print(f"[DEBUG] Token scopes: {credentials.scopes}", flush=True)
                    print(f"[DEBUG] Required scopes: {self.SCOPES}", flush=True)
                    if credentials.scopes:
                        token_scopes_set = set(credentials.scopes)
                        required_scopes_set = set(self.SCOPES)
                        missing_scopes = required_scopes_set - token_scopes_set
                        if missing_scopes:
                            print(f"[DEBUG] WARNING: Token is missing scopes: {list(missing_scopes)}", flush=True)
                        else:
                            print(f"[DEBUG] ✓ Token has all required scopes", flush=True)
        
        except (ValueError, FileNotFoundError, json.JSONDecodeError) as e:
            print(f"[DEBUG] Error loading credentials: {e}", flush=True)
            raise ValueError(f"Failed to load credentials from {credentials_path}: {e}")
        
        # Log authentication identity and scopes before building service
        # Detect credential type and log appropriate information
        from google.oauth2.credentials import Credentials as OAuthCredentials
        
        authenticated_email = None
        if isinstance(credentials, service_account.Credentials):
            # Service account credentials
            authenticated_email = credentials.service_account_email
            print(f"[GTM DEBUG] Authenticated as service account: {authenticated_email}", flush=True)
        elif isinstance(credentials, OAuthCredentials):
            # User OAuth credentials - fetch email using OAuth2 v2 API
            try:
                oauth2_service = build("oauth2", "v2", credentials=credentials)
                userinfo = oauth2_service.userinfo().get().execute()
                email = userinfo.get("email")
                authenticated_email = email
                print(f"[GTM DEBUG] Authenticated as OAuth user: {email}", flush=True)
            except Exception as e:
                print(f"[GTM DEBUG] Failed to fetch userinfo email: {e}", flush=True)
        else:
            # Unknown credential type
            print(f"[GTM DEBUG] Unknown credential type: {type(credentials).__name__}", flush=True)
        
        # Log scopes in all cases
        if hasattr(credentials, 'scopes') and credentials.scopes:
            print(f"[GTM DEBUG] Active scopes: {credentials.scopes}", flush=True)
        else:
            print(f"[GTM DEBUG] Active scopes: Not available", flush=True)
        
        print(f"[DEBUG] Building GTM API service...", flush=True)
        service = build('tagmanager', 'v2', credentials=credentials)
        print(f"[DEBUG] Service built successfully", flush=True)
        
        # Store authenticated email for later use
        self._authenticated_user_email = authenticated_email
        
        # Identify the authenticated identity
        try:
            if hasattr(credentials, 'service_account_email'):
                # Service account
                identity_email = credentials.service_account_email
                identity_type = "Service Account"
                print(f"[DEBUG] Authenticated as: {identity_type} - {identity_email}", flush=True)
            elif hasattr(credentials, 'token') and hasattr(credentials, 'id_token'):
                # Try to decode the ID token to get email
                try:
                    import base64
                    import json as json_module
                    # Decode JWT token (format: header.payload.signature)
                    if credentials.id_token:
                        parts = credentials.id_token.split('.')
                        if len(parts) >= 2:
                            # Decode payload (add padding if needed)
                            payload = parts[1]
                            padding = len(payload) % 4
                            if padding:
                                payload += '=' * (4 - padding)
                            decoded = base64.urlsafe_b64decode(payload)
                            token_data = json_module.loads(decoded)
                            identity_email = token_data.get('email', 'Unknown')
                            identity_type = "OAuth User"
                            print(f"[DEBUG] Authenticated as: {identity_type} - {identity_email}", flush=True)
                        else:
                            print(f"[DEBUG] Authenticated as: OAuth User (email not available in token)", flush=True)
                    else:
                        print(f"[DEBUG] Authenticated as: OAuth User (no ID token available)", flush=True)
                except Exception as e:
                    print(f"[DEBUG] Authenticated as: OAuth User (could not decode email: {e})", flush=True)
            else:
                # Fallback: try to get from credentials object
                if hasattr(credentials, 'email'):
                    print(f"[DEBUG] Authenticated as: {credentials.email}", flush=True)
                else:
                    print(f"[DEBUG] Authenticated identity type: {type(credentials).__name__}", flush=True)
        except Exception as e:
            print(f"[DEBUG] Could not determine authenticated identity: {e}", flush=True)
        
        # Verify API is accessible by trying a simple call
        try:
            print(f"[DEBUG] Verifying API access by listing accounts...", flush=True)
            test_accounts = service.accounts().list().execute()
            print(f"[DEBUG] API verification successful - found {len(test_accounts.get('account', []))} account(s)", flush=True)
        except HttpError as e:
            if e.resp.status == 403:
                error_msg = str(e)
                if 'API not enabled' in error_msg or 'API_NOT_ENABLED' in error_msg:
                    print(f"[DEBUG] ERROR: Tag Manager API is not enabled", flush=True)
                else:
                    print(f"[DEBUG] WARNING: API access test failed with 403: {e}", flush=True)
                    print(f"[DEBUG] This might indicate OAuth consent screen issues or project mismatch", flush=True)
            else:
                print(f"[DEBUG] WARNING: API access test failed: {e}", flush=True)
        
        return service
    
    def _get_oauth_user_email(self, credentials, credentials_path: str) -> Optional[str]:
        """Get OAuth user email using multiple methods."""
        # Method 1: Try to get from id_token if available
        if hasattr(credentials, 'id_token') and credentials.id_token:
            try:
                import base64
                import json as json_module
                parts = credentials.id_token.split('.')
                if len(parts) >= 2:
                    payload = parts[1]
                    padding = len(payload) % 4
                    if padding:
                        payload += '=' * (4 - padding)
                    decoded = base64.urlsafe_b64decode(payload)
                    token_data = json_module.loads(decoded)
                    email = token_data.get('email')
                    if email:
                        return email
            except:
                pass
        
        # Method 2: Try to read from token.json file
        try:
            token_file = os.path.join(os.path.dirname(credentials_path), 'token.json')
            if os.path.exists(token_file):
                with open(token_file, 'r') as f:
                    token_data = json.load(f)
                    # Some token files have 'account' field with email
                    account = token_data.get('account', '')
                    if account:
                        return account
        except:
            pass
        
        # Method 3: Try to use Google userinfo API
        try:
            userinfo_service = build('oauth2', 'v2', credentials=credentials)
            user_info = userinfo_service.userinfo().get().execute()
            if user_info and user_info.get('email'):
                return user_info.get('email')
        except:
            pass
        
        return None
    
    def list_accounts(self) -> List[Dict]:
        """
        List all GTM accounts the user has access to.
        Returns list of account dicts with accountId and name fields.
        """
        try:
            accounts = self._api_call_with_retry(
                self.service.accounts().list()
            )
            if accounts:
                return accounts.get('account', [])
            return []
        except HttpError as e:
            print(f"ERROR: Failed to list accounts: {e}")
            return []
    
    def list_containers(self, account_id: Optional[str] = None) -> List[Dict]:
        """
        List all containers in the specified account (or self.account_id if not specified).
        Returns list of container dicts with containerId, name, and accountId fields.
        """
        target_account_id = account_id or self.account_id
        try:
            containers = self._api_call_with_retry(
                self.service.accounts().containers().list(
                parent=f'accounts/{target_account_id}'
                )
            )
            if containers:
                container_list = containers.get('container', [])
                # Add accountId to each container for tracking
                for container in container_list:
                    container['accountId'] = target_account_id
                return container_list
            return []
        except HttpError as e:
            print(f"ERROR: Failed to list containers for account {target_account_id}: {e}")
            return []
    
    def list_all_containers(self) -> List[Dict]:
        """
        List all containers from all accounts the user has access to.
        Returns list of container dicts with containerId, name, accountId, and accountName fields.
        """
        all_containers = []
        accounts = self.list_accounts()
        
        if not accounts:
            print("WARNING: No accounts found or failed to list accounts")
            return []
        
        print(f"Found {len(accounts)} account(s), listing containers from all accounts...")
        
        # Create account name map for quick lookup
        account_name_map = {acc.get('accountId', ''): acc.get('name', 'Unknown') for acc in accounts}
        
        for account in accounts:
            account_id = account.get('accountId', '')
            account_name = account.get('name', 'Unknown')
            print(f"  Listing containers from account: {account_name} ({account_id})")
            
            containers = self.list_containers(account_id)
            # Add account name to each container
            for container in containers:
                container['accountName'] = account_name
            all_containers.extend(containers)
            print(f"    Found {len(containers)} container(s) in account {account_id}")
        
        return all_containers
    
    def list_containers_for_account(self, account_id: str) -> List[Dict]:
        """
        List all containers for the given account and print them.
        This must be READ-ONLY: no workspaces, no versions, no updates.
        
        Args:
            account_id: Account ID to list containers for
            
        Returns:
            List of container dicts with containerId, name, and accountId fields
        """
        containers = self.list_containers(account_id)
        
        if not containers:
            print(f"Found 0 container(s) for account {account_id}")
            return []
        
        print(f"Found {len(containers)} container(s) for account {account_id}")
        print("Container list:")
        for container in containers:
            container_id = container.get('containerId', 'Unknown')
            container_name = container.get('name', 'Unknown')
            print(f"  - {container_id}: {container_name}")
        
        return containers
    
    def get_container(self, container_id: str, account_id: Optional[str] = None) -> Optional[Dict]:
        """Get container details including fingerprint, last update date, and permissions."""
        target_account_id = account_id or self.account_id
        try:
            container = self._api_call_with_retry(
                self.service.accounts().containers().get(
                    path=f'accounts/{target_account_id}/containers/{container_id}'
                )
            )
            return container
        except HttpError as e:
            # Return None for permission errors - let caller handle gracefully
            if e.resp.status in [403, 404]:
                return None
            print(f"ERROR: Failed to get container {container_id}: {e}")
            return None
    
    def get_container_metadata(self, container_id: str, account_id: Optional[str] = None) -> Optional[Dict]:
        """
        Get container metadata including permissions and last update date.
        
        Returns:
            Dict with:
            - containerId
            - name
            - accountId
            - lastUpdated (timestamp)
            - permissions (dict with canRead, canEdit, canPublish)
        """
        target_account_id = account_id or self.account_id
        metadata = {
            'containerId': container_id,
            'accountId': target_account_id,
        }
        
        # Get container details
        container = self.get_container(container_id, account_id=target_account_id)
        if not container:
            # No permission or container doesn't exist
            metadata['permissions'] = {
                'canRead': False,
                'canEdit': False,
                'canPublish': False,
            }
            return metadata
        
        metadata['name'] = container.get('name', '')
        metadata['lastUpdated'] = container.get('fingerprint', '')  # fingerprint changes on updates
        
        # Try to get workspace to check read permissions
        workspace_id = self.get_workspace(container_id, account_id=target_account_id)
        can_read = workspace_id is not None
        
        # Try to list tags to check read permissions
        can_edit = False
        can_publish = False
        
        if can_read and workspace_id:
            try:
                # Try to list tags (read permission)
                tags = self._api_call_with_retry(
                    self.service.accounts().containers().workspaces().tags().list(
                        parent=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
                    )
                )
                can_read = tags is not None
                
                # Try to get workspace to check edit permissions
                # If we can get workspace, we likely have edit permissions
                workspace = self._api_call_with_retry(
                    self.service.accounts().containers().workspaces().get(
                        path=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
                    )
                )
                can_edit = workspace is not None
                
                # Check publish permissions by trying to get container versions
                try:
                    versions = self._api_call_with_retry(
                        self.service.accounts().containers().versions().list(
                            parent=f'accounts/{target_account_id}/containers/{container_id}'
                        )
                    )
                    can_publish = versions is not None
                except:
                    can_publish = False
                    
            except HttpError as e:
                if e.resp.status in [403, 404]:
                    can_read = False
                    can_edit = False
                    can_publish = False
        
        metadata['permissions'] = {
            'canRead': can_read,
            'canEdit': can_edit,
            'canPublish': can_publish,
        }
        
        # Get last updated timestamp from container
        # Try to get the latest published version to find the last update date
        try:
            versions = self._api_call_with_retry(
                self.service.accounts().containers().versions().list(
                    parent=f'accounts/{target_account_id}/containers/{container_id}'
                )
            )
            if versions and versions.get('containerVersion'):
                # Get the latest version (first in list is usually the most recent)
                # But we should check for published versions or sort by date if available
                version_list = versions.get('containerVersion', [])
                if version_list:
                    # Try to find the most recent published version
                    # Versions are typically sorted with newest first, but let's verify
                    latest_version = None
                    for version in version_list:
                        # Check if this version is published (has a name with date)
                        version_name = version.get('name', '')
                        if version_name and ('Version' in version_name or '/' in version_name):
                            latest_version = version
                            break
                    
                    # If no version with name found, use the first one
                    if not latest_version:
                        latest_version = version_list[0]
                    
                    if latest_version:
                        # Try to extract date from version 'name' field first (e.g., "Version 47: 11/04/2025, 10:06 AM")
                        version_name = latest_version.get('name', '')
                        if version_name:
                            # Try to parse date from name like "Version 47: 11/04/2025, 10:06 AM"
                            import re
                            # Look for date patterns: MM/DD/YYYY or YYYY-MM-DD
                            date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', version_name)
                            if date_match:
                                date_str = date_match.group(1)
                                try:
                                    from datetime import datetime
                                    # Parse MM/DD/YYYY format
                                    last_updated_date = datetime.strptime(date_str, '%m/%d/%Y')
                                    metadata['lastUpdated'] = last_updated_date.strftime('%Y-%m-%d')
                                except:
                                    # If parsing fails, use the date string as-is
                                    metadata['lastUpdated'] = date_str
                            else:
                                # Try YYYY-MM-DD format
                                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', version_name)
                                if date_match:
                                    metadata['lastUpdated'] = date_match.group(1)
                                else:
                                    # Fallback: use the version name
                                    metadata['lastUpdated'] = version_name
                        else:
                            # If no name field, try containerVersionId
                            version_id = latest_version.get('containerVersionId', '')
                            
                            # Check if it's a Unix timestamp (milliseconds)
                            try:
                                # Try to parse as integer timestamp
                                if version_id and str(version_id).isdigit():
                                    timestamp_ms = int(version_id)
                                    # Check if it's a reasonable timestamp (after 2000-01-01)
                                    if timestamp_ms > 946684800000:  # 2000-01-01 in ms
                                        from datetime import datetime
                                        last_updated_date = datetime.fromtimestamp(timestamp_ms / 1000)
                                        metadata['lastUpdated'] = last_updated_date.strftime('%Y-%m-%d')
                                    else:
                                        # Might be a version ID in YYYYMMDDHHMMSS format
                                        if len(str(version_id)) >= 8:
                                            year = int(str(version_id)[:4])
                                            month = int(str(version_id)[4:6])
                                            day = int(str(version_id)[6:8])
                                            from datetime import datetime
                                            last_updated_date = datetime(year, month, day)
                                            metadata['lastUpdated'] = last_updated_date.strftime('%Y-%m-%d')
                                        else:
                                            metadata['lastUpdated'] = str(version_id)
                                else:
                                    # Try parsing as YYYYMMDDHHMMSS format
                                    if version_id and len(str(version_id)) >= 8:
                                        try:
                                            year = int(str(version_id)[:4])
                                            month = int(str(version_id)[4:6])
                                            day = int(str(version_id)[6:8])
                                            from datetime import datetime
                                            last_updated_date = datetime(year, month, day)
                                            metadata['lastUpdated'] = last_updated_date.strftime('%Y-%m-%d')
                                        except:
                                            metadata['lastUpdated'] = str(version_id) if version_id else 'Unknown'
                                    else:
                                        metadata['lastUpdated'] = str(version_id) if version_id else 'Unknown'
                            except:
                                metadata['lastUpdated'] = str(version_id) if version_id else 'Unknown'
        except:
            # Fallback to fingerprint if version lookup fails
            metadata['lastUpdated'] = container.get('fingerprint', 'Unknown')
        
        return metadata
    
    def _find_container_account(self, container_id: str) -> Optional[str]:
        """
        Search all accounts to find which account contains the given container ID.
        Returns the account ID if found, None otherwise.
        """
        try:
            print(f"  🔍 Searching all accounts for container {container_id}...")
            accounts = self.list_accounts()
            if not accounts:
                print(f"  ⚠️  Could not list accounts to search for container")
                return None
            
            for account in accounts:
                account_id = account.get('accountId', '')
                account_name = account.get('name', 'Unknown')
                try:
                    containers = self.list_containers(account_id)
                    for container in containers:
                        if container.get('containerId') == container_id:
                            print(f"  ✓ Found container {container_id} in account: {account_name} ({account_id})")
                            return account_id
                except Exception:
                    # Skip accounts where we can't list containers
                    continue
            
            print(f"  ⚠️  Container {container_id} not found in any accessible account")
            return None
        except Exception as e:
            print(f"  ⚠️  Error searching for container account: {e}")
            return None
    
    def get_workspace(self, container_id: str, account_id: Optional[str] = None) -> Optional[str]:
        """Get the default workspace ID for a container."""
        target_account_id = account_id or self.account_id
        try:
            workspaces = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().list(
                parent=f'accounts/{target_account_id}/containers/{container_id}'
                )
            )
            
            if workspaces:
                # Find default workspace (usually the first one or marked as default)
                workspace_list = workspaces.get('workspace', [])
                if workspace_list:
                    return workspace_list[0]['workspaceId']
                else:
                    print(f"  ⚠️  No workspaces found in container {container_id} (workspaces list is empty)")
                    return None
            else:
                print(f"  ⚠️  No workspaces response for container {container_id} (response is None or empty)")
                return None
        except HttpError as e:
            # Provide detailed diagnostics for permission errors
            try:
                content = e.content.decode("utf-8") if isinstance(e.content, bytes) else str(e.content)
            except Exception:
                content = str(e)
            status = getattr(e.resp, "status", "unknown")
            
            if e.resp.status == 403:
                print(f"  ❌ Permission denied (HTTP 403) when listing workspaces for container {container_id}")
                print(f"  ⚠️  This usually means:")
                print(f"      - You don't have 'View' or 'Edit' permission for this container")
                print(f"      - The OAuth token may need to be refreshed")
                print(f"      - The container may belong to a different account")
                print(f"  📋 Error details: {content}")
                print(f"  💡 TIP: Check your GTM permissions for container {container_id} in the GTM UI")
                return None
            elif e.resp.status == 404:
                print(f"  ❌ Container {container_id} not found in account {target_account_id} (HTTP 404)")
                print(f"  ⚠️  This usually means the container belongs to a different account")
                
                # Try to find which account the container actually belongs to
                actual_account_id = self._find_container_account(container_id)
                if actual_account_id:
                    print(f"  💡 SOLUTION: Container {container_id} belongs to account {actual_account_id}, not {target_account_id}")
                    print(f"  💡 Please use --account-id {actual_account_id} or update the account ID in your request")
                    # Try again with the correct account
                    try:
                        workspaces = self._api_call_with_retry(
                            self.service.accounts().containers().workspaces().list(
                            parent=f'accounts/{actual_account_id}/containers/{container_id}'
                            )
                        )
                        if workspaces:
                            workspace_list = workspaces.get('workspace', [])
                            if workspace_list:
                                print(f"  ✓ Successfully retrieved workspace using correct account {actual_account_id}")
                                return workspace_list[0]['workspaceId']
                    except Exception as retry_e:
                        print(f"  ⚠️  Could not retrieve workspace even with correct account: {retry_e}")
                else:
                    print(f"  ⚠️  Could not find container {container_id} in any accessible account")
                    print(f"  📋 Error details: {content}")
                    print(f"  💡 Please verify:")
                    print(f"      - The container ID is correct")
                    print(f"      - You have access to this container")
                    print(f"      - The container exists in GTM")
                return None
            else:
                print(f"  ❌ Failed to get workspace for container {container_id} (HTTP {status}): {content}")
                return None
        except Exception as e:
            print(f"  ❌ Unexpected error getting workspace for container {container_id}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_workspace(self, container_id: str, workspace_name: str, account_id: Optional[str] = None) -> Optional[str]:
        """
        Create a new workspace for a container.
        This isolates changes from other workspaces to prevent conflicts.
        
        Args:
            container_id: Container ID
            workspace_name: Name for the new workspace (e.g., "Tag Update - 3E_Pop-up - 2025-01-17")
            account_id: Optional account ID (if different from the initialized account)
        
        Returns:
            Workspace ID if successful, None otherwise
        """
        target_account_id = account_id or self.account_id
        try:
            workspace = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().create(
                    parent=f'accounts/{target_account_id}/containers/{container_id}',
                    body={'name': workspace_name}
                )
            )
            if workspace:
                workspace_id = workspace.get('workspaceId')
                if workspace_id:
                    print(f"  ✓ Created workspace: {workspace_name} (ID: {workspace_id})")
                    return workspace_id
            return None
        except HttpError as e:
            print(f"ERROR: Failed to create workspace for container {container_id}: {e}")
            return None
    
    def sync_workspace(self, container_id: str, workspace_id: str, account_id: Optional[str] = None) -> bool:
        """
        Sync a workspace with the latest published version.
        This updates all unmodified entities in the workspace to match the latest container version.
        
        Args:
            container_id: Container ID
            workspace_id: Workspace ID to sync
            account_id: Optional account ID (if different from the initialized account)
        
        Returns:
            True if successful, False otherwise
        """
        target_account_id = account_id or self.account_id
        workspace_path = f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
        try:
            self._api_call_with_retry(
                self.service.accounts().containers().workspaces().sync(
                    path=workspace_path
                )
            )
            print(f"  ✓ Synced workspace {workspace_id} with latest published version")
            return True
        except HttpError as e:
            try:
                content = e.content.decode("utf-8") if isinstance(e.content, bytes) else str(e.content)
            except Exception:
                content = str(e)
            status = getattr(e.resp, "status", "unknown")
            print(f"  ⚠️  Failed to sync workspace {workspace_id} (HTTP {status}): {content}")
            # Don't treat sync failure as a hard error - the publish was successful
            return False
        except Exception as e:
            print(f"  ⚠️  Unexpected error syncing workspace {workspace_id}: {e}")
            return False
    
    def delete_workspace(self, container_id: str, workspace_id: str, account_id: Optional[str] = None) -> bool:
        """
        Delete a workspace.
        
        Args:
            container_id: Container ID
            workspace_id: Workspace ID to delete
            account_id: Optional account ID (if different from the initialized account)
        
        Returns:
            True if successful, False otherwise
        """
        target_account_id = account_id or self.account_id
        try:
            self._api_call_with_retry(
                self.service.accounts().containers().workspaces().delete(
                    path=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
                )
            )
            print(f"  ✓ Deleted workspace: {workspace_id}")
            return True
        except HttpError as e:
            # If workspace doesn't exist (404) or already deleted, that's okay
            if e.resp.status == 404:
                print(f"  ℹ️  Workspace {workspace_id} already deleted or doesn't exist")
                return True
            # If permission denied (403), the token likely needs to be regenerated
            if e.resp.status == 403:
                print(f"  ⚠️  Permission denied when deleting workspace {workspace_id}")
                print(f"  ⚠️  This usually means the OAuth token needs to be regenerated with proper scopes")
                print(f"  ⚠️  Please delete the token.json file and re-run to re-authenticate")
                print(f"  ⚠️  Workspace {workspace_id} may need to be manually deleted in GTM")
                return False
            print(f"ERROR: Failed to delete workspace {workspace_id}: {e}")
            return False
    
    def find_tag(self, container_id: str, workspace_id: str, tag_name: str, account_id: Optional[str] = None) -> Optional[Dict]:
        """Find a tag by name in a workspace."""
        target_account_id = account_id or self.account_id
        try:
            tags = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().tags().list(
                parent=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
                )
            )
            
            if tags:
                tag_list = tags.get('tag', [])
                for tag in tag_list:
                    if tag.get('name') == tag_name:
                        return tag
            return None
        except HttpError as e:
            print(f"ERROR: Failed to find tag in container {container_id}: {e}")
            return None
    
    def update_tag(self, container_id: str, workspace_id: str, tag: Dict, new_content: str, account_id: Optional[str] = None) -> bool:
        """Update a tag's content."""
        target_account_id = account_id or self.account_id
        try:
            # Update the tag's HTML content
            # For Custom HTML tags, the content is in tag.parameter
            # Find the HTML parameter
            parameters = tag.get('parameter', [])
            html_param = None
            
            for param in parameters:
                if param.get('key') == 'html':
                    html_param = param
                    break
            
            if html_param:
                html_param['value'] = new_content
            else:
                # If no HTML parameter exists, add one
                # This assumes it's a Custom HTML tag
                parameters.append({
                    'type': 'template',
                    'key': 'html',
                    'value': new_content
                })
                tag['parameter'] = parameters
            
            # Update the tag
            updated_tag = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().tags().update(
                path=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}/tags/{tag["tagId"]}',
                body=tag
                )
            )
            
            return True
        except HttpError as e:
            print(f"ERROR: Failed to update tag: {e}")
            return False
    
    def create_version(self, container_id: str, workspace_id: str, account_id: Optional[str] = None, tag_name: Optional[str] = None) -> Optional[str]:
        """Create a container version from the given workspace and return its ID.

        Returns:
            containerVersionId as a string on success, or None on failure.
        """
        from typing import Optional
        from googleapiclient.errors import HttpError

        target_account_id = account_id or self.account_id
        workspace_path = f"accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}"
        name = f"Tag Update - {tag_name}" if tag_name else "Tag Update"
        notes = (
            f"Automated update for tag '{tag_name}' at {self._now_str()}"
            if tag_name
            else f"Automated update at {self._now_str()}"
        )

        body = {
            "name": name,
            "notes": notes,
        }

        print("[GTM DEBUG] Creating version:")
        print(f"    workspace_path: {workspace_path}")
        print("    HTTP POST")
        print(f"    body = {body}")

        try:
            # IMPORTANT: use 'path=' (not 'parent=') and go through _api_call_with_retry
            response = self._api_call_with_retry(
                self.service
                    .accounts()
                    .containers()
                    .workspaces()
                    .create_version(
                        path=workspace_path,
                        body=body,
                    )
            )
        except HttpError as e:
            # Real failure from the API
            try:
                content = e.content.decode("utf-8") if isinstance(e.content, bytes) else str(e.content)
            except Exception:
                content = str(e)
            status = getattr(e.resp, "status", "unknown")
            print(
                f"ERROR: Failed to create version for workspace {workspace_id} "
                f"(HTTP {status}): {content}"
            )
            return None
        except Exception as e:
            # Any other unexpected failure on our side
            print(f"ERROR: Unexpected error creating version for workspace {workspace_id}: {e}")
            return None

        if not response:
            print("WARNING: create_version returned no response object.")
            return None

        version = response.get("containerVersion", {})
        version_id = version.get("containerVersionId")

        print("[GTM DEBUG] create_version response:")
        print(f"    containerVersionId: {version_id}")
        print(f"    name: {version.get('name')!r}")
        print(f"    notes: {version.get('notes')!r}")

        if not version_id:
            # Still treat as success, but warn and let caller decide what to do
            print(
                "WARNING: create_version returned no containerVersionId. "
                "Version was likely created, but ID is missing from response."
            )
            return None

        print(f"[GTM DEBUG] Successfully created version {version_id} from workspace {workspace_id}")
        return version_id
    
    def publish_version(self, container_id: str, version_id: str, account_id: Optional[str] = None) -> bool:
        """
        Publish a specific container version.
        
        Args:
            container_id: Container ID
            version_id: Version ID to publish
            account_id: Optional account ID (if different from the initialized account)
        
        Returns:
            True if the publish API call succeeds (no exception raised), False otherwise.
        """
        from googleapiclient.errors import HttpError

        target_account_id = account_id or self.account_id
        path = f"accounts/{target_account_id}/containers/{container_id}/versions/{version_id}"
        print(f"\n[GTM DEBUG] Publishing version {version_id} for container {container_id}")
        print(f"[GTM DEBUG]   path: {path}")

        try:
            (
                self.service
                    .accounts()
                    .containers()
                    .versions()
                    .publish(path=path)
                    .execute()
            )
            # If we get here, the API call succeeded - treat as success
            print(f"[GTM DEBUG] Published version {version_id} for container {container_id}")
            return True
        except HttpError as e:
            try:
                content = e.content.decode("utf-8") if isinstance(e.content, bytes) else str(e.content)
            except Exception:
                content = str(e)
            status = getattr(e.resp, "status", "unknown")
            print(f"ERROR: Failed to publish version {version_id} for container {container_id} "
                  f"(HTTP {status}): {content}")
            return False
        except Exception as e:
            print(f"ERROR: Unexpected error publishing version {version_id} for container {container_id}: {e}")
            return False
    
    def list_versions(self, container_id: str) -> None:
        """
        List all container versions for a given container.
        """
        from googleapiclient.errors import HttpError

        parent = f"accounts/{self.account_id}/containers/{container_id}"
        print(f"\nContainer {container_id}:")

        try:
            versions = self._api_call_with_retry(
                self.service.accounts().containers().versions().list(
                    parent=parent
                )
            )
        except HttpError as e:
            # Show raw error to help debugging
            try:
                content = e.content.decode("utf-8") if isinstance(e.content, bytes) else str(e.content)
            except Exception:
                content = str(e)
            status = getattr(e.resp, "status", "unknown")
            print(f"  ERROR: Failed to list versions (HTTP {status}): {content}")
            return
        except Exception as e:
            print(f"  ERROR: Unexpected error listing versions for container {container_id}: {e}")
            return

        if not versions:
            print("  (no versions found)")
            return

        version_list = versions.get("containerVersion", [])
        if not version_list:
            print("  (no versions found)")
            return

        # Sort by numeric containerVersionId
        def _version_key(v):
            try:
                return int(v.get("containerVersionId", "0"))
            except Exception:
                return 0

        version_list = sorted(version_list, key=_version_key)

        for v in version_list:
            vid = v.get("containerVersionId", "(no id)")
            name = v.get("name") or "(no name)"
            notes = v.get("notes") or "(no notes)"
            print(f"  - ID: {vid}, name: {name}, notes: {notes}")
    
    def list_all_tags(self, container_id: str, workspace_id: str) -> List[str]:
        """List all tag names in a container."""
        try:
            tags = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().tags().list(
                    parent=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}'
                )
            )
            
            if tags:
                tag_list = tags.get('tag', [])
                return [tag.get('name', '') for tag in tag_list]
            return []
        except HttpError as e:
            return []
    
    def get_tags_in_container(self, container_id: str, filter_3e: bool = False, account_id: Optional[str] = None) -> List[Dict]:
        """
        Get all tags in a container with their details.
        
        Args:
            container_id: Container ID
            filter_3e: If True, only return tags with '3E' or 'Template' in the name
            account_id: Optional account ID (if different from the initialized account)
        
        Returns:
            List of tag dictionaries with tagId, name, and version (if available)
        """
        target_account_id = account_id or self.account_id
        try:
            workspace_id = self.get_workspace(container_id, account_id=target_account_id)
            if not workspace_id:
                # Return empty list silently - no workspace means no tags or no permission
                return []
            
            tags = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().tags().list(
                    parent=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
                )
            )
            
            if not tags:
                return []
            
            tag_list = tags.get('tag', [])
            result = []
            
            for tag in tag_list:
                tag_name = tag.get('name', '')
                
                # Filter for 3E tags if requested
                # If filter_3e is True, only show tags with '3E' or 'Template' in the name
                # If filter_3e is False, show all tags
                if filter_3e:
                    # Only include tags that have '3E' or 'Template' in the name
                    if '3E' not in tag_name and 'Template' not in tag_name:
                        continue  # Skip tags that don't have '3E' or 'Template'
                # If filter_3e is False, we don't enter the if block, so all tags are included
                
                # Extract version
                version = self.extract_version_from_tag(tag)
                
                result.append({
                    'tagId': tag.get('tagId', ''),
                    'tagName': tag_name,
                    'version': version,
                    'paused': tag.get('paused', False),  # Tag paused status
                })
            
            return result
        except HttpError as e:
            # Return empty list for permission errors - let caller handle gracefully
            if e.resp.status in [403, 404]:
                return []
            # Don't print errors - return empty list instead
            # The calling code can handle empty results
            return []
        except Exception as e:
            # Catch any other exceptions and return empty list
            return []
    
    def extract_version_from_tag(self, tag: Dict) -> Optional[str]:
        """Extract version from tag content."""
        try:
            parameters = tag.get('parameter', [])
            html_param = None
            
            for param in parameters:
                if param.get('key') == 'html':
                    html_param = param
                    break
            
            if html_param:
                html_content = html_param.get('value', '')
                # Look for version in comments
                version_match = re.search(r'//\s*Version:\s*([^\n]+)', html_content, re.IGNORECASE)
                if version_match:
                    return version_match.group(1).strip()
            return None
        except Exception:
            return None
    
    def extract_html_from_tag(self, tag: Dict) -> Optional[str]:
        """Extract HTML content from tag."""
        try:
            parameters = tag.get('parameter', [])
            for param in parameters:
                if param.get('key') == 'html':
                    return param.get('value', '')
            return None
        except Exception:
            return None
    
    def find_tag_in_container(
        self, 
        container_id: str, 
        tag_name: str,
        list_only: bool = False,
        verbose: bool = False
    ) -> Optional[Dict]:
        """Find a tag in a specific container (read-only operation)."""
        # Progress message is now printed by the caller
        
        # Get workspace
        workspace_id = self.get_workspace(container_id)
        if not workspace_id:
            print(f"  ❌ Could not get workspace for {container_id}")
            return None
        
        # Find tag
        tag = self.find_tag(container_id, workspace_id, tag_name)
        if not tag:
            print(f"  ⚠️  Tag '{tag_name}' not found in {container_id}")
            
            # If verbose, show all tags in this container
            if verbose:
                all_tags = self.list_all_tags(container_id, workspace_id)
                if all_tags:
                    # Check for similar tag names (case-insensitive, partial matches)
                    similar = [t for t in all_tags if tag_name.lower() in t.lower() or t.lower() in tag_name.lower()]
                    if similar:
                        print(f"  💡 Similar tag names found: {', '.join(similar)}")
                    print(f"  📋 All tags in container ({len(all_tags)} total):")
                    for t in sorted(all_tags):
                        print(f"      - {t}")
                else:
                    print(f"  📋 No tags found in this container")
            return None
        
        # Extract version
        version = self.extract_version_from_tag(tag)
        version_str = f" (Version: {version})" if version else ""
        
        print(f"  ✓ Found tag: {tag_name} (ID: {tag['tagId']}){version_str}")
        
        # Add version to tag dict for return
        if version:
            tag['_extracted_version'] = version
        
        return tag
    
    def update_tag_in_container(
        self, 
        container_id: str, 
        tag_name: str, 
        new_content: str, 
        publish: bool = True,
        dry_run: bool = False,
        account_id: Optional[str] = None
    ) -> bool:
        """
        Update a tag in a specific container.
        
        Creates a new workspace to isolate changes and prevent conflicts with other edits.
        After publishing, the workspace is automatically removed by GTM.
        If there's an error, the workspace is manually deleted to prevent leftovers.
        """
        print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing container: {container_id}")
        target_account_id = account_id or self.account_id
        workspace_id = None  # Track workspace ID for cleanup
        
        try:
            # Get default workspace first to find the tag (read-only operation)
            default_workspace_id = self.get_workspace(container_id, account_id=target_account_id)
            if not default_workspace_id:
                print(f"  ❌ Could not get default workspace for {container_id}")
                print(f"  ⚠️  Cannot proceed with tag update without workspace access")
                print(f"  💡 Please check:")
                print(f"      - Your GTM permissions for container {container_id}")
                print(f"      - That the container ID is correct")
                print(f"      - That you have at least 'View' permission for this container")
                return False
            
            # Find tag in default workspace (read-only)
            tag = self.find_tag(container_id, default_workspace_id, tag_name, account_id=target_account_id)
            if not tag:
                print(f"  ⚠️  Tag '{tag_name}' not found in {container_id}")
                return False
            
            print(f"  ✓ Found tag: {tag_name} (ID: {tag['tagId']})")
            
            if dry_run:
                print(f"  [DRY RUN] Would create new workspace and update tag content")
                return True
            
            # Create a new workspace for this update to isolate changes
            from datetime import datetime
            # Use format without colons (GTM doesn't allow colons in workspace names)
            workspace_name = f"Tag Update - {tag_name} - {datetime.now().strftime('%Y-%m-%d %H-%M-%S')}"
            workspace_id = self.create_workspace(container_id, workspace_name, account_id=target_account_id)
            if not workspace_id:
                print(f"  ❌ Failed to create workspace for {container_id}")
                return False
            
            # Find the tag in the new workspace (it should be copied from default workspace)
            # Note: When a workspace is created, it starts with a copy of the default workspace
            tag_in_workspace = self.find_tag(container_id, workspace_id, tag_name, account_id=target_account_id)
            if not tag_in_workspace:
                print(f"  ⚠️  Tag '{tag_name}' not found in new workspace (this shouldn't happen)")
                return False
            
            # Update tag in the new workspace
            if not self.update_tag(container_id, workspace_id, tag_in_workspace, new_content, account_id=target_account_id):
                print(f"  ❌ Failed to update tag")
                return False
            
            print(f"  ✓ Tag updated successfully in workspace")
            
            if publish:
                # Create version from the new workspace (include tag name for better traceability)
                version_id = self.create_version(container_id, workspace_id, account_id=target_account_id, tag_name=tag_name)
                
                if not version_id:
                    print(f"  ❌ Failed to create version")
                    # Check if it's a permission error and provide detailed help
                    try:
                        # Check what scopes the current token has
                        if hasattr(self.service._http, 'credentials') and hasattr(self.service._http.credentials, 'scopes'):
                            token_scopes = self.service._http.credentials.scopes or []
                            print(f"  ⚠️  Current token scopes: {token_scopes}")
                            required_set = set(self.SCOPES)
                            token_set = set(token_scopes)
                            missing = required_set - token_set
                            if missing:
                                print(f"  ⚠️  Missing scopes: {list(missing)}")
                            else:
                                print(f"  ⚠️  Token has all scopes, but API still rejecting. This usually means:")
                                print(f"      - Tag Manager API is not enabled in Google Cloud Console")
                                print(f"      - OAuth consent screen is not configured properly")
                                print(f"      - The OAuth client doesn't have Tag Manager API access")
                    except Exception as e:
                        print(f"  ⚠️  Could not check token scopes: {e}")
                    return False
                
                print(f"  ✓ Created version: {version_id}")
                
                # Publish version (workspace will be automatically removed after publishing)
                if not self.publish_version(container_id, version_id, account_id=target_account_id):
                    print(f"  ❌ Failed to publish version")
                    # Check if it's a permission error
                    try:
                        # Try to get workspace to see if we have access
                        workspace = self._api_call_with_retry(
                            self.service.accounts().containers().workspaces().get(
                                path=f'accounts/{target_account_id}/containers/{container_id}/workspaces/{workspace_id}'
                            )
                        )
                        if workspace:
                            print(f"  ⚠️  Permission error: OAuth token missing required scopes")
                            print(f"  ⚠️  Required scopes: {', '.join(self.SCOPES)}")
                            print(f"  ⚠️  Please delete token.json and re-authenticate")
                    except:
                        pass
                    return False
                
                print(f"  ✓ Version published successfully (workspace automatically removed)")
                # Workspace is automatically deleted by GTM after publishing, so clear our reference
                workspace_id = None
                
                # Sync the default workspace with the latest published version
                # This ensures the default workspace reflects the changes we just published
                default_workspace_id = self.get_workspace(container_id, account_id=target_account_id)
                if default_workspace_id:
                    print(f"  🔄 Syncing default workspace {default_workspace_id} with published version...")
                    self.sync_workspace(container_id, default_workspace_id, account_id=target_account_id)
                else:
                    print(f"  ⚠️  Could not get default workspace to sync (this is non-fatal)")
            else:
                # If not publishing, we need to manually delete the workspace
                # (though this shouldn't happen in normal operation)
                if workspace_id:
                    self.delete_workspace(container_id, workspace_id, account_id=target_account_id)
                    workspace_id = None
            
            return True
            
        except Exception as e:
            print(f"  ❌ Unexpected error during update: {e}")
            return False
            
        finally:
            # Always clean up workspace if it still exists (e.g., if publish failed or error occurred)
            if workspace_id:
                print(f"  🧹 Cleaning up workspace {workspace_id}...")
                self.delete_workspace(container_id, workspace_id, account_id=target_account_id)


def read_script_file(file_path: str) -> str:
    """Read script content from file."""
    script_path = Path(file_path)
    if not script_path.exists():
        raise FileNotFoundError(f"Script file not found: {file_path}")
    
    with open(script_path, 'r', encoding='utf-8') as f:
        return f.read()


def main():
    # Force output to be unbuffered by flushing immediately
    import sys
    try:
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)
    except:
        pass  # Python 3.9 might not have reconfigure
    
    print("[DEBUG] Script started", flush=True)
    print(f"[DEBUG] Python version: {sys.version}", flush=True)
    print(f"[DEBUG] Working directory: {os.getcwd()}", flush=True)
    
    parser = argparse.ArgumentParser(
        description='Update GTM tags across multiple containers',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run to see what would be updated
  python gtm_tag_updater.py --tag-name "3E_Pop-up" \\
    --script-file "Deployed/3E_Pop-up" \\
    --account-id "1234567" \\
    --credentials "credentials.json" \\
    --dry-run

  # Update specific containers
  python gtm_tag_updater.py --tag-name "3E_Pop-up" \\
    --script-file "Deployed/3E_Pop-up" \\
    --account-id "1234567" \\
    --credentials "credentials.json" \\
    --containers "GTM-XXXXX,GTM-YYYYY"

  # Update all containers with the tag
  python gtm_tag_updater.py --tag-name "3E_Pop-up" \\
    --script-file "Deployed/3E_Pop-up" \\
    --account-id "1234567" \\
    --credentials "credentials.json"
        """
    )
    
    parser.add_argument(
        '--tag-name',
        required=False,  # Not required if using --containers-only
        help='Name of the tag to update (e.g., "3E_Pop-up"). Not required with --containers-only.'
    )
    
    parser.add_argument(
        '--script-file',
        required=False,
        help='Path to the updated script file (relative to Tag Manager folder, e.g., "Deployed/3E_Pop-up"). Not required for --list-only mode.'
    )
    
    parser.add_argument(
        '--account-id',
        required=True,
        help='GTM Account ID (numeric, e.g., "1234567")'
    )
    
    parser.add_argument(
        '--credentials',
        required=True,
        help='Path to service account JSON or OAuth credentials file'
    )
    
    parser.add_argument(
        '--containers',
        help='Comma-separated list of container IDs to update (e.g., "GTM-XXXXX,GTM-YYYYY"). If not provided, updates all containers.'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without making changes'
    )
    
    parser.add_argument(
        '--no-publish',
        action='store_true',
        help='Update tags but do not publish versions (for testing)'
    )
    
    parser.add_argument(
        '--delay',
        type=float,
        default=1.1,
        help='Delay in seconds between API calls to avoid rate limiting (default: 1.1, minimum enforced: 1.1 for GTM API compliance)'
    )
    
    parser.add_argument(
        '--list-only',
        action='store_true',
        help='Only list containers and tags, do not attempt any updates (safer than dry-run)'
    )
    
    parser.add_argument(
        '--containers-only',
        action='store_true',
        help='Only list container IDs, do not search for tags (fastest mode, no tag processing)'
    )
    
    parser.add_argument(
        '--all-accounts',
        action='store_true',
        help='List containers from all accounts the user has access to (not just the specified account)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed information including all tags found in containers'
    )
    
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Verify mode: locate tag, fetch it, and print tag info without making changes'
    )
    
    parser.add_argument(
        '--list-versions',
        action='store_true',
        help='List all container versions for the specified container(s) and exit'
    )
    
    parser.add_argument(
        '--publish-version',
        type=str,
        help='Publish the specified container version ID for the specified container(s) and exit'
    )
    
    args = parser.parse_args()
    
    # Determine --all-accounts mode: discovery vs update
    is_all_accounts_discovery = (
        args.all_accounts and
        not args.tag_name and
        not args.script_file
    )
    
    is_all_accounts_update = (
        args.all_accounts and
        args.tag_name is not None and
        args.script_file is not None
    )
    
    # Helper: Determine if we're in a read-only mode that doesn't require tag-name or script-file
    # Note: --all-accounts in discovery mode is read-only, but in update mode it's not
    is_read_only_mode = (
        args.list_only or
        args.containers_only or
        args.verify or
        args.list_versions or
        args.publish_version or
        is_all_accounts_discovery  # Only discovery mode is read-only
    )
    
    # Validate arguments
    if args.containers_only:
        # Containers-only mode doesn't need tag-name or script-file
        pass
    elif args.list_versions:
        # List-versions mode requires containers but not tag-name or script-file
        if not args.containers:
            print("ERROR: --containers is required when using --list-versions mode")
            sys.exit(1)
    elif args.publish_version:
        # Publish-version mode requires containers but not tag-name or script-file
        if not args.containers:
            print("ERROR: --containers is required when using --publish-version mode")
            sys.exit(1)
        # For now, only support a single container ID
        container_list = [c.strip() for c in args.containers.split(',')]
        if len(container_list) > 1:
            print("ERROR: --publish-version currently only supports a single container ID")
            sys.exit(1)
    # For update mode (NOT read-only), require both tag-name and script-file
    # This includes multi-account update mode (is_all_accounts_update)
    if not is_read_only_mode:
        if not args.tag_name:
            print("ERROR: --tag-name is required for update mode")
            sys.exit(1)
        if not args.script_file:
            print("ERROR: --script-file is required for update mode")
            sys.exit(1)
    
    # If in read-only mode, script file is optional
    script_content = None
    if not is_read_only_mode:
        # Read script content - handle relative paths from Tag Manager folder
        if not args.script_file:
            print("ERROR: --script-file is required for update mode")
            sys.exit(1)
        
        script_file = args.script_file
        if not Path(script_file).is_absolute():
            # If relative, assume it's relative to the Tag Manager folder
            script_dir = Path(__file__).parent
            script_file = script_dir / script_file
        
        try:
            script_content = read_script_file(str(script_file))
            print(f"✓ Loaded script from: {script_file}")
            print(f"  Content length: {len(script_content)} characters")
        except FileNotFoundError as e:
            print(f"ERROR: {e}")
            sys.exit(1)
    
    # Initialize updater
    print(f"[DEBUG] Initializing GTMTagUpdater with credentials: {args.credentials}, account: {args.account_id}", flush=True)
    try:
        updater = GTMTagUpdater(args.credentials, args.account_id, delay=args.delay)
        print("[DEBUG] GTMTagUpdater initialized successfully", flush=True)
    except Exception as e:
        print(f"ERROR: Failed to initialize GTM service: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # Determine --all-accounts mode: discovery vs update (re-evaluate after initialization)
    # Note: --containers-only mode should NOT trigger discovery mode - it has its own handling
    is_all_accounts_discovery = (
        args.all_accounts and
        not args.tag_name and
        not args.script_file and
        not args.containers_only  # Exclude containers-only mode from discovery
    )
    
    is_all_accounts_update = (
        args.all_accounts and
        args.tag_name is not None and
        args.script_file is not None
    )
    
    # Handle discovery mode (read-only, just list containers)
    # This is for --all-accounts WITHOUT --containers-only
    if is_all_accounts_discovery:
        containers = updater.list_containers_for_account(args.account_id)
        print(f"\n{'='*60}")
        print(f"Discovery complete: Found {len(containers)} container(s) for account {args.account_id}")
        print(f"{'='*60}")
        sys.exit(0)
    
    # Handle list-versions mode
    if args.list_versions:
        if not args.containers:
            print("ERROR: --containers is required when using --list-versions mode")
            sys.exit(1)
        
        # Parse container IDs
        container_ids = [c.strip() for c in args.containers.split(',')]
        # Extract container ID from GTM-XXXXX format if needed
        container_ids = [c.replace('GTM-', '') if c.startswith('GTM-') else c for c in container_ids]
        
        print(f"\n[Listing versions for {len(container_ids)} container(s)...]\n")
        
        for container_id in container_ids:
            updater.list_versions(container_id)
        
        print(f"\n{'='*60}")
        print(f"Listed versions for {len(container_ids)} container(s)")
        print(f"{'='*60}")
        sys.exit(0)
    
    # Handle publish-version mode
    if args.publish_version:
        if not args.containers:
            print("ERROR: --containers is required when using --publish-version mode")
            sys.exit(1)
        
        # Parse container IDs (only one allowed)
        container_ids = [c.strip() for c in args.containers.split(',')]
        # Extract container ID from GTM-XXXXX format if needed
        container_ids = [c.replace('GTM-', '') if c.startswith('GTM-') else c for c in container_ids]
        
        if len(container_ids) > 1:
            print("ERROR: --publish-version currently only supports a single container ID")
            sys.exit(1)
        
        container_id = container_ids[0]
        version_id = args.publish_version
        
        print(f"\n[Publishing version {version_id} for container {container_id}...]\n")
        
        success = updater.publish_version(container_id, version_id)
        
        if success:
            print(f"\n{'='*60}")
            print(f"✓ Successfully published version {version_id} for container {container_id}")
            print(f"{'='*60}")
            sys.exit(0)
        else:
            print(f"\n{'='*60}")
            print(f"❌ Failed to publish version {version_id} for container {container_id}")
            print(f"{'='*60}")
            sys.exit(1)
    
    # Get containers to update
    if args.containers:
        # Use specified containers
        container_ids = [c.strip() for c in args.containers.split(',')]
        # Extract container ID from GTM-XXXXX format if needed
        container_ids = [c.replace('GTM-', '') if c.startswith('GTM-') else c for c in container_ids]
        containers = None  # We don't have full container objects when using --containers
    else:
        # Get all containers
        print("\nFetching all containers...")
        # For containers-only mode with --all-accounts, use list_all_containers()
        if args.containers_only and args.all_accounts:
            # Containers-only mode with all accounts: list from all accounts
            containers = updater.list_all_containers()
        elif is_all_accounts_update:
            # Multi-account update mode: list containers from all accounts
            containers = updater.list_all_containers()
        else:
            # Single account mode: list containers from the specified account
            containers = updater.list_containers()
            # Get account name for single account mode
            accounts = updater.list_accounts()
            account_name_map = {acc.get('accountId', ''): acc.get('name', 'Unknown') for acc in accounts}
            account_name = account_name_map.get(args.account_id, 'Unknown')
            # Add account name to each container
            for container in containers:
                container['accountName'] = account_name
        if not containers:
            print("ERROR: No containers found or failed to list containers")
            sys.exit(1)
        
        container_ids = [c['containerId'] for c in containers]
        print(f"Found {len(container_ids)} container(s)")
    
    # List containers only (no tag processing)
    if args.containers_only:
        print(f"\n[CONTAINERS ONLY] Listing {len(container_ids)} container(s)...")
        print("⚠️  CONTAINERS-ONLY MODE: Only listing container IDs and names, no tag processing.\n")
        
        # Create maps for container info from the original containers list
        container_name_map = {}
        container_account_map = {}
        container_account_name_map = {}
        if containers:
            for c in containers:
                container_id = c.get('containerId', '')
                container_name_map[container_id] = c.get('name', '')
                container_account_map[container_id] = c.get('accountId', '')
                container_account_name_map[container_id] = c.get('accountName', '')
        
        # Print container IDs, names, account IDs, and account names
        for container_id in container_ids:
            container_name = container_name_map.get(container_id, '')
            account_id = container_account_map.get(container_id, '')
            account_name = container_account_name_map.get(container_id, '')
            if container_name and account_id and account_name:
                print(f"Container ID: {container_id} | Name: {container_name} | Account: {account_id} | Account Name: {account_name}")
            elif container_name and account_id:
                print(f"Container ID: {container_id} | Name: {container_name} | Account: {account_id}")
            elif container_name:
                print(f"Container ID: {container_id} | Name: {container_name}")
            elif account_id:
                print(f"Container ID: {container_id} | Account: {account_id}")
            else:
                print(f"Container ID: {container_id}")
        
        print(f"\n{'='*60}")
        print(f"Total containers: {len(container_ids)}")
        print(f"{'='*60}")
    
    # List or update tags
    elif args.list_only:
        print(f"\n[LIST ONLY] Searching for tag '{args.tag_name}' in {len(container_ids)} container(s)...")
        print("⚠️  LIST-ONLY MODE: No changes will be made, only searching for tags.\n")
        
        found_count = 0
        not_found_count = 0
        error_count = 0
        total_containers = len(container_ids)
        
        for idx, container_id in enumerate(container_ids, 1):
            print(f"\n[{idx}/{total_containers}] Processing container: {container_id}")
            tag = updater.find_tag_in_container(
                container_id,
                args.tag_name,
                list_only=True,
                verbose=args.verbose
            )
            
            if tag:
                found_count += 1
            elif tag is None:
                # Tag not found (not an error, just doesn't exist)
                not_found_count += 1
            else:
                # Error occurred
                error_count += 1
        
        # Summary
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  ✓ Found: {found_count}")
        print(f"  ⚠️  Not Found: {not_found_count}")
        print(f"  ❌ Errors: {error_count}")
        print(f"{'='*60}")
        
        if error_count > 0:
            sys.exit(1)
    elif args.verify:
        # Verify mode: locate tag, fetch it, and print info without making changes
        print(f"\n[VERIFY MODE] Verifying tag '{args.tag_name}' in {len(container_ids)} container(s)...")
        print("⚠️  VERIFY MODE: Only locating and displaying tag info, no changes will be made.\n")
        
        found_count = 0
        not_found_count = 0
        error_count = 0
        total_containers = len(container_ids)
        
        for idx, container_id in enumerate(container_ids, 1):
            print(f"\n[{idx}/{total_containers}] Processing container: {container_id}")
            
            # Get account_id for this container if we have container objects
            container_account_id = None
            if containers:
                container_obj = next((c for c in containers if c.get('containerId') == container_id), None)
                if container_obj:
                    container_account_id = container_obj.get('accountId')
            
            try:
                # Get default workspace (read-only, no new workspace created)
                workspace_id = updater.get_workspace(container_id, account_id=container_account_id)
                if not workspace_id:
                    print(f"  ❌ Could not get workspace for {container_id}")
                    error_count += 1
                    continue
                
                # Find tag in default workspace (read-only)
                tag = updater.find_tag(container_id, workspace_id, args.tag_name, account_id=container_account_id)
                if not tag:
                    print(f"  ⚠️  Tag '{args.tag_name}' not found in {container_id}")
                    not_found_count += 1
                    continue
                
                # Extract tag info
                tag_id = tag.get('tagId', 'Unknown')
                html_content = updater.extract_html_from_tag(tag)
                
                # Print tag info
                print(f"  ✓ Tag found")
                print(f"  Tag ID: {tag_id}")
                if html_content:
                    html_preview = html_content[:300]
                    print(f"  First 300 characters of HTML:")
                    print(f"  {html_preview}")
                    if len(html_content) > 300:
                        print(f"  ... (truncated, total length: {len(html_content)} characters)")
                else:
                    print(f"  HTML content: Not available (tag may not have HTML parameter)")
                
                found_count += 1
                
            except Exception as e:
                print(f"  ❌ Error processing container {container_id}: {e}")
                error_count += 1
        
        # Summary
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  ✓ Found: {found_count}")
        print(f"  ⚠️  Not Found: {not_found_count}")
        print(f"  ❌ Errors: {error_count}")
        print(f"{'='*60}")
        
        if error_count > 0:
            sys.exit(1)
    else:
        # Update tags
        print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Updating tag '{args.tag_name}' in {len(container_ids)} container(s)...")
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        for container_id in container_ids:
            # Get account_id for this container if we have container objects
            container_account_id = None
            if containers:
                container_obj = next((c for c in containers if c.get('containerId') == container_id), None)
                if container_obj:
                    container_account_id = container_obj.get('accountId')
            
            result = updater.update_tag_in_container(
                container_id,
                args.tag_name,
                script_content,
                publish=not args.no_publish,
                dry_run=args.dry_run,
                account_id=container_account_id
            )
            
            if result:
                success_count += 1
            else:
                failed_count += 1
        
        # Summary for update mode
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  ✓ Success: {success_count}")
        print(f"  ❌ Failed: {failed_count}")
        print(f"  ⚠️  Skipped: {skipped_count}")
        print(f"{'='*60}")
        
        if failed_count > 0:
            sys.exit(1)


if __name__ == '__main__':
    main()

