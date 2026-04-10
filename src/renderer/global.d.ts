/**
 * Global type declarations for the VaultPass renderer process.
 * Extends the Window interface with the vault API exposed via preload.
 */

import type { VaultAPI } from '@preload/preload';

declare global {
  interface Window {
    api: VaultAPI;
  }
}

export {};
