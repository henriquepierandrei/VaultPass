/**
 * Dashboard page - main password management interface.
 * Layout: Sidebar on left, entry list in center, EntryDrawer on right.
 * Includes search, sorting, filtering, import/export, and CRUD operations.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { VaultEntryWithHistory, SortField, ImportFormat, ExportFormat, ColumnMapping } from '@shared/types';
import { useVaultStore } from '@renderer/store/vaultStore';
import { useSettingsStore } from '@renderer/store/settingsStore';
import { Sidebar } from '@renderer/components/Sidebar';
import { EntryCard } from '@renderer/components/EntryCard';
import { EntryDrawer } from '@renderer/components/EntryDrawer';
import { SkeletonCard } from '@renderer/components/SkeletonCard';
import { EmptyState } from '@renderer/components/EmptyState';
import { EntryForm } from '@renderer/components/EntryForm';
import { GeneratorModal } from '@renderer/components/GeneratorModal';
import { ImportExportModal } from '@renderer/components/ImportExportModal';
import { ConfirmDialog } from '@renderer/components/ConfirmDialog';

type DashboardView = 'list' | 'create' | 'edit';
type ImportExportTab = 'import' | 'export' | null;

export function Dashboard(): JSX.Element {
  const { sidebarCollapsed } = useSettingsStore();
  const {
    entries,
    selectedEntryId,
    isLoading,
    filters,
    sort,
    isDrawerOpen,
    setEntries,
    setSelectedEntry,
    setLoading,
    setFilters,
    setSort,
    toggleDrawer,
    deleteEntry,
    addEntry,
    updateEntry,
    getFilteredEntries,
    getSelectedEntry,
  } = useVaultStore();

  const [view, setView] = useState<DashboardView>('list');
  const [searchInput, setSearchInput] = useState(filters.searchQuery);
  const [showImportExport, setShowImportExport] = useState<ImportExportTab>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntryWithHistory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Load vault entries on mount
  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      try {
        const result = await window.api.entry.getAll();
        if (result.success && result.data) {
          setEntries(result.data);
        } else {
          toast.error(result.error ?? 'Failed to load vault entries');
        }
      } catch {
        toast.error('Failed to load vault entries');
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, [setEntries, setLoading]);

  // Ctrl+F focus handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync search input with store
  const handleSearchSubmit = useCallback(() => {
    setFilters({ searchQuery: searchInput });
  }, [searchInput, setFilters]);

  // Entry selection
  const handleEntryClick = useCallback(
    (id: string) => {
      setSelectedEntry(id);
    },
    [setSelectedEntry]
  );

  // New entry
  const handleNewEntry = useCallback(() => {
    setView('create');
    setEditingEntry(null);
  }, []);

  // Create entry
  const handleCreateEntry = useCallback(
    async (data: any) => {
      setIsSubmitting(true);
      try {
        const { id: _id, passwordHistory: _ph, ...createData } = data;
        const result = await window.api.entry.create(createData);
        if (result.success && result.data) {
          addEntry(result.data);
          toast.success('Entry created');
          setView('list');
        } else {
          toast.error(result.error ?? 'Failed to create entry');
        }
      } catch {
        toast.error('Failed to create entry');
      } finally {
        setIsSubmitting(false);
      }
    },
    [addEntry]
  );

  // Edit entry
  const handleEditEntry = useCallback(
    async (data: any) => {
      if (!editingEntry) return;
      setIsSubmitting(true);
      try {
        const updated = { ...editingEntry, ...data };
        const result = await window.api.entry.update(updated);
        if (result.success && result.data) {
          updateEntry(result.data);
          toast.success('Entry updated');
          setView('list');
          setEditingEntry(null);
        } else {
          toast.error(result.error ?? 'Failed to update entry');
        }
      } catch {
        toast.error('Failed to update entry');
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingEntry, updateEntry]
  );

  // Cancel create/edit
  const handleCancelForm = useCallback(() => {
    setView('list');
    setEditingEntry(null);
  }, []);

  // Handle edit from drawer
  const handleEditFromDrawer = useCallback(
    (entry: VaultEntryWithHistory) => {
      setEditingEntry(entry);
      setView('edit');
      toggleDrawer(false);
    },
    [toggleDrawer]
  );

  // Handle duplicate from drawer
  const handleDuplicateFromDrawer = useCallback(
    async (entry: VaultEntryWithHistory) => {
      try {
        const result = await window.api.entry.duplicate(entry.id);
        if (result.success && result.data) {
          addEntry(result.data);
          toast.success('Entry duplicated');
        } else {
          toast.error(result.error ?? 'Failed to duplicate entry');
        }
      } catch {
        toast.error('Failed to duplicate entry');
      }
    },
    [addEntry]
  );

  // Handle delete from drawer
  const handleDeleteFromDrawer = useCallback(
    async (id: string) => {
      try {
        const result = await window.api.entry.delete(id);
        if (result.success) {
          deleteEntry(id);
          toast.success('Entry deleted');
        } else {
          toast.error(result.error ?? 'Failed to delete entry');
        }
      } catch {
        toast.error('Failed to delete entry');
      }
    },
    [deleteEntry]
  );

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (selectedEntryId) {
      setShowDeleteConfirm(false);
      handleDeleteFromDrawer(selectedEntryId);
    }
  }, [selectedEntryId, handleDeleteFromDrawer]);

  // Import handler
  const handleImport = useCallback(
    async (_file: File, format: ImportFormat, mapping?: ColumnMapping) => {
      try {
        const result = await window.api.import.fromFile('', format, mapping);
        if (result.success && result.data) {
          setEntries(result.data);
          toast.success(`Imported ${result.data.length} entries`);
        } else {
          toast.error(result.error ?? 'Import failed');
        }
      } catch {
        toast.error('Failed to import entries');
      }
    },
    [setEntries]
  );

  // Export handler
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      try {
        const result = await window.api.file.select({
          title: 'Export vault as',
          properties: ['showOverwriteConfirmation'],
        });
        if (result.success && result.data && typeof result.data === 'string') {
          const exportResult = await window.api.export.toFile(format, result.data);
          if (exportResult.success) {
            toast.success('Export successful');
          } else {
            toast.error(exportResult.error ?? 'Export failed');
          }
        }
      } catch {
        toast.error('Failed to export vault');
      }
    },
    []
  );

  // Sort options
  const sortOptions: { field: SortField; direction: 'asc' | 'desc'; label: string; icon: string }[] = [
    { field: 'title', direction: 'asc', label: 'Name (A-Z)', icon: 'sort_by_alpha' },
    { field: 'title', direction: 'desc', label: 'Name (Z-A)', icon: 'sort_by_alpha' },
    { field: 'createdAt', direction: 'desc', label: 'Newest First', icon: 'schedule' },
    { field: 'createdAt', direction: 'asc', label: 'Oldest First', icon: 'schedule' },
    { field: 'updatedAt', direction: 'desc', label: 'Recently Updated', icon: 'update' },
    { field: 'strength', direction: 'desc', label: 'Strongest First', icon: 'security' },
  ];

  const currentSortLabel = sortOptions.find(
    (o) => o.field === sort.field && o.direction === sort.direction
  )?.label ?? 'Name (A-Z)';

  const filteredEntries = getFilteredEntries();
  const selectedEntry = getSelectedEntry();

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-60';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarWidth} flex-shrink-0`}>
        <Sidebar onNewEntry={handleNewEntry} />
      </div>

      {/* Main content */}
      <main
        className={`flex flex-1 flex-col transition-all duration-300 ease-spring ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}
        aria-label="Main content"
      >
        {/* Form view (create/edit) */}
        {view === 'create' || view === 'edit' ? (
          <div className="mx-auto w-full max-w-2xl overflow-y-auto px-6 py-8">
            <EntryForm
              entry={view === 'edit' ? editingEntry : null}
              onSubmit={view === 'edit' ? handleEditEntry : handleCreateEntry}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          <>
            {/* Top bar */}
            <header className="flex items-center gap-3 border-b border-border-subtle bg-background-secondary px-5 py-3">
              {/* Search */}
              <div className="relative flex-1">
                <div className="input-field-icon">
                  <span className="material-symbols-rounded text-lg">search</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchSubmit();
                    }}
                    placeholder="Search vault... (Ctrl+F)"
                    className="input-field pl-10 pr-8 bg-surface-secondary border-transparent"
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

              <div className="flex-1" />

              {/* Sort dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="btn-secondary gap-2 text-sm"
                  aria-label="Sort entries"
                  aria-expanded={showSortDropdown}
                >
                  <span className="material-symbols-rounded text-lg">sort</span>
                  {currentSortLabel}
                </button>
                {showSortDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface-secondary py-1 shadow-elevation-3 animate-scale-in origin-top-right" role="menu">
                    {sortOptions.map((option) => (
                      <button
                        key={`${option.field}-${option.direction}`}
                        onClick={() => {
                          setSort({ field: option.field, direction: option.direction });
                          setShowSortDropdown(false);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          sort.field === option.field && sort.direction === option.direction
                            ? 'bg-accent-500/10 text-accent-400'
                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                        }`}
                        role="menuitem"
                      >
                        <span className="material-symbols-rounded text-lg">{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Import/Export */}
              <button
                onClick={() => setShowImportExport('import')}
                className="btn-secondary gap-2 text-sm"
                aria-label="Import or export vault data"
              >
                <span className="material-symbols-rounded text-lg">swap_horiz</span>
                Import/Export
              </button>

              {/* New Entry */}
              <button onClick={handleNewEntry} className="btn-primary gap-2 text-sm" aria-label="Create new entry">
                <span className="material-symbols-rounded text-lg">add</span>
                New Entry
              </button>
            </header>

            {/* Entry list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin" role="list" aria-label="Vault entries">
              {isLoading ? (
                <div className="space-y-3">
                  <SkeletonCard count={5} />
                </div>
              ) : filteredEntries.length === 0 ? (
                <EmptyState
                  icon={entries.length === 0 ? 'lock_open' : 'search_off'}
                  title={entries.length === 0 ? 'Your vault is empty' : 'No entries found'}
                  description={
                    entries.length === 0
                      ? 'Create your first entry to start storing passwords securely.'
                      : 'Try adjusting your search or filters.'
                  }
                  actionButton={
                    entries.length === 0
                      ? { label: 'Create Entry', icon: 'add', onClick: handleNewEntry }
                      : undefined
                  }
                />
              ) : (
                <div className="grid gap-2">
                  {filteredEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      isSelected={entry.id === selectedEntryId}
                      onClick={handleEntryClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Entry Drawer */}
      {selectedEntry && (
        <EntryDrawer
          entry={selectedEntry}
          isOpen={isDrawerOpen}
          onClose={() => toggleDrawer(false)}
          onEdit={handleEditFromDrawer}
          onDuplicate={handleDuplicateFromDrawer}
          onDelete={() => {
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Entry"
        message={`Are you sure you want to delete "${editingEntry?.title ?? selectedEntryId}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      />

      {/* Import/Export Modal */}
      {showImportExport && (
        <ImportExportModal
          isOpen={showImportExport !== null}
          onClose={() => setShowImportExport(null)}
          onImport={handleImport}
          onExport={handleExport}
        />
      )}

      {/* Generator Modal is provided by App.tsx but we include it for standalone use */}
      <GeneratorModal />
    </div>
  );
}
