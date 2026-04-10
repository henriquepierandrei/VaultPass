/**
 * Settings page with sections for Appearance, Security, Storage, Keyboard Shortcuts, and About.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AppSettings } from '@shared/types';
import { KEYBOARD_SHORTCUTS, SESSION_TIMEOUTS } from '@shared/constants';
import { useSettingsStore } from '@renderer/store/settingsStore';
import { useAuthStore } from '@renderer/store/authStore';
import { ToggleSwitch } from '@renderer/components/ToggleSwitch';

type SettingsSection = 'appearance' | 'security' | 'storage' | 'shortcuts' | 'about';

interface SectionItem {
  id: SettingsSection;
  label: string;
  icon: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'security', label: 'Security', icon: 'security' },
  { id: 'storage', label: 'Storage', icon: 'folder' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: 'keyboard' },
  { id: 'about', label: 'About', icon: 'info' },
];

export function Settings(): JSX.Element {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const {
    theme,
    sessionTimeout,
    vaultPath,
    autoBackup,
    backupPath,
    isLoaded,
    setTheme,
    setSessionTimeout,
    setVaultPath,
    setAutoBackup,
    setBackupPath,
  } = useSettingsStore();

  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Listen for settings updates from main process
  useEffect(() => {
    const cleanup = window.api.events.onSettingsUpdated((settings: AppSettings) => {
      useSettingsStore.getState().setSettings(settings);
    });
    return cleanup;
  }, []);

  // Handle vault path selection
  const handleSelectVaultPath = useCallback(async () => {
    try {
      const result = await window.api.file.select({
        title: 'Select vault file',
        properties: ['openFile'],
        filters: [{ name: 'Vault File', extensions: ['vault'] }],
      });
      if (result.success && result.data && typeof result.data === 'string') {
        setVaultPath(result.data);
        toast.success('Vault path updated');
      }
    } catch {
      toast.error('Failed to select vault path');
    }
  }, [setVaultPath]);

  // Handle backup path selection
  const handleSelectBackupPath = useCallback(async () => {
    try {
      const result = await window.api.file.select({
        title: 'Select backup directory',
        properties: ['openDirectory'],
      });
      if (result.success && result.data && typeof result.data === 'string') {
        setBackupPath(result.data);
        toast.success('Backup path updated');
      }
    } catch {
      toast.error('Failed to select backup path');
    }
  }, [setBackupPath]);

  // Handle change master password
  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        toast.error('Please fill in all fields');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (newPassword.length < 12) {
        toast.error('New password must be at least 12 characters');
        return;
      }

      setIsChangingPassword(true);

      try {
        // Verify current password first
        const verifyResult = await window.api.auth.verifyMaster(currentPassword, vaultPath);

        if (!verifyResult.success || !verifyResult.data) {
          toast.error('Current password is incorrect');
          return;
        }

        // Re-key the vault with the new password
        const setupResult = await window.api.auth.setup(newPassword);

        if (setupResult.success) {
          toast.success('Master password changed successfully');
          setShowChangePassword(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
        } else {
          toast.error(setupResult.error ?? 'Failed to change password');
        }
      } catch {
        toast.error('Failed to change password. Please try again.');
      } finally {
        setIsChangingPassword(false);
      }
    },
    [currentPassword, newPassword, confirmNewPassword, vaultPath]
  );

  // Handle logout
  const handleLogout = useCallback(async () => {
    await window.api.auth.logout();
    logout();
    toast.info('Vault locked');
    navigate('/login');
  }, [logout, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar navigation */}
      <aside className="w-64 flex-shrink-0 border-r border-border-subtle bg-background-secondary" aria-label="Settings navigation">
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-5">
          <button
            onClick={() => navigate('/dashboard')}
            className="icon-btn hover:bg-surface-secondary"
            aria-label="Back to dashboard"
          >
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Settings</h1>
        </div>

        <nav className="p-3" aria-label="Settings sections">
          <ul className="space-y-0.5">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-accent-500/10 text-accent-400 shadow-sm'
                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                  }`}
                  aria-current={activeSection === section.id ? 'page' : undefined}
                >
                  <span className={`material-symbols-rounded text-xl ${activeSection === section.id ? 'text-accent-400' : ''}`}>{section.icon}</span>
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin" aria-label="Settings content">
        <div className="mx-auto max-w-2xl px-8 py-8">
          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-2xl text-accent-400">palette</span>
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Appearance</h2>
              </div>

              <div className="card-glass card border-white/5 space-y-5 backdrop-blur-xl">
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary mb-1">Theme Mode</h3>
                  <p className="text-xs text-text-muted">Choose your preferred visual experience</p>
                </div>

                <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-secondary/50 border border-border-subtle">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/10">
                      <span className={`material-symbols-rounded text-xl ${theme === 'dark' ? 'text-accent-400' : 'text-text-muted'}`}>
                        {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                      <p className="text-xs text-text-muted">
                        {theme === 'dark' ? 'Easier on the eyes in low-light' : 'Bright and clean interface'}
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={theme === 'dark'}
                    onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    ariaLabel="Toggle dark mode"
                    size="md"
                  />
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-text-secondary mb-3">Preview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Dark theme preview */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`group relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-300 ease-spring ${
                        theme === 'dark'
                          ? 'border-accent-500/50 bg-surface-secondary shadow-glow'
                          : 'border-border-subtle bg-surface-secondary hover:border-border hover:-translate-y-0.5'
                      }`}
                      aria-label="Select dark theme"
                      aria-pressed={theme === 'dark'}
                    >
                      {theme === 'dark' && (
                        <div className="absolute top-3 right-3">
                          <span className="material-symbols-rounded text-accent-400 text-lg">check_circle</span>
                        </div>
                      )}
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                          <span className="material-symbols-rounded text-sm text-accent-400">dark_mode</span>
                        </div>
                        <span className="text-sm font-semibold text-text-primary">Dark</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-accent-500/30 to-accent-500/10" />
                        <div className="h-1.5 w-1/2 rounded-full bg-surface-tertiary" />
                        <div className="h-1.5 w-2/3 rounded-full bg-surface-tertiary" />
                      </div>
                    </button>

                    {/* Light theme preview */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`group relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-300 ease-spring ${
                        theme === 'light'
                          ? 'border-accent-500/50 bg-surface-light shadow-glow'
                          : 'border-border-subtle bg-surface-light hover:border-border hover:-translate-y-0.5'
                      }`}
                      aria-label="Select light theme"
                      aria-pressed={theme === 'light'}
                    >
                      {theme === 'light' && (
                        <div className="absolute top-3 right-3">
                          <span className="material-symbols-rounded text-accent-400 text-lg">check_circle</span>
                        </div>
                      )}
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                          <span className="material-symbols-rounded text-sm text-yellow-500">light_mode</span>
                        </div>
                        <span className="text-sm font-semibold text-text-primary-light">Light</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-accent-500/30 to-accent-500/10" />
                        <div className="h-1.5 w-1/2 rounded-full bg-gray-200" />
                        <div className="h-1.5 w-2/3 rounded-full bg-gray-200" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">Security</h2>

              {/* Session timeout */}
              <div className="card space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">Session Timeout</h3>
                <p className="text-xs text-text-muted">Automatically lock the vault after this period of inactivity.</p>
                <div className="flex flex-wrap gap-2">
                  {SESSION_TIMEOUTS.map((timeout) => (
                    <button
                      key={timeout}
                      onClick={() => setSessionTimeout(timeout)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        sessionTimeout === timeout
                          ? 'border-accent-500 bg-accent-500/10 text-accent-500'
                          : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                      }`}
                      aria-pressed={sessionTimeout === timeout}
                      aria-label={`Set session timeout to ${timeout} minutes`}
                    >
                      {timeout} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Change master password */}
              <div className="card space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">Master Password</h3>

                {!showChangePassword ? (
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="btn-secondary text-sm"
                  >
                    <span className="material-symbols-rounded text-sm mr-1">lock_reset</span>
                    Change Master Password
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-3" noValidate>
                    <div>
                      <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-text-secondary">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          id="current-password"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="input-field pr-10"
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          aria-label="Current master password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn"
                          aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          <span className="material-symbols-rounded text-sm">
                            {showCurrentPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-text-secondary">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-field pr-10"
                          placeholder="Enter new password (min 12 characters)"
                          autoComplete="new-password"
                          aria-label="New master password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn"
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          <span className="material-symbols-rounded text-sm">
                            {showNewPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium text-text-secondary">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-new-password"
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className={`input-field pr-10 ${
                            confirmNewPassword.length > 0
                              ? newPassword === confirmNewPassword
                                ? 'border-green-500'
                                : 'border-red-500'
                              : ''
                          }`}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
                          aria-label="Confirm new master password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn"
                          aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          <span className="material-symbols-rounded text-sm">
                            {showConfirmNewPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword}
                        className="btn-primary text-sm"
                      >
                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmNewPassword('');
                        }}
                        className="btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Lock vault now */}
              <div className="card">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                  aria-label="Lock vault now"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded">lock</span>
                    <span>Lock Vault Now</span>
                  </div>
                  <span className="material-symbols-rounded text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}

          {/* Storage Section */}
          {activeSection === 'storage' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">Storage</h2>

              {/* Vault file path */}
              <div className="card space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">Vault File</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vaultPath}
                    readOnly
                    className="input-field flex-1 bg-surface-hover font-mono text-xs"
                    placeholder="No vault file selected"
                    aria-label="Vault file path"
                  />
                  <button onClick={handleSelectVaultPath} className="btn-secondary text-sm" aria-label="Browse for vault file">
                    <span className="material-symbols-rounded text-sm mr-1">folder_open</span>
                    Browse
                  </button>
                </div>
              </div>

              {/* Auto backup */}
              <div className="card space-y-4">
                <h3 className="text-sm font-medium text-text-secondary">Automatic Backup</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Enable Auto Backup</p>
                    <p className="text-xs text-text-muted">Create a backup every time you save changes</p>
                  </div>
                  <ToggleSwitch
                    checked={autoBackup}
                    onChange={setAutoBackup}
                    ariaLabel="Toggle automatic backup"
                  />
                </div>

                {autoBackup && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label htmlFor="backup-path" className="block text-sm font-medium text-text-secondary">
                      Backup Directory
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="backup-path"
                        type="text"
                        value={backupPath}
                        readOnly
                        className="input-field flex-1 bg-surface-hover font-mono text-xs"
                        placeholder="No backup directory selected"
                        aria-label="Backup directory path"
                      />
                      <button onClick={handleSelectBackupPath} className="btn-secondary text-sm" aria-label="Browse for backup directory">
                        <span className="material-symbols-rounded text-sm mr-1">folder_open</span>
                        Browse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Section */}
          {activeSection === 'shortcuts' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">Keyboard Shortcuts</h2>

              <div className="card">
                <ul className="divide-y divide-border" aria-label="Keyboard shortcuts list">
                  {Object.entries(KEYBOARD_SHORTCUTS).map(([name, shortcut]) => (
                    <li key={name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-text-primary">{getShortcutDescription(name)}</span>
                      <kbd className="rounded-md border border-border bg-surface-hover px-2.5 py-1 font-mono text-xs text-text-secondary">
                        {shortcut}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* About Section */}
          {activeSection === 'about' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary">About</h2>

              <div className="card space-y-4">
                {/* App info */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-500/10">
                    <span className="material-symbols-rounded text-3xl text-accent-500">lock</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">VaultPass</h3>
                    <p className="text-sm text-text-muted">Version 1.0.0</p>
                  </div>
                </div>

                <p className="text-sm text-text-secondary">
                  A secure, cross-platform desktop password manager with end-to-end encryption.
                  Your data never leaves your device unencrypted.
                </p>

                {/* Links */}
                <div className="space-y-2 border-t border-border pt-4">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-accent-500 transition-colors hover:text-accent-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-symbols-rounded text-sm">link</span>
                    Documentation
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-accent-500 transition-colors hover:text-accent-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-symbols-rounded text-sm">code</span>
                    Source Code
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-sm text-accent-500 transition-colors hover:text-accent-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-symbols-rounded text-sm">bug_report</span>
                    Report an Issue
                  </a>
                </div>

                {/* Credits */}
                <div className="border-t border-border pt-4 text-xs text-text-muted">
                  <p>Built with Electron, React, and TypeScript</p>
                  <p className="mt-1">Encryption: AES-256-GCM with PBKDF2 key derivation (100,000 iterations)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function getShortcutDescription(name: string): string {
  const descriptions: Record<string, string> = {
    NEW_ENTRY: 'Create a new vault entry',
    FOCUS_SEARCH: 'Focus the search input',
    OPEN_GENERATOR: 'Open the password generator',
    LOCK_VAULT: 'Lock the vault immediately',
    OPEN_SETTINGS: 'Open settings page',
    CLOSE_MODAL: 'Close any open modal or drawer',
    COPY_WITHOUT_REVEAL: 'Copy field content without revealing',
  };
  return descriptions[name] ?? name;
}
