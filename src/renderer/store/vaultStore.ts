/**
 * Vault entries store using Zustand.
 * Manages the list of vault entries, filtering, sorting, and selection.
 */

import { create } from 'zustand';
import type {
  VaultEntryWithHistory,
  FilterConfig,
  SortConfig,
  EntryCategory,
  PasswordStrength,
} from '@shared/types';
import { calculatePasswordStrength } from '@shared/password-utils';

export interface VaultState {
  /** All vault entries */
  entries: VaultEntryWithHistory[];
  /** Currently selected entry ID */
  selectedEntryId: string | null;
  /** Whether entries are being loaded */
  isLoading: boolean;
  /** Filter configuration */
  filters: FilterConfig;
  /** Sort configuration */
  sort: SortConfig;
  /** Whether the detail drawer is open */
  isDrawerOpen: boolean;

  // Actions
  setEntries: (entries: VaultEntryWithHistory[]) => void;
  setSelectedEntry: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<FilterConfig>) => void;
  resetFilters: () => void;
  setSort: (sort: Partial<SortConfig>) => void;
  toggleDrawer: (open?: boolean) => void;
  toggleFavorite: (id: string) => void;
  deleteEntry: (id: string) => void;
  addEntry: (entry: VaultEntryWithHistory) => void;
  updateEntry: (entry: VaultEntryWithHistory) => void;

  // Computed
  getFilteredEntries: () => VaultEntryWithHistory[];
  getSelectedEntry: () => VaultEntryWithHistory | null;
}

const defaultFilters: FilterConfig = {
  category: 'all',
  favoritesOnly: false,
  minStrength: 'all',
  searchQuery: '',
};

const defaultSort: SortConfig = {
  field: 'title',
  direction: 'asc',
};

export const useVaultStore = create<VaultState>((set, get) => ({
  entries: [],
  selectedEntryId: null,
  isLoading: false,
  filters: { ...defaultFilters },
  sort: { ...defaultSort },
  isDrawerOpen: false,

  setEntries: (entries) => set({ entries }),
  setSelectedEntry: (id) => set({ selectedEntryId: id, isDrawerOpen: id !== null }),
  setLoading: (loading) => set({ isLoading: loading }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  setSort: (sort) => set((state) => ({
    sort: { ...state.sort, ...sort },
  })),

  toggleDrawer: (open) => set((state) => ({
    isDrawerOpen: open !== undefined ? open : !state.isDrawerOpen,
    selectedEntryId: open === false ? null : state.selectedEntryId,
  })),

  toggleFavorite: (id) => set((state) => ({
    entries: state.entries.map((e) =>
      e.id === id ? { ...e, favorite: !e.favorite } : e
    ),
  })),

  deleteEntry: (id) => set((state) => ({
    entries: state.entries.filter((e) => e.id !== id),
    selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
    isDrawerOpen: state.selectedEntryId === id ? false : state.isDrawerOpen,
  })),

  addEntry: (entry) => set((state) => ({
    entries: [entry, ...state.entries],
  })),

  updateEntry: (entry) => set((state) => ({
    entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
  })),

  getFilteredEntries: () => {
    const { entries, filters, sort } = get();
    let filtered = [...entries];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.username.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          e.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((e) => e.category === filters.category);
    }

    // Favorites filter
    if (filters.favoritesOnly) {
      filtered = filtered.filter((e) => e.favorite);
    }

    // Strength filter
    if (filters.minStrength !== 'all') {
      const strengthOrder = ['very-weak', 'weak', 'medium', 'strong', 'very-strong'];
      const minIndex = strengthOrder.indexOf(filters.minStrength);
      filtered = filtered.filter((e) => {
        const strength = calculatePasswordStrength(e.password);
        return strengthOrder.indexOf(strength) >= minIndex;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'strength': {
          const strengthOrder = ['very-weak', 'weak', 'medium', 'strong', 'very-strong'];
          const aStrength = strengthOrder.indexOf(calculatePasswordStrength(a.password));
          const bStrength = strengthOrder.indexOf(calculatePasswordStrength(b.password));
          comparison = aStrength - bStrength;
          break;
        }
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });

    return filtered;
  },

  getSelectedEntry: () => {
    const { entries, selectedEntryId } = get();
    return entries.find((e) => e.id === selectedEntryId) ?? null;
  },
}));
