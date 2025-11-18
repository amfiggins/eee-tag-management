#!/usr/bin/env python3
"""
GTM Tag Updater Script
Updates a specific tag across multiple Google Tag Manager containers.

    Author: Anthony Figgins
    Version: 1.0.7
    Date Updated: 2025-11-17

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

# Suppress Python version warnings from Google API
warnings.filterwarnings('ignore', category=FutureWarning, module='google.api_core')

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Install with: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
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
    
    SCOPES = ['https://www.googleapis.com/auth/tagmanager.edit.containers']
    
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
        self.rate_limiter = GTMRateLimiter()  # Use proper rate limiter
        self.service = self._build_service(credentials_path)
    
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
                    credentials = OAuthCredentials.from_authorized_user_file(token_file, self.SCOPES)
                    print(f"[DEBUG] Loaded credentials from token file, valid: {credentials.valid if credentials else 'None'}", flush=True)
                else:
                    print(f"[DEBUG] No token file found at {token_file}", flush=True)
                
                # If no valid credentials, get new ones
                if not credentials or not credentials.valid:
                    if credentials and credentials.expired and credentials.refresh_token:
                        print(f"[DEBUG] Token expired, attempting refresh...", flush=True)
                        credentials.refresh(Request())
                        print(f"[DEBUG] Token refreshed successfully", flush=True)
                    else:
                        print(f"[DEBUG] No valid credentials, starting OAuth flow...", flush=True)
                        print(f"[DEBUG] WARNING: This will try to open a browser. In headless environments, this will hang!", flush=True)
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
        
        except (ValueError, FileNotFoundError, json.JSONDecodeError) as e:
            print(f"[DEBUG] Error loading credentials: {e}", flush=True)
            raise ValueError(f"Failed to load credentials from {credentials_path}: {e}")
        
        print(f"[DEBUG] Building GTM API service...", flush=True)
        service = build('tagmanager', 'v2', credentials=credentials)
        print(f"[DEBUG] Service built successfully", flush=True)
        return service
    
    def list_containers(self) -> List[Dict]:
        """
        List all containers in the account.
        Returns list of container dicts with containerId and name fields.
        """
        try:
            containers = self._api_call_with_retry(
                self.service.accounts().containers().list(
                parent=f'accounts/{self.account_id}'
                )
            )
            if containers:
                return containers.get('container', [])
            return []
        except HttpError as e:
            print(f"ERROR: Failed to list containers: {e}")
            return []
    
    def get_container(self, container_id: str) -> Optional[Dict]:
        """Get container details including fingerprint for change detection."""
        try:
            container = self._api_call_with_retry(
                self.service.accounts().containers().get(
                    path=f'accounts/{self.account_id}/containers/{container_id}'
                )
            )
            return container
        except HttpError as e:
            print(f"ERROR: Failed to get container {container_id}: {e}")
            return None
    
    def get_workspace(self, container_id: str) -> Optional[str]:
        """Get the default workspace ID for a container."""
        try:
            workspaces = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().list(
                parent=f'accounts/{self.account_id}/containers/{container_id}'
                )
            )
            
            if workspaces:
                # Find default workspace (usually the first one or marked as default)
                workspace_list = workspaces.get('workspace', [])
                if workspace_list:
                    return workspace_list[0]['workspaceId']
            return None
        except HttpError as e:
            print(f"ERROR: Failed to get workspace for container {container_id}: {e}")
            return None
    
    def find_tag(self, container_id: str, workspace_id: str, tag_name: str) -> Optional[Dict]:
        """Find a tag by name in a workspace."""
        try:
            tags = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().tags().list(
                parent=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}'
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
    
    def update_tag(self, container_id: str, workspace_id: str, tag: Dict, new_content: str) -> bool:
        """Update a tag's content."""
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
                path=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}/tags/{tag["tagId"]}',
                body=tag
                )
            )
            
            return True
        except HttpError as e:
            print(f"ERROR: Failed to update tag: {e}")
            return False
    
    def create_version(self, container_id: str, workspace_id: str) -> Optional[str]:
        """Create a new container version from workspace."""
        try:
            version = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().create_version(
                path=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}'
                )
            )
            if version:
                return version.get('containerVersionId')
            return None
        except HttpError as e:
            print(f"ERROR: Failed to create version: {e}")
            return None
    
    def publish_version(self, container_id: str, version_id: str) -> bool:
        """Publish a container version."""
        try:
            self._api_call_with_retry(
            self.service.accounts().containers().versions().publish(
                path=f'accounts/{self.account_id}/containers/{container_id}/versions/{version_id}'
                )
            )
            return True
        except HttpError as e:
            print(f"ERROR: Failed to publish version: {e}")
            return False
    
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
    
    def get_tags_in_container(self, container_id: str, filter_3e: bool = False) -> List[Dict]:
        """
        Get all tags in a container with their details.
        
        Args:
            container_id: Container ID
            filter_3e: If True, only return tags with '3E' or 'Template' in the name
        
        Returns:
            List of tag dictionaries with tagId, name, and version (if available)
        """
        try:
            workspace_id = self.get_workspace(container_id)
            if not workspace_id:
                # Return empty list silently - no workspace means no tags
                return []
            
            tags = self._api_call_with_retry(
                self.service.accounts().containers().workspaces().tags().list(
                    parent=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}'
                )
            )
            
            if not tags:
                return []
            
            tag_list = tags.get('tag', [])
            result = []
            
            for tag in tag_list:
                tag_name = tag.get('name', '')
                
                # Filter for 3E tags if requested
                if filter_3e and '3E' not in tag_name and 'Template' not in tag_name:
                    continue
                
                # Extract version
                version = self.extract_version_from_tag(tag)
                
                result.append({
                    'tagId': tag.get('tagId', ''),
                    'tagName': tag_name,
                    'version': version,
                })
            
            return result
        except HttpError as e:
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
        dry_run: bool = False
    ) -> bool:
        """Update a tag in a specific container."""
        print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing container: {container_id}")
        
        # Get workspace
        workspace_id = self.get_workspace(container_id)
        if not workspace_id:
            print(f"  ❌ Could not get workspace for {container_id}")
            return False
        
        # Find tag
        tag = self.find_tag(container_id, workspace_id, tag_name)
        if not tag:
            print(f"  ⚠️  Tag '{tag_name}' not found in {container_id}")
            return False
        
        print(f"  ✓ Found tag: {tag_name} (ID: {tag['tagId']})")
        
        if dry_run:
            print(f"  [DRY RUN] Would update tag content")
            return True
        
        # Update tag
        if not self.update_tag(container_id, workspace_id, tag, new_content):
            print(f"  ❌ Failed to update tag")
            return False
        
        print(f"  ✓ Tag updated successfully")
        
        if publish:
            # Create version
            version_id = self.create_version(container_id, workspace_id)
            if not version_id:
                print(f"  ❌ Failed to create version")
                return False
            
            print(f"  ✓ Created version: {version_id}")
            
            # Publish version
            if not self.publish_version(container_id, version_id):
                print(f"  ❌ Failed to publish version")
                return False
            
            print(f"  ✓ Version published successfully")
        
        return True


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
        '--verbose',
        action='store_true',
        help='Show detailed information including all tags found in containers'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.containers_only:
        # Containers-only mode doesn't need tag-name or script-file
        pass
    elif not args.list_only and not args.script_file:
        print("ERROR: --script-file is required unless using --list-only or --containers-only mode")
        sys.exit(1)
    elif args.list_only and not args.tag_name:
        print("ERROR: --tag-name is required when using --list-only mode")
        sys.exit(1)
    elif not args.containers_only and not args.list_only and not args.tag_name:
        print("ERROR: --tag-name is required for update mode")
        sys.exit(1)
    
    # If list-only or containers-only mode, script file is optional
    script_content = None
    if not args.list_only and not args.containers_only:
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
    
    # Get containers to update
    if args.containers:
        # Use specified containers
        container_ids = [c.strip() for c in args.containers.split(',')]
        # Extract container ID from GTM-XXXXX format if needed
        container_ids = [c.replace('GTM-', '') if c.startswith('GTM-') else c for c in container_ids]
    else:
        # Get all containers
        print("\nFetching all containers...")
        containers = updater.list_containers()
        if not containers:
            print("ERROR: No containers found or failed to list containers")
            sys.exit(1)
        
        container_ids = [c['containerId'] for c in containers]
        print(f"Found {len(container_ids)} container(s)")
    
    # List containers only (no tag processing)
    if args.containers_only:
        print(f"\n[CONTAINERS ONLY] Listing {len(container_ids)} container(s)...")
        print("⚠️  CONTAINERS-ONLY MODE: Only listing container IDs and names, no tag processing.\n")
        
        # Create a map of container_id -> name from the original containers list
        # (list_containers already returns names, so we don't need extra API calls)
        container_name_map = {}
        if containers:
            for c in containers:
                container_name_map[c.get('containerId', '')] = c.get('name', '')
        
        # Print container IDs and names (names already available from list_containers)
        for container_id in container_ids:
            container_name = container_name_map.get(container_id, '')
            if container_name:
                print(f"Container ID: {container_id} | Name: {container_name}")
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
    else:
        # Update tags
        print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Updating tag '{args.tag_name}' in {len(container_ids)} container(s)...")
        
        success_count = 0
        failed_count = 0
        skipped_count = 0
        
        for container_id in container_ids:
            result = updater.update_tag_in_container(
                container_id,
                args.tag_name,
                script_content,
                publish=not args.no_publish,
                dry_run=args.dry_run
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

