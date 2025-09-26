# Electron Setup Guide for Shadowguard Drop Tracker

This guide will walk you through converting your Shadowguard Drop Tracker Node.js application into a distributable desktop application using Electron.

## Prerequisites

- Your existing Shadowguard Drop Tracker project
- Node.js 14+ installed
- npm or yarn package manager
- Basic familiarity with command line

## Current Project Structure (Before Electron)

```
shadowguard-tracker/
├── package.json
├── server.js
├── ecosystem.config.js (PM2 config)
├── database/
│   ├── init.js
│   ├── schema.sql
│   └── shadowguard.db (created at runtime)
├── public/
│   ├── index.html
│   ├── css/
│   └── js/
└── logs/ (if using PM2)
```

## Step 1: Install Electron Dependencies

Open your terminal in the project root directory and run:

```bash
npm install --save-dev electron electron-builder
```

**Expected output:** Should install without errors and add electron packages to your `node_modules/` folder.

## Step 2: Create Electron Main Process File

Create a new file called `electron-main.js` in your project root (same level as `server.js`):

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Start the Express server
function startServer() {
  const serverPath = path.join(__dirname, 'server.js');
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: 3020 }
  });
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

function createWindow() {
  // Start the server
  startServer();
  
  // Wait a moment for server to start
  setTimeout(() => {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      icon: path.join(__dirname, 'public/icon.png') // Add an icon if you have one
    });

    // Load the app
    mainWindow.loadURL('http://localhost:3020');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }, 2000);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Kill the server process
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

**Verification:** You should now have `electron-main.js` in your project root.

## Step 3: Update package.json

**IMPORTANT:** Back up your current `package.json` first!

```bash
cp package.json package.json.backup
```

Now update your `package.json` to include the Electron configuration. Merge these additions with your existing file:

```json
{
  "name": "shadowguard-drop-tracker",
  "version": "1.0.0",
  "description": "A comprehensive web application for tracking Ultima Online Shadowguard encounters",
  "main": "electron-main.js",
  "homepage": "./",
  "scripts": {
    "start": "node server.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:dev": "pm2 start ecosystem.config.js --env development",
    "pm2:stop": "pm2 stop shadowguard-tracker",
    "pm2:restart": "pm2 restart shadowguard-tracker",
    "pm2:logs": "pm2 logs shadowguard-tracker",
    "pm2:monit": "pm2 monit",
    "electron": "electron .",
    "electron:dev": "NODE_ENV=development electron .",
    "build:electron": "electron-builder",
    "dist": "electron-builder --publish=never",
    "dist:win": "electron-builder --win --publish=never",
    "dist:mac": "electron-builder --mac --publish=never",
    "dist:linux": "electron-builder --linux --publish=never",
    "dist:all": "electron-builder --win --mac --linux --publish=never"
  },
  "build": {
    "appId": "com.shadowguard.tracker",
    "productName": "Shadowguard Drop Tracker",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "**/*",
      "!dist-electron/**/*",
      "!node_modules/.cache/**/*"
    ],
    "extraResources": [
      {
        "from": "database/",
        "to": "database/",
        "filter": ["**/*"]
      },
      {
        "from": "public/",
        "to": "public/",
        "filter": ["**/*"]
      }
    ],
    "win": {
      "target": {
        "target": "nsis",
        "arch": ["x64"]
      },
      "icon": "build/icon.ico",
      "publisherName": "Shadowguard Tracker"
    },
    "mac": {
      "target": {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      "icon": "build/icon.icns",
      "category": "public.app-category.utilities"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.png",
      "category": "Utility"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  },
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest"
  }
}
```

**Key changes made:**
- Changed `"main"` from `server.js` to `electron-main.js`
- Added `"homepage": "./"`
- Added all the electron-related scripts
- Added the entire `"build"` configuration
- Added `devDependencies` section

## Step 4: Create App Icons (Optional but Recommended)

Create a `build/` folder in your project root:

```bash
mkdir build
```

Add icons to the `build/` folder:
- `icon.png` - 512x512 PNG for Linux
- `icon.ico` - Windows ICO file  
- `icon.icns` - macOS ICNS file

**If you don't have icons:** The app will still work, you'll just get default Electron icons.

**To create icons:** You can use online converters or tools like `electron-icon-builder` to generate all formats from a single 512x512 PNG.

## Step 5: Update server.js for Electron Compatibility

**IMPORTANT:** Back up your current `server.js` first!

```bash
cp server.js server.js.backup
```

Add this code to the top of your `server.js` file (after the requires but before your existing code):

