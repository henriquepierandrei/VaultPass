/**
 * ToggleSwitch component - Premium enterprise toggle switch.
 * Accessible, animated toggle with smooth transitions.
 */

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  size = 'md',
}: ToggleSwitchProps): JSX.Element {
  const sizeClasses = {
    sm: {
      container: 'h-5 w-9',
      thumb: 'h-4 w-4',
      thumbChecked: 'translate-x-4',
      thumbUnchecked: 'translate-x-0.5',
    },
    md: {
      container: 'h-6 w-11',
      thumb: 'h-5 w-5',
      thumbChecked: 'translate-x-5',
      thumbUnchecked: 'translate-x-0.5',
    },
    lg: {
      container: 'h-7 w-14',
      thumb: 'h-6 w-6',
      thumbChecked: 'translate-x-7',
      thumbUnchecked: 'translate-x-0.5',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${sizes.container} items-center rounded-full transition-colors duration-250 ease-spring focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-background ${
        checked
          ? 'bg-accent-500 shadow-glow'
          : 'bg-surface-tertiary hover:bg-surface-hover'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block ${sizes.thumb} transform rounded-full bg-white shadow-elevation-1 transition-transform duration-250 ease-spring ${
          checked ? sizes.thumbChecked : sizes.thumbUnchecked
        }`}
      />
    </button>
  );
}
