/**
 * ImportExportModal component for importing and exporting vault data.
 * Supports multiple import formats (CSV, JSON, Bitwarden, LastPass, 1Password, KeePass)
 * and export formats (.vault, JSON, CSV, PDF).
 * Includes column mapping UI for CSV imports.
 */

import { useState, useCallback, useRef } from 'react';
import type { ImportFormat, ExportFormat, ColumnMapping } from '@shared/types';
import { IMPORT_FORMATS, EXPORT_FORMATS, DEFAULT_COLUMN_MAPPING } from '@shared/constants';
import { useEscapeKey } from '@renderer/hooks/useHooks';
import { toast } from 'sonner';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, format: ImportFormat, mapping?: ColumnMapping) => Promise<void>;
  onExport: (format: ExportFormat) => Promise<void>;
}

type Tab = 'import' | 'export';

export function ImportExportModal({
  isOpen,
  onClose,
  onImport,
  onExport,
}: ImportExportModalProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('import');
  const [importFormat, setImportFormat] = useState<ImportFormat>('csv');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('vault');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ ...DEFAULT_COLUMN_MAPPING });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(onClose);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSelectedFile(file);

      // If CSV, try to parse headers for column mapping
      if (importFormat === 'csv' || importFormat === 'lastpass' || importFormat === '1password') {
        try {
          const text = await file.text();
          const firstLine = text.split('\n')[0];
          const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          setCsvHeaders(headers);

          // Auto-map columns if headers match known field names
          const mapping = { ...DEFAULT_COLUMN_MAPPING };
          const fieldNames: (keyof ColumnMapping)[] = ['title', 'username', 'password', 'url', 'description', 'tags'];
          for (const field of fieldNames) {
            const match = headers.find(
              (h) => h.toLowerCase().includes(field) || h.toLowerCase() === field
            );
            if (match) {
              mapping[field] = match;
            }
          }
          setColumnMapping(mapping);
          setShowColumnMapping(true);
        } catch {
          setShowColumnMapping(false);
        }
      } else {
        setShowColumnMapping(false);
      }
    },
    [importFormat]
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(
        selectedFile,
        importFormat,
        showColumnMapping ? columnMapping : undefined
      );
      toast.success('Import successful');
      resetState();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, importFormat, columnMapping, showColumnMapping, onImport, onClose]);

  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onExport(exportFormat);
      toast.success('Export successful');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }, [exportFormat, onExport, onClose]);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setShowColumnMapping(false);
    setCsvHeaders([]);
    setColumnMapping({ ...DEFAULT_COLUMN_MAPPING });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  if (!isOpen) {
    return <></>;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="modal-content lg"
        role="dialog"
        aria-modal="true"
        aria-label="Import / Export vault data"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Import / Export</h2>
          <button onClick={handleClose} className="icon-btn" aria-label="Close">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex rounded-lg border border-border p-1" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-accent-500 text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-rounded mr-1 inline-block text-sm">upload_file</span>
            Import
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'export'}
            onClick={() => setActiveTab('export')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'bg-accent-500 text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-rounded mr-1 inline-block text-sm">download</span>
            Export
          </button>
        </div>

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            {/* Import format selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Import Format
              </label>
              <select
                value={importFormat}
                onChange={(e) => {
                  setImportFormat(e.target.value as ImportFormat);
                  setSelectedFile(null);
                  setShowColumnMapping(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="input-field"
                aria-label="Select import format"
              >
                {IMPORT_FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File upload */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Select File
              </label>
              <div
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  selectedFile
                    ? 'border-accent-500 bg-accent-500/5'
                    : 'border-border hover:border-accent-500/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Select file to import"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={getFileAccept(importFormat)}
                  aria-hidden="true"
                />
                {selectedFile ? (
                  <>
                    <span className="material-symbols-rounded mb-2 text-accent-500">
                      check_circle
                    </span>
                    <p className="text-sm font-medium text-text-primary">{selectedFile.name}</p>
                    <p className="text-xs text-text-muted">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded mb-2 text-text-muted">
                      upload_file
                    </span>
                    <p className="text-sm text-text-secondary">
                      Click to select or drag a file here
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {getFormatExtensions(importFormat)}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Column Mapping for CSV */}
            {showColumnMapping && csvHeaders.length > 0 && (
              <div className="rounded-lg border border-border bg-surface-hover p-4">
                <h3 className="mb-3 text-sm font-semibold text-text-primary">
                  <span className="material-symbols-rounded mr-1 inline-block text-sm">map</span>
                  Column Mapping
                </h3>
                <p className="mb-3 text-xs text-text-secondary">
                  Map the CSV columns to vault fields:
                </p>
                <div className="space-y-2">
                  {(
                    [
                      { key: 'title', label: 'Title' },
                      { key: 'username', label: 'Username' },
                      { key: 'password', label: 'Password' },
                      { key: 'url', label: 'URL' },
                      { key: 'description', label: 'Description' },
                      { key: 'tags', label: 'Tags' },
                    ] as { key: keyof ColumnMapping; label: string }[]
                  ).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label
                        htmlFor={`mapping-${key}`}
                        className="w-24 text-sm font-medium text-text-secondary"
                      >
                        {label}
                      </label>
                      <select
                        id={`mapping-${key}`}
                        value={columnMapping[key]}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="input-field flex-1 text-sm"
                        aria-label={`Map ${label} column`}
                      >
                        <option value="">-- Skip --</option>
                        {csvHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
              className="btn-primary w-full"
            >
              <span className="material-symbols-rounded mr-1 text-sm">upload_file</span>
              {isProcessing ? 'Importing...' : 'Import'}
            </button>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Export format selection */}
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Export Format
              </label>
              <div className="space-y-2">
                {EXPORT_FORMATS.map((format) => (
                  <label
                    key={format.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      exportFormat === format.value
                        ? 'border-accent-500 bg-accent-500/5'
                        : 'border-border hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="export-format"
                      value={format.value}
                      checked={exportFormat === format.value}
                      onChange={() => setExportFormat(format.value as ExportFormat)}
                      className="sr-only"
                      aria-label={format.label}
                    />
                    <span
                      className={`material-symbols-rounded ${
                        exportFormat === format.value ? 'text-accent-500' : 'text-text-muted'
                      }`}
                    >
                      {getExportIcon(format.value)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{format.label}</p>
                      <p className="text-xs text-text-muted">
                        {getExportDescription(format.value)}
                      </p>
                    </div>
                    {exportFormat === format.value && (
                      <span className="material-symbols-rounded text-accent-500 filled">
                        check_circle
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Warning for unencrypted exports */}
            {exportFormat !== 'vault' && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                <span className="material-symbols-rounded flex-shrink-0 text-yellow-500">
                  warning
                </span>
                <p className="text-xs text-text-secondary">
                  This export will be <strong>unencrypted</strong>. Store the file securely and
                  delete it after use.
                </p>
              </div>
            )}

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="btn-primary w-full"
            >
              <span className="material-symbols-rounded mr-1 text-sm">download</span>
              {isProcessing ? 'Exporting...' : 'Export Vault'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getFileAccept(format: ImportFormat): string {
  switch (format) {
    case 'csv':
    case 'lastpass':
    case '1password':
      return '.csv';
    case 'json':
    case 'bitwarden':
      return '.json';
    case 'keepass':
      return '.xml,.kdbx';
    default:
      return '*/*';
  }
}

function getFormatExtensions(format: ImportFormat): string {
  switch (format) {
    case 'csv':
      return 'Supports .csv files';
    case 'json':
      return 'Supports .json files';
    case 'bitwarden':
      return 'Bitwarden JSON export';
    case 'lastpass':
      return 'LastPass CSV export';
    case '1password':
      return '1Password CSV export';
    case 'keepass':
      return 'KeePass XML export';
    default:
      return '';
  }
}

function getExportIcon(format: ExportFormat): string {
  const icons: Record<ExportFormat, string> = {
    'vault': 'lock',
    'json': 'data_object',
    'csv': 'table_chart',
    'pdf': 'picture_as_pdf',
  };
  return icons[format];
}

function getExportDescription(format: ExportFormat): string {
  const descriptions: Record<ExportFormat, string> = {
    'vault': 'Encrypted .vault file (recommended)',
    'json': 'Plain JSON with all entry data',
    'csv': 'Spreadsheet-compatible CSV file',
    'pdf': 'Formatted PDF document',
  };
  return descriptions[format];
}
