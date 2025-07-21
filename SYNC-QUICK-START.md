# Design Diary - Quick Sync Setup

This is a quick reference for setting up multi-machine synchronization for Design Diary development.

## 🚀 First Time Setup (New Machine)

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/your-username/design-diary.git
cd design-diary

# Run the automated setup script
./setup-new-machine.sh
```

### 2. Configure VS Code
1. Install VS Code if not already installed
2. Open the project: `code .`
3. Install recommended extensions when prompted
4. Enable Settings Sync: `Cmd+Shift+P` → "Settings Sync: Turn On"
5. Sign in with your GitHub/Microsoft account

### 3. Configure Cline
1. Install the Continue extension (should be auto-suggested)
2. Configure your API keys in the Continue extension settings
3. Import chat history if you have exports from another machine

## 🔄 Daily Workflow

### Starting Work (Any Machine)
```bash
# Pull latest changes and start
./sync-start.sh
```

### Ending Work (Before Switching Machines)
```bash
# Save work and push changes
./sync-end.sh
```

## 📁 What Gets Synchronized

| Component | Method | Location |
|-----------|--------|----------|
| **Code & Files** | Git | GitHub repository |
| **VS Code Settings** | Settings Sync | Microsoft/GitHub account |
| **Extensions** | Settings Sync | Microsoft/GitHub account |
| **Cline Chat History** | Manual Export/Import | Local files |
| **Design Diary Documents** | File-based | Cloud storage or Git |
| **Python Environment** | requirements.txt | Git repository |

## 🛠️ Available Scripts

| Script | Purpose |
|--------|---------|
| `./setup-new-machine.sh` | Complete setup for new machine |
| `./sync-start.sh` | Pull changes and start development |
| `./sync-end.sh` | Save work and push changes |
| `./start-dev.sh` | Start Design Diary (no sync) |
| `./restart.sh` | Restart Design Diary servers |
| `./cleanup.sh` | Clean up processes and temp files |

## 📱 Remote Development Options

### GitHub Codespaces
1. Go to your GitHub repository
2. Click "Code" → "Codespaces" → "Create codespace"
3. Everything is pre-configured via `.devcontainer/devcontainer.json`

### SSH Remote Development
```bash
# On remote server
git clone https://github.com/your-username/design-diary.git
cd design-diary
./start-dev.sh

# From local machine
ssh -L 3000:localhost:3000 -L 3001:localhost:3001 user@server.com
```

## 🔐 Security Notes

- Never commit API keys or sensitive data
- Use `.env` files for local configuration
- Consider encrypting chat history exports for sensitive conversations
- Use private repositories for sensitive project data

## 🚨 Troubleshooting

### Port Conflicts
```bash
./cleanup.sh && ./restart.sh
```

### Git Conflicts
```bash
git status
# Resolve conflicts manually, then:
git add . && git commit -m "Resolve conflicts"
```

### Missing Dependencies
```bash
rm -rf node_modules server/node_modules
npm install && cd server && npm install
```

### Cline Not Working
- Reinstall Continue extension in VS Code
- Check API key configuration
- Import chat history if needed

## 📞 Quick Help

**Problem**: Can't start the application
**Solution**: Run `./cleanup.sh` then `./start-dev.sh`

**Problem**: Changes not syncing
**Solution**: Check git status with `git status`, commit and push changes

**Problem**: VS Code settings not syncing
**Solution**: Check Settings Sync is enabled and you're signed in

**Problem**: Cline chat history lost
**Solution**: Import from your last export file

---

For detailed instructions, see [SYNCHRONIZATION-GUIDE.md](SYNCHRONIZATION-GUIDE.md)
