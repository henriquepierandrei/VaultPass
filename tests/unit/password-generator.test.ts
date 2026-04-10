/**
 * Unit tests for the password generator.
 * Tests password generation, entropy calculation, strength assessment, and crack time estimation.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePasswords,
  calculateEntropy,
  entropyToStrength,
  estimateCrackTime,
  calculatePasswordStrength,
} from '../../src/main/password-generator';
import type { PasswordGeneratorOptions, PasswordStrength } from '../../src/shared/types';

describe('Password Generator', () => {
  describe('generatePasswords', () => {
    const baseOptions: PasswordGeneratorOptions = {
      length: 16,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeAmbiguous: false,
      excludeCharacters: '',
      count: 1,
    };

    it('should generate correct number of passwords', () => {
      const options = { ...baseOptions, count: 5 };
      const results = generatePasswords(options);
      expect(results).toHaveLength(5);
    });

    it('should generate passwords of correct length', () => {
      const options = { ...baseOptions, length: 20 };
      const results = generatePasswords(options);
      expect(results[0].password.length).toBe(20);
    });

    it('should include uppercase when enabled', () => {
      const options = { ...baseOptions, includeUppercase: true, includeLowercase: false, includeNumbers: false, includeSymbols: false };
      const results = generatePasswords(options);
      expect(/[A-Z]/.test(results[0].password)).toBe(true);
    });

    it('should include lowercase when enabled', () => {
      const options = { ...baseOptions, includeUppercase: false, includeLowercase: true, includeNumbers: false, includeSymbols: false };
      const results = generatePasswords(options);
      expect(/[a-z]/.test(results[0].password)).toBe(true);
    });

    it('should include numbers when enabled', () => {
      const options = { ...baseOptions, includeUppercase: false, includeLowercase: false, includeNumbers: true, includeSymbols: false };
      const results = generatePasswords(options);
      expect(/[0-9]/.test(results[0].password)).toBe(true);
    });

    it('should include symbols when enabled', () => {
      const options = { ...baseOptions, includeUppercase: false, includeLowercase: false, includeNumbers: false, includeSymbols: true };
      const results = generatePasswords(options);
      expect(/[^a-zA-Z0-9]/.test(results[0].password)).toBe(true);
    });

    it('should exclude ambiguous characters when requested', () => {
      const options: PasswordGeneratorOptions = {
        ...baseOptions,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: false,
        excludeAmbiguous: true,
        excludeCharacters: '',
        count: 1,
        length: 32,
      };
      const results = generatePasswords(options);
      // With enough length and all char types, ambiguous chars should be excluded
      // Note: with short passwords this might not always trigger, so use longer length
      expect(results[0].password).not.toMatch(/[0OolI]/);
    });

    it('should exclude custom characters', () => {
      const options: PasswordGeneratorOptions = {
        ...baseOptions,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: false,
        includeSymbols: false,
        excludeAmbiguous: false,
        excludeCharacters: 'abc',
        count: 1,
        length: 32,
      };
      const results = generatePasswords(options);
      expect(results[0].password).not.toMatch(/[abc]/);
    });

    it('should return entropy and strength for each password', () => {
      const results = generatePasswords(baseOptions);
      expect(results[0].entropy).toBeGreaterThan(0);
      expect(['very-weak', 'weak', 'medium', 'strong', 'very-strong']).toContain(results[0].strength);
      expect(results[0].crackTimeEstimate).toBeDefined();
    });

    it('should generate different passwords on subsequent calls', () => {
      const results1 = generatePasswords(baseOptions);
      const results2 = generatePasswords(baseOptions);
      expect(results1[0].password).not.toBe(results2[0].password);
    });
  });

  describe('calculateEntropy', () => {
    it('should calculate higher entropy for longer passwords', () => {
      const options: PasswordGeneratorOptions = {
        length: 16, includeUppercase: true, includeLowercase: true,
        includeNumbers: true, includeSymbols: true, excludeAmbiguous: false,
        excludeCharacters: '', count: 1,
      };

      const entropy16 = calculateEntropy('A'.repeat(16), options);
      const entropy32 = calculateEntropy('A'.repeat(32), options);

      expect(entropy32).toBeGreaterThan(entropy16);
    });

    it('should calculate higher entropy for more character diversity', () => {
      const optionsFull: PasswordGeneratorOptions = {
        length: 16, includeUppercase: true, includeLowercase: true,
        includeNumbers: true, includeSymbols: true, excludeAmbiguous: false,
        excludeCharacters: '', count: 1,
      };

      const optionsLowerOnly: PasswordGeneratorOptions = {
        length: 16, includeUppercase: false, includeLowercase: true,
        includeNumbers: false, includeSymbols: false, excludeAmbiguous: false,
        excludeCharacters: '', count: 1,
      };

      const entropyFull = calculateEntropy('A'.repeat(16), optionsFull);
      const entropyLower = calculateEntropy('a'.repeat(16), optionsLowerOnly);

      expect(entropyFull).toBeGreaterThan(entropyLower);
    });
  });

  describe('entropyToStrength', () => {
    const testCases: Array<{ entropy: number; expected: PasswordStrength }> = [
      { entropy: 20, expected: 'very-weak' },
      { entropy: 40, expected: 'weak' },
      { entropy: 70, expected: 'medium' },
      { entropy: 90, expected: 'strong' },
      { entropy: 120, expected: 'very-strong' },
    ];

    for (const { entropy, expected } of testCases) {
      it(`should return ${expected} for entropy ${entropy}`, () => {
        expect(entropyToStrength(entropy)).toBe(expected);
      });
    }
  });

  describe('estimateCrackTime', () => {
    it('should return "Instantly" for very low entropy', () => {
      expect(estimateCrackTime(10)).toBe('Instantly');
    });

    it('should return seconds for low entropy', () => {
      const result = estimateCrackTime(40);
      expect(result).toMatch(/second/);
    });

    it('should return years for high entropy', () => {
      const result = estimateCrackTime(100);
      expect(result).toMatch(/year/);
    });

    it('should return centuries+ for very high entropy', () => {
      const result = estimateCrackTime(200);
      expect(result).toBe('Centuries+');
    });

    it('should increase with entropy', () => {
      const time1 = estimateCrackTime(50);
      const time2 = estimateCrackTime(80);
      // Higher entropy should mean longer crack time
      expect(time2).not.toBe(time1);
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should rate very short passwords as very-weak', () => {
      expect(calculatePasswordStrength('abc')).toBe('very-weak');
    });

    it('should rate simple passwords as weak', () => {
      expect(calculatePasswordStrength('password')).toBe('weak');
    });

    it('should rate medium complexity passwords as medium', () => {
      expect(calculatePasswordStrength('MyP@ssw0rd12')).toBe('medium');
    });

    it('should rate strong passwords correctly', () => {
      expect(calculatePasswordStrength('Str0ng!P@ssw0rd#2024')).toBe('strong');
    });

    it('should rate very strong passwords correctly', () => {
      expect(calculatePasswordStrength('X#9kL$mN2@pQ5!rT&vY8*zB^wE4jH6')).toBe('very-strong');
    });

    it('should penalize repetitive passwords', () => {
      expect(calculatePasswordStrength('aaaaaaaaaaaaaa')).toBe('very-weak');
    });

    it('should penalize sequential characters', () => {
      expect(calculatePasswordStrength('abcdef123456')).toBe('weak');
    });
  });
});
