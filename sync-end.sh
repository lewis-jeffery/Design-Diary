#!/bin/bash
# Design Diary - Daily Shutdown Sync Script
# This script saves work and pushes changes before switching machines

set -e  # Exit on any error

echo "💾 Ending Design Diary sync workflow..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run from the Design Diary project root."
    exit 1
fi

# 1. Check for unsaved work
echo "💾 Checking for unsaved work..."
echo "⚠️  Make sure to save any open Design Diary documents before continuing!"
echo "⚠️  Export any important Cline chat history if needed!"
read -p "Press Enter when you've saved all your work..."

# 2. Check git status
echo "📊 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Found changes to commit:"
    git status --short
    
    # Ask for commit message
    echo ""
    echo "📝 Enter a commit message for your changes:"
    read -p "Commit message: " commit_msg
    
    if [ -z "$commit_msg" ]; then
        commit_msg="Work in progress - $(date '+%Y-%m-%d %H:%M')"
        echo "Using default message: $commit_msg"
    fi
    
    # Add and commit changes
    echo "📦 Adding and committing changes..."
    git add .
    git commit -m "$commit_msg"
    
    # Push changes
    echo "📤 Pushing changes to remote..."
    git push origin main
    
    echo "✅ Changes committed and pushed successfully!"
else
    echo "✅ No changes to commit"
fi

# 3. Update requirements if Python packages were installed
if [ -f "server/venv/bin/activate" ]; then
    echo "🐍 Updating Python requirements..."
    cd server
    source venv/bin/activate
    pip freeze > requirements.txt
    cd ..
    
    # Check if requirements.txt changed
    if ! git diff --quiet server/requirements.txt; then
        echo "📦 Python requirements updated, committing..."
        git add server/requirements.txt
        git commit -m "Update Python requirements"
        git push origin main
    fi
fi

# 4. Show sync summary
echo ""
echo "📊 Sync Summary:"
echo "   Latest commit: $(git log -1 --pretty=format:'%h - %s (%cr)')"
echo "   Branch: $(git branch --show-current)"
echo "   Remote status: $(git status -uno | grep 'Your branch' || echo 'Up to date')"

# 5. Cleanup processes
echo ""
echo "🧹 Cleaning up processes..."
./cleanup.sh

# 6. Final reminders
echo ""
echo "✅ Sync complete! Safe to switch machines."
echo ""
echo "📋 Remember for next machine:"
echo "   1. Run: git pull origin main"
echo "   2. Run: ./sync-start.sh"
echo "   3. Import Cline chat history if needed"
echo "   4. Check VS Code settings sync"
echo ""
echo "🔄 Next time, just run './sync-start.sh' on your other machine!"
