/**
 * Shared constants used across the application.
 */

/** Encryption configuration constants */
export const ENCRYPTION = {
  /** AES-256-GCM key size in bytes */
  KEY_SIZE: 32,
  /** Salt size in bytes */
  SALT_SIZE: 32,
  /** IV size in bytes (12 bytes for GCM) */
  IV_SIZE: 12,
  /** PBKDF2 iterations for key derivation */
  PBKDF2_ITERATIONS: 100_000,
  /** Hash algorithm for PBKDF2 */
  HASH_ALGORITHM: 'sha256',
  /** Vault file format version */
  VAULT_VERSION: 1,
} as const;

/** Password requirements for master password */
export const PASSWORD_REQUIREMENTS = {
  /** Minimum password length */
  MIN_LENGTH: 12,
  /** Require at least one uppercase letter */
  REQUIRE_UPPERCASE: true,
  /** Require at least one lowercase letter */
  REQUIRE_LOWERCASE: true,
  /** Require at least one number */
  REQUIRE_NUMBER: true,
  /** Require at least one symbol */
  REQUIRE_SYMBOL: true,
} as const;

/** Brute force protection thresholds */
export const BRUTE_FORCE = {
  /** Lockout durations in milliseconds */
  LOCKOUT_DURATIONS: [
    { attempts: 3, duration: 30 * 1000 },    // 30 seconds
    { attempts: 5, duration: 5 * 60 * 1000 }, // 5 minutes
  ],
  /** Attempts before permanent lock */
  PERMANENT_LOCK_THRESHOLD: 10,
  /** Reset counter after this many minutes of no attempts */
  RESET_AFTER_MINUTES: 30,
} as const;

/** Session timeout options in minutes */
export const SESSION_TIMEOUTS = [5, 15, 30, 60] as const;

/** Default app settings */
export const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  sessionTimeout: 15 as const,
  vaultPath: '',
  autoBackup: true,
  backupPath: '',
  sidebarCollapsed: false,
};

/** Password character sets for generation */
export const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: '0OolI',
} as const;

/** Supported import formats */
export const IMPORT_FORMATS = [
  { value: 'csv', label: 'Generic CSV' },
  { value: 'json', label: 'JSON (Native)' },
  { value: 'bitwarden', label: 'Bitwarden (JSON)' },
  { value: 'lastpass', label: 'LastPass (CSV)' },
  { value: '1password', label: '1Password (CSV)' },
  { value: 'keepass', label: 'KeePass (XML)' },
] as const;

/** Supported export formats */
export const EXPORT_FORMATS = [
  { value: 'vault', label: 'Encrypted Vault (.vault)', extension: '.vault' },
  { value: 'json', label: 'JSON (Unencrypted)', extension: '.json' },
  { value: 'csv', label: 'CSV (Spreadsheet)', extension: '.csv' },
  { value: 'pdf', label: 'PDF (Formatted)', extension: '.pdf' },
] as const;

/** Entry category display labels */
export const CATEGORY_LABELS: Record<string, string> = {
  'login': 'Login',
  'credit-card': 'Credit Card',
  'identity': 'Identity',
  'secure-note': 'Secure Note',
  'software-license': 'Software License',
  'api-key': 'API Key',
  'database': 'Database',
  'email': 'Email',
  'social': 'Social Media',
  'financial': 'Financial',
  'health': 'Health',
  'government': 'Government',
  'other': 'Other',
};

/** Keyboard shortcuts */
export const KEYBOARD_SHORTCUTS = {
  NEW_ENTRY: 'Ctrl+N',
  FOCUS_SEARCH: 'Ctrl+F',
  OPEN_GENERATOR: 'Ctrl+G',
  LOCK_VAULT: 'Ctrl+L',
  OPEN_SETTINGS: 'Ctrl+,',
  CLOSE_MODAL: 'Escape',
  COPY_WITHOUT_REVEAL: 'Ctrl+C',
} as const;

/** Strength level ordering for comparison */
export const STRENGTH_LEVELS = ['very-weak', 'weak', 'medium', 'strong', 'very-strong'] as const;

/** Default column mapping for CSV import */
export const DEFAULT_COLUMN_MAPPING = {
  title: 'title',
  username: 'username',
  password: 'password',
  url: 'url',
  description: 'description',
  tags: 'tags',
};

/** Clipboard clear delay in milliseconds */
export const CLIPBOARD_CLEAR_DELAY = 30_000;

/** Maximum password history entries to keep */
export const MAX_PASSWORD_HISTORY = 5;

/** Debounce delay for search input in milliseconds */
export const SEARCH_DEBOUNCE_DELAY = 200;

/** Favicon fetch URL template */
export const FAVICON_URL_TEMPLATE = 'https://www.google.com/s2/favicons?domain={domain}&sz=64';
