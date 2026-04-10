/**
 * Main process entry point for the VaultPass Electron application.
 * Initializes the app window, security settings, and IPC handlers.
 */

import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron';
import { join } from 'path';
import { registerIPCHandlers } from './ipc-handlers';
import { databaseManager } from './database';

/** Keep a global reference to prevent GC */
let mainWindow: BrowserWindow | null = null;

/**
 * Creates the main application window with security best practices.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    title: 'VaultPass',
    backgroundColor: '#0f1117',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  // Hide default menu
  Menu.setApplicationMenu(null);

  // Security: block navigation to external URLs
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: set content security policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "img-src 'self' data: https://www.google.com blob:; " +
          "connect-src 'self' http://localhost:* ws://localhost:*; " +
          "frame-src 'none'; " +
          "object-src 'none';",
        ],
      },
    });
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('Loading dev URL:', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    console.log('Loading production file:', join(__dirname, '../renderer/index.html'));
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
  
  // Always open DevTools in development
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Clean up on close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Log any errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
  
  mainWindow.webContents.on('crashed', () => {
    console.error('Window crashed!');
  });
  
  mainWindow.webContents.on('unresponsive', () => {
    console.error('Window became unresponsive!');
  });
}

/**
 * Registers global keyboard shortcuts.
 */
function registerGlobalShortcuts(): void {
  // Ctrl+L: Lock vault
  ipcMain.on('shortcut:lock', () => {
    mainWindow?.webContents.send('vault:locked');
  });
}

/**
 * App lifecycle handlers.
 */
app.whenReady().then(() => {
  console.log('App is ready, initializing database...');
  
  // Initialize SQL database (must be called after app.whenReady())
  try {
    const userDataDir = app.getPath('userData');
    databaseManager.initialize(userDataDir);
    console.log('Database initialized successfully at:', userDataDir);
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
  
  // Register IPC handlers
  registerIPCHandlers();
  registerGlobalShortcuts();

  createWindow();
  
  console.log('Window created, loading app...');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('Failed to initialize app:', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Expose window for renderer access if needed.
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
