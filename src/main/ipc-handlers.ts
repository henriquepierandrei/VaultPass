/**
 * IPC handlers for communication between main and renderer processes.
 * All handlers are registered with ipcMain.handle() for invoke/handle pattern.
 */

import { ipcMain, dialog, shell, clipboard, BrowserWindow } from 'electron';
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join, basename, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  setupNewVault,
  unlockVault,
  encryptVault,
  verifyPassword,
  deriveKey,
} from './crypto';
import { generatePasswords, calculatePasswordStrength } from './password-generator';
import { importData, exportData, getCSVColumns } from './import-export';
import { databaseManager } from './database';
import type {
  VaultEntryWithHistory,
  EncryptedVault,
  PasswordGeneratorOptions,
  AppSettings,
  BruteForceState,
  ImportFormat,
  ExportFormat,
  ColumnMapping,
  Result,
} from '@shared/types';
import { ENCRYPTION, BRUTE_FORCE, DEFAULT_SETTINGS } from '@shared/constants';

/** In-memory state (never persisted to disk) */
let masterKey: Buffer | null = null;
let masterSalt: Buffer | null = null;
let vaultEntries: VaultEntryWithHistory[] = [];
let encryptedVault: EncryptedVault | null = null;
let vaultFilePath = '';
let sessionTimer: NodeJS.Timeout | null = null;

/** Brute force tracking */
const bruteForceState: BruteForceState = {
  failedAttempts: 0,
  lastAttempt: 0,
  locked: false,
};

/** Default settings (persisted via electron-store from renderer) */
let appSettings: AppSettings = { ...DEFAULT_SETTINGS };

/**
 * Sets the session timeout timer.
 */
function resetSessionTimeout(timeoutMinutes: number): void {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }

  sessionTimer = setTimeout(() => {
    lockVault();
  }, timeoutMinutes * 60 * 1000);
}

/**
 * Locks the vault and clears sensitive data from memory.
 */
function lockVault(): void {
  masterKey = null;
  masterSalt = null;
  vaultEntries = [];
  encryptedVault = null;
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }

  // Notify renderer
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send('vault:locked');
  }
}

/**
 * Checks brute force state and returns whether login is allowed.
 */
function checkBruteForce(): { allowed: boolean; remainingLockout?: number } {
  if (bruteForceState.locked) {
    return { allowed: false, remainingLockout: -1 };
  }

  const now = Date.now();
  const timeSinceLastAttempt = now - bruteForceState.lastAttempt;

  // Reset counter after timeout
  if (timeSinceLastAttempt > BRUTE_FORCE.RESET_AFTER_MINUTES * 60 * 1000) {
    bruteForceState.failedAttempts = 0;
    return { allowed: true };
  }

  // Check lockout tiers
  for (const tier of BRUTE_FORCE.LOCKOUT_DURATIONS.reverse()) {
    if (bruteForceState.failedAttempts >= tier.attempts) {
      if (timeSinceLastAttempt < tier.duration) {
        return { allowed: false, remainingLockout: tier.duration - timeSinceLastAttempt };
      }
    }
  }

  // Check permanent lock
  if (bruteForceState.failedAttempts >= BRUTE_FORCE.PERMANENT_LOCK_THRESHOLD) {
    bruteForceState.locked = true;
    return { allowed: false, remainingLockout: -1 };
  }

  return { allowed: true };
}

/**
 * Records a failed login attempt.
 */
function recordFailedAttempt(): void {
  bruteForceState.failedAttempts++;
  bruteForceState.lastAttempt = Date.now();

  if (bruteForceState.failedAttempts >= BRUTE_FORCE.PERMANENT_LOCK_THRESHOLD) {
    bruteForceState.locked = true;
  }
}

/**
 * Resets brute force state on successful login.
 */
function resetBruteForce(): void {
  bruteForceState.failedAttempts = 0;
  bruteForceState.lastAttempt = 0;
  bruteForceState.locked = false;
}

/**
 * Creates a backup of the vault file before saving.
 */
