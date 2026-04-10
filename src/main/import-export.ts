/**
 * Import/Export handlers for various password manager formats.
 * Supports CSV, JSON, Bitwarden, LastPass, 1Password, and KeePass.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  VaultEntryWithHistory,
  ImportFormat,
  ExportFormat,
  ColumnMapping,
  Result,
} from '@shared/types';
import type { EncryptedVault } from '@shared/types';
import { ENCRYPTION, DEFAULT_COLUMN_MAPPING } from '@shared/constants';

/**
 * Parses a CSV string into rows of string arrays.
 * Handles quoted fields and escaped quotes.
 */
function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = '';
      }
      if (char === '\r' && nextChar === '\n') i++;
    } else {
      current += char;
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

/**
 * Imports from a generic CSV format with column mapping.
 */
function importFromCSV(
  csvContent: string,
  mapping: ColumnMapping
): Result<VaultEntryWithHistory[]> {
  try {
    const rows = parseCSV(csvContent);
    if (rows.length < 2) {
      return { success: false, error: 'CSV must have at least a header row and one data row' };
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const entries: VaultEntryWithHistory[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      const getField = (fieldName: string): string => {
        const mappedField = mapping[fieldName as keyof ColumnMapping];
        const index = headers.indexOf(mappedField.toLowerCase());
        return index >= 0 && index < row.length ? row[index] : '';
      };

      const title = getField('title') || 'Untitled';
      const username = getField('username');
      const password = getField('password');
      const url = getField('url');
      const description = getField('description');
      const tagsStr = getField('tags');

      entries.push({
        id: uuidv4(),
        title,
        username,
        password,
        url,
        description,
        category: 'other',
        tags: tagsStr ? tagsStr.split(';').map((t) => t.trim()).filter(Boolean) : [],
        favorite: false,
        icon: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passwordHistory: [],
      });
    }

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: `CSV import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Imports from JSON format (native app format).
 */
function importFromJSON(jsonContent: string): Result<VaultEntryWithHistory[]> {
  try {
    const parsed = JSON.parse(jsonContent);
    const entries: VaultEntryWithHistory[] = Array.isArray(parsed) ? parsed : parsed.entries || [];

    // Validate and fix entries
    for (const entry of entries) {
      if (!entry.id) entry.id = uuidv4();
      if (!entry.passwordHistory) entry.passwordHistory = [];
      if (!entry.tags) entry.tags = [];
      if (!entry.createdAt) entry.createdAt = new Date().toISOString();
      if (!entry.updatedAt) entry.updatedAt = new Date().toISOString();
    }

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: `JSON import failed: ${error instanceof Error ? error.message : 'Invalid JSON'}` };
  }
}

/**
 * Imports from Bitwarden JSON export format.
 */
function importFromBitwarden(jsonContent: string): Result<VaultEntryWithHistory[]> {
  try {
    const data = JSON.parse(jsonContent);
    const items = data.items || [];
    const entries: VaultEntryWithHistory[] = [];

    for (const item of items) {
      if (item.type === 2) continue; // Skip secure notes for now

      entries.push({
        id: uuidv4(),
        title: item.name || 'Untitled',
        username: item.login?.username || '',
        password: item.login?.password || '',
        url: item.login?.uris?.[0]?.uri || '',
        description: item.notes || '',
        category: 'login',
        tags: [],
        favorite: item.favorite || false,
        icon: '',
        createdAt: item.creationDate ? new Date(item.creationDate).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passwordHistory: [],
      });
    }

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: `Bitwarden import failed: ${error instanceof Error ? error.message : 'Invalid format'}` };
  }
}

/**
 * Imports from LastPass CSV format.
 */
function importFromLastPass(csvContent: string): Result<VaultEntryWithHistory[]> {
  try {
    const rows = parseCSV(csvContent);
    if (rows.length < 2) {
      return { success: false, error: 'LastPass CSV must have header and data rows' };
    }

    const entries: VaultEntryWithHistory[] = [];

    // LastPass format: url,username,password,extra,name,grouping,fav
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      entries.push({
        id: uuidv4(),
        title: row[4] || row[0] || 'Untitled',
        username: row[1] || '',
        password: row[2] || '',
        url: row[0] || '',
        description: row[3] || '',
        category: 'login',
        tags: row[5] ? row[5].split('/').filter(Boolean) : [],
        favorite: row[6] === '1',
        icon: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passwordHistory: [],
      });
    }

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: `LastPass import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Imports from 1Password CSV format.
 */
function importFrom1Password(csvContent: string): Result<VaultEntryWithHistory[]> {
  try {
    const rows = parseCSV(csvContent);
    if (rows.length < 2) {
      return { success: false, error: '1Password CSV must have header and data rows' };
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const entries: VaultEntryWithHistory[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      const getField = (possibleNames: string[]): string => {
        for (const name of possibleNames) {
          const index = headers.indexOf(name.toLowerCase());
          if (index >= 0 && index < row.length) return row[index];
        }
        return '';
      };

      entries.push({
        id: uuidv4(),
        title: getField(['title', 'name', 'url']),
        username: getField(['username', 'user name', 'email']),
        password: getField(['password', 'secret']),
        url: getField(['url', 'website', 'site']),
        description: getField(['notes', 'description', 'extra']),
        category: 'login',
        tags: [],
        favorite: false,
        icon: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passwordHistory: [],
      });
    }

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: `1Password import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Imports from KeePass XML format (simplified parser).
 */
function importFromKeePass(xmlContent: string): Result<VaultEntryWithHistory[]> {
  try {
    const entries: VaultEntryWithHistory[] = [];

    // Simple XML parsing for KeePass format
    const entryRegex = /<Entry>([\s\S]*?)<\/Entry>/g;
    let match;

    while ((match = entryRegex.exec(xmlContent)) !== null) {
      const entryXml = match[1];

      const getString = (key: string): string => {
        const keyRegex = new RegExp(`<Key>${key}</Key>\\s*<Value[^>]*>([^<]*)</Value>`, 'i');
        const keyMatch = keyRegex.exec(entryXml);
        return keyMatch ? keyMatch[1] : '';
      };

      const title = getString('Title') || getString('URL') || 'Untitled';
      const username = getString('UserName');
      const password = getString('Password');
      const url = getString('URL');
      const notes = getString('Notes');

      entries.push({
        id: uuidv4(),
        title,
        username,
        password,
        url,
        description: notes,
        category: 'login',
        tags: [],
        favorite: false,
        icon: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        passwordHistory: [],
      });
    }

    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: `KeePass import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Main import function that dispatches to the correct importer based on format.
 */
export function importData(
  content: string,
  format: ImportFormat,
  columnMapping?: ColumnMapping
): Result<VaultEntryWithHistory[]> {
  switch (format) {
    case 'csv':
      return importFromCSV(content, columnMapping || DEFAULT_COLUMN_MAPPING);
    case 'json':
      return importFromJSON(content);
    case 'bitwarden':
      return importFromBitwarden(content);
    case 'lastpass':
      return importFromLastPass(content);
    case '1password':
      return importFrom1Password(content);
    case 'keepass':
      return importFromKeePass(content);
    default:
      return { success: false, error: `Unsupported import format: ${format}` };
  }
}

/**
 * Exports entries to JSON format (unencrypted).
 */
function exportToJSON(entries: VaultEntryWithHistory[]): string {
  return JSON.stringify(entries, null, 2);
}

/**
 * Exports entries to CSV format.
 */
function exportToCSV(entries: VaultEntryWithHistory[], maskSensitive = false): string {
  const headers = ['title', 'username', 'password', 'url', 'description', 'tags', 'category', 'favorite'];
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const rows = entries.map((entry) => [
    escapeCSV(entry.title),
    escapeCSV(entry.username),
    escapeCSV(maskSensitive ? '••••••••' : entry.password),
    escapeCSV(entry.url),
    escapeCSV(entry.description),
    escapeCSV(entry.tags.join(';')),
    escapeCSV(entry.category),
    escapeCSV(entry.favorite ? 'true' : 'false'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Main export function that dispatches to the correct exporter based on format.
 */
export function exportData(
  entries: VaultEntryWithHistory[],
  format: ExportFormat,
  encryptedVault?: EncryptedVault,
  maskSensitive = false
): Result<string> {
  try {
    switch (format) {
      case 'vault':
        if (!encryptedVault) {
          return { success: false, error: 'Encrypted vault object required for .vault export' };
        }
        return { success: true, data: JSON.stringify(encryptedVault, null, 2) };
      case 'json':
        return { success: true, data: exportToJSON(entries) };
      case 'csv':
        return { success: true, data: exportToCSV(entries, maskSensitive) };
      case 'pdf':
        return { success: false, error: 'PDF export must be handled via HTML template rendering' };
      default:
        return { success: false, error: `Unsupported export format: ${format}` };
    }
  } catch (error) {
    return { success: false, error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Gets column headers from a CSV file for mapping.
 */
export function getCSVColumns(csvContent: string): Result<string[]> {
  try {
    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      return { success: false, error: 'CSV file is empty' };
    }
    return { success: true, data: rows[0].map((h) => h.trim()) };
  } catch (error) {
    return { success: false, error: `Failed to parse CSV columns: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
