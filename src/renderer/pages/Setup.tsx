/**
 * Setup page for first-time users to create a master password and vault.
 * Premium enterprise design with real-time validation and beautiful UX.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@renderer/store/authStore';
import type { PasswordStrength } from '@shared/types';
import { PASSWORD_REQUIREMENTS } from '@shared/constants';
import { calculatePasswordStrength, getStrengthColor, getStrengthLabel, getStrengthPercentage } from '@renderer/utils/password-strength';

interface RequirementCheck {
  label: string;
  met: boolean;
}

export function Setup(): JSX.Element {
  const navigate = useNavigate();
  const { setAuthenticated, setFirstRun } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [memoryHint, setMemoryHint] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('very-weak');

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (value) {
      setPasswordStrength(calculatePasswordStrength(value));
    } else {
      setPasswordStrength('very-weak');
    }
  }, []);

  const requirements: RequirementCheck[] = [
    { label: `At least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`, met: password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canCreate = allRequirementsMet && passwordsMatch && password.length > 0;

  const handleCreateVault = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!canCreate) {
        if (!allRequirementsMet) {
          toast.error('Please meet all password requirements');
          return;
        }
        if (!passwordsMatch) {
          toast.error('Passwords do not match');
          return;
        }
        return;
      }

      setIsCreating(true);

      try {
        // Prompt user to select vault file location
        const fileResult = await window.api.file.select({
          title: 'Save vault file',
          properties: ['saveFile'],
          filters: [{ name: 'Vault File', extensions: ['vault'] }],
        });

        if (!fileResult.success || !fileResult.data || typeof fileResult.data !== 'string') {
          toast.error('Vault creation cancelled');
          setIsCreating(false);
          return;
        }

        const filePath = fileResult.data;
        const result = await window.api.auth.setup(password, filePath);

        if (result.success) {
          if (memoryHint.trim()) {
            localStorage.setItem('vaultpass-hint', memoryHint.trim());
          }

          // Update stores
          const { useAuthStore } = await import('@renderer/store/authStore');
          useAuthStore.getState().setVaultPath(filePath);
          useAuthStore.getState().setFirstRun(false);
          
          setAuthenticated(true);
          setFirstRun(false);
          toast.success('Vault created successfully!');
          navigate('/dashboard');
        } else {
          toast.error(result.error ?? 'Failed to create vault');
        }
      } catch (error) {
        console.error('Setup error:', error);
        toast.error('Failed to create vault. Please try again.');
      } finally {
        setIsCreating(false);
      }
    },
    [canCreate, allRequirementsMet, passwordsMatch, password, memoryHint, setAuthenticated, setFirstRun, navigate]
  );

  const strengthPercentage = password ? getStrengthPercentage(passwordStrength) : 0;
  const strengthColor = password ? getStrengthColor(passwordStrength) : '';
  const strengthLabel = password ? getStrengthLabel(passwordStrength) : '';

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-8">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-5" 
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="card-glass card border-white/10 p-8 shadow-elevation-3 backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-purple-500/20 border border-white/10 shadow-glow">
              <img src="/assets/logo.png" alt="VaultPass Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Create Master Password
            </h1>
            <p className="mt-2 text-sm text-text-secondary max-w-xs">
              This password encrypts your vault. It cannot be recovered if lost.
            </p>
          </div>

          <form onSubmit={handleCreateVault} className="space-y-5" noValidate>
            {/* Password input with strength meter */}
            <div>
              <label htmlFor="setup-password" className="mb-2 block text-sm font-medium text-text-secondary">
                Master Password
              </label>
              <div className="relative group">
                <div className="input-field-icon group-focus-within:border-accent-500/50 transition-colors duration-200">
                  <span className="material-symbols-rounded text-xl">key</span>
                  <input
                    id="setup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="input-field border-0 bg-transparent focus:ring-0 focus:border-0 pr-12 text-base"
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    autoFocus
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

              {/* Strength bar */}
              {password && (
                <div className="mt-3 animate-fade-in" role="progressbar" aria-valuenow={strengthPercentage} aria-valuemin={0} aria-valuemax={100}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">Password Strength</span>
                    <span className="text-xs font-semibold" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-spring"
                      style={{ width: `${strengthPercentage}%`, backgroundColor: strengthColor }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Requirements checklist */}
            <div className="rounded-xl bg-surface-secondary/50 border border-border-subtle p-4">
              <p className="mb-3 text-sm font-semibold text-text-secondary">Requirements</p>
              <ul className="space-y-2">
                {requirements.map((req) => (
                  <li key={req.label} className="flex items-center gap-2.5 text-sm transition-all duration-200">
                    <span
                      className={`material-symbols-rounded text-lg flex-shrink-0 transition-all duration-300 ${
                        req.met ? 'text-accent-400 scale-110' : 'text-text-faint'
                      }`}
                    >
                      {req.met ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`transition-colors duration-200 ${req.met ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="setup-confirm" className="mb-2 block text-sm font-medium text-text-secondary">
                Confirm Password
              </label>
              <div className="relative group">
                <div className={`input-field-icon transition-colors duration-200 ${
                  confirmPassword.length > 0 
                    ? passwordsMatch 
                      ? 'border-accent-500/50' 
                      : 'border-red-500/50'
                    : ''
                }`}>
                  <span className="material-symbols-rounded text-xl">check</span>
                  <input
                    id="setup-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field border-0 bg-transparent focus:ring-0 focus:border-0 pr-12 text-base"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    aria-label="Confirm master password"
                    aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 icon-btn p-2"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <span className="material-symbols-rounded text-lg">
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Match indicator */}
              {confirmPassword.length > 0 && (
                <p
                  className={`mt-2 flex items-center gap-1.5 text-xs font-medium animate-fade-in ${
                    passwordsMatch ? 'text-accent-400' : 'text-red-400'
                  }`}
                  role="alert"
                >
                  <span className="material-symbols-rounded text-base">
                    {passwordsMatch ? 'verified' : 'error'}
                  </span>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {/* Memory hint */}
            <div>
              <label htmlFor="setup-hint" className="mb-2 block text-sm font-medium text-text-secondary">
                Memory Hint <span className="text-text-muted font-normal">(stored locally only)</span>
              </label>
              <input
                id="setup-hint"
                type="text"
                value={memoryHint}
                onChange={(e) => setMemoryHint(e.target.value)}
                className="input-field"
                placeholder="A hint to help you remember..."
                aria-label="Memory hint"
              />
            </div>

            {/* Create vault button */}
            <button
              type="submit"
              disabled={!canCreate || isCreating}
              className="btn-primary w-full text-base h-12 rounded-xl mt-6"
              aria-label="Create vault"
            >
              {isCreating ? (
                <>
                  <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating Vault...
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-xl">shield</span>
                  Create Secure Vault
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-faint">
          <span className="material-symbols-rounded text-sm">lock</span>
          <span>Military-grade AES-256 encryption</span>
        </div>
      </div>
    </div>
  );
}
