/**
 * Sidebar component with navigation, categories, filters, and settings.
 * Premium enterprise design with smooth animations and modern styling.
 */

import { useState, useCallback } from 'react';
import type { EntryCategory } from '@shared/types';
import { CATEGORY_LABELS } from '@shared/constants';
import { useVaultStore } from '@renderer/store/vaultStore';
import { useSettingsStore } from '@renderer/store/settingsStore';
import { useNavigate } from 'react-router-dom';

const CATEGORIES: { key: EntryCategory | 'all'; icon: string }[] = [
  { key: 'all', icon: 'apps' },
  { key: 'login', icon: 'password' },
  { key: 'credit-card', icon: 'credit_card' },
  { key: 'identity', icon: 'badge' },
  { key: 'secure-note', icon: 'sticky_note_2' },
  { key: 'software-license', icon: 'key' },
  { key: 'api-key', icon: 'api' },
  { key: 'database', icon: 'storage' },
  { key: 'email', icon: 'mail' },
  { key: 'social', icon: 'group' },
  { key: 'financial', icon: 'account_balance' },
  { key: 'health', icon: 'monitor_heart' },
  { key: 'government', icon: 'gavel' },
  { key: 'other', icon: 'folder' },
];

interface SidebarProps {
  onNewEntry?: () => void;
}

export function Sidebar({ onNewEntry }: SidebarProps): JSX.Element {
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed, isLoaded } = useSettingsStore();
  const { filters, setFilters, resetFilters } = useVaultStore();

  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const [showFavorites, setShowFavorites] = useState(filters.favoritesOnly);
  const [showTrash, setShowTrash] = useState(false);

  const handleSearchSubmit = useCallback(() => {
    setFilters({ searchQuery: searchInput });
  }, [searchInput, setFilters]);

  const handleCategoryClick = useCallback(
    (category: EntryCategory | 'all') => {
      setFilters({ category });
    },
    [setFilters]
  );

  const handleFavoritesToggle = useCallback(() => {
    const next = !showFavorites;
    setShowFavorites(next);
    setFilters({ favoritesOnly: next });
  }, [showFavorites, setFilters]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setSearchInput('');
    setShowFavorites(false);
  }, [resetFilters]);

  const handleNavigateSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const handleNavigateAudit = useCallback(() => {
    navigate('/audit');
  }, [navigate]);

  const handleNewEntry = useCallback(() => {
    onNewEntry?.();
  }, [onNewEntry]);

  const isExpanded = !sidebarCollapsed;

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-full flex-col border-r border-border-subtle bg-background-secondary transition-all duration-300 ease-spring ${
        isExpanded ? 'w-60' : 'w-16'
      }`}
      aria-label="Sidebar navigation"
    >
      {/* Logo / Header */}
      <div className={`flex items-center ${isExpanded ? 'gap-2 px-3 py-3' : 'justify-center py-3'}`}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="icon-btn flex-shrink-0 hover:bg-surface-secondary"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="material-symbols-rounded text-xl">
            {isExpanded ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>
        {isExpanded && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="material-symbols-rounded text-accent-400 text-xl">lock</span>
            <span className="truncate text-base font-bold text-text-primary tracking-tight">VaultPass</span>
          </div>
        )}
      </div>

      {/* New Entry Button */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <button onClick={handleNewEntry} className="btn-primary w-full justify-center">
            <span className="material-symbols-rounded text-lg">add</span>
            New Entry
          </button>
        </div>
      )}
      {!isExpanded && (
        <div className="flex justify-center pb-3">
          <button onClick={handleNewEntry} className="icon-btn bg-accent-500/10 text-accent-400 hover:bg-accent-500/20" aria-label="New entry">
            <span className="material-symbols-rounded">add</span>
          </button>
        </div>
      )}

      {/* Search */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <div className="relative">
            <div className="input-field-icon">
              <span className="material-symbols-rounded text-lg text-text-muted">search</span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit();
                }}
                placeholder="Search vault..."
                className="input-field pl-10 pr-8 bg-surface-secondary border-transparent text-sm"
                aria-label="Search vault entries"
              />
            </div>
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setFilters({ searchQuery: '' });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn"
                aria-label="Clear search"
              >
                <span className="material-symbols-rounded text-sm">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable navigation area */}
      <nav className="flex-1 overflow-y-auto px-2 scrollbar-thin" aria-label="Categories">
        {isExpanded && (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-text-faint">
            Categories
          </p>
        )}
        <ul role="list" className="space-y-0.5">
          {CATEGORIES.map(({ key, icon }) => {
            const isActive = filters.category === key;
            return (
              <li key={key}>
                <button
                  onClick={() => handleCategoryClick(key)}
                  className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-spring ${
                    isExpanded ? 'gap-3' : 'justify-center'
                  } ${
                    isActive
                      ? 'bg-accent-500/10 text-accent-400 shadow-sm'
                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                  }`}
                  aria-label={`Filter by ${key === 'all' ? 'all categories' : CATEGORY_LABELS[key]}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`material-symbols-rounded text-lg flex-shrink-0 ${isActive ? 'text-accent-400' : ''}`}>{icon}</span>
                  {isExpanded && (
                    <span className="truncate">
                      {key === 'all' ? 'All Items' : CATEGORY_LABELS[key]}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section: Favorites, Trash, Settings */}
      <div className="border-t border-border-subtle px-2 py-3">
        <ul role="list" className="space-y-0.5">
          {/* Favorites */}
          <li>
            <button
              onClick={handleFavoritesToggle}
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isExpanded ? 'gap-3' : 'justify-center'
              } ${
                showFavorites
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              }`}
              aria-label={showFavorites ? 'Hide favorites' : 'Show favorites'}
              aria-pressed={showFavorites}
            >
              <span className={`material-symbols-rounded text-lg ${showFavorites ? 'filled' : ''}`}>
                star
              </span>
              {isExpanded && <span>Favorites</span>}
            </button>
          </li>

          {/* Audit */}
          <li>
            <button
              onClick={handleNavigateAudit}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-surface-secondary hover:text-text-primary"
              aria-label="Security audit"
            >
              {isExpanded ? (
                <>
                  <span className="material-symbols-rounded text-lg flex-shrink-0 mr-3">security</span>
                  <span>Security Audit</span>
                </>
              ) : (
                <span className="material-symbols-rounded text-lg">security</span>
              )}
            </button>
          </li>

          {/* Settings */}
          <li>
            <button
              onClick={handleNavigateSettings}
              className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-surface-secondary hover:text-text-primary"
              aria-label="Settings"
            >
              {isExpanded ? (
                <>
                  <span className="material-symbols-rounded text-lg flex-shrink-0 mr-3">settings</span>
                  <span>Settings</span>
                </>
              ) : (
                <span className="material-symbols-rounded text-lg">settings</span>
              )}
            </button>
          </li>

          {/* Reset filters */}
          {isExpanded && (filters.category !== 'all' || filters.favoritesOnly || filters.searchQuery) && (
            <li className="pt-2">
              <button
                onClick={handleResetFilters}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-text-muted transition-all duration-200 hover:text-text-secondary hover:bg-surface-secondary"
                aria-label="Reset all filters"
              >
                <span className="material-symbols-rounded text-lg">restart_alt</span>
                Reset Filters
              </button>
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}
