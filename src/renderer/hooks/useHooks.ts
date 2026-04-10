/**
 * Custom React hooks for the VaultPass application.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for debouncing a value.
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for handling keyboard shortcuts.
 * @param keyCombo - Key combination (e.g., 'Ctrl+N')
 * @param callback - Function to call when shortcut is triggered
 */
export function useKeyboardShortcut(
  keyCombo: string,
  callback: (e: KeyboardEvent) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const parts = keyCombo.toLowerCase().split('+');
      const requiresCtrl = parts.includes('ctrl');
      const requiresShift = parts.includes('shift');
      const requiresAlt = parts.includes('alt');
      const key = parts[parts.length - 1];

      const isCtrl = requiresCtrl ? (e.ctrlKey || e.metaKey) : true;
      const isShift = requiresShift ? e.shiftKey : true;
      const isAlt = requiresAlt ? e.altKey : true;
      const isKey = e.key.toLowerCase() === key;

      if (isCtrl && isShift && isAlt && isKey) {
        e.preventDefault();
        callbackRef.current(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keyCombo]);
}

/**
 * Hook for managing local storage state.
 * @param key - Local storage key
 * @param initialValue - Initial value
 * @returns State tuple like useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch {
          // Ignore storage errors
        }
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

/**
 * Hook for handling escape key to close modals.
 * @param callback - Function to call on Escape
 */
export function useEscapeKey(callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callbackRef.current();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

/**
 * Hook for focus trap inside a modal/dialog.
 * @param containerRef - Ref to the container element
 * @param isActive - Whether the trap is active
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean
): void {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
  }, [containerRef, isActive]);
}

/**
 * Hook for loading vault entries on mount.
 */
export function useVaultLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVault = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.api.vault.load();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load vault';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, loadVault };
}
