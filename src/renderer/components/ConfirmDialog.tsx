/**
 * ConfirmDialog component for destructive action confirmations.
 * Displays a title, message, and confirm/cancel buttons.
 */

import { useEscapeKey } from '@renderer/hooks/useHooks';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps): JSX.Element {
  useEscapeKey(onClose);

  if (!isOpen) {
    return <></>;
  }

  const variantClasses: Record<string, string> = {
    danger: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
    warning: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500',
    info: 'bg-accent-500 hover:bg-accent-600 focus:ring-accent-500',
  };

  const variantIcons: Record<string, string> = {
    danger: 'delete_forever',
    warning: 'warning',
    info: 'info',
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div
        className="modal-content max-w-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <span className={`material-symbols-rounded text-2xl ${variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-yellow-500' : 'text-accent-500'}`}>
            {variantIcons[variant]}
          </span>
        </div>

        {/* Title */}
        <h3 id="confirm-title" className="mb-2 text-center text-lg font-semibold text-text-primary">
          {title}
        </h3>

        {/* Message */}
        <p id="confirm-description" className="mb-6 text-center text-sm text-text-secondary">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn-primary flex-1 ${variantClasses[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
