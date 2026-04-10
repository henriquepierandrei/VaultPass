/**
 * Settings store using Zustand.
 * Manages application settings persisted via electron-store.
 */

import { create } from 'zustand';
import type { AppSettings } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/constants';

export interface SettingsState extends AppSettings {
  /** Whether settings have been loaded */
  isLoaded: boolean;

  // Actions
  setSettings: (settings: Partial<AppSettings>) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setSessionTimeout: (timeout: 5 | 15 | 30 | 60) => void;
  setVaultPath: (path: string) => void;
  setAutoBackup: (enabled: boolean) => void;
  setBackupPath: (path: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  loadSettings: () => Promise<void>;
  applyTheme: (theme: 'dark' | 'light') => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  setSettings: (settings) => set((state) => ({ ...state, ...settings })),

  setTheme: async (theme) => {
    get().applyTheme(theme);
    await window.api.settings.update({ theme });
    set({ theme });
  },

  setSessionTimeout: async (timeout) => {
    await window.api.settings.update({ sessionTimeout: timeout });
    set({ sessionTimeout: timeout });
  },

  setVaultPath: async (path) => {
    await window.api.settings.update({ vaultPath: path });
    set({ vaultPath: path });
  },

  setAutoBackup: async (enabled) => {
    await window.api.settings.update({ autoBackup: enabled });
    set({ autoBackup: enabled });
  },

  setBackupPath: async (path) => {
    await window.api.settings.update({ backupPath: path });
    set({ backupPath: path });
  },

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  loadSettings: async () => {
    try {
      const settings = await window.api.settings.get();
      get().applyTheme(settings.theme);
      set({ ...settings, isLoaded: true });
      
      // Update auth store with vault path and first run status
      if (settings.vaultPath) {
        const { useAuthStore } = await import('@renderer/store/authStore');
        useAuthStore.getState().setVaultPath(settings.vaultPath);
        useAuthStore.getState().setFirstRun(false);
      }
    } catch {
      set({ ...DEFAULT_SETTINGS, isLoaded: true });
    }
  },

  applyTheme: (theme) => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      html.classList.remove('dark');
      html.classList.add('light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
    }
    // Persist to localStorage for consistency
    localStorage.setItem('vaultpass-theme', theme);
  },
}));
