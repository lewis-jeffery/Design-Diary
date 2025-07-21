# Design Diary - Multi-Machine Synchronization Guide

This guide shows you how to synchronize your VS Code workspace, Cline chat sessions, and Design Diary project state across multiple machines for seamless development.

## 🔄 Overview

Synchronizing across machines involves several components:
1. **Project Code & Files** (Git repository)
2. **VS Code Settings & Extensions** (Settings Sync)
3. **Cline Chat History** (Manual export/import)
4. **Design Diary Documents** (File-based sync)
5. **Python Environment** (Requirements & virtual environments)

## 📁 1. Project Code Synchronization (Git)

### Initial Setup on Machine A
```bash
# If not already done, initialize git repository
git init
git add .
git commit -m "Initial commit"

# Add remote repository (GitHub/GitLab/etc.)
git remote add origin https://github.com/your-username/design-diary.git
git push -u origin main
```

### Setup on Machine B
```bash
# Clone the repository
git clone https://github.com/your-username/design-diary.git
cd design-diary

# Install dependencies
npm install
cd server && npm install && cd ..

# Start the application
./start-dev.sh
```

### Daily Workflow
```bash
# Before starting work (pull latest changes)
git pull origin main

# After making changes (push your work)
git add .
git commit -m "Your commit message"
git push origin main
```

## ⚙️ 2. VS Code Settings Synchronization

### Enable Settings Sync
1. **Open VS Code**
2. **Press** `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. **Type** "Settings Sync: Turn On"
4. **Sign in** with GitHub or Microsoft account
5. **Select what to sync**:
   - ✅ Settings
   - ✅ Extensions
   - ✅ Keyboard Shortcuts
   - ✅ User Snippets
   - ✅ UI State

### On Your Second Machine
1. **Install VS Code**
2. **Sign in** with the same account
3. **Enable Settings Sync**
4. **Your settings will automatically sync**

### Recommended Extensions for Design Diary Development
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.pylint",
    "continue.continue",
    "github.copilot"
  ]
}
```

## 💬 3. Cline Chat History Synchronization

### Export Chat History (Machine A)
1. **Open Cline sidebar** in VS Code
2. **Click the gear icon** (⚙️) in Cline panel
3. **Select "Export Chat History"**
4. **Save the file** as `cline-history-YYYY-MM-DD.json`
5. **Store in a synced location** (see options below)

### Import Chat History (Machine B)
1. **Open Cline sidebar** in VS Code
2. **Click the gear icon** (⚙️) in Cline panel
3. **Select "Import Chat History"**
4. **Choose your exported file**
5. **Chat history will be restored**

### Automated Chat Sync Options

#### Option A: Cloud Storage Sync
```bash
# Create a sync folder in your project
mkdir .cline-sync
echo ".cline-sync/" >> .gitignore

# Export to sync folder
# (Use Cline's export feature to save here)

# Sync via Dropbox/Google Drive/OneDrive
# Point your cloud storage to sync the .cline-sync folder
```

#### Option B: Git-based Sync (Private Repository)
```bash
# Create a separate private repo for sensitive data
git clone https://github.com/your-username/design-diary-private.git
cd design-diary-private

# Store chat exports here
mkdir cline-history
# Export Cline chats to this folder
```

## 📄 4. Design Diary Documents Synchronization

### Method 1: Cloud Storage Integration
```bash
# Create a documents folder synced with cloud storage
mkdir ~/Documents/DesignDiary
# Point Dropbox/Google Drive/OneDrive to sync this folder

# Save your .ipynb and .layout.json files here
# They'll automatically sync across machines
```

### Method 2: Git LFS for Large Files
```bash
# Install Git LFS
git lfs install

# Track notebook and layout files
git lfs track "*.ipynb"
git lfs track "*.layout.json"
git lfs track "*.png"
git lfs track "*.jpg"
git lfs track "*.pdf"

# Add .gitattributes
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

### Method 3: Dedicated Documents Repository
```bash
# Create a separate repository for documents
git clone https://github.com/your-username/design-diary-documents.git

# Symlink to your project
ln -s ~/design-diary-documents ~/design-diary/documents
```

## 🐍 5. Python Environment Synchronization

### Create Requirements File
```bash
# On Machine A, create requirements file
cd server
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Add Python requirements"
git push
```

### Setup Python Environment on Machine B
```bash
# After cloning the repository
cd design-diary/server

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### Keep Requirements Updated
```bash
# When you install new packages on any machine
pip install new-package
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Update Python requirements"
git push
```

## 🔧 6. Complete Synchronization Workflow

