// electron-main.js
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

// Enable live reload for Electron development (optional)
if (process.env.NODE_ENV === 'development') {
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
            hardResetMethod: 'exit'
        });
        console.log('Electron live reload enabled');
    } catch (error) {
        console.log('Electron live reload not available (install electron-reload for auto-restart)');
    }
}

// Start the Express server
function startServer() {
    const serverPath = path.join(__dirname, 'server.js');
    const isDev = process.env.NODE_ENV === 'development';
    
    console.log('Starting server from:', serverPath);
    
    serverProcess = spawn('node', [serverPath], {
        env: { 
            ...process.env, 
            PORT: 3020,
            NODE_ENV: process.env.NODE_ENV || 'production'
        },
        stdio: isDev ? 'inherit' : 'pipe'
    });
    
    if (!isDev) {
        serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
        });
        
        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });
    }
    
    serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
        dialog.showErrorBox('Server Error', `Failed to start server: ${error.message}`);
    });
    
    serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
            dialog.showErrorBox('Server Crashed', 'The server process has crashed. Please restart the application.');
        }
    });
}

function createApplicationMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Refresh',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Shadowguard Drop Tracker',
                            message: 'Shadowguard Drop Tracker',
                            detail: 'A comprehensive web application for tracking Ultima Online Shadowguard encounters, character performance analytics, and item drops across multiple simultaneous parties.\n\nVersion 2.0.0\nElectron Desktop Edition'
                        });
                    }
                },
                {
                    label: 'Learn More',
                    click: () => {
                        // You can add a link to documentation here
                        shell.openExternal('https://github.com/your-repo');
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    // Start the server first
    startServer();
    
    // Function to check if server is ready
    const checkServer = () => {
        return new Promise((resolve) => {
            const http = require('http');
            const req = http.get('http://localhost:3020/api/health', (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => {
                resolve(false);
            });
            
            req.setTimeout(1000, () => {
                req.destroy();
                resolve(false);
            });
        });
    };
    
    // Wait for server to be ready, then create window
    const waitForServer = async () => {
        console.log('Waiting for server to be ready...');
        let attempts = 0;
        const maxAttempts = 20; // 20 seconds max
        
        while (attempts < maxAttempts) {
            if (await checkServer()) {
                console.log('Server is ready! Creating window...');
                break;
            }
            console.log(`Server not ready yet, attempt ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.error('Server failed to start within 20 seconds');
            dialog.showErrorBox('Server Error', 'Server failed to start. Please check the console for errors.');
            return;
        }
        
        mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true
            },
            icon: getAppIcon(),
            show: false, // Don't show until ready-to-show
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
        });

        // Create application menu
        createApplicationMenu();

        // Add debugging for the web contents
        mainWindow.webContents.on('dom-ready', () => {
            console.log('DOM is ready');
        });

        mainWindow.webContents.on('did-finish-load', () => {
            console.log('Page finished loading');
        });

        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('Failed to load page:', errorCode, errorDescription, validatedURL);
        });

        mainWindow.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL) => {
            console.error('Failed provisional load:', errorCode, errorDescription, validatedURL);
        });

        // Load the app
        console.log('Loading app at http://localhost:3020');
        
        try {
            await mainWindow.loadURL('http://localhost:3020');
            console.log('loadURL completed successfully');
        } catch (error) {
            console.error('Error loading URL:', error);
            dialog.showErrorBox('Load Error', `Failed to load application: ${error.message}`);
            return;
        }

// Show window when ready to prevent visual flash
mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    
    // Focus on window
    if (process.platform === 'darwin') {
        app.dock.show();
    }
});

// Add a backup timer to show the window if ready-to-show doesn't fire
setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
        console.log('Forcing window to show after timeout');
        mainWindow.show();
    }
}, 3000); // Show after 3 seconds regardless

        // Open DevTools in development
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }

        // Handle window closed
        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        // Handle external links
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });

        // Handle navigation
        mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);
            
            // Only allow localhost navigation
            if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
                event.preventDefault();
                shell.openExternal(navigationUrl);
            }
        });

        // Handle app crashes
        mainWindow.webContents.on('crashed', () => {
            const options = {
                type: 'error',
                title: 'Application Crashed',
                message: 'The application has crashed. Would you like to restart?',
                buttons: ['Restart', 'Close']
            };
            
            dialog.showMessageBox(options).then((result) => {
                if (result.response === 0) {
                    app.relaunch();
                }
                app.quit();
            });
        });

        // Add unresponsive window handling
        mainWindow.on('unresponsive', () => {
            console.log('Window became unresponsive');
            const options = {
                type: 'warning',
                title: 'Window Unresponsive',
                message: 'The window has become unresponsive. Would you like to reload it?',
                buttons: ['Reload', 'Keep Waiting', 'Close']
            };
            
            dialog.showMessageBox(options).then((result) => {
                if (result.response === 0) {
                    mainWindow.reload();
                } else if (result.response === 2) {
                    mainWindow.close();
                }
            });
        });

        mainWindow.on('responsive', () => {
            console.log('Window became responsive again');
        });
    };
    
    // Start the server readiness check
    waitForServer();
}

function getAppIcon() {
    // Return appropriate icon path based on platform
    if (process.platform === 'win32') {
        return path.join(__dirname, 'build', 'icon.ico');
    } else if (process.platform === 'darwin') {
        return path.join(__dirname, 'build', 'icon.icns');
    } else {
        return path.join(__dirname, 'build', 'icon.png');
    }
}

// App event handlers
app.whenReady().then(() => {
    createWindow();
    
    // macOS: Re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Kill the server process
    if (serverProcess && !serverProcess.killed) {
        console.log('Stopping server process...');
        serverProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if it doesn't stop gracefully
        setTimeout(() => {
            if (!serverProcess.killed) {
                serverProcess.kill('SIGKILL');
            }
        }, 5000);
    }
    
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle app quit
app.on('before-quit', () => {
    // Kill server process before quitting
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (process.env.NODE_ENV === 'development') {
        // In development, ignore certificate errors for localhost
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});

// Prevent navigation to external sites
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'http://localhost:3020') {
            event.preventDefault();
        }
    });
});