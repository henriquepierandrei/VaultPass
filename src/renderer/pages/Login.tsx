/**
 * Login page for unlocking an existing vault.
 * Premium enterprise design with glass morphism and gradient accents.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@renderer/store/authStore';
import { useSettingsStore } from '@renderer/store/settingsStore';

export function Login(): JSX.Element {
  const navigate = useNavigate();
  const { setAuthenticated, setBruteForceState } = useAuthStore();
  const { vaultPath } = useSettingsStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [bruteForce, setBruteForce] = useState<{
    failedAttempts: number;
    locked: boolean;
    allowed: boolean;
    remainingLockout: number;
  } | null>(null);

  useEffect(() => {
    const fetchBruteForceState = async () => {
      try {
        const state = await window.api.auth.getBruteForceState();
        setBruteForce(state);
        setBruteForceState(state);
      } catch {
        // Silently ignore
      }
    };
    fetchBruteForceState();
  }, [setBruteForceState]);

  const handleUnlock = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!password) {
        toast.error('Please enter your master password');
        return;
      }

      if (bruteForce?.locked) {
        toast.error('Vault is locked. Please try again later.');
        return;
      }

      setIsUnlocking(true);

      try {
        const result = await window.api.auth.login(password, vaultPath);

        if (result.success) {
          setAuthenticated(true);
          toast.success('Vault unlocked successfully');
          navigate('/dashboard');
        } else {
          toast.error(result.error ?? 'Incorrect password');

          const state = await window.api.auth.getBruteForceState();
          setBruteForce(state);
          setBruteForceState(state);

          if (state.locked) {
            toast.error('Too many failed attempts. Vault is now locked.');
          }
        }
      } catch {
        toast.error('Failed to unlock vault. Please try again.');
      } finally {
        setIsUnlocking(false);
      }
    },
    [password, vaultPath, bruteForce, setAuthenticated, setBruteForceState, navigate]
  );

  const remainingAttempts = bruteForce
    ? Math.max(0, 10 - bruteForce.failedAttempts)
    : null;

  const lockoutSeconds = bruteForce && bruteForce.remainingLockout > 0
    ? Math.ceil(bruteForce.remainingLockout / 1000)
    : 0;

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-5" 
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
        <div className="card-glass card border-white/10 p-8 shadow-elevation-3 backdrop-blur-xl">
          {/* Logo and title */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-blue-500/20 border border-white/10 shadow-glow">
              <span className="material-symbols-rounded text-5xl text-accent-400">lock</span>
            </div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-text-secondary max-w-xs">
              Enter your master password to access your secure vault
            </p>
          </div>

          {/* Brute-force lockout warning */}
          {bruteForce?.locked && lockoutSeconds > 0 && (
            <div
              className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-400 animate-shake"
              role="alert"
            >
              <span className="material-symbols-rounded text-xl flex-shrink-0">warning</span>
              <span className="font-medium">Vault locked. Try again in {lockoutSeconds}s</span>
            </div>
          )}

          {bruteForce?.locked && lockoutSeconds === 0 && (
            <div
              className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"
              role="alert"
            >
              <span className="material-symbols-rounded text-xl flex-shrink-0">block</span>
              <span className="font-medium">Vault permanently locked. Please use backup recovery.</span>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleUnlock} className="space-y-5" noValidate>
            <div>
              <label htmlFor="master-password" className="sr-only">
                Master Password
              </label>
              <div className="relative group">
                <div className="input-field-icon group-focus-within:border-accent-500/50 transition-colors duration-200">
                  <span className="material-symbols-rounded text-xl">key</span>
                  <input
                    id="master-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field border-0 bg-transparent focus:ring-0 focus:border-0 pr-12 text-base"
                    placeholder="Master Password"
                    autoComplete="current-password"
                    autoFocus
                    disabled={bruteForce?.locked}
                    aria-label="Master password"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn p-2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <span className="material-symbols-rounded text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remaining attempts indicator */}
            {remainingAttempts !== null && remainingAttempts <= 5 && remainingAttempts > 0 && !bruteForce?.locked && (
              <div className="flex items-center gap-2 text-xs text-text-muted" aria-live="polite">
                <span className="material-symbols-rounded text-sm">info</span>
                <span>{remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUnlocking || !password || bruteForce?.locked}
              className="btn-primary w-full text-base h-12 rounded-xl"
              aria-label="Unlock vault"
            >
              {isUnlocking ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Unlocking...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-xl">lock_open</span>
                  Unlock Vault
                </>
              )}
            </button>
          </form>

          {/* Help links */}
          <div className="mt-8 flex flex-col items-center gap-4 text-sm">
            <button
              className="text-accent-400 transition-all duration-200 hover:text-accent-300 hover:underline underline-offset-4"
              onClick={() => toast.info('If you forgot your master password, your vault cannot be recovered. This is by design for maximum security.')}
              aria-label="Forgot password help"
            >
              Forgot password?
            </button>

            <div className="flex items-center gap-2 text-text-muted">
              <span>New here?</span>
              <Link
                to="/setup"
                className="text-accent-400 transition-all duration-200 hover:text-accent-300 hover:underline underline-offset-4 font-medium"
              >
                Create a vault
              </Link>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-faint">
          <span className="material-symbols-rounded text-sm">shield</span>
          <span>AES-256 Encrypted • Zero Knowledge</span>
        </div>
      </div>
    </div>
  );
}
