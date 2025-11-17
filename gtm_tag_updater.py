#!/usr/bin/env python3
"""
GTM Tag Updater Script
Updates a specific tag across multiple Google Tag Manager containers.

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
import sys
from pathlib import Path
from typing import List, Dict, Optional

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    print("ERROR: Required packages not installed.")
    print("Install with: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")
    sys.exit(1)


class GTMTagUpdater:
    """Manages GTM tag updates across multiple containers."""
    
    SCOPES = ['https://www.googleapis.com/auth/tagmanager.edit.containers']
    
    def __init__(self, credentials_path: str, account_id: str):
        """
        Initialize GTM Tag Updater.
        
        Args:
            credentials_path: Path to service account JSON or OAuth credentials
            account_id: GTM Account ID (e.g., '1234567')
        """
        self.account_id = account_id
        self.service = self._build_service(credentials_path)
        
    def _build_service(self, credentials_path: str):
        """Build and return GTM API service."""
        try:
            # Try service account first
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path, scopes=self.SCOPES
            )
        except (ValueError, FileNotFoundError):
            # Fall back to OAuth flow if service account doesn't work
            from google_auth_oauthlib.flow import InstalledAppFlow
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path, self.SCOPES
            )
            credentials = flow.run_local_server(port=0)
        
        return build('tagmanager', 'v2', credentials=credentials)
    
    def list_containers(self) -> List[Dict]:
        """List all containers in the account."""
        try:
            containers = self.service.accounts().containers().list(
                parent=f'accounts/{self.account_id}'
            ).execute()
            return containers.get('container', [])
        except HttpError as e:
            print(f"ERROR: Failed to list containers: {e}")
            return []
    
    def get_workspace(self, container_id: str) -> Optional[str]:
        """Get the default workspace ID for a container."""
        try:
            workspaces = self.service.accounts().containers().workspaces().list(
                parent=f'accounts/{self.account_id}/containers/{container_id}'
            ).execute()
            
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
            tags = self.service.accounts().containers().workspaces().tags().list(
                parent=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}'
            ).execute()
            
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
            updated_tag = self.service.accounts().containers().workspaces().tags().update(
                path=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}/tags/{tag["tagId"]}',
                body=tag
            ).execute()
            
            return True
        except HttpError as e:
            print(f"ERROR: Failed to update tag: {e}")
            return False
    
    def create_version(self, container_id: str, workspace_id: str) -> Optional[str]:
        """Create a new container version from workspace."""
        try:
            version = self.service.accounts().containers().workspaces().create_version(
                path=f'accounts/{self.account_id}/containers/{container_id}/workspaces/{workspace_id}'
            ).execute()
            return version.get('containerVersionId')
        except HttpError as e:
            print(f"ERROR: Failed to create version: {e}")
            return None
    
    def publish_version(self, container_id: str, version_id: str) -> bool:
        """Publish a container version."""
        try:
            self.service.accounts().containers().versions().publish(
                path=f'accounts/{self.account_id}/containers/{container_id}/versions/{version_id}'
            ).execute()
            return True
        except HttpError as e:
            print(f"ERROR: Failed to publish version: {e}")
            return False
    
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
        required=True,
        help='Name of the tag to update (e.g., "3E_Pop-up")'
    )
    
    parser.add_argument(
        '--script-file',
        required=True,
        help='Path to the updated script file (relative to Tag Manager folder, e.g., "Deployed/3E_Pop-up")'
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
    
    args = parser.parse_args()
    
    # Read script content - handle relative paths from Tag Manager folder
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
    try:
        updater = GTMTagUpdater(args.credentials, args.account_id)
    except Exception as e:
        print(f"ERROR: Failed to initialize GTM service: {e}")
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
    
    # Summary
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

