/**
 * Authentication state store using Zustand.
 * Manages login state, brute force status, and session info.
 */

import { create } from 'zustand';

export interface AuthState {
  /** Whether the vault is currently unlocked */
  isAuthenticated: boolean;
  /** Whether this is the first time setup */
  isFirstRun: boolean;
  /** Brute force state from main process */
  bruteForceState: {
    failedAttempts: number;
    locked: boolean;
    allowed: boolean;
    remainingLockout: number;
  } | null;
  /** Vault file path */
  vaultPath: string;

  // Actions
  setAuthenticated: (value: boolean) => void;
  setFirstRun: (value: boolean) => void;
  setVaultPath: (path: string) => void;
  setBruteForceState: (state: AuthState['bruteForceState']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isFirstRun: true,
  bruteForceState: null,
  vaultPath: '',

  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setFirstRun: (value) => set({ isFirstRun: value }),
  setVaultPath: (path) => set({ vaultPath: path }),
  setBruteForceState: (state) => set({ bruteForceState: state }),

  logout: () => set({
    isAuthenticated: false,
    bruteForceState: null,
  }),
}));
