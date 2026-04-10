/**
 * SQL Database Manager for VaultPass.
 * Uses better-sqlite3 for fast, reliable local storage.
 * Manages vault entries, settings, and audit logs.
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { VaultEntry, AppSettings, AuditLog } from '@shared/types';

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string = '';

  /**
   * Initialize database connection.
   * @param dataDir - Directory to store the database file
   */
  initialize(dataDir: string): void {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = join(dataDir, 'vaultpass.db');
    this.db = new Database(this.dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.createTables();
  }

  /**
   * Create database tables if they don't exist.
   */
  private createTables(): void {
    if (!this.db) return;

    // Vault entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vault_entries (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        username TEXT NOT NULL DEFAULT '',
        password TEXT NOT NULL,
        url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        category TEXT NOT NULL DEFAULT 'login',
        tags TEXT DEFAULT '[]',
        icon TEXT DEFAULT '',
        favorite INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id TEXT NOT NULL,
        password TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES vault_entries(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        timestamp TEXT NOT NULL
      );

      -- Create indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_entries_category ON vault_entries(category);
      CREATE INDEX IF NOT EXISTS idx_entries_favorite ON vault_entries(favorite);
      CREATE INDEX IF NOT EXISTS idx_entries_title ON vault_entries(title);
      CREATE INDEX IF NOT EXISTS idx_password_history_entry ON password_history(entry_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);
  }

  /**
   * Get database instance.
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Vault Entries CRUD Operations
   */

  /**
   * Create a new vault entry.
   */
  createEntry(entry: VaultEntry): void {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO vault_entries (id, title, username, password, url, description, category, tags, icon, favorite, created_at, updated_at)
      VALUES (@id, @title, @username, @password, @url, @description, @category, @tags, @icon, @favorite, @created_at, @updated_at)
    `);

    stmt.run({
      ...entry,
      tags: JSON.stringify(entry.tags || []),
      favorite: entry.favorite ? 1 : 0,
    });

    this.logAudit('CREATE', 'entry', entry.id, `Created entry: ${entry.title}`);
  }

  /**
   * Get all vault entries.
   */
  getAllEntries(): VaultEntry[] {
    const db = this.getDatabase();
    const rows = db.prepare('SELECT * FROM vault_entries ORDER BY title ASC').all();

    return rows.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      favorite: row.favorite === 1,
    }));
  }

  /**
   * Get entry by ID.
   */
  getEntryById(id: string): VaultEntry | null {
    const db = this.getDatabase();
    const row = db.prepare('SELECT * FROM vault_entries WHERE id = ?').get(id);

    if (!row) return null;

    return {
      ...(row as any),
      tags: JSON.parse(row.tags || '[]'),
      favorite: row.favorite === 1,
    };
  }

  /**
   * Update an existing entry.
   */
  updateEntry(entry: VaultEntry): void {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      UPDATE vault_entries 
      SET title = @title, username = @username, password = @password, url = @url,
          description = @description, category = @category, tags = @tags, icon = @icon,
          favorite = @favorite, updated_at = @updated_at
      WHERE id = @id
    `);

    stmt.run({
      ...entry,
      tags: JSON.stringify(entry.tags || []),
      favorite: entry.favorite ? 1 : 0,
    });

    this.logAudit('UPDATE', 'entry', entry.id, `Updated entry: ${entry.title}`);
  }

  /**
   * Delete an entry by ID.
   */
  deleteEntry(id: string): void {
    const db = this.getDatabase();
    const entry = this.getEntryById(id);

    db.prepare('DELETE FROM vault_entries WHERE id = ?').run(id);

    this.logAudit('DELETE', 'entry', id, `Deleted entry: ${entry?.title || id}`);
  }

  /**
   * Search entries by query.
   */
  searchEntries(query: string): VaultEntry[] {
    const db = this.getDatabase();
    const searchTerm = `%${query}%`;

    const rows = db.prepare(`
      SELECT * FROM vault_entries 
      WHERE title LIKE ? OR username LIKE ? OR url LIKE ? OR description LIKE ?
      ORDER BY title ASC
    `).all(searchTerm, searchTerm, searchTerm, searchTerm);

    return rows.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      favorite: row.favorite === 1,
    }));
  }

  /**
   * Get entries by category.
   */
  getEntriesByCategory(category: string): VaultEntry[] {
    const db = this.getDatabase();

    if (category === 'all') {
      return this.getAllEntries();
    }

    const rows = db.prepare('SELECT * FROM vault_entries WHERE category = ? ORDER BY title ASC').all(category);

    return rows.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      favorite: row.favorite === 1,
    }));
  }

  /**
   * Get favorite entries.
   */
  getFavoriteEntries(): VaultEntry[] {
    const db = this.getDatabase();
    const rows = db.prepare('SELECT * FROM vault_entries WHERE favorite = 1 ORDER BY title ASC').all();

    return rows.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      favorite: true,
    }));
  }

  /**
   * Password History Operations
   */

  /**
   * Add password to history.
   */
  addPasswordHistory(entryId: string, password: string): void {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO password_history (entry_id, password, changed_at)
      VALUES (?, ?, datetime('now'))
    `);

    stmt.run(entryId, password);

    // Keep only last 5 passwords
    db.prepare(`
      DELETE FROM password_history 
      WHERE id NOT IN (
        SELECT id FROM password_history 
        WHERE entry_id = ? 
        ORDER BY changed_at DESC 
        LIMIT 5
      ) AND entry_id = ?
    `).run(entryId, entryId);
  }

  /**
   * Get password history for an entry.
   */
  getPasswordHistory(entryId: string): Array<{ password: string; changedAt: string }> {
    const db = this.getDatabase();
    const rows = db.prepare(`
      SELECT password, changed_at FROM password_history 
      WHERE entry_id = ? 
      ORDER BY changed_at DESC
    `).all(entryId);

    return rows.map((row: any) => ({
      password: row.password,
      changedAt: row.changed_at,
    }));
  }

  /**
   * Settings Operations
   */

  /**
   * Set a setting value.
   */
  setSetting(key: string, value: any): void {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value)
      VALUES (?, ?)
    `);

    stmt.run(key, JSON.stringify(value));
  }

  /**
   * Get a setting value.
   */
  getSetting(key: string): any {
    const db = this.getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);

    if (!row) return null;

    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  /**
   * Get all settings.
   */
  getAllSettings(): Record<string, any> {
    const db = this.getDatabase();
    const rows = db.prepare('SELECT * FROM settings').all();

    const settings: Record<string, any> = {};
    rows.forEach((row: any) => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });

    return settings;
  }

  /**
   * Audit Log Operations
   */

  /**
   * Log an audit event.
   */
  private logAudit(action: string, entityType: string, entityId: string | null, details: string): void {
    const db = this.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(action, entityType, entityId, details);

    // Keep only last 1000 audit logs
    db.prepare(`
      DELETE FROM audit_logs 
      WHERE id NOT IN (
        SELECT id FROM audit_logs ORDER BY timestamp DESC LIMIT 1000
      )
    `).run();
  }

  /**
   * Get audit logs.
   */
  getAuditLogs(limit: number = 100): AuditLog[] {
    const db = this.getDatabase();
    const rows = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);

    return rows as AuditLog[];
  }

  /**
   * Clear audit logs older than X days.
   */
  clearOldAuditLogs(days: number): void {
    const db = this.getDatabase();
    db.prepare(`
      DELETE FROM audit_logs 
      WHERE timestamp < datetime('now', '-${days} days')
    `).run();
  }

  /**
   * Close database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Backup database to a file.
   */
  backup(backupPath: string): void {
    const db = this.getDatabase();
    const backup = new Database(backupPath);

    db.backup(backup);
    backup.close();
  }

  /**
   * Restore database from a backup file.
   */
  restore(backupPath: string): void {
    if (!existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    const backup = new Database(backupPath);
    const db = this.getDatabase();

    backup.backup(db);
    backup.close();
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager();