function createBackup(filePath: string): void {
  if (!existsSync(filePath)) return;

  const dir = dirname(filePath);
  const name = basename(filePath, extname(filePath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${name}_backup_${timestamp}.vault`;
  const backupPath = join(dir, backupName);

  copyFileSync(filePath, backupPath);
}

/**
 * Saves the vault to disk.
 */
function saveVault(): Result<void> {
  if (!vaultFilePath || !masterKey || !masterSalt || !encryptedVault) {
    return { success: false, error: 'No vault loaded or not unlocked' };
  }

  try {
    // Re-encrypt with current entries
    encryptedVault = encryptVault(vaultEntries, masterKey, masterSalt);

    // Create backup if enabled
    if (appSettings.autoBackup && existsSync(vaultFilePath)) {
      createBackup(vaultFilePath);
    }

    const data = JSON.stringify(encryptedVault, null, 2);
    writeFileSync(vaultFilePath, data, 'utf8');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save vault: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Fetches favicon for a domain.
 */
function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    return '';
  }
}

/**
 * Registers all IPC handlers.
 */
export function registerIPCHandlers(): void {
  // ========== AUTH CHANNELS ==========

  ipcMain.handle('auth:setup', async (_event, password: string, filePath: string): Promise<Result<{ salt: string }>> => {
    const result = setupNewVault(password);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    masterKey = result.data!.key;
    masterSalt = result.data!.salt;
    encryptedVault = result.data!.encryptedVault;
    vaultEntries = [];
    vaultFilePath = filePath;

    // Save vault to disk
    try {
      saveVault();
      console.log('New vault created and saved at:', filePath);
    } catch (error) {
      console.error('Failed to save new vault:', error);
    }

    // Persist vault path to settings
    appSettings = { ...appSettings, vaultPath: filePath };
    databaseManager.setSetting('vaultPath', filePath);

    // Mark first run as complete
    databaseManager.setSetting('isFirstRun', false);

    resetBruteForce();

    return { success: true, data: { salt: masterSalt.toString('base64') } };
  });

  ipcMain.handle('auth:login', async (_event, password: string, filePath: string): Promise<Result<void>> => {
    const bruteForce = checkBruteForce();
    if (!bruteForce.allowed) {
      if (bruteForce.remainingLockout === -1) {
        return { success: false, error: 'Account permanently locked. Please use backup recovery.' };
      }
      return { success: false, error: `Too many failed attempts. Please wait ${Math.ceil(bruteForce.remainingLockout! / 1000)} seconds.` };
    }

    if (!existsSync(filePath)) {
      return { success: false, error: 'Vault file not found' };
    }

    try {
      const fileContent = readFileSync(filePath, 'utf8');
      const vault: EncryptedVault = JSON.parse(fileContent);

      const result = unlockVault(vault, password);
      if (!result.success) {
        recordFailedAttempt();
        return { success: false, error: 'Incorrect password' };
      }

      masterKey = result.data!.key;
      masterSalt = result.data!.salt;
      encryptedVault = vault;
      vaultFilePath = filePath;

      // Try to load from SQL database first, fallback to decrypted vault
      try {
        const dbEntries = databaseManager.getAllEntries();
        if (dbEntries.length > 0) {
          console.log(`Loaded ${dbEntries.length} entries from SQL database after login`);
          vaultEntries = dbEntries.map(entry => ({
            ...entry,
            passwordHistory: databaseManager.getPasswordHistory(entry.id),
          }));
        } else {
          console.log('SQL database empty, using decrypted vault entries');
          vaultEntries = result.data!.decryptedVault.entries;
          // Sync to SQL for next time
          vaultEntries.forEach(entry => {
            try {
              databaseManager.createEntry(entry);
            } catch (e) {
              // Ignore duplicates
            }
          });
        }
      } catch (error) {
        console.error('Failed to load from SQL, using decrypted vault:', error);
        vaultEntries = result.data!.decryptedVault.entries;
      }

      resetBruteForce();
      resetSessionTimeout(appSettings.sessionTimeout);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to load vault: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('auth:logout', async (): Promise<Result<void>> => {
    lockVault();
    return { success: true };
  });

  ipcMain.handle('auth:verify-master', async (_event, password: string, filePath: string): Promise<Result<boolean>> => {
    if (!existsSync(filePath)) {
      return { success: false, error: 'Vault file not found' };
    }

    try {
      const fileContent = readFileSync(filePath, 'utf8');
      const vault: EncryptedVault = JSON.parse(fileContent);
      const isValid = verifyPassword(vault, password);
      return { success: true, data: isValid };
    } catch {
      return { success: false, error: 'Failed to verify password' };
    }
  });

  ipcMain.handle('auth:get-brute-force-state', async (): Promise<BruteForceState> => {
    const bruteForce = checkBruteForce();
    return {
      ...bruteForceState,
      allowed: bruteForce.allowed,
      remainingLockout: bruteForce.remainingLockout ?? 0,
    } as BruteForceState & { allowed: boolean; remainingLockout: number };
  });

  // ========== VAULT CHANNELS ==========

  ipcMain.handle('vault:load', async (): Promise<Result<VaultEntryWithHistory[]>> => {
    return { success: true, data: vaultEntries };
  });

  ipcMain.handle('vault:save', async (): Promise<Result<void>> => {
    return saveVault();
  });

  ipcMain.handle('vault:create-new', async (_event, password: string, filePath: string): Promise<Result<void>> => {
    const result = setupNewVault(password);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    masterKey = result.data!.key;
    masterSalt = result.data!.salt;
    encryptedVault = result.data!.encryptedVault;
    vaultEntries = [];
    vaultFilePath = filePath;

    resetBruteForce();

    return { success: true };
  });

  ipcMain.handle('vault:import', async (_event, filePath: string): Promise<Result<VaultEntryWithHistory[]>> => {
    try {
      const content = readFileSync(filePath, 'utf8');
      const vault: EncryptedVault = JSON.parse(content);

      if (!masterKey || !masterSalt) {
        return { success: false, error: 'Vault not unlocked' };
      }

      // Merge entries (could add conflict resolution here)
      const merged = [...vaultEntries, ...vault.data ? [] : []];
      return { success: true, data: vaultEntries };
    } catch (error) {
      return { success: false, error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  // ========== ENTRY CHANNELS ==========

  ipcMain.handle('entry:create', async (_event, entry: Omit<VaultEntryWithHistory, 'id' | 'createdAt' | 'updatedAt' | 'passwordHistory'>): Promise<Result<VaultEntryWithHistory>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    const now = new Date().toISOString();
    const newEntry: VaultEntryWithHistory = {
      ...entry,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      passwordHistory: [],
    };

    // Save to SQL database first
    try {
      databaseManager.createEntry({
        id: newEntry.id,
        title: newEntry.title,
        username: newEntry.username,
        password: newEntry.password,
        url: newEntry.url,
        description: newEntry.description,
        category: newEntry.category,
        tags: newEntry.tags,
        icon: newEntry.icon,
        favorite: newEntry.favorite,
        createdAt: newEntry.createdAt,
        updatedAt: newEntry.updatedAt,
      });
      console.log('Entry saved to SQL database:', newEntry.id);
    } catch (error) {
      console.error('Failed to save entry to database:', error);
      // Continue anyway - save to memory vault
    }

    vaultEntries.unshift(newEntry);

    // Auto-save encrypted vault as backup
    saveVault();

    return { success: true, data: newEntry };
  });

  ipcMain.handle('entry:update', async (_event, entry: VaultEntryWithHistory): Promise<Result<VaultEntryWithHistory>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    const index = vaultEntries.findIndex((e) => e.id === entry.id);
    if (index === -1) {
      return { success: false, error: 'Entry not found' };
    }

    // Check if password changed and add to history
    const existing = vaultEntries[index];
    const passwordHistory = [...(existing.passwordHistory || [])];

    if (existing.password !== entry.password && existing.password) {
      passwordHistory.unshift({
        password: existing.password,
        changedAt: new Date().toISOString(),
      });

      // Keep only last 5
      while (passwordHistory.length > 5) {
        passwordHistory.pop();
      }

      // Save to password history in SQL
      try {
        databaseManager.addPasswordHistory(entry.id, existing.password);
      } catch (error) {
        console.error('Failed to save password history:', error);
      }
    }

    vaultEntries[index] = {
      ...entry,
      updatedAt: new Date().toISOString(),
      passwordHistory,
    };

    // Update in SQL database
    try {
      databaseManager.updateEntry({
        id: entry.id,
        title: entry.title,
        username: entry.username,
        password: entry.password,
        url: entry.url,
        description: entry.description,
        category: entry.category,
        tags: entry.tags,
        icon: entry.icon,
        favorite: entry.favorite,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    } catch (error) {
      console.error('Failed to update entry in database:', error);
    }

    saveVault();

    return { success: true, data: vaultEntries[index] };
  });

  ipcMain.handle('entry:delete', async (_event, entryId: string): Promise<Result<void>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    const index = vaultEntries.findIndex((e) => e.id === entryId);
    if (index === -1) {
      return { success: false, error: 'Entry not found' };
    }

    vaultEntries.splice(index, 1);

    // Delete from SQL database
    try {
      databaseManager.deleteEntry(entryId);
    } catch (error) {
      console.error('Failed to delete entry from database:', error);
    }

    saveVault();

    return { success: true };
  });

  ipcMain.handle('entry:get-all', async (): Promise<Result<VaultEntryWithHistory[]>> => {
    // Try to load from SQL database first
    try {
      const dbEntries = databaseManager.getAllEntries();
      console.log(`Loaded ${dbEntries.length} entries from SQL database`);
      
      if (dbEntries.length > 0) {
        // Merge with password history
        vaultEntries = dbEntries.map(entry => ({
          ...entry,
          passwordHistory: databaseManager.getPasswordHistory(entry.id),
        }));
        console.log('Successfully loaded entries from SQL');
      }
    } catch (error) {
      console.error('Failed to load entries from database:', error);
      // Fallback to in-memory vault entries
    }

    return { success: true, data: vaultEntries };
  });

  ipcMain.handle('entry:duplicate', async (_event, entryId: string): Promise<Result<VaultEntryWithHistory>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    const entry = vaultEntries.find((e) => e.id === entryId);
    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    const now = new Date().toISOString();
    const duplicate: VaultEntryWithHistory = {
      ...entry,
      id: uuidv4(),
      title: `${entry.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
      passwordHistory: [],
    };

    vaultEntries.unshift(duplicate);

    // Save to SQL database
    try {
      databaseManager.createEntry({
        id: duplicate.id,
        title: duplicate.title,
        username: duplicate.username,
        password: duplicate.password,
        url: duplicate.url,
        description: duplicate.description,
        category: duplicate.category,
        tags: duplicate.tags,
        icon: duplicate.icon,
        favorite: duplicate.favorite,
        createdAt: duplicate.createdAt,
        updatedAt: duplicate.updatedAt,
      });
    } catch (error) {
      console.error('Failed to save duplicate entry:', error);
    }

    saveVault();

    return { success: true, data: duplicate };
  });

  // ========== SEARCH CHANNELS ==========

  ipcMain.handle('entry:search', async (_event, query: string): Promise<Result<VaultEntryWithHistory[]>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    try {
      const results = databaseManager.searchEntries(query);
      const entriesWithHistory = results.map(entry => ({
        ...entry,
        passwordHistory: databaseManager.getPasswordHistory(entry.id),
      }));
      return { success: true, data: entriesWithHistory };
    } catch (error) {
      return { success: false, error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('entry:get-by-category', async (_event, category: string): Promise<Result<VaultEntryWithHistory[]>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    try {
      const results = databaseManager.getEntriesByCategory(category);
      const entriesWithHistory = results.map(entry => ({
        ...entry,
        passwordHistory: databaseManager.getPasswordHistory(entry.id),
      }));
      return { success: true, data: entriesWithHistory };
    } catch (error) {
      return { success: false, error: `Failed to get entries: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('entry:get-favorites', async (): Promise<Result<VaultEntryWithHistory[]>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    try {
      const results = databaseManager.getFavoriteEntries();
      const entriesWithHistory = results.map(entry => ({
        ...entry,
        passwordHistory: databaseManager.getPasswordHistory(entry.id),
      }));
      return { success: true, data: entriesWithHistory };
    } catch (error) {
      return { success: false, error: `Failed to get favorites: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  // ========== GENERATOR CHANNELS ==========

  ipcMain.handle('generator:generate', async (_event, options: PasswordGeneratorOptions): Promise<Result<{ passwords: Array<{ password: string; strength: string; entropy: number; crackTimeEstimate: string }> }>> => {
    try {
      const generated = generatePasswords(options);
      return {
        success: true,
        data: {
          passwords: generated.map((p) => ({
            password: p.password,
            strength: p.strength,
            entropy: p.entropy,
            crackTimeEstimate: p.crackTimeEstimate,
          })),
        },
      };
    } catch (error) {
      return { success: false, error: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  // ========== FILE CHANNELS ==========

  ipcMain.handle('file:select', async (_event, options: Electron.OpenDialogOptions): Promise<Result<string | string[]>> => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return { success: false, error: 'No window available' };

    const result = await dialog.showOpenDialog(win, options);
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'File selection canceled' };
    }

    return { success: true, data: options.properties?.includes('multiSelections') ? result.filePaths : result.filePaths[0] };
  });

  ipcMain.handle('file:read', async (_event, filePath: string): Promise<Result<string>> => {
    try {
      const content = readFileSync(filePath, 'utf8');
      return { success: true, data: content };
    } catch (error) {
      return { success: false, error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('file:write', async (_event, filePath: string, content: string): Promise<Result<void>> => {
    try {
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('file:backup', async (_event): Promise<Result<void>> => {
    if (!vaultFilePath) {
      return { success: false, error: 'No vault file loaded' };
    }

    try {
      createBackup(vaultFilePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  // ========== SETTINGS CHANNELS ==========

  ipcMain.handle('settings:get', async (): Promise<AppSettings & { isFirstRun: boolean }> => {
    // Try to load from SQL database first
    try {
      const dbSettings = databaseManager.getAllSettings();
      const isFirstRun = !dbSettings.vaultPath || !existsSync(dbSettings.vaultPath);
      
      if (Object.keys(dbSettings).length > 0) {
        console.log('Loaded settings from SQL. isFirstRun:', isFirstRun);
        return { ...DEFAULT_SETTINGS, ...dbSettings, isFirstRun } as AppSettings & { isFirstRun: boolean };
      }
    } catch (error) {
      console.error('Failed to load settings from database:', error);
    }
    
    // Fallback: check if vault path exists in appSettings
    const isFirstRun = !appSettings.vaultPath;
    console.log('Using fallback settings. isFirstRun:', isFirstRun);
    return { ...appSettings, isFirstRun } as AppSettings & { isFirstRun: boolean };
  });

  ipcMain.handle('settings:update', async (_event, settings: Partial<AppSettings>): Promise<Result<void>> => {
    appSettings = { ...appSettings, ...settings };

    // Save to SQL database
    try {
      Object.entries(settings).forEach(([key, value]) => {
        databaseManager.setSetting(key, value);
      });
    } catch (error) {
      console.error('Failed to save settings to database:', error);
    }

    // Reset session timeout if changed
    if (settings.sessionTimeout && masterKey) {
      resetSessionTimeout(settings.sessionTimeout);
    }

    // Notify renderer of settings change
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send('settings:updated', appSettings);
    }

    return { success: true };
  });

  // ========== IMPORT/EXPORT CHANNELS ==========

  ipcMain.handle('import:from-file', async (_event, filePath: string, format: ImportFormat, mapping?: ColumnMapping): Promise<Result<VaultEntryWithHistory[]>> => {
    try {
      const content = readFileSync(filePath, 'utf8');
      return importData(content, format, mapping);
    } catch (error) {
      return { success: false, error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('export:to-file', async (_event, format: ExportFormat, savePath: string, maskSensitive?: boolean): Promise<Result<void>> => {
    if (!masterKey) {
      return { success: false, error: 'Vault not unlocked' };
    }

    const result = exportData(vaultEntries, format, encryptedVault ?? undefined, maskSensitive);
    if (!result.success) {
      return result;
    }

    try {
      const dir = dirname(savePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(savePath, result.data!, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to write export: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  // ========== UTILITY CHANNELS ==========

  ipcMain.handle('util:lock-vault', async (): Promise<Result<void>> => {
    lockVault();
    return { success: true };
  });

  ipcMain.handle('util:get-favicon', async (_event, url: string): Promise<Result<string>> => {
    const faviconUrl = getFaviconUrl(url);
    return { success: true, data: faviconUrl };
  });

  // ========== AUDIT CHANNELS ==========

  ipcMain.handle('audit:get-logs', async (_event, limit: number = 100): Promise<Result<any[]>> => {
    try {
      const logs = databaseManager.getAuditLogs(limit);
      return { success: true, data: logs };
    } catch (error) {
      return { success: false, error: `Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('audit:clear-old', async (_event, days: number = 30): Promise<Result<void>> => {
    try {
      databaseManager.clearOldAuditLogs(days);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to clear audit logs: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  // ========== DATABASE CHANNELS ==========

  ipcMain.handle('database:backup', async (_event, backupPath: string): Promise<Result<void>> => {
    try {
      databaseManager.backup(backupPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });

  ipcMain.handle('database:restore', async (_event, backupPath: string): Promise<Result<void>> => {
    try {
      databaseManager.restore(backupPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  });
}

/**
 * Exposes functions for the main process to use directly.
 */
export function getVaultState(): {
  masterKey: Buffer | null;
  entries: VaultEntryWithHistory[];
  encryptedVault: EncryptedVault | null;
  vaultFilePath: string;
} {
  return {
    masterKey: masterKey ? Buffer.from(masterKey) : null,
    entries: vaultEntries,
    encryptedVault: encryptedVault,
    vaultFilePath: vaultFilePath,
  };
}
