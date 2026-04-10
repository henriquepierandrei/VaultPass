/**
 * Preload script that securely exposes IPC channels to the renderer.
 * Uses contextBridge for isolation - no Node.js APIs exposed directly.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  VaultEntryWithHistory,
  PasswordGeneratorOptions,
  AppSettings,
  BruteForceState,
  ImportFormat,
  ExportFormat,
  ColumnMapping,
  Result,
} from '@shared/types';

/**
 * Typed API surface exposed to the renderer via contextBridge.
 * Available as window.api.* in the renderer process.
 */
const api = {
  // Auth
  auth: {
    setup: (password: string, filePath: string) =>
      ipcRenderer.invoke('auth:setup', password, filePath) as Promise<Result<{ salt: string }>>,
    login: (password: string, filePath: string) =>
      ipcRenderer.invoke('auth:login', password, filePath) as Promise<Result<void>>,
    logout: () =>
      ipcRenderer.invoke('auth:logout') as Promise<Result<void>>,
    verifyMaster: (password: string, filePath: string) =>
      ipcRenderer.invoke('auth:verify-master', password, filePath) as Promise<Result<boolean>>,
    getBruteForceState: () =>
      ipcRenderer.invoke('auth:get-brute-force-state') as Promise<BruteForceState & { allowed: boolean; remainingLockout: number }>,
  },

  // Vault
  vault: {
    load: () =>
      ipcRenderer.invoke('vault:load') as Promise<Result<VaultEntryWithHistory[]>>,
    save: () =>
      ipcRenderer.invoke('vault:save') as Promise<Result<void>>,
    createNew: (password: string, filePath: string) =>
      ipcRenderer.invoke('vault:create-new', password, filePath) as Promise<Result<void>>,
    importVault: (filePath: string) =>
      ipcRenderer.invoke('vault:import', filePath) as Promise<Result<VaultEntryWithHistory[]>>,
  },

  // Entries
  entry: {
    create: (entry: Omit<VaultEntryWithHistory, 'id' | 'createdAt' | 'updatedAt' | 'passwordHistory'>) =>
      ipcRenderer.invoke('entry:create', entry) as Promise<Result<VaultEntryWithHistory>>,
    update: (entry: VaultEntryWithHistory) =>
      ipcRenderer.invoke('entry:update', entry) as Promise<Result<VaultEntryWithHistory>>,
    delete: (entryId: string) =>
      ipcRenderer.invoke('entry:delete', entryId) as Promise<Result<void>>,
    getAll: () =>
      ipcRenderer.invoke('entry:get-all') as Promise<Result<VaultEntryWithHistory[]>>,
    duplicate: (entryId: string) =>
      ipcRenderer.invoke('entry:duplicate', entryId) as Promise<Result<VaultEntryWithHistory>>,
    search: (query: string) =>
      ipcRenderer.invoke('entry:search', query) as Promise<Result<VaultEntryWithHistory[]>>,
    getByCategory: (category: string) =>
      ipcRenderer.invoke('entry:get-by-category', category) as Promise<Result<VaultEntryWithHistory[]>>,
    getFavorites: () =>
      ipcRenderer.invoke('entry:get-favorites') as Promise<Result<VaultEntryWithHistory[]>>,
  },

  // Generator
  generator: {
    generate: (options: PasswordGeneratorOptions) =>
      ipcRenderer.invoke('generator:generate', options) as Promise<Result<{
        passwords: Array<{ password: string; strength: string; entropy: number; crackTimeEstimate: string }>;
      }>>,
  },

  // File
  file: {
    select: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('file:select', options) as Promise<Result<string | string[]>>,
    read: (filePath: string) =>
      ipcRenderer.invoke('file:read', filePath) as Promise<Result<string>>,
    write: (filePath: string, content: string) =>
      ipcRenderer.invoke('file:write', filePath, content) as Promise<Result<void>>,
    backup: () =>
      ipcRenderer.invoke('file:backup') as Promise<Result<void>>,
  },

  // Settings
  settings: {
    get: () =>
      ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
    update: (settings: Partial<AppSettings>) =>
      ipcRenderer.invoke('settings:update', settings) as Promise<Result<void>>,
  },

  // Import/Export
  import: {
    fromFile: (filePath: string, format: ImportFormat, mapping?: ColumnMapping) =>
      ipcRenderer.invoke('import:from-file', filePath, format, mapping) as Promise<Result<VaultEntryWithHistory[]>>,
  },
  export: {
    toFile: (format: ExportFormat, savePath: string, maskSensitive?: boolean) =>
      ipcRenderer.invoke('export:to-file', format, savePath, maskSensitive) as Promise<Result<void>>,
  },

  // Utility
  util: {
    lockVault: () =>
      ipcRenderer.invoke('util:lock-vault') as Promise<Result<void>>,
    getFavicon: (url: string) =>
      ipcRenderer.invoke('util:get-favicon', url) as Promise<Result<string>>,
  },

  // Audit
  audit: {
    getLogs: (limit?: number) =>
      ipcRenderer.invoke('audit:get-logs', limit) as Promise<Result<any[]>>,
    clearOld: (days?: number) =>
      ipcRenderer.invoke('audit:clear-old', days) as Promise<Result<void>>,
  },

  // Database
  database: {
    backup: (backupPath: string) =>
      ipcRenderer.invoke('database:backup', backupPath) as Promise<Result<void>>,
    restore: (backupPath: string) =>
      ipcRenderer.invoke('database:restore', backupPath) as Promise<Result<void>>,
  },

  // IPC event listeners
  events: {
    onVaultLocked: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('vault:locked', listener);
      return () => ipcRenderer.removeListener('vault:locked', listener);
    },
    onSettingsUpdated: (callback: (settings: AppSettings) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, settings: AppSettings) => callback(settings);
      ipcRenderer.on('settings:updated', listener);
      return () => ipcRenderer.removeListener('settings:updated', listener);
    },
  },
};

/** Expose the API to the renderer process */
contextBridge.exposeInMainWorld('api', api);

/** Export for TypeScript type checking */
export type VaultAPI = typeof api;
