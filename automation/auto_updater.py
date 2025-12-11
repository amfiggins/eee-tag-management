#!/usr/bin/env python3
"""
Auto-Updater Module for GTM Tag Management
Handles version checking and automatic updates from S3/CloudFront

Author: Anthony Figgins
Version: 1.0.0
Date Updated: 2025-01-20
"""

import os
import sys
import json
import hashlib
import zipfile
import shutil
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, Tuple
from datetime import datetime

# Version manifest URL - can be overridden via environment variable
DEFAULT_MANIFEST_URL = os.getenv(
    'GTM_UPDATE_MANIFEST_URL',
    'https://d1234567890.cloudfront.net/manifests/latest.json'  # Replace with actual CloudFront URL
)

# Update check timeout (seconds)
UPDATE_CHECK_TIMEOUT = 10

# Files/directories to preserve during updates
PRESERVE_PATTERNS = [
    'automation/gtm-oauth-credentials.json',
    'automation/token.json',
    '.cache/',
    '.env',
    'node_modules/',  # Preserve to avoid re-downloading
]


class AutoUpdater:
    """Handles automatic updates for the GTM Tag Management tool."""
    
    def __init__(self, repo_root: Path, manifest_url: str = None):
        """
        Initialize the auto-updater.
        
        Args:
            repo_root: Root directory of the repository
            manifest_url: URL to version manifest (optional, uses env var or default)
        """
        self.repo_root = Path(repo_root).resolve()
        self.manifest_url = manifest_url or DEFAULT_MANIFEST_URL
        self.version_file = self.repo_root / 'VERSION'
        self.manifest_cache = self.repo_root / '.cache' / 'update_manifest.json'
        
    def get_current_version(self) -> Optional[str]:
        """Get the current installed version."""
        # Try VERSION file first
        if self.version_file.exists():
            try:
                with open(self.version_file, 'r') as f:
                    version = f.read().strip()
                    if version:
                        return version
            except Exception:
                pass
        
        # Try package.json (for web interface version)
        package_json = self.repo_root / 'web' / 'package.json'
        if package_json.exists():
            try:
                with open(package_json, 'r') as f:
                    data = json.load(f)
                    version = data.get('version')
                    if version:
                        return version
            except Exception:
                pass
        
        # Try start-web.py version comment
        start_web = self.repo_root / 'start-web.py'
        if start_web.exists():
            try:
                with open(start_web, 'r') as f:
                    for line in f:
                        if 'Version:' in line:
                            parts = line.split('Version:')
                            if len(parts) > 1:
                                version = parts[1].strip().split()[0]
                                return version
            except Exception:
                pass
        
        return None
    
    def fetch_manifest(self, use_cache: bool = True) -> Optional[Dict]:
        """
        Fetch the version manifest from the remote URL.
        
        Args:
            use_cache: If True, use cached manifest if available and recent (< 1 hour)
        
        Returns:
            Manifest dictionary or None if fetch fails
        """
        # Check cache first
        if use_cache and self.manifest_cache.exists():
            try:
                cache_age = datetime.now().timestamp() - self.manifest_cache.stat().st_mtime
                if cache_age < 3600:  # Cache valid for 1 hour
                    with open(self.manifest_cache, 'r') as f:
                        return json.load(f)
            except Exception:
                pass
        
        # Fetch from remote
        try:
            print(f"  Checking for updates from: {self.manifest_url}")
            req = urllib.request.Request(
                self.manifest_url,
                headers={'User-Agent': 'GTM-Tag-Management-AutoUpdater/1.0'}
            )
            
            with urllib.request.urlopen(req, timeout=UPDATE_CHECK_TIMEOUT) as response:
                manifest = json.loads(response.read().decode('utf-8'))
                
                # Cache the manifest
                self.manifest_cache.parent.mkdir(parents=True, exist_ok=True)
                with open(self.manifest_cache, 'w') as f:
                    json.dump(manifest, f, indent=2)
                
                return manifest
        except urllib.error.URLError as e:
            print(f"  ⚠️  Could not check for updates: {e}")
            print(f"  ℹ️  Continuing with current version...")
            return None
        except json.JSONDecodeError as e:
            print(f"  ⚠️  Invalid manifest format: {e}")
            return None
        except Exception as e:
            print(f"  ⚠️  Error checking for updates: {e}")
            return None
    
    def compare_versions(self, current: str, latest: str) -> bool:
        """
        Compare version strings to determine if update is needed.
        
        Args:
            current: Current version string
            latest: Latest version string
        
        Returns:
            True if latest > current, False otherwise
        """
        # Simple semantic version comparison
        def parse_version(v: str) -> Tuple[int, int, int]:
            """Parse version string into (major, minor, patch)."""
            parts = v.lstrip('v').split('.')
            major = int(parts[0]) if len(parts) > 0 and parts[0].isdigit() else 0
            minor = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0
            patch = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
            return (major, minor, patch)
        
        try:
            current_ver = parse_version(current)
            latest_ver = parse_version(latest)
            return latest_ver > current_ver
        except Exception:
            # If parsing fails, assume update is needed if versions differ
            return current != latest
    
    def verify_checksum(self, file_path: Path, expected_checksum: str) -> bool:
        """
        Verify file checksum.
        
        Args:
            file_path: Path to file to verify
            expected_checksum: Expected SHA-256 checksum (format: "sha256:abc123...")
        
        Returns:
            True if checksum matches, False otherwise
        """
        if not expected_checksum.startswith('sha256:'):
            print(f"  ⚠️  Invalid checksum format: {expected_checksum}")
            return False
        
        expected_hash = expected_checksum[7:]  # Remove 'sha256:' prefix
        
        try:
            sha256 = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    sha256.update(chunk)
            actual_hash = sha256.hexdigest()
            return actual_hash == expected_hash
        except Exception as e:
            print(f"  ⚠️  Error verifying checksum: {e}")
            return False
    
    def download_update(self, download_url: str, expected_checksum: str = None) -> Optional[Path]:
        """
        Download update ZIP file.
        
        Args:
            download_url: URL to download ZIP from
            expected_checksum: Expected SHA-256 checksum (optional)
        
        Returns:
            Path to downloaded ZIP file, or None if download fails
        """
        try:
            print(f"  Downloading update from: {download_url}")
            
            # Create temp directory
            temp_dir = Path(tempfile.mkdtemp(prefix='gtm_update_'))
            zip_path = temp_dir / 'update.zip'
            
            # Download file
            req = urllib.request.Request(
                download_url,
                headers={'User-Agent': 'GTM-Tag-Management-AutoUpdater/1.0'}
            )
            
            with urllib.request.urlopen(req, timeout=300) as response:
                total_size = int(response.headers.get('Content-Length', 0))
                downloaded = 0
                
                with open(zip_path, 'wb') as f:
                    while True:
                        chunk = response.read(8192)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"  Progress: {percent:.1f}%", end='\r')
            
            print(f"  ✓ Download complete ({downloaded / 1024 / 1024:.2f} MB)")
            
            # Verify checksum if provided
            if expected_checksum:
                print(f"  Verifying checksum...")
                if not self.verify_checksum(zip_path, expected_checksum):
                    print(f"  ❌ Checksum verification failed!")
                    zip_path.unlink()
                    return None
                print(f"  ✓ Checksum verified")
            
            return zip_path
        except urllib.error.URLError as e:
            print(f"  ❌ Download failed: {e}")
            return None
        except Exception as e:
            print(f"  ❌ Error downloading update: {e}")
            return None
    
    def preserve_files(self, backup_dir: Path) -> None:
        """
        Backup files that should be preserved during update.
        
        Args:
            backup_dir: Directory to store backups
        """
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        for pattern in PRESERVE_PATTERNS:
            source = self.repo_root / pattern
            if source.exists():
                dest = backup_dir / pattern
                dest.parent.mkdir(parents=True, exist_ok=True)
                
                if source.is_file():
                    shutil.copy2(source, dest)
                elif source.is_dir():
                    shutil.copytree(source, dest, dirs_exist_ok=True)
    
    def restore_files(self, backup_dir: Path) -> None:
        """
        Restore preserved files after update.
        
        Args:
            backup_dir: Directory containing backups
        """
        for pattern in PRESERVE_PATTERNS:
            backup = backup_dir / pattern
            if backup.exists():
                target = self.repo_root / pattern
                target.parent.mkdir(parents=True, exist_ok=True)
                
                if backup.is_file():
                    shutil.copy2(backup, target)
                elif backup.is_dir():
                    shutil.copytree(backup, target, dirs_exist_ok=True)
    
    def extract_update(self, zip_path: Path) -> bool:
        """
        Extract update ZIP file to repository.
        
        Args:
            zip_path: Path to ZIP file
        
        Returns:
            True if extraction successful, False otherwise
        """
        try:
            print(f"  Extracting update...")
            
            # Create backup directory
            backup_dir = self.repo_root / '.backup' / datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Backup current installation
            print(f"  Backing up current installation...")
            shutil.copytree(self.repo_root, backup_dir / 'repo_backup', dirs_exist_ok=True)
            
            # Preserve important files
            print(f"  Preserving credentials and config...")
            self.preserve_files(backup_dir / 'preserved')
            
            # Extract ZIP to temp directory first
            temp_extract = Path(tempfile.mkdtemp(prefix='gtm_extract_'))
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_extract)
            
            # Find the root of the extracted repo (might be in a subdirectory)
            extracted_root = temp_extract
            if (temp_extract / 'start-web.py').exists():
                # Root is the temp directory
                pass
            else:
                # Look for subdirectory containing start-web.py
                for item in temp_extract.iterdir():
                    if item.is_dir() and (item / 'start-web.py').exists():
                        extracted_root = item
                        break
            
            # Copy files from extracted repo to current repo
            print(f"  Installing update...")
            for item in extracted_root.iterdir():
                if item.name.startswith('.'):
                    continue
                target = self.repo_root / item.name
                if item.is_file():
                    shutil.copy2(item, target)
                elif item.is_dir():
                    if target.exists():
                        shutil.rmtree(target)
                    shutil.copytree(item, target)
            
            # Restore preserved files
            print(f"  Restoring credentials and config...")
            self.restore_files(backup_dir / 'preserved')
            
            # Cleanup
            shutil.rmtree(temp_extract)
            zip_path.unlink()
            
            print(f"  ✓ Update extracted successfully")
            print(f"  Backup saved to: {backup_dir}")
            return True
        except Exception as e:
            print(f"  ❌ Error extracting update: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def check_and_update(self, force: bool = False, auto_apply: bool = False) -> Tuple[bool, Optional[str]]:
        """
        Check for updates and optionally apply them.
        
        Args:
            force: Force update check even if recently checked
            auto_apply: Automatically apply updates if available
        
        Returns:
            Tuple of (update_available, new_version)
        """
        current_version = self.get_current_version()
        if not current_version:
            print("  ⚠️  Could not determine current version")
            current_version = "0.0.0"
        
        print(f"  Current version: {current_version}")
        
        # Fetch manifest
        manifest = self.fetch_manifest(use_cache=not force)
        if not manifest:
            return (False, None)
        
        latest_version = manifest.get('version')
        if not latest_version:
            print("  ⚠️  Manifest missing version field")
            return (False, None)
        
        print(f"  Latest version: {latest_version}")
        
        # Check if update is needed
        if not self.compare_versions(current_version, latest_version):
            print(f"  ✓ You are running the latest version")
            return (False, None)
        
        print(f"  ⬆️  Update available: {current_version} → {latest_version}")
        
        if not auto_apply:
            print(f"  ℹ️  Run with --update to apply the update")
            return (True, latest_version)
        
        # Auto-apply update
        download_url = manifest.get('download_url')
        if not download_url:
            print("  ❌ Manifest missing download_url")
            return (True, latest_version)
        
        checksum = manifest.get('checksum')
        
        # Download update
        zip_path = self.download_update(download_url, checksum)
        if not zip_path:
            return (True, latest_version)
        
        # Extract update
        if not self.extract_update(zip_path):
            return (True, latest_version)
        
        print(f"  ✓ Update applied successfully!")
        print(f"  Please restart the application to use the new version.")
        return (True, latest_version)


def main():
    """CLI entry point for auto-updater."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Check for and apply updates to GTM Tag Management')
    parser.add_argument('--check', action='store_true', help='Check for updates only')
    parser.add_argument('--update', action='store_true', help='Apply update if available')
    parser.add_argument('--force', action='store_true', help='Force update check (ignore cache)')
    parser.add_argument('--manifest-url', help='Override manifest URL')
    
    args = parser.parse_args()
    
    # Find repo root (assume script is in automation/ directory)
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    
    updater = AutoUpdater(repo_root, manifest_url=args.manifest_url)
    
    if args.update:
        update_available, new_version = updater.check_and_update(force=args.force, auto_apply=True)
        if update_available and new_version:
            sys.exit(0)  # Success
        elif update_available:
            sys.exit(1)  # Update available but failed to apply
        else:
            sys.exit(0)  # No update needed
    else:
        update_available, new_version = updater.check_and_update(force=args.force, auto_apply=False)
        if update_available:
            print(f"\nTo apply the update, run: python {__file__} --update")
            sys.exit(1)  # Update available
        else:
            sys.exit(0)  # No update available


if __name__ == '__main__':
    main()
