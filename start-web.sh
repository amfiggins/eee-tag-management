#!/bin/bash

# GTM Tag Management Web Interface - Setup and Launch Script
# This script installs all dependencies and starts the web interface
# Author: Anthony Figgins
# Version: 1.0.0
# Date Updated: 2025-11-17

# Don't use set -e here as we need to handle background processes

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 GTM Tag Management Web Interface${NC}"
echo "=================================="
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WEB_DIR="$SCRIPT_DIR/web"
AUTOMATION_DIR="$SCRIPT_DIR/automation"

# Load Homebrew if it exists but isn't in PATH
if ! command -v brew &> /dev/null; then
    if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f "/usr/local/bin/brew" ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi

# Check for Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    echo ""
    
    # Check for nvm (Node Version Manager)
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        echo -e "${YELLOW}Found nvm! Installing Node.js via nvm...${NC}"
        source "$HOME/.nvm/nvm.sh"
        nvm install --lts
        nvm use --lts
        echo -e "${GREEN}✓ Node.js installed via nvm${NC}"
    # Check for Homebrew
    elif command -v brew &> /dev/null; then
        echo -e "${YELLOW}Found Homebrew! Installing Node.js via Homebrew...${NC}"
        echo "This may take a few minutes..."
        brew install node
        echo -e "${GREEN}✓ Node.js installed via Homebrew${NC}"
    else
        echo -e "${YELLOW}Attempting to install Node.js...${NC}"
        echo ""
        echo "Option 1: Install Homebrew first (recommended for macOS)"
        echo "  Run: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "  Then run this script again"
        echo ""
        echo "Option 2: Install Node.js directly"
        echo "  Download from: https://nodejs.org/"
        echo "  Or use: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        echo ""
        read -p "Would you like to install Homebrew now and then Node.js? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            
            # Add Homebrew to PATH for this session
            if [ -f "/opt/homebrew/bin/brew" ]; then
                eval "$(/opt/homebrew/bin/brew shellenv)"
                echo -e "${GREEN}✓ Homebrew installed${NC}"
            elif [ -f "/usr/local/bin/brew" ]; then
                eval "$(/usr/local/bin/brew shellenv)"
                echo -e "${GREEN}✓ Homebrew installed${NC}"
            fi
            
            # Check if brew is now available
            if command -v brew &> /dev/null; then
                echo "Installing Node.js..."
                brew install node
                echo -e "${GREEN}✓ Node.js installed${NC}"
            else
                echo -e "${YELLOW}⚠️  Homebrew installed but not in PATH.${NC}"
                echo "Please run: eval \"\$(/opt/homebrew/bin/brew shellenv)\""
                echo "Then run this script again."
                exit 1
            fi
        else
            echo -e "${RED}Please install Node.js manually and run this script again.${NC}"
            exit 1
        fi
    fi
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"

# Check for Python
echo ""
echo -e "${YELLOW}Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed.${NC}"
    echo ""
    
    # Check for Homebrew
    if command -v brew &> /dev/null; then
        echo -e "${YELLOW}Found Homebrew! Installing Python via Homebrew...${NC}"
        echo "This may take a few minutes..."
        brew install python3
        echo -e "${GREEN}✓ Python installed via Homebrew${NC}"
    else
        echo -e "${YELLOW}Attempting to install Python...${NC}"
        echo ""
        echo "Option 1: Install Homebrew first (recommended for macOS)"
        echo "  Run: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "  Then run this script again"
        echo ""
        echo "Option 2: Install Python directly"
        echo "  Download from: https://www.python.org/downloads/"
        echo ""
        read -p "Would you like to install Homebrew now and then Python? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            
            # Add Homebrew to PATH for this session
            if [ -f "/opt/homebrew/bin/brew" ]; then
                eval "$(/opt/homebrew/bin/brew shellenv)"
                echo -e "${GREEN}✓ Homebrew installed${NC}"
            elif [ -f "/usr/local/bin/brew" ]; then
                eval "$(/usr/local/bin/brew shellenv)"
                echo -e "${GREEN}✓ Homebrew installed${NC}"
            fi
            
            # Check if brew is now available
            if command -v brew &> /dev/null; then
                echo "Installing Python..."
                brew install python3
                echo -e "${GREEN}✓ Python installed${NC}"
            else
                echo -e "${YELLOW}⚠️  Homebrew installed but not in PATH.${NC}"
                echo "Please run: eval \"\$(/opt/homebrew/bin/brew shellenv)\""
                echo "Then run this script again."
                exit 1
            fi
        else
            echo -e "${RED}Please install Python manually and run this script again.${NC}"
            exit 1
        fi
    fi
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ Python found: $PYTHON_VERSION${NC}"

# Install Python dependencies
echo ""
echo -e "${YELLOW}Installing Python dependencies...${NC}"
cd "$AUTOMATION_DIR"
if [ -f "requirements-gtm.txt" ]; then
    python3 -m pip install -q -r requirements-gtm.txt --user
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  requirements-gtm.txt not found, skipping Python dependencies${NC}"
fi

# Install Node.js dependencies
echo ""
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
cd "$WEB_DIR"

# Ensure Homebrew environment is loaded for npm
if ! command -v npm &> /dev/null; then
    if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f "/usr/local/bin/brew" ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages (this may take a minute)..."
    npm install
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Node.js dependencies already installed${NC}"
    echo "Running npm install to ensure everything is up to date..."
    npm install
fi

# Check for credentials
echo ""
echo -e "${YELLOW}Checking credentials...${NC}"
CREDENTIALS_FILE="$AUTOMATION_DIR/gtm-oauth-credentials.json"
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo -e "${YELLOW}⚠️  OAuth credentials not found at: $CREDENTIALS_FILE${NC}"
    echo "You'll need to set up OAuth credentials before using the interface."
    echo "See: automation/OAUTH_SETUP.md"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ OAuth credentials found${NC}"
fi

# Start the web server
echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Starting web interface...${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo "The web interface will be available at:"
echo -e "${GREEN}http://localhost:3000${NC}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Next.js dev server and open browser after delay
(
    sleep 5
    if command -v open &> /dev/null; then
        # macOS
        open http://localhost:3000 2>/dev/null || true
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open http://localhost:3000 2>/dev/null || true
    fi
) &

# Start Next.js dev server (runs in foreground)
npm run dev

