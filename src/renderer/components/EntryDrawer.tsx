/**
 * EntryDrawer component showing full entry details.
 * Slides in from the right with copy buttons, password history, and action buttons.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VaultEntryWithHistory } from '@shared/types';
import { useVaultStore } from '@renderer/store/vaultStore';
import { useEscapeKey, useFocusTrap } from '@renderer/hooks/useHooks';
import { copyToClipboard } from '@renderer/utils/clipboard';
import { toast } from 'sonner';

interface EntryDrawerProps {
  entry: VaultEntryWithHistory | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (entry: VaultEntryWithHistory) => void;
  onDuplicate: (entry: VaultEntryWithHistory) => void;
  onDelete: (id: string) => void;
}

export function EntryDrawer({
  entry,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: EntryDrawerProps): JSX.Element {
  const drawerRef = useRef<HTMLDivElement>(null);
  const { toggleFavorite } = useVaultStore();
  const [showPassword, setShowPassword] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);

  useEscapeKey(onClose);
  useFocusTrap(drawerRef, isOpen);

  // Reset local state when entry changes
  useEffect(() => {
    setShowPassword(false);
    setExpandedHistory(false);
  }, [entry?.id]);

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await copyToClipboard(text);
        toast.success(`${label} copied to clipboard`);
      } catch {
        toast.error(`Failed to copy ${label.toLowerCase()}`);
      }
    },
    []
  );

  const handleToggleFavorite = useCallback(() => {
    if (entry) {
      toggleFavorite(entry.id);
    }
  }, [entry, toggleFavorite]);

  const handleDelete = useCallback(() => {
    if (entry) {
      onDelete(entry.id);
      onClose();
    }
  }, [entry, onDelete, onClose]);

  if (!isOpen || !entry) {
    return <></>;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/30 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Entry details: ${entry.title}`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-surface-hover">
                {entry.icon ? (
                  <img src={entry.icon} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="material-symbols-rounded text-text-muted">
                    {getCategoryIcon(entry.category)}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary">{entry.title}</h2>
                <span className="text-xs text-text-muted">{getCategoryLabel(entry.category)}</span>
              </div>
            </div>
            <button onClick={onClose} className="icon-btn" aria-label="Close drawer">
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
            {/* Title */}
            <DetailField
              label="Title"
              value={entry.title}
              onCopy={() => handleCopy(entry.title, 'Title')}
            />

            {/* Username */}
            {entry.username && (
              <DetailField
                label="Username"
                value={entry.username}
                onCopy={() => handleCopy(entry.username, 'Username')}
              />
            )}

            {/* Password */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">Password</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="icon-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-rounded text-sm">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleCopy(entry.password, 'Password')}
                    className="icon-btn"
                    aria-label="Copy password"
                  >
                    <span className="material-symbols-rounded text-sm">content_copy</span>
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface-hover px-3 py-2">
                <p className="font-mono text-sm text-text-primary break-all">
                  {showPassword ? entry.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                </p>
              </div>
            </div>

            {/* URL */}
            {entry.url && (
              <DetailField
                label="URL"
                value={entry.url}
                isLink
                onCopy={() => handleCopy(entry.url, 'URL')}
              />
            )}

            {/* Description */}
            {entry.description && (
              <div>
                <span className="mb-1 block text-sm font-medium text-text-secondary">
                  Description
                </span>
                <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-text-primary">
                  {entry.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div>
                <span className="mb-1 block text-sm font-medium text-text-secondary">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-accent-500/10 px-2.5 py-0.5 text-xs text-accent-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Password History */}
            {entry.passwordHistory.length > 0 && (
              <div>
                <button
                  onClick={() => setExpandedHistory(!expandedHistory)}
                  className="flex w-full items-center justify-between text-sm font-medium text-text-secondary hover:text-text-primary"
                  aria-expanded={expandedHistory}
                >
                  <span>Password History ({entry.passwordHistory.length})</span>
                  <span className="material-symbols-rounded text-sm transition-transform">
                    {expandedHistory ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {expandedHistory && (
                  <div className="mt-2 space-y-2">
                    {entry.passwordHistory.map((hist, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface-hover px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-text-primary break-all">
                            {'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                          </p>
                          <p className="mt-0.5 text-xxs text-text-muted">
                            Changed: {new Date(hist.changedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(hist.password, 'Previous password')}
                          className="icon-btn ml-2 flex-shrink-0"
                          aria-label="Copy previous password"
                        >
                          <span className="material-symbols-rounded text-sm">content_copy</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-1 border-t border-border pt-3 text-xs text-text-muted">
              <p>Created: {new Date(entry.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(entry.updatedAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-2 border-t border-border px-5 py-3">
            <button
              onClick={handleToggleFavorite}
              className={`icon-btn ${entry.favorite ? 'text-yellow-400' : 'text-text-muted'}`}
              aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <span className={`material-symbols-rounded ${entry.favorite ? 'filled' : ''}`}>
                star
              </span>
            </button>
            <div className="flex-1" />
            <button
              onClick={() => onEdit(entry)}
              className="btn-secondary px-3 py-1.5 text-sm"
              aria-label="Edit entry"
            >
              <span className="material-symbols-rounded text-sm mr-1">edit</span>
              Edit
            </button>
            <button
              onClick={() => onDuplicate(entry)}
              className="btn-secondary px-3 py-1.5 text-sm"
              aria-label="Duplicate entry"
            >
              <span className="material-symbols-rounded text-sm mr-1">content_copy</span>
              Duplicate
            </button>
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/20"
              aria-label="Delete entry"
            >
              <span className="material-symbols-rounded text-sm mr-1">delete</span>
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({
  label,
  value,
  isLink,
  onCopy,
}: {
  label: string;
  value: string;
  isLink?: boolean;
  onCopy: () => void;
}): JSX.Element {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <button onClick={onCopy} className="icon-btn" aria-label={`Copy ${label.toLowerCase()}`}>
          <span className="material-symbols-rounded text-sm">content_copy</span>
        </button>
      </div>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-accent-500 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="rounded-lg border border-border bg-surface-hover px-3 py-2 text-sm text-text-primary break-all">
          {value}
        </p>
      )}
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'login': 'password',
    'credit-card': 'credit_card',
    'identity': 'badge',
    'secure-note': 'sticky_note_2',
    'software-license': 'key',
    'api-key': 'api',
    'database': 'storage',
    'email': 'mail',
    'social': 'group',
    'financial': 'account_balance',
    'health': 'monitor_heart',
    'government': 'gavel',
    'other': 'folder',
  };
  return icons[category] ?? 'key';
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'login': 'Login',
    'credit-card': 'Credit Card',
    'identity': 'Identity',
    'secure-note': 'Secure Note',
    'software-license': 'Software License',
    'api-key': 'API Key',
    'database': 'Database',
    'email': 'Email',
    'social': 'Social Media',
    'financial': 'Financial',
    'health': 'Health',
    'government': 'Government',
    'other': 'Other',
  };
  return labels[category] ?? 'Other';
}
