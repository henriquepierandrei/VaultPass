/**
 * Generator store using Zustand.
 * Manages password generator options and generated passwords.
 */

import { create } from 'zustand';
import type { PasswordGeneratorOptions } from '@shared/types';

export interface GeneratedPasswordResult {
  password: string;
  strength: string;
  entropy: number;
  crackTimeEstimate: string;
}

export interface GeneratorState {
  /** Generator options */
  options: PasswordGeneratorOptions;
  /** Generated passwords */
  results: GeneratedPasswordResult[];
  /** Whether generator is running */
  isGenerating: boolean;
  /** Whether the generator modal is open */
  isOpen: boolean;

  // Actions
  setOptions: (options: Partial<PasswordGeneratorOptions>) => void;
  setResults: (results: GeneratedPasswordResult[]) => void;
  setGenerating: (value: boolean) => void;
  setOpen: (open: boolean) => void;
  generate: () => Promise<void>;
  usePassword: (password: string) => void;
}

const defaultOptions: PasswordGeneratorOptions = {
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeAmbiguous: false,
  excludeCharacters: '',
  count: 1,
};

/** Callback for when a password is selected from the generator */
let onPasswordSelectedCallback: ((password: string) => void) | null = null;

export function setOnPasswordSelected(callback: ((password: string) => void) | null): void {
  onPasswordSelectedCallback = callback;
}

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  options: { ...defaultOptions },
  results: [],
  isGenerating: false,
  isOpen: false,

  setOptions: (options) => set((state) => ({
    options: { ...state.options, ...options },
  })),

  setResults: (results) => set({ results }),

  setGenerating: (value) => set({ isGenerating: value }),

  setOpen: (open) => set({ isOpen: open, results: [] }),

  generate: async () => {
    set({ isGenerating: true });

    const result = await window.api.generator.generate(get().options);

    if (result.success && result.data) {
      set({ results: result.data.passwords, isGenerating: false });
    } else {
      set({ isGenerating: false });
    }
  },

  usePassword: (password) => {
    if (onPasswordSelectedCallback) {
      onPasswordSelectedCallback(password);
    }
    set({ isOpen: false, results: [] });
  },
}));
