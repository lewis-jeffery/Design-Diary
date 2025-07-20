# Dropbox Access Guide for Design Diary

## Issue Identified
The `/Users/lewis/Dropbox` directory is a symbolic link pointing to `/Users/lewis/Library/CloudStorage/Dropbox`. The Node.js server process doesn't have the necessary permissions to access this location.

## Root Cause
Modern macOS (Monterey and later) moved Dropbox integration to the CloudStorage framework, which requires specific permissions for applications to access.

## Solutions

### Option 1: Grant Full Disk Access (Recommended)
1. Open **System Preferences** (or **System Settings** on macOS Ventura+)
2. Go to **Security & Privacy** → **Privacy** tab
3. Select **Full Disk Access** from the left sidebar
4. Click the lock icon and enter your password
5. Click the **+** button to add applications
6. Add the following applications:
   - **Terminal** (if running from Terminal)
   - **Visual Studio Code** (if running from VS Code integrated terminal)
   - **Node.js** (if you have a standalone Node.js installation)

### Option 2: Use the Real Dropbox Path
Instead of using `/Users/lewis/Dropbox`, use the actual path:
```
/Users/lewis/Library/CloudStorage/Dropbox
```

### Option 3: Grant CloudStorage Access
1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Files and Folders** from the left sidebar
3. Find your terminal application or Node.js
4. Enable access to **CloudStorage**

## Testing the Fix
After applying any of the above solutions:

1. Restart your terminal/VS Code
2. Restart the Design Diary server:
   ```bash
   npm run dev
   ```
3. Test the directory browser with the Dropbox path

## Verification Commands
```bash
# Test direct access
ls -la /Users/lewis/Dropbox
ls -la /Users/lewis/Library/CloudStorage/Dropbox

# Test Node.js access
node -e "console.log(require('fs').readdirSync('/Users/lewis/Library/CloudStorage/Dropbox'))"
```

## Alternative: Update Directory Browser Default Path
If you frequently access Dropbox files, you can update the default starting directory in the DirectoryBrowser component to use the real path instead of the symbolic link.
