/**
 * EmptyState component for when vault is empty or no search results.
 * Displays an illustration icon, title, description, and optional action button.
 */

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionButton?: {
    label: string;
    icon?: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, actionButton }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center" role="status" aria-live="polite">
      {/* Illustration */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-hover">
        <span className="material-symbols-rounded text-4xl text-text-muted">{icon}</span>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm text-text-secondary">{description}</p>

      {/* Optional action button */}
      {actionButton && (
        <button onClick={actionButton.onClick} className="btn-primary">
          {actionButton.icon && (
            <span className="material-symbols-rounded mr-2 text-sm">{actionButton.icon}</span>
          )}
          {actionButton.label}
        </button>
      )}
    </div>
  );
}