### Daily Startup Routine
```bash
#!/bin/bash
# save as: sync-start.sh

echo "🔄 Starting Design Diary sync workflow..."

# 1. Pull latest code changes
echo "📥 Pulling latest code..."
git pull origin main

# 2. Update Python dependencies if changed
if git diff HEAD~1 server/requirements.txt > /dev/null; then
    echo "🐍 Updating Python dependencies..."
    cd server
    pip install -r requirements.txt
    cd ..
fi

# 3. Update Node dependencies if changed
if git diff HEAD~1 package.json > /dev/null; then
    echo "📦 Updating Node dependencies..."
    npm install
fi

# 4. Start the application
echo "🚀 Starting Design Diary..."
./start-dev.sh

echo "✅ Sync complete! Design Diary is running."
```

### Daily Shutdown Routine
```bash
#!/bin/bash
# save as: sync-end.sh

echo "💾 Ending Design Diary sync workflow..."

# 1. Save any open work
echo "💾 Make sure to save your work in Design Diary!"
read -p "Press Enter when ready to continue..."

# 2. Export Cline chat history
echo "💬 Don't forget to export Cline chat history if you had important conversations!"

# 3. Commit and push changes
echo "📤 Committing and pushing changes..."
git add .
git status
read -p "Enter commit message: " commit_msg
git commit -m "$commit_msg"
git push origin main

# 4. Cleanup
echo "🧹 Cleaning up..."
./cleanup.sh

echo "✅ Sync complete! Safe to switch machines."
```

## 📱 7. Mobile/Remote Access Options

### Option A: GitHub Codespaces
```yaml
# .devcontainer/devcontainer.json
{
  "name": "Design Diary Development",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:18",
  "features": {
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.11"
    }
  },
  "postCreateCommand": "npm install && cd server && npm install",
  "forwardPorts": [3000, 3001],
  "customizations": {
    "vscode": {
      "extensions": [
        "continue.continue",
        "ms-python.python"
      ]
    }
  }
}
```

### Option B: Remote SSH Development
```bash
# On your remote server
git clone https://github.com/your-username/design-diary.git
cd design-diary
./start-dev.sh

# Access via SSH tunnel
ssh -L 3000:localhost:3000 -L 3001:localhost:3001 user@your-server.com
```

## 🔐 8. Security Considerations

### Sensitive Data Management
```bash
# Create .env files for sensitive data
echo "OPENAI_API_KEY=your-key-here" > .env
echo "ANTHROPIC_API_KEY=your-key-here" >> .env
echo ".env" >> .gitignore

# Use environment variables in your code
# Never commit API keys or sensitive data
```

### Chat History Privacy
```bash
# For sensitive chat histories, use encrypted storage
# Option 1: Encrypted zip files
zip -e cline-history-encrypted.zip cline-history.json

# Option 2: Use tools like gpg
gpg -c cline-history.json
```

## 🚨 9. Troubleshooting Common Sync Issues

### Port Conflicts
```bash
# If ports are in use on new machine
./cleanup.sh
./restart.sh
```

### Git Conflicts
```bash
# If you have merge conflicts
git status
git diff
# Resolve conflicts manually, then:
git add .
git commit -m "Resolve merge conflicts"
```

### Missing Dependencies
```bash
# Reset dependencies completely
rm -rf node_modules server/node_modules
npm install
cd server && npm install
```

### Cline Not Working
```bash
# Reinstall Cline extension
# In VS Code: Cmd+Shift+P -> "Extensions: Reinstall Extension"
# Search for "Continue" and reinstall
```

## 📋 10. Quick Reference Checklist

### Before Switching Machines:
- [ ] Save all open Design Diary documents
- [ ] Export Cline chat history (if important conversations)
- [ ] Commit and push all code changes
- [ ] Note any new dependencies installed
- [ ] Run cleanup script

### After Switching Machines:
- [ ] Pull latest code changes
- [ ] Check for dependency updates
- [ ] Import Cline chat history (if needed)
- [ ] Verify VS Code settings synced
- [ ] Test that Design Diary starts correctly

### Weekly Maintenance:
- [ ] Update Python requirements.txt
- [ ] Clean up old chat history exports
- [ ] Review and organize Design Diary documents
- [ ] Update documentation if workflow changed

## 🎯 Best Practices

1. **Commit Often**: Small, frequent commits are easier to sync and merge
2. **Use Branches**: Create feature branches for experimental work
3. **Document Changes**: Good commit messages help track what changed
4. **Backup Important Work**: Keep copies of important notebooks
5. **Test After Sync**: Always verify the application works after syncing
6. **Keep Secrets Safe**: Never commit API keys or sensitive data

This synchronization setup ensures you can seamlessly work on Design Diary from any machine while maintaining all your development context, chat history, and project state.
