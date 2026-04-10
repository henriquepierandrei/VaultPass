/**
 * Clipboard utility with auto-clear functionality.
 */

import { CLIPBOARD_CLEAR_DELAY } from '@shared/constants';

/** Active clipboard timeout reference */
let clipboardTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Copies text to clipboard with optional auto-clear after delay.
 * @param text - Text to copy
 * @param autoClear - Whether to clear clipboard after delay
 * @returns Promise resolving when copy is complete
 */
export async function copyToClipboard(
  text: string,
  autoClear = false
): Promise<void> {
  // Clear any existing timeout
  if (clipboardTimeout) {
    clearTimeout(clipboardTimeout);
    clipboardTimeout = null;
  }

  try {
    await navigator.clipboard.writeText(text);

    if (autoClear) {
      clipboardTimeout = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('');
        } catch {
          // Ignore clear errors
        }
        clipboardTimeout = null;
      }, CLIPBOARD_CLEAR_DELAY);
    }
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Clears the clipboard content immediately.
 */
export async function clearClipboard(): Promise<void> {
  if (clipboardTimeout) {
    clearTimeout(clipboardTimeout);
    clipboardTimeout = null;
  }

  try {
    await navigator.clipboard.writeText('');
  } catch {
    // Ignore errors
  }
}
