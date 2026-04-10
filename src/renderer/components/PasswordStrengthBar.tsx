/**
 * PasswordStrengthBar component with visual strength indicator.
 * Displays a color-coded bar and strength label.
 */

import { calculatePasswordStrength, getStrengthColor, getStrengthLabel, getStrengthPercentage } from '@renderer/utils/password-strength';
import type { PasswordStrength } from '@shared/types';

interface PasswordStrengthBarProps {
  password: string;
  showLabel?: boolean;
  showBar?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PasswordStrengthBar({
  password,
  showLabel = true,
  showBar = true,
  size = 'md',
}: PasswordStrengthBarProps): JSX.Element {
  const strength: PasswordStrength = password
    ? calculatePasswordStrength(password)
    : 'very-weak';
  const percentage = getStrengthPercentage(strength);
  const color = getStrengthColor(strength);
  const label = getStrengthLabel(strength);

  const barHeight = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-2.5' : 'h-1.5';
  const labelSize = size === 'sm' ? 'text-xxs' : 'text-xs';

  if (!password) {
    return <></>;
  }

  return (
    <div className="w-full" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Password strength: ${label}`}>
      {showBar && (
        <div className={`mb-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-hover ${barHeight}`}>
          <div
            className={`rounded-full transition-all duration-500 ease-out ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {showLabel && (
        <div className="flex items-center justify-between">
          <span
            className={`font-medium ${labelSize}`}
            style={{ color: getStrengthColorValue(strength) }}
          >
            {label}
          </span>
          <span className={`text-text-muted ${labelSize}`}>
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

function getStrengthColorValue(strength: PasswordStrength): string {
  const colors: Record<PasswordStrength, string> = {
    'very-weak': '#ef4444',
    'weak': '#f97316',
    'medium': '#eab308',
    'strong': '#22c55e',
    'very-strong': '#059669',
  };
  return colors[strength];
}