```javascript
// Add after your existing requires
const express = require('express');
const path = require('path');

// Detect if running in Electron
const isElectron = process.versions && process.versions.electron;

// Set correct paths for Electron vs normal Node.js
const basePath = isElectron 
  ? path.join(process.resourcesPath, 'app.asar')
  : __dirname;

const publicPath = isElectron 
  ? path.join(process.resourcesPath, 'app.asar', 'public')
  : path.join(__dirname, 'public');

const dbPath = isElectron
  ? path.join(process.resourcesPath, 'database', 'shadowguard.db')
  : path.join(__dirname, 'database', 'shadowguard.db');

// Update your static file serving line to use publicPath
app.use(express.static(publicPath));

// Update any database initialization to use dbPath instead of hardcoded paths
```

**What this does:** Ensures your app can find its files whether running as a normal Node.js app or packaged in Electron.

## Step 6: Test Your Setup

### Test 1: Development Mode
```bash
npm run electron:dev
```

**Expected result:** 
- A desktop window should open
- Your Shadowguard Drop Tracker should load inside it
- Console should show "Server running on port 3020" and "Running in Electron mode"
- If you have issues, the DevTools will be open automatically

### Test 2: Production Mode
```bash
npm run electron
```

**Expected result:**
- Same as above but without DevTools open
- Window should look more "production ready"

**Common issues at this stage:**
- Window opens but shows "This site can't be reached" → Server isn't starting properly
- Blank window → Check console for JavaScript errors
- App won't start → Check that all files are in the right place

## Step 7: Build Distributables

### Build for your current platform:
```bash
npm run dist
```

### Build for specific platforms:
```bash
# Windows (creates installer)
npm run dist:win

# macOS (creates DMG)
npm run dist:mac

# Linux (creates AppImage and DEB)
npm run dist:linux
```

**Expected results:**
- Files will be created in `dist-electron/` folder
- Build process may take 5-15 minutes depending on your machine
- You'll get platform-specific installers/packages

## Final Project Structure (After Electron Setup)

```
shadowguard-tracker/
├── package.json (updated)
├── package.json.backup
├── server.js (updated)
├── server.js.backup
├── electron-main.js (new)
├── ecosystem.config.js
├── build/ (new - optional)
│   ├── icon.png
│   ├── icon.ico
│   └── icon.icns
├── database/
├── public/
├── logs/
├── node_modules/ (electron packages added)
└── dist-electron/ (created after building)
    ├── win-unpacked/
    ├── Shadowguard Drop Tracker Setup.exe
    └── other platform builds
```

## Testing Your Built Application

### Windows:
1. Navigate to `dist-electron/`
2. Double-click `Shadowguard Drop Tracker Setup.exe`
3. Install and run the application

### macOS:
1. Navigate to `dist-electron/`
2. Double-click the `.dmg` file
3. Drag the app to Applications folder

### Linux:
1. Navigate to `dist-electron/`
2. Run `./shadowguard-drop-tracker.AppImage` or install the `.deb` file

## Troubleshooting Common Issues

### Issue: "electron: command not found"
**Solution:** Make sure you installed electron as a dev dependency: `npm install --save-dev electron`

### Issue: Window opens but shows connection error
**Solution:** 
- Check if port 3020 is available
- Look at the Electron console for server startup errors
- Verify server.js paths are updated correctly

### Issue: Build fails with file not found errors
**Solution:**
- Verify all files exist in the expected locations
- Check that `database/` and `public/` folders are present
- Ensure `electron-main.js` is in the root directory

### Issue: App works in development but not in built version
**Solution:**
- Check file paths in server.js (use the Electron-compatible paths)
- Verify database files are being included in the build
- Check the `build.extraResources` configuration in package.json

## Getting Help

If you encounter issues:

1. **Check the console output** - Both in terminal and in the Electron DevTools
2. **Verify file structure** - Make sure all files are where they should be  
3. **Test step by step** - Don't skip the testing phases
4. **Check this guide** - Re-read the relevant section
5. **Provide context** - When asking for help, include:
   - What step you were on
   - The exact error message
   - Your current file structure
   - Console output

## Next Steps After Successful Build

1. **Test thoroughly** - Try all features of your app in the built version
2. **Add icons** - Create proper icons for a professional look
3. **Code signing** - For distribution, you may want to code sign your apps
4. **Auto-updater** - Consider implementing auto-update functionality
5. **Distribution** - Plan how you'll distribute your application

## Rollback Plan

If something goes wrong and you need to go back to your working Node.js version:

```bash
# Restore your original files
cp package.json.backup package.json
cp server.js.backup server.js

# Remove Electron files (optional)
rm electron-main.js
rm -rf build/
rm -rf dist-electron/

# Your original app should work with:
npm start
# or
npm run pm2:start
```

---

**Remember:** Keep this guide handy for debugging and reference. Each step builds on the previous one, so make sure each step works before moving to the next!