/**
 * Main React application entry point.
 * Sets up routing, global providers, and theme initialization.
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useSettingsStore } from '@renderer/store/settingsStore';
import { useAuthStore } from '@renderer/store/authStore';
import { KEYBOARD_SHORTCUTS } from '@shared/constants';
import { Login } from '@renderer/pages/Login';
import { Setup } from '@renderer/pages/Setup';
import { Dashboard } from '@renderer/pages/Dashboard';
import { Settings } from '@renderer/pages/Settings';
import { Audit } from '@renderer/pages/Audit';
import { GeneratorModal } from '@renderer/components/GeneratorModal';
import './styles/index.css';

function App(): JSX.Element {
  const { loadSettings, isLoaded } = useSettingsStore();
  const { isAuthenticated, isFirstRun } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings().then(() => setIsReady(true));
  }, [loadSettings]);

  // Listen for vault lock events from main process
  useEffect(() => {
    const cleanup = window.api.events.onVaultLocked(() => {
      useAuthStore.getState().logout();
    });
    return cleanup;
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+G: Open generator
      if (isCtrl && e.key === 'g') {
        e.preventDefault();
        useSettingsStore.setState((state) => ({ ...state })); // Trigger re-render
        // Dispatch custom event for generator modal
        window.dispatchEvent(new CustomEvent('vaultpass:open-generator'));
      }

      // Ctrl+L: Lock vault
      if (isCtrl && e.key === 'l') {
        e.preventDefault();
        if (useAuthStore.getState().isAuthenticated) {
          window.api.util.lockVault();
        }
      }

      // Ctrl+, : Open settings
      if (isCtrl && e.key === ',') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('vaultpass:open-settings'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="h-screen overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              isFirstRun ? (
                <Navigate to="/setup" replace />
              ) : isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          <Route
            path="/dashboard/*"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/settings"
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/audit"
            element={isAuthenticated ? <Audit /> : <Navigate to="/login" replace />}
          />
        </Routes>

        <GeneratorModal />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--toast-bg)',
              color: 'white',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: { style: { background: '#059669' } },
            error: { style: { background: '#dc2626' } },
            warning: { style: { background: '#d97706' } },
            info: { style: { background: '#2563eb' } },
          }}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
