/**
 * EntryCard component displaying a vault entry.
 * Premium enterprise design with hover effects and smooth animations.
 */

import type { VaultEntryWithHistory } from '@shared/types';
import { calculatePasswordStrength, getStrengthColor, getStrengthLabel, getStrengthPercentage } from '@renderer/utils/password-strength';
import { useVaultStore } from '@renderer/store/vaultStore';

interface EntryCardProps {
  entry: VaultEntryWithHistory;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export function EntryCard({ entry, isSelected, onClick }: EntryCardProps): JSX.Element {
  const { toggleFavorite } = useVaultStore();
  const strength = calculatePasswordStrength(entry.password);
  const strengthColor = getStrengthColor(entry.password ? strength : 'very-weak');
  const strengthPercentage = getStrengthPercentage(entry.password ? strength : 'very-weak');

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(entry.id);
  };

  const handleClick = () => {
    onClick(entry.id);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(entry.id);
        }
      }}
      aria-label={`${entry.title}, username: ${entry.username}`}
      aria-selected={isSelected}
      className={`group relative flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all duration-250 ease-spring ${
        isSelected
          ? 'border-accent-500/30 bg-accent-500/5 shadow-elevation-2 ring-1 ring-accent-500/20'
          : 'border-border-subtle bg-surface-primary hover:border-border hover:bg-surface-secondary hover:shadow-elevation-1 hover:-translate-y-0.5'
      }`}
    >
      {/* Icon / Favicon */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary border border-border-subtle">
        {entry.icon ? (
          <img
            src={entry.icon}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <span
          className={`material-symbols-rounded text-xl text-text-secondary ${entry.icon ? 'hidden' : ''}`}
        >
          {getCategoryIcon(entry.category)}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {entry.title}
          </h3>
          {entry.favorite && (
            <span className="material-symbols-rounded text-sm text-yellow-400 filled flex-shrink-0">
              star
            </span>
          )}
        </div>

        {/* Username */}
        {entry.username && (
          <p className="truncate text-xs text-text-secondary mb-2">{entry.username}</p>
        )}

        {/* Password strength bar */}
        <div className="flex items-center gap-2.5">
          <div className="h-1 w-20 flex-shrink-0 overflow-hidden rounded-full bg-surface-tertiary">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-spring ${strengthColor}`}
              style={{ width: `${strengthPercentage}%` }}
            />
          </div>
          <span className="text-xs text-text-muted font-medium">{getStrengthLabel(strength)}</span>
        </div>
      </div>

      {/* Favorite star toggle - appears on hover */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-4 right-4 flex-shrink-0 icon-btn opacity-0 group-hover:opacity-100 transition-all duration-200 hover-lift"
        aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <span
          className={`material-symbols-rounded text-xl transition-colors duration-200 ${
            entry.favorite ? 'filled text-yellow-400' : 'text-text-muted hover:text-yellow-400'
          }`}
        >
          star
        </span>
      </button>
    </article>
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
