/**
 * Password Generator Modal Component.
 * Accessible via Ctrl+G from anywhere in the app.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGeneratorStore, setOnPasswordSelected } from '@renderer/store/generatorStore';
import { useEscapeKey, useFocusTrap } from '@renderer/hooks/useHooks';
import { getStrengthColor, getStrengthLabel, getStrengthPercentage } from '@renderer/utils/password-strength';
import { toast } from 'sonner';

export function GeneratorModal(): JSX.Element {
  const { isOpen, options, results, isGenerating, setOptions, setOpen, generate, usePassword } = useGeneratorStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const [localPassword, setLocalPassword] = useState('');

  useEscapeKey(() => setOpen(false));
  useFocusTrap(modalRef, isOpen);

  // Register callback for "Use this password"
  useEffect(() => {
    setOnPasswordSelected((password) => {
      setLocalPassword(password);
    });
    return () => setOnPasswordSelected(null);
  }, []);

  // Listen for custom open event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('vaultpass:open-generator', handler);
    return () => window.removeEventListener('vaultpass:open-generator', handler);
  }, [setOpen]);

  const handleGenerate = useCallback(async () => {
    await generate();
  }, [generate]);

  const handleCopy = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Failed to copy password');
    }
  };

  if (!isOpen) return <></>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="Password Generator">
      <div ref={modalRef} className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-modal animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">Generate Password</h2>
          <button
            onClick={() => setOpen(false)}
            className="icon-btn"
            aria-label="Close generator"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Length Slider */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">Length</label>
            <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-sm font-mono text-accent-500">
              {options.length}
            </span>
          </div>
          <input
            type="range"
            min="8"
            max="128"
            value={options.length}
            onChange={(e) => setOptions({ length: parseInt(e.target.value, 10) })}
            className="w-full accent-accent-500"
            aria-label="Password length"
          />
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>8</span>
            <span>128</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Toggle label="Uppercase (A-Z)" checked={options.includeUppercase} onChange={(v) => setOptions({ includeUppercase: v })} />
          <Toggle label="Lowercase (a-z)" checked={options.includeLowercase} onChange={(v) => setOptions({ includeLowercase: v })} />
          <Toggle label="Numbers (0-9)" checked={options.includeNumbers} onChange={(v) => setOptions({ includeNumbers: v })} />
          <Toggle label="Symbols (!@#)" checked={options.includeSymbols} onChange={(v) => setOptions({ includeSymbols: v })} />
          <Toggle label="Exclude Ambiguous" checked={options.excludeAmbiguous} onChange={(v) => setOptions({ excludeAmbiguous: v })} />
        </div>

        {/* Count */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-text-secondary">Number of Passwords</label>
          <input
            type="number"
            min="1"
            max="10"
            value={options.count}
            onChange={(e) => setOptions({ count: Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
            className="input-field w-24"
            aria-label="Number of passwords"
          />
        </div>

        {/* Generate Button */}
        <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary w-full mb-4">
          <span className="material-symbols-rounded mr-2">autorenew</span>
          {isGenerating ? 'Generating...' : 'Generate Passwords'}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="rounded-lg border border-border bg-surface-hover p-3">
                <div className="mb-2 font-mono text-sm text-text-primary break-all">{result.password}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-surface-hover overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getStrengthColor(result.strength as any)}`}
                        style={{ width: `${getStrengthPercentage(result.strength as any)}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{getStrengthLabel(result.strength as any)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleCopy(result.password)} className="icon-btn" aria-label="Copy password">
                      <span className="material-symbols-rounded text-sm">content_copy</span>
                    </button>
                    <button onClick={() => usePassword(result.password)} className="icon-btn" aria-label="Use this password">
                      <span className="material-symbols-rounded text-sm">check</span>
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-text-muted">~{result.crackTimeEstimate} to crack</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <div
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!checked); } }}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-surface-hover'}`}
      >
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'left-4' : 'left-0.5'}`} />
      </div>
      <span className="text-xs text-text-secondary">{label}</span>
    </label>
  );
}
