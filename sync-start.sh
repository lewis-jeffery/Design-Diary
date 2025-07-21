#!/bin/bash
# Design Diary - Daily Startup Sync Script
# This script pulls latest changes and starts the application

set -e  # Exit on any error

echo "🔄 Starting Design Diary sync workflow..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run from the Design Diary project root."
    exit 1
fi

# 1. Pull latest code changes
echo "📥 Pulling latest code changes..."
git fetch origin
if [ $(git rev-list HEAD...origin/main --count) -gt 0 ]; then
    echo "📦 New changes found, pulling..."
    git pull origin main
else
    echo "✅ Already up to date"
fi

# 2. Check if Python requirements changed
if git diff HEAD~1 HEAD --name-only | grep -q "server/requirements.txt"; then
    echo "🐍 Python requirements changed, updating..."
    cd server
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        echo "📦 Activated virtual environment"
    fi
    pip install -r requirements.txt
    cd ..
else
    echo "✅ Python requirements unchanged"
fi

# 3. Check if Node dependencies changed
if git diff HEAD~1 HEAD --name-only | grep -q "package.json\|package-lock.json"; then
    echo "📦 Node dependencies changed, updating..."
    npm install
    cd server && npm install && cd ..
else
    echo "✅ Node dependencies unchanged"
fi

# 4. Clean up any previous processes
echo "🧹 Cleaning up previous processes..."
./cleanup.sh > /dev/null 2>&1 || true

# 5. Start the application
echo "🚀 Starting Design Diary..."
./start-dev.sh

echo "✅ Sync complete! Design Diary is running at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
