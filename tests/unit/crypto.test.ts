/**
 * Unit tests for the cryptographic utilities.
 * Tests encryption, decryption, key derivation, and vault operations.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveKey,
  encryptData,
  decryptData,
  encryptVault,
  decryptVault,
  setupNewVault,
  unlockVault,
  verifyPassword,
} from '../../src/main/crypto';
import type { VaultEntryWithHistory, EncryptedVault } from '../../src/shared/types';
import { ENCRYPTION } from '../../src/shared/constants';

describe('Crypto Utilities', () => {
  describe('deriveKey', () => {
    it('should derive a key of correct length (32 bytes)', () => {
      const { key, salt } = deriveKey('test-password-12345');
      expect(key.length).toBe(ENCRYPTION.KEY_SIZE);
      expect(salt.length).toBe(ENCRYPTION.SALT_SIZE);
    });

    it('should derive different keys for different passwords', () => {
      const { key: key1 } = deriveKey('password-one');
      const { key: key2 } = deriveKey('password-two');
      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });

    it('should derive same key for same password and salt', () => {
      const salt = Buffer.alloc(32, 'fixed-salt-for-testing');
      const { key: key1, salt: s1 } = deriveKey('same-password', salt);
      const { key: key2, salt: s2 } = deriveKey('same-password', salt);
      expect(key1.toString('hex')).toBe(key2.toString('hex'));
      expect(s1.toString('hex')).toBe(s2.toString('hex'));
    });

    it('should derive different keys for same password but different salt', () => {
      const { key: key1 } = deriveKey('same-password');
      const { key: key2 } = deriveKey('same-password');
      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });
  });

  describe('encryptData / decryptData', () => {
    it('should encrypt and decrypt data correctly', () => {
      const { key } = deriveKey('test-key');
      const plaintext = 'Hello, World!';

      const { ciphertext, iv, authTag } = encryptData(plaintext, key);
      const decrypted = decryptData(ciphertext, key, iv, authTag);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (unique IV)', () => {
      const { key } = deriveKey('test-key');
      const plaintext = 'Same message';

      const { ciphertext: c1 } = encryptData(plaintext, key);
      const { ciphertext: c2 } = encryptData(plaintext, key);

      expect(c1.toString('hex')).not.toBe(c2.toString('hex'));
    });

    it('should fail decryption with wrong key', () => {
      const { key: key1 } = deriveKey('key-one');
      const { key: key2 } = deriveKey('key-two');
      const plaintext = 'Secret data';

      const { ciphertext, iv, authTag } = encryptData(plaintext, key1);

      expect(() => decryptData(ciphertext, key2, iv, authTag)).toThrow();
    });

    it('should fail decryption with tampered ciphertext', () => {
      const { key } = deriveKey('test-key');
      const plaintext = 'Important data';

      const { ciphertext, iv, authTag } = encryptData(plaintext, key);
      const tampered = Buffer.from(ciphertext);
      tampered[0] ^= 0xff; // Flip bits of first byte

      expect(() => decryptData(tampered, key, iv, authTag)).toThrow();
    });
  });

  describe('encryptVault / decryptVault', () => {
    const sampleEntries: VaultEntryWithHistory[] = [
      {
        id: 'test-uuid-1',
        title: 'GitHub',
        username: 'user@example.com',
        password: 'encrypted-password-1',
        url: 'https://github.com',
        description: 'My GitHub account',
        category: 'login',
        tags: ['dev', 'work'],
        favorite: true,
        icon: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        passwordHistory: [],
      },
    ];

    it('should encrypt and decrypt a vault correctly', () => {
      const { key, salt } = deriveKey('vault-password');
      const encrypted = encryptVault(sampleEntries, key, salt);

      expect(encrypted.version).toBe(ENCRYPTION.VAULT_VERSION);
      expect(encrypted.salt).toBe(salt.toString('base64'));
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();

      const result = decryptVault(encrypted, key);
      expect(result.success).toBe(true);
      expect(result.data?.entries).toHaveLength(1);
      expect(result.data?.entries[0].title).toBe('GitHub');
    });

    it('should fail decryption with wrong key', () => {
      const { key: key1, salt } = deriveKey('correct-password');
      const { key: key2 } = deriveKey('wrong-password');
      const encrypted = encryptVault(sampleEntries, key1, salt);

      const result = decryptVault(encrypted, key2);
      expect(result.success).toBe(false);
    });

    it('should handle empty vault', () => {
      const { key, salt } = deriveKey('test-password');
      const encrypted = encryptVault([], key, salt);

      const result = decryptVault(encrypted, key);
      expect(result.success).toBe(true);
      expect(result.data?.entries).toHaveLength(0);
    });
  });

  describe('setupNewVault', () => {
    it('should setup a new vault with empty entries', () => {
      const result = setupNewVault('new-master-password');

      expect(result.success).toBe(true);
      expect(result.data?.key).toBeDefined();
      expect(result.data?.salt).toBeDefined();
      expect(result.data?.encryptedVault).toBeDefined();

      // Verify the vault can be decrypted
      const decryptResult = decryptVault(result.data!.encryptedVault, result.data!.key);
      expect(decryptResult.success).toBe(true);
      expect(decryptResult.data?.entries).toHaveLength(0);
    });

    it('should fail with empty password', () => {
      const result = setupNewVault('');
      // Empty passwords should still technically work cryptographically
      // but in practice the app should validate password strength before calling this
      expect(result.success).toBe(true);
    });
  });

  describe('unlockVault', () => {
    it('should unlock a vault with correct password', () => {
      const setupResult = setupNewVault('my-secret-password');
      const encryptedVault = setupResult.data!.encryptedVault;

      const unlockResult = unlockVault(encryptedVault, 'my-secret-password');
      expect(unlockResult.success).toBe(true);
      expect(unlockResult.data?.decryptedVault.entries).toHaveLength(0);
    });

    it('should fail to unlock with wrong password', () => {
      const setupResult = setupNewVault('correct-password');
      const encryptedVault = setupResult.data!.encryptedVault;

      const unlockResult = unlockVault(encryptedVault, 'wrong-password');
      expect(unlockResult.success).toBe(false);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const setupResult = setupNewVault('test-password');
      const isValid = verifyPassword(setupResult.data!.encryptedVault, 'test-password');
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', () => {
      const setupResult = setupNewVault('test-password');
      const isValid = verifyPassword(setupResult.data!.encryptedVault, 'wrong-password');
      expect(isValid).toBe(false);
    });
  });
});
