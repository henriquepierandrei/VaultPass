/**
 * Unit tests for import/export functionality.
 * Tests parsing and conversion for all supported formats.
 */

import { describe, it, expect } from 'vitest';
import { importData, exportData, getCSVColumns } from '../../src/main/import-export';
import type { VaultEntryWithHistory, ColumnMapping } from '../../src/shared/types';

describe('Import/Export', () => {
  describe('importData - CSV', () => {
    const csvContent = `title,username,password,url,description,tags
GitHub,user@example.com,pass123,https://github.com,My dev account,dev;work
Google,myemail@gmail.com,googlepass,https://google.com,Personal email,personal`;

    const mapping: ColumnMapping = {
      title: 'title',
      username: 'username',
      password: 'password',
      url: 'url',
      description: 'description',
      tags: 'tags',
    };

    it('should import CSV entries correctly', () => {
      const result = importData(csvContent, 'csv', mapping);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].title).toBe('GitHub');
      expect(result.data![0].username).toBe('user@example.com');
    });

    it('should parse tags from semicolon-separated values', () => {
      const result = importData(csvContent, 'csv', mapping);
      expect(result.success).toBe(true);
      expect(result.data![0].tags).toContain('dev');
      expect(result.data![0].tags).toContain('work');
    });
  });

  describe('importData - JSON', () => {
    const jsonContent = JSON.stringify([
      {
        id: 'test-1',
        title: 'Test Entry',
        username: 'testuser',
        password: 'testpass',
        url: 'https://example.com',
        description: 'A test entry',
        category: 'login',
        tags: ['test'],
        favorite: false,
        icon: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]);

    it('should import JSON entries correctly', () => {
      const result = importData(jsonContent, 'json');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('Test Entry');
    });

    it('should handle invalid JSON', () => {
      const result = importData('{ invalid json }', 'json');
      expect(result.success).toBe(false);
    });
  });

  describe('importData - Bitwarden', () => {
    const bitwardenContent = JSON.stringify({
      items: [
        {
          name: 'Bitwarden Login',
          type: 1,
          login: {
            username: 'bwuser',
            password: 'bwpass',
            uris: [{ uri: 'https://bitwarden.com' }],
          },
          notes: 'Bitwarden notes',
          favorite: true,
          creationDate: '2024-01-01T00:00:00.000Z',
        },
      ],
    });

    it('should import Bitwarden entries correctly', () => {
      const result = importData(bitwardenContent, 'bitwarden');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('Bitwarden Login');
      expect(result.data![0].favorite).toBe(true);
    });
  });

  describe('importData - LastPass', () => {
    const lastpassContent = `url,username,password,extra,name,grouping,fav
https://lastpass.com,lpuser,lppass,LP Notes,LastPass Entry,,1`;

    it('should import LastPass entries correctly', () => {
      const result = importData(lastpassContent, 'lastpass');
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('LastPass Entry');
      expect(result.data![0].favorite).toBe(true);
    });
  });

  describe('exportData - JSON', () => {
    const entries: VaultEntryWithHistory[] = [
      {
        id: 'export-test-1',
        title: 'Export Test',
        username: 'expuser',
        password: 'exppass',
        url: 'https://example.com',
        description: 'Test export',
        category: 'login',
        tags: ['test'],
        favorite: false,
        icon: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        passwordHistory: [],
      },
    ];

    it('should export to JSON format', () => {
      const result = exportData(entries, 'json');
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.data!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Export Test');
    });

    it('should export to CSV format', () => {
      const result = exportData(entries, 'csv');
      expect(result.success).toBe(true);
      expect(result.data).toContain('title,username,password');
      expect(result.data).toContain('Export Test');
    });

    it('should mask sensitive data in CSV when requested', () => {
      const result = exportData(entries, 'csv', undefined, true);
      expect(result.success).toBe(true);
      expect(result.data).toContain('••••••••');
      expect(result.data).not.toContain('exppass');
    });
  });

  describe('getCSVColumns', () => {
    it('should extract column headers from CSV', () => {
      const csv = 'name,login,secret,website\nval1,val2,val3,val4';
      const result = getCSVColumns(csv);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(['name', 'login', 'secret', 'website']);
    });

    it('should handle empty CSV', () => {
      const result = getCSVColumns('');
      expect(result.success).toBe(false);
    });
  });
});
