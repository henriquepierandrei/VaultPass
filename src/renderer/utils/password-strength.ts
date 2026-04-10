/**
 * Password strength calculation for the renderer.
 * Mirrors the main process logic for client-side display.
 */

import type { PasswordStrength } from '@shared/types';
import { CHAR_SETS } from '@shared/constants';

/**
 * Calculates password strength using heuristic analysis.
 * @param password - The password to analyze
 * @returns Password strength level
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;

  // Character diversity
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Unique character ratio bonus
  if (password.length > 0) {
    const uniqueChars = new Set(password).size;
    const ratio = uniqueChars / password.length;
    if (ratio > 0.8) score += 1;
    if (ratio > 0.6) score += 0.5;
  }

  // Repetition penalty
  if (/(.)\1{2,}/.test(password)) score -= 1;

  // Sequential character penalty
  if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    score -= 1;
  }

  if (score <= 2) return 'very-weak';
  if (score <= 4) return 'weak';
  if (score <= 6) return 'medium';
  if (score <= 8) return 'strong';
  return 'very-strong';
}

/**
 * Gets the display label for a strength level.
 */
export function getStrengthLabel(strength: PasswordStrength): string {
  const labels: Record<PasswordStrength, string> = {
    'very-weak': 'Very Weak',
    'weak': 'Weak',
    'medium': 'Medium',
    'strong': 'Strong',
    'very-strong': 'Very Strong',
  };
  return labels[strength];
}

/**
 * Gets the color class for a strength level.
 */
export function getStrengthColor(strength: PasswordStrength): string {
  const colors: Record<PasswordStrength, string> = {
    'very-weak': 'bg-strength-veryweak',
    'weak': 'bg-strength-weak',
    'medium': 'bg-strength-medium',
    'strong': 'bg-strength-strong',
    'very-strong': 'bg-strength-verystrong',
  };
  return colors[strength];
}

/**
 * Gets the strength level as a percentage for progress bar.
 */
export function getStrengthPercentage(strength: PasswordStrength): number {
  const percentages: Record<PasswordStrength, number> = {
    'very-weak': 10,
    'weak': 30,
    'medium': 50,
    'strong': 75,
    'very-strong': 100,
  };
  return percentages[strength];
}
