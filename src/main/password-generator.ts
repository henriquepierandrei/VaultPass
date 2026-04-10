/**
 * Password generator utility running in the main process.
 * Generates cryptographically secure random passwords.
 */

import { randomBytes } from 'crypto';
import { CHAR_SETS, STRENGTH_LEVELS } from '@shared/constants';
import type {
  PasswordGeneratorOptions,
  GeneratedPassword,
  PasswordStrength,
} from '@shared/types';
import { calculatePasswordStrength } from '@shared/password-utils';

/**
 * Generates cryptographically secure random bytes.
 * @param length - Number of bytes to generate
 * @returns Buffer of random bytes
 */
function secureRandomBytes(length: number): Buffer {
  return randomBytes(length);
}

/**
 * Generates a single password based on the provided options.
 * Uses crypto-secure random number generation.
 * @param options - Password generation options
 * @returns The generated password
 */
function generateSinglePassword(options: PasswordGeneratorOptions): string {
  let charPool = '';

  if (options.includeUppercase) charPool += CHAR_SETS.uppercase;
  if (options.includeLowercase) charPool += CHAR_SETS.lowercase;
  if (options.includeNumbers) charPool += CHAR_SETS.numbers;
  if (options.includeSymbols) charPool += CHAR_SETS.symbols;

  // Remove ambiguous characters if requested
  if (options.excludeAmbiguous) {
    for (const char of CHAR_SETS.ambiguous) {
      charPool = charPool.replace(char, '');
    }
  }

  // Remove custom excluded characters
  if (options.excludeCharacters) {
    for (const char of options.excludeCharacters) {
      charPool = charPool.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    }
  }

  // Fallback to lowercase if pool is empty
  if (charPool.length === 0) {
    charPool = CHAR_SETS.lowercase;
  }

  const poolLength = charPool.length;
  let password = '';

  // Use rejection sampling to avoid modulo bias
  const bytesNeeded = Math.ceil(options.length * 1.5);
  const bytes = secureRandomBytes(bytesNeeded);
  const maxValidByte = 256 - (256 % poolLength);

  let byteIndex = 0;
  while (password.length < options.length && byteIndex < bytes.length) {
    const byte = bytes[byteIndex];
    if (byte < maxValidByte) {
      password += charPool[byte % poolLength];
    }
    byteIndex++;
  }

  // If we still need more characters, generate more bytes
  while (password.length < options.length) {
    const extraBytes = secureRandomBytes(options.length - password.length);
    for (let i = 0; i < extraBytes.length && password.length < options.length; i++) {
      const byte = extraBytes[i];
      if (byte < maxValidByte) {
        password += charPool[byte % poolLength];
      }
    }
  }

  return password.slice(0, options.length);
}

/**
 * Calculates the entropy of a password in bits.
 * Entropy = length * log2(pool_size)
 * @param password - The password to analyze
 * @param options - The options used to generate it
 * @returns Entropy in bits
 */
export function calculateEntropy(password: string, options: PasswordGeneratorOptions): number {
  let poolSize = 0;

  if (options.includeUppercase) poolSize += 26;
  if (options.includeLowercase) poolSize += 26;
  if (options.includeNumbers) poolSize += 10;
  if (options.includeSymbols) poolSize += CHAR_SETS.symbols.length;

  if (options.excludeAmbiguous) {
    poolSize -= CHAR_SETS.ambiguous.split('').filter((c) =>
      (options.includeNumbers && '0O'.includes(c)) ||
      (options.includeUppercase && 'OI'.includes(c)) ||
      (options.includeLowercase && 'ol'.includes(c))
    ).length;
  }

  poolSize -= options.excludeCharacters.split('').filter((c) => {
    const inPool =
      (options.includeUppercase && CHAR_SETS.uppercase.includes(c)) ||
      (options.includeLowercase && CHAR_SETS.lowercase.includes(c)) ||
      (options.includeNumbers && CHAR_SETS.numbers.includes(c)) ||
      (options.includeSymbols && CHAR_SETS.symbols.includes(c));
    return inPool;
  }).length;

  if (poolSize <= 0) poolSize = 26; // Fallback

  return password.length * Math.log2(poolSize);
}

/**
 * Determines password strength based on entropy.
 * @param entropy - Entropy in bits
 * @returns Password strength level
 */
export function entropyToStrength(entropy: number): PasswordStrength {
  if (entropy < 36) return 'very-weak';
  if (entropy < 60) return 'weak';
  if (entropy < 80) return 'medium';
  if (entropy < 100) return 'strong';
  return 'very-strong';
}

/**
 * Estimates the time to crack a password given its entropy.
 * Assumes 10 billion guesses per second (high-end GPU).
 * @param entropy - Entropy in bits
 * @returns Human-readable time estimate
 */
export function estimateCrackTime(entropy: number): string {
  const guessesPerSecond = 10e9; // 10 billion
  const totalGuesses = Math.pow(2, entropy);
  const seconds = totalGuesses / guessesPerSecond;

  if (seconds < 1) return 'Instantly';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`;
  if (seconds < 31536000 * 1000) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 31536000 * 1e6) return `${Math.round(seconds / (31536000 * 1000))}K years`;
  if (seconds < 31536000 * 1e9) return `${Math.round(seconds / (31536000 * 1e6))}M years`;
  if (seconds < 31536000 * 1e12) return `${Math.round(seconds / (31536000 * 1e9))}B years`;
  return 'Centuries+';
}

/**
 * Generates passwords based on the provided options.
 * @param options - Password generation options
 * @returns Array of generated passwords with strength analysis
 */
export function generatePasswords(options: PasswordGeneratorOptions): GeneratedPassword[] {
  const passwords: GeneratedPassword[] = [];

  for (let i = 0; i < options.count; i++) {
    const password = generateSinglePassword(options);
    const entropy = calculateEntropy(password, options);
    const strength = entropyToStrength(entropy);
    const crackTimeEstimate = estimateCrackTime(entropy);

    passwords.push({
      password,
      entropy,
      strength,
      crackTimeEstimate,
    });
  }

  return passwords;
}
