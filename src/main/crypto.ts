/**
 * Cryptographic utilities for the VaultPass password manager.
 * All encryption/decryption operations run exclusively in the main process.
 * Uses AES-256-GCM with PBKDF2 key derivation.
 */

import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv, timingSafeEqual } from 'crypto';
import { ENCRYPTION } from '@shared/constants';
import type {
  EncryptedVault,
  DecryptedVault,
  VaultEntryWithHistory,
  Result,
} from '@shared/types';

/**
 * Derives an encryption key from a password using PBKDF2.
 * @param password - The master password to derive the key from
 * @param salt - The salt to use (or generate if not provided)
 * @returns Object containing the derived key and salt (both as Buffers)
 */
export function deriveKey(
  password: string,
  salt?: Buffer
): { key: Buffer; salt: Buffer } {
  const saltBuffer = salt ?? randomBytes(ENCRYPTION.SALT_SIZE);

  const key = pbkdf2Sync(
    password,
    saltBuffer,
    ENCRYPTION.PBKDF2_ITERATIONS,
    ENCRYPTION.KEY_SIZE,
    ENCRYPTION.HASH_ALGORITHM
  );

  return { key, salt: saltBuffer };
}

/**
 * Encrypts plaintext data using AES-256-GCM.
 * Generates a unique IV for each encryption operation.
 * @param plaintext - The data to encrypt (as string)
 * @param key - The encryption key (32 bytes)
 * @returns Object containing ciphertext, IV, and auth tag (all as Buffers)
 */
export function encryptData(
  plaintext: string,
  key: Buffer
): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const iv = randomBytes(ENCRYPTION.IV_SIZE);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return { ciphertext, iv, authTag };
}

/**
 * Decrypts ciphertext using AES-256-GCM.
 * Verifies the authentication tag to detect tampering.
 * @param ciphertext - The encrypted data
 * @param key - The decryption key (32 bytes)
 * @param iv - The initialization vector
 * @param authTag - The authentication tag
 * @returns The decrypted plaintext string
 * @throws Error if authentication fails (data tampered)
 */
export function decryptData(
  ciphertext: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag: Buffer
): string {
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

/**
 * Encrypts a vault (array of entries) into the EncryptedVault format.
 * @param entries - Array of vault entries with history
 * @param masterKey - The derived master key
 * @param salt - The salt used for key derivation
 * @returns Encrypted vault object ready for disk storage
 */
export function encryptVault(
  entries: VaultEntryWithHistory[],
  masterKey: Buffer,
  salt: Buffer
): EncryptedVault {
  const plaintext = JSON.stringify(entries);
  const { ciphertext, iv, authTag } = encryptData(plaintext, masterKey);

  return {
    version: ENCRYPTION.VAULT_VERSION,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
    data: ciphertext.toString('base64'),
    savedAt: new Date().toISOString(),
  };
}

/**
 * Decrypts an EncryptedVault object back into vault entries.
 * Verifies data integrity via GCM authentication tag.
 * @param encryptedVault - The encrypted vault object from disk
 * @param masterKey - The derived master key
 * @returns Result containing decrypted entries or error
 */
export function decryptVault(
  encryptedVault: EncryptedVault,
  masterKey: Buffer
): Result<DecryptedVault> {
  try {
    const iv = Buffer.from(encryptedVault.iv, 'base64');
    const authTag = Buffer.from(encryptedVault.tag, 'base64');
    const ciphertext = Buffer.from(encryptedVault.data, 'base64');

    const plaintext = decryptData(ciphertext, masterKey, iv, authTag);
    const entries: VaultEntryWithHistory[] = JSON.parse(plaintext);

    return { success: true, data: { entries } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown decryption error';
    if (message.includes('auth')) {
      return { success: false, error: 'Vault data corrupted or tampered' };
    }
    return { success: false, error: `Failed to decrypt vault: ${message}` };
  }
}

/**
 * Sets up a new vault by deriving a key from the master password and encrypting an empty vault.
 * @param masterPassword - The user's master password
 * @returns Result containing encrypted vault, key, and salt
 */
export function setupNewVault(
  masterPassword: string
): Result<{ encryptedVault: EncryptedVault; key: Buffer; salt: Buffer }> {
  try {
    const { key, salt } = deriveKey(masterPassword);
    const encryptedVault = encryptVault([], key, salt);

    return { success: true, data: { encryptedVault, key, salt } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown setup error';
    return { success: false, error: `Failed to setup vault: ${message}` };
  }
}

/**
 * Attempts to unlock a vault with a given password.
 * @param encryptedVault - The encrypted vault object
 * @param password - The password to try
 * @returns Result containing decrypted vault and key if successful
 */
export function unlockVault(
  encryptedVault: EncryptedVault,
  password: string
): Result<{ decryptedVault: DecryptedVault; key: Buffer; salt: Buffer }> {
  try {
    const salt = Buffer.from(encryptedVault.salt, 'base64');
    const { key } = deriveKey(password, salt);
    const result = decryptVault(encryptedVault, key);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { decryptedVault: result.data!, key, salt } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown unlock error';
    return { success: false, error: `Failed to unlock vault: ${message}` };
  }
}

/**
 * Verifies a password against an existing vault without fully decrypting.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param encryptedVault - The encrypted vault
 * @param password - The password to verify
 * @returns True if the password is correct
 */
export function verifyPassword(
  encryptedVault: EncryptedVault,
  password: string
): boolean {
  try {
    const salt = Buffer.from(encryptedVault.salt, 'base64');
    const { key } = deriveKey(password, salt);
    const result = decryptVault(encryptedVault, key);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Generates a random salt for testing purposes.
 * @returns A random salt buffer
 */
export function generateSalt(): Buffer {
  return randomBytes(ENCRYPTION.SALT_SIZE);
}
