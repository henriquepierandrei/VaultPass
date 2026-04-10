/**
 * Shared TypeScript types for the VaultPass password manager.
 * These types are used across both main and renderer processes.
 */

/** Unique identifier using UUID v4 format */
export type UUID = string;

/** Represents the strength level of a password */
export type PasswordStrength = 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';

/** Category for organizing vault entries */
export type EntryCategory =
  | 'login'
  | 'credit-card'
  | 'identity'
  | 'secure-note'
  | 'software-license'
  | 'api-key'
  | 'database'
  | 'email'
  | 'social'
  | 'financial'
  | 'health'
  | 'government'
  | 'other';

/** A single vault entry containing credentials or secure data */
export interface VaultEntry {
  /** Unique identifier (UUID v4) */
  id: UUID;
  /** Service or website name */
  title: string;
  /** Username or email associated with the entry */
  username: string;
  /** Encrypted password */
  password: string;
  /** URL of the service */
  url: string;
  /** Free-form description/notes (supports multiline) */
  description: string;
  /** Category for organization */
  category: EntryCategory;
  /** Tags for flexible organization */
  tags: string[];
  /** Whether this entry is marked as favorite */
  favorite: boolean;
  /** URL or data URI for the entry icon */
  icon: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/** Password history entry for tracking previous passwords */
export interface PasswordHistoryEntry {
  /** The encrypted previous password */
  password: string;
  /** ISO 8601 timestamp when this password was replaced */
  changedAt: string;
}

/** Extended vault entry with password history */
export interface VaultEntryWithHistory extends VaultEntry {
  /** History of previous passwords (up to 5) */
  passwordHistory: PasswordHistoryEntry[];
}

/** Encrypted vault file structure */
export interface EncryptedVault {
  /** Encryption version */
  version: number;
  /** Salt used for key derivation (base64) */
  salt: string;
  /** IV used for encryption (base64) */
  iv: string;
  /** Authentication tag (base64) */
  tag: string;
  /** Encrypted vault data (base64) */
  data: string;
  /** Timestamp when the vault was last saved */
  savedAt: string;
}

/** Result of a decryption operation */
export interface DecryptedVault {
  /** Array of vault entries */
  entries: VaultEntryWithHistory[];
}

/** Options for password generation */
export interface PasswordGeneratorOptions {
  /** Password length (8-128) */
  length: number;
  /** Include uppercase letters */
  includeUppercase: boolean;
  /** Include lowercase letters */
  includeLowercase: boolean;
  /** Include numbers */
  includeNumbers: boolean;
  /** Include special symbols */
  includeSymbols: boolean;
  /** Exclude ambiguous characters (0, O, l, I) */
  excludeAmbiguous: boolean;
  /** Custom characters to exclude */
  excludeCharacters: string;
  /** Number of passwords to generate (1-10) */
  count: number;
}

/** Generated password result */
export interface GeneratedPassword {
  /** The generated password */
  password: string;
  /** Calculated entropy in bits */
  entropy: number;
  /** Strength level */
  strength: PasswordStrength;
  /** Estimated crack time as human-readable string */
  crackTimeEstimate: string;
}

/** Sort field for vault entries */
export type SortField = 'title' | 'createdAt' | 'updatedAt' | 'strength';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Sort configuration */
export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/** Filter configuration for vault entries */
export interface FilterConfig {
  /** Filter by category */
  category: EntryCategory | 'all';
  /** Show only favorites */
  favoritesOnly: boolean;
  /** Minimum password strength */
  minStrength: PasswordStrength | 'all';
  /** Search query */
  searchQuery: string;
}

/** Application settings stored in electron-store */
export interface AppSettings {
  /** Application theme */
  theme: 'dark' | 'light';
  /** Session timeout in minutes */
  sessionTimeout: 5 | 15 | 30 | 60;
  /** Path to the vault file */
  vaultPath: string;
  /** Enable automatic backup */
  autoBackup: boolean;
  /** Backup directory path */
  backupPath: string;
  /** Window bounds (position and size) */
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Sidebar collapsed state */
  sidebarCollapsed: boolean;
}

/** Brute force protection state */
export interface BruteForceState {
  /** Number of failed attempts */
  failedAttempts: number;
  /** Timestamp of last attempt */
  lastAttempt: number;
  /** Whether permanently locked */
  locked: boolean;
}

/** IPC channel names for type-safe communication */
export type IPCChannel =
  // Auth channels
  | 'auth:setup'
  | 'auth:login'
  | 'auth:logout'
  | 'auth:verify-master'
  | 'auth:get-brute-force-state'
  // Vault channels
  | 'vault:load'
  | 'vault:save'
  | 'vault:create-new'
  | 'vault:import'
  // Entry channels
  | 'entry:create'
  | 'entry:update'
  | 'entry:delete'
  | 'entry:get-all'
  | 'entry:duplicate'
  // Generator channels
  | 'generator:generate'
  // File channels
  | 'file:select'
  | 'file:read'
  | 'file:write'
  | 'file:backup'
  // Settings channels
  | 'settings:get'
  | 'settings:update'
  // Import/Export channels
  | 'import:from-file'
  | 'export:to-file'
  // Utility channels
  | 'util:lock-vault'
  | 'util:get-favicon';

/** Toast notification types */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Result wrapper for async operations */
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Column mapping for CSV import */
export interface ColumnMapping {
  title: string;
  username: string;
  password: string;
  url: string;
  description: string;
  tags: string;
}

/** Import format types */
export type ImportFormat = 'csv' | 'json' | 'bitwarden' | 'lastpass' | '1password' | 'keepass';

/** Export format types */
export type ExportFormat = 'vault' | 'json' | 'csv' | 'pdf';

/** Audit log entry */
export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string;
  timestamp: string;
}

/** Database backup info */
export interface DatabaseBackup {
  path: string;
  createdAt: string;
  size: number;
}
