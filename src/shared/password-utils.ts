/**
 * Password utility functions that can run in both main and renderer processes.
 * No Node.js dependencies - pure functions only.
 */

import type { PasswordStrength } from '@shared/types';

/**
 * Calculates password strength for a given password string.
 * Uses heuristic analysis for non-generated passwords.
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
  const uniqueChars = new Set(password).size;
  const ratio = uniqueChars / password.length;
  if (ratio > 0.8) score += 1;
  if (ratio > 0.6) score += 0.5;

  // Repetition penalty
  const repetitionPattern = /(.)\1{2,}/.test(password);
  if (repetitionPattern) score -= 1;

  // Sequential character penalty
  const sequentialPattern = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);
  if (sequentialPattern) score -= 1;

  // Map score to strength levels
  if (score <= 2) return 'very-weak';
  if (score <= 4) return 'weak';
  if (score <= 6) return 'medium';
  if (score <= 8) return 'strong';
  return 'very-strong';
}
