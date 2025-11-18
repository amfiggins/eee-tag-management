#!/usr/bin/env python3
"""
GTM Tag Management Web Interface - Setup and Launch Script (Python)
This script installs all dependencies and starts the web interface

Author: Anthony Figgins
Version: 1.0.0
Date Updated: 2025-11-17
"""

import os
import sys
import subprocess
import platform
import time
import shutil
from pathlib import Path

# Colors for output (ANSI codes)
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def print_colored(message, color=NC):
    """Print colored message (works on Unix-like systems)"""
    if platform.system() == 'Windows':
        print(message)  # Windows doesn't support ANSI colors in all terminals
    else:
        print(f"{color}{message}{NC}")

def check_command(cmd, name, install_instructions=None):
    """Check if a command exists, return (exists, version)"""
    try:
        result = subprocess.run(
            [cmd, '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            version = result.stdout.strip().split('\n')[0]
            return True, version
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    return False, None

def install_node_via_brew():
    """Try to install Node.js via Homebrew"""
    brew_paths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']
    brew_cmd = None
    
    for path in brew_paths:
        if os.path.exists(path):
            brew_cmd = path
            break
    
    if not brew_cmd:
        # Try to find brew in PATH
        if shutil.which('brew'):
            brew_cmd = 'brew'
    
    if brew_cmd:
        print_colored("Found Homebrew! Installing Node.js via Homebrew...", YELLOW)
        print("This may take a few minutes...")
        try:
            subprocess.run([brew_cmd, 'install', 'node'], check=True)
            print_colored("✓ Node.js installed via Homebrew", GREEN)
            return True
        except subprocess.CalledProcessError:
            print_colored("❌ Failed to install Node.js via Homebrew", RED)
            return False
    
    return False

def install_python_via_brew():
    """Try to install Python via Homebrew"""
    brew_paths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']
    brew_cmd = None
    
    for path in brew_paths:
        if os.path.exists(path):
            brew_cmd = path
            break
    
    if not brew_cmd:
        if shutil.which('brew'):
            brew_cmd = 'brew'
    
    if brew_cmd:
        print_colored("Found Homebrew! Installing Python via Homebrew...", YELLOW)
        print("This may take a few minutes...")
        try:
            # Try to install Python 3.11 first
            subprocess.run([brew_cmd, 'install', 'python@3.11'], check=True)
            print_colored("✓ Python 3.11 installed via Homebrew", GREEN)
            return True
        except subprocess.CalledProcessError:
            try:
                # Fall back to python3
                subprocess.run([brew_cmd, 'install', 'python3'], check=True)
                print_colored("✓ Python installed via Homebrew", GREEN)
                return True
            except subprocess.CalledProcessError:
                print_colored("❌ Failed to install Python via Homebrew", RED)
                return False
    
    return False

def find_python_executable():
    """Find the best Python executable"""
    candidates = [
        '/opt/homebrew/bin/python3.11',  # Homebrew Python 3.11 on Apple Silicon
        '/usr/local/bin/python3.11',     # Homebrew Python 3.11 on Intel
        'python3.11',
        'python3.10',
        'python3',
        'python',
    ]
    
    for candidate in candidates:
        if shutil.which(candidate):
            try:
                result = subprocess.run(
                    [candidate, '--version'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    return candidate
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
    
    return None

def main():
    print_colored("🚀 GTM Tag Management Web Interface", GREEN)
    print("==================================")
    print()
    
    # Get script directory
    script_dir = Path(__file__).parent.absolute()
    web_dir = script_dir / 'web'
    automation_dir = script_dir / 'automation'
    
    # Check for Node.js
    print_colored("Checking Node.js...", YELLOW)
    node_exists, node_version = check_command('node', 'Node.js')
    
    if not node_exists:
        print_colored("❌ Node.js is not installed.", RED)
        print()
        
        if platform.system() == 'Darwin':  # macOS
            response = input("Would you like to install Node.js via Homebrew? (y/n) ").strip().lower()
            if response == 'y':
                if install_node_via_brew():
                    node_exists, node_version = check_command('node', 'Node.js')
                else:
                    print_colored("Please install Node.js manually from https://nodejs.org/", RED)
                    sys.exit(1)
            else:
                print_colored("Please install Node.js manually from https://nodejs.org/", RED)
                sys.exit(1)
        else:
            print_colored("Please install Node.js from https://nodejs.org/", RED)
            sys.exit(1)
    
    print_colored(f"✓ Node.js found: {node_version}", GREEN)
    
    # Check for npm
    npm_exists, npm_version = check_command('npm', 'npm')
    if not npm_exists:
        print_colored("❌ npm is not installed.", RED)
        sys.exit(1)
    
    print_colored(f"✓ npm found: {npm_version}", GREEN)
    
    # Check for Python
    print()
    print_colored("Checking Python...", YELLOW)
    python_exe = find_python_executable()
    
    if not python_exe:
        print_colored("❌ Python 3 is not installed.", RED)
        print()
        
        if platform.system() == 'Darwin':  # macOS
            response = input("Would you like to install Python via Homebrew? (y/n) ").strip().lower()
            if response == 'y':
                if install_python_via_brew():
                    python_exe = find_python_executable()
                else:
                    print_colored("Please install Python manually from https://www.python.org/", RED)
                    sys.exit(1)
            else:
                print_colored("Please install Python manually from https://www.python.org/", RED)
                sys.exit(1)
        else:
            print_colored("Please install Python from https://www.python.org/", RED)
            sys.exit(1)
    
    python_version = subprocess.run(
        [python_exe, '--version'],
        capture_output=True,
        text=True,
        timeout=5
    ).stdout.strip()
    
    print_colored(f"✓ Python found: {python_version} ({python_exe})", GREEN)
    
    # Install Python dependencies
    print()
    print_colored("Installing Python dependencies...", YELLOW)
    requirements_file = automation_dir / 'requirements-gtm.txt'
    
    if requirements_file.exists():
        try:
            subprocess.run(
                [python_exe, '-m', 'pip', 'install', '-q', '-r', str(requirements_file), '--user'],
                check=True,
                cwd=str(automation_dir)
            )
            print_colored("✓ Python dependencies installed", GREEN)
        except subprocess.CalledProcessError:
            print_colored("⚠️  Failed to install some Python dependencies", YELLOW)
            print("You may need to install them manually.")
    else:
        print_colored("⚠️  requirements-gtm.txt not found, skipping Python dependencies", YELLOW)
    
    # Install Node.js dependencies
    print()
    print_colored("Installing Node.js dependencies...", YELLOW)
    
    node_modules_dir = web_dir / 'node_modules'
    
    if not node_modules_dir.exists():
        print("Installing npm packages (this may take a minute)...")
        try:
            subprocess.run(['npm', 'install'], check=True, cwd=str(web_dir))
            print_colored("✓ Node.js dependencies installed", GREEN)
        except subprocess.CalledProcessError:
            print_colored("❌ Failed to install Node.js dependencies", RED)
            sys.exit(1)
    else:
        print_colored("✓ Node.js dependencies already installed", GREEN)
        print("Running npm install to ensure everything is up to date...")
        try:
            subprocess.run(['npm', 'install'], check=True, cwd=str(web_dir))
        except subprocess.CalledProcessError:
            print_colored("⚠️  npm install had some issues, but continuing...", YELLOW)
    
    # Check for credentials
    print()
    print_colored("Checking credentials...", YELLOW)
    credentials_file = automation_dir / 'gtm-oauth-credentials.json'
    
    if not credentials_file.exists():
        print_colored(f"⚠️  OAuth credentials not found at: {credentials_file}", YELLOW)
        print("You'll need to set up OAuth credentials before using the interface.")
        print("See: automation/OAUTH_SETUP.md")
        print()
        response = input("Continue anyway? (y/n) ").strip().lower()
        if response != 'y':
            sys.exit(1)
    else:
        print_colored("✓ OAuth credentials found", GREEN)
    
    # Start the web server
    print()
    print_colored("==================================", GREEN)
    print_colored("Starting web interface...", GREEN)
    print_colored("==================================", GREEN)
    print()
    print("The web interface will be available at:")
    print_colored("http://localhost:3000", GREEN)
    print()
    print("Press Ctrl+C to stop the server")
    print()
    
    # Open browser after delay (in background)
    def open_browser():
        time.sleep(5)  # Wait for server to start
        url = 'http://localhost:3000'
        
        if platform.system() == 'Darwin':  # macOS
            subprocess.run(['open', url], check=False)
        elif platform.system() == 'Windows':
            subprocess.run(['start', url], shell=True, check=False)
        elif platform.system() == 'Linux':
            subprocess.run(['xdg-open', url], check=False)
    
    # Start browser opener in background thread
    import threading
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Start Next.js dev server (runs in foreground)
    try:
        subprocess.run(['npm', 'run', 'dev'], cwd=str(web_dir))
    except KeyboardInterrupt:
        print()
        print_colored("Server stopped.", YELLOW)
        sys.exit(0)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_colored("Interrupted by user.", YELLOW)
        sys.exit(0)
    except Exception as e:
        print_colored(f"❌ Error: {e}", RED)
        sys.exit(1)

