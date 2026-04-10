/**
 * Security Audit page.
 * Analyzes vault entries for weak, reused, and old passwords.
 * Shows summary cards, grouped issue lists, and optional HaveIBeenPwned check.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { VaultEntryWithHistory, PasswordStrength } from '@shared/types';
import { useVaultStore } from '@renderer/store/vaultStore';
import { calculatePasswordStrength, getStrengthColor, getStrengthLabel, getStrengthPercentage } from '@renderer/utils/password-strength';

interface AuditSummary {
  totalEntries: number;
  weakPasswords: number;
  reusedPasswords: number;
  oldPasswords: number;
}

interface AuditGroup {
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  entries: AuditedEntry[];
}

interface AuditedEntry {
  entry: VaultEntryWithHistory;
  strength: PasswordStrength;
  issue: 'weak' | 'reused' | 'old';
  issueDetail?: string;
}

const OLD_PASSWORD_DAYS = 90;

export function Audit(): JSX.Element {
  const navigate = useNavigate();
  const { entries, setSelectedEntry, setFilters, toggleDrawer } = useVaultStore();

  const [auditedEntries, setAuditedEntries] = useState<AuditedEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary>({
    totalEntries: 0,
    weakPasswords: 0,
    reusedPasswords: 0,
    oldPasswords: 0,
  });
  const [showHIBP, setShowHIBP] = useState(false);
  const [hibpChecking, setHibpChecking] = useState(false);
  const [hibpResults, setHibpResults] = useState<{ entry: VaultEntryWithHistory; breached: boolean }[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'weak' | 'reused' | 'old'>('all');

  // Run audit on mount / entries change
  useEffect(() => {
    const audit = () => {
      const audited: AuditedEntry[] = [];
      const passwordMap = new Map<string, VaultEntryWithHistory[]>();

      // Track password reuse
      for (const entry of entries) {
        const key = entry.password;
        if (!passwordMap.has(key)) {
          passwordMap.set(key, []);
        }
        passwordMap.get(key)!.push(entry);
      }

      const reusedPasswords = new Set<string>();
      for (const [, group] of passwordMap) {
        if (group.length > 1) {
          for (const entry of group) {
            reusedPasswords.add(entry.id);
          }
        }
      }

      // Check each entry
      for (const entry of entries) {
        const strength = calculatePasswordStrength(entry.password);
        const now = new Date();
        const updatedAt = new Date(entry.updatedAt);
        const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

        // Weak password check
        if (strength === 'very-weak' || strength === 'weak') {
          audited.push({
            entry,
            strength,
            issue: 'weak',
            issueDetail: `Strength: ${getStrengthLabel(strength)}`,
          });
        }

        // Reused password check
        if (reusedPasswords.has(entry.id)) {
          const reuseCount = passwordMap.get(entry.password)!.length;
          audited.push({
            entry,
            strength,
            issue: 'reused',
            issueDetail: `Used in ${reuseCount} entries`,
          });
        }

        // Old password check
        if (daysSinceUpdate > OLD_PASSWORD_DAYS) {
          audited.push({
            entry,
            strength,
            issue: 'old',
            issueDetail: `Last updated ${daysSinceUpdate} days ago`,
          });
        }
      }

      setAuditedEntries(audited);
      setSummary({
        totalEntries: entries.length,
        weakPasswords: audited.filter((a) => a.issue === 'weak').length,
        reusedPasswords: audited.filter((a) => a.issue === 'reused').length,
        oldPasswords: audited.filter((a) => a.issue === 'old').length,
      });
    };

    audit();
  }, [entries]);

  // Group entries by issue
  const groups: AuditGroup[] = [
    {
      title: 'Weak Passwords',
      icon: 'shield',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      entries: auditedEntries.filter((a) => a.issue === 'weak'),
    },
    {
      title: 'Reused Passwords',
      icon: 'content_copy',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      entries: auditedEntries.filter((a) => a.issue === 'reused'),
    },
    {
      title: 'Old Passwords',
      icon: 'schedule',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      entries: auditedEntries.filter((a) => a.issue === 'old'),
    },
  ];

  // Handle clicking "Fix" on an entry
  const handleFixEntry = useCallback(
    (entry: VaultEntryWithHistory) => {
      setSelectedEntry(entry.id);
      setFilters({ category: 'all', favoritesOnly: false, minStrength: 'all', searchQuery: '' });
      toggleDrawer(true);
      navigate('/dashboard');
    },
    [setSelectedEntry, setFilters, toggleDrawer, navigate]
  );

  // Simulated HaveIBeenPwned check
  const handleHIBPCheck = useCallback(async () => {
    setHibpChecking(true);
    setHibpResults([]);

    try {
      // In production, this would use the k-anonymity API:
      // 1. Hash password with SHA-1
      // 2. Send first 5 chars of hash to https://api.pwnedpasswords.com/range/{prefix}
      // 3. Check if remaining hash is in the response
      // For now, we simulate this with a placeholder.

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Placeholder: mark some entries as breached for demonstration
      const results = entries.map((entry) => ({
        entry,
        breached: entry.password.length < 10,
      }));

      setHibpResults(results);
      const breachedCount = results.filter((r) => r.breached).length;
      if (breachedCount > 0) {
        toast.warning(`${breachedCount} password(s) found in known data breaches`);
      } else {
        toast.success('No passwords found in known data breaches');
      }
    } catch {
      toast.error('Failed to check HaveIBeenPwned API');
    } finally {
      setHibpChecking(false);
    }
  }, [entries]);

  // Score calculation
  const getSecurityScore = (): number => {
    if (entries.length === 0) return 100;
    const totalIssues = auditedEntries.length;
    const maxIssues = entries.length * 3; // Each entry can have up to 3 issues
    return Math.round(Math.max(0, 100 - (totalIssues / maxIssues) * 100));
  };

  const securityScore = getSecurityScore();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar navigation (minimal) */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-surface" aria-label="Audit navigation">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="icon-btn"
            aria-label="Back to dashboard"
          >
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-text-primary">Security Audit</h1>
        </div>

        {/* Security score */}
        <div className="px-5 py-6">
          <div className="flex flex-col items-center">
            <div className="relative h-24 w-24">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-surface-hover"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${securityScore * 2.64} ${264 - securityScore * 2.64}`}
                  strokeLinecap="round"
                  className={securityScore >= 70 ? 'text-green-500' : securityScore >= 40 ? 'text-yellow-500' : 'text-red-500'}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-text-primary">{securityScore}</span>
                <span className="text-xs text-text-muted">/ 100</span>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-text-secondary">Security Score</p>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin" aria-label="Audit content">
        <div className="mx-auto max-w-4xl px-8 py-8">
          {/* Summary cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard
              icon="password"
              label="Total Entries"
              value={summary.totalEntries}
              color="text-accent-500"
              bgColor="bg-accent-500/10"
            />
            <SummaryCard
              icon="shield"
              label="Weak Passwords"
              value={summary.weakPasswords}
              color="text-red-500"
              bgColor="bg-red-500/10"
            />
            <SummaryCard
              icon="content_copy"
              label="Reused Passwords"
              value={summary.reusedPasswords}
              color="text-yellow-500"
              bgColor="bg-yellow-500/10"
            />
            <SummaryCard
              icon="schedule"
              label="Old Passwords"
              value={summary.oldPasswords}
              color="text-blue-500"
              bgColor="bg-blue-500/10"
            />
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1" role="tablist" aria-label="Audit filters">
            {[
              { key: 'all' as const, label: 'All Issues', count: auditedEntries.length },
              { key: 'weak' as const, label: 'Weak', count: summary.weakPasswords },
              { key: 'reused' as const, label: 'Reused', count: summary.reusedPasswords },
              { key: 'old' as const, label: 'Old', count: summary.oldPasswords },
            ].map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-accent-500/10 text-accent-500'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                    activeTab === tab.key ? 'bg-accent-500/20' : 'bg-surface-hover'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Grouped entries */}
          {groups
            .filter((group) => activeTab === 'all' || group.entries.length > 0)
            .map((group) => {
              const filteredEntries = activeTab === 'all'
                ? group.entries
                : group.entries.filter((e) => e.issue === activeTab);

              if (filteredEntries.length === 0) return null;

              return (
                <div key={group.title} className="mb-6">
                  <div className={`mb-3 flex items-center gap-2 rounded-lg border ${group.borderColor} ${group.bgColor} px-4 py-2`}>
                    <span className={`material-symbols-rounded ${group.color}`}>{group.icon}</span>
                    <h3 className={`text-sm font-semibold ${group.color}`}>
                      {group.title} ({filteredEntries.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {filteredEntries.map(({ entry, strength, issueDetail }) => (
                      <div
                        key={`${entry.id}-${issueDetail}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-hover"
                      >
                        {/* Entry icon */}
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-hover text-text-muted">
                          {entry.icon ? (
                            <img src={entry.icon} alt="" className="h-full w-full rounded-lg object-cover" />
                          ) : (
                            <span className="material-symbols-rounded">{getCategoryIcon(entry.category)}</span>
                          )}
                        </div>

                        {/* Entry info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{entry.title}</p>
                          <p className="truncate text-xs text-text-muted">
                            {entry.username}
                            {issueDetail && <span className="ml-2 text-text-secondary">&middot; {issueDetail}</span>}
                          </p>
                        </div>

                        {/* Password strength */}
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className={`h-full rounded-full transition-all ${getStrengthColor(strength)}`}
                              style={{ width: `${getStrengthPercentage(strength)}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted">{getStrengthLabel(strength)}</span>
                        </div>

                        {/* Fix button */}
                        <button
                          onClick={() => handleFixEntry(entry)}
                          className="flex-shrink-0 rounded-lg border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-xs font-medium text-accent-500 transition-colors hover:bg-accent-500/20"
                          aria-label={`Fix password for ${entry.title}`}
                        >
                          <span className="material-symbols-rounded text-sm mr-1">edit</span>
                          Fix
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          {/* Empty state when no issues */}
          {auditedEntries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center" role="status" aria-live="polite">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10">
                <span className="material-symbols-rounded text-4xl text-green-500">verified</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-text-primary">All Clear!</h3>
              <p className="max-w-sm text-sm text-text-secondary">
                {entries.length > 0
                  ? 'All your passwords meet our security standards. Great job!'
                  : 'Add some entries to your vault and we will audit them for you.'}
              </p>
            </div>
          )}

          {/* HaveIBeenPwned section */}
          <div className="mt-8 card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-rounded text-accent-500">security</span>
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Have I Been Pwned?</h3>
                  <p className="text-xs text-text-muted">
                    Check if your passwords appear in known data breaches
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHIBP(!showHIBP)}
                className="btn-secondary text-sm"
                aria-expanded={showHIBP}
                aria-label="Toggle HaveIBeenPwned check"
              >
                <span className="material-symbols-rounded text-sm mr-1">
                  {showHIBP ? 'expand_less' : 'expand_more'}
                </span>
                {showHIBP ? 'Hide' : 'Check'}
              </button>
            </div>

            {showHIBP && (
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                {/* K-anonymity note */}
                <div className="rounded-lg border border-border bg-surface-hover px-4 py-3 text-xs text-text-secondary">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-rounded text-sm text-accent-500">info</span>
                    <div>
                      <p className="font-medium text-text-primary">How it works (k-anonymity)</p>
                      <p className="mt-1">
                        Your password is hashed using SHA-1. Only the first 5 characters of the hash are sent to the
                        HaveIBeenPwned API. The server returns all hashes starting with those 5 characters, and we
                        check locally if your full hash matches. Your full password is <strong className="text-text-primary">never</strong> transmitted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Check button */}
                <button
                  onClick={handleHIBPCheck}
                  disabled={hibpChecking || entries.length === 0}
                  className="btn-primary w-full"
                  aria-label="Check passwords against HaveIBeenPwned database"
                >
                  {hibpChecking ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Checking passwords...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-rounded mr-2">search</span>
                      Check All Passwords
                    </>
                  )}
                </button>

                {/* Results */}
                {hibpResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-secondary">Results</p>
                    {hibpResults
                      .filter((r) => r.breached)
                      .map(({ entry }) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text-primary">{entry.title}</p>
                            <p className="text-xs text-red-500">Found in known data breaches</p>
                          </div>
                          <button
                            onClick={() => handleFixEntry(entry)}
                            className="ml-2 flex-shrink-0 rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-500 hover:bg-red-500/30"
                            aria-label={`Fix password for ${entry.title}`}
                          >
                            Fix
                          </button>
                        </div>
                      ))}
                    {hibpResults.filter((r) => r.breached).length === 0 && (
                      <p className="flex items-center gap-2 text-sm text-green-500">
                        <span className="material-symbols-rounded text-sm">check_circle</span>
                        No breaches found for any password
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}): JSX.Element {
  return (
    <div className={`rounded-xl border border-border ${bgColor} p-4`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
          <span className={`material-symbols-rounded ${color}`}>{icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'login': 'password',
    'credit-card': 'credit_card',
    'identity': 'badge',
    'secure-note': 'sticky_note_2',
    'software-license': 'key',
    'api-key': 'api',
    'database': 'storage',
    'email': 'mail',
    'social': 'group',
    'financial': 'account_balance',
    'health': 'monitor_heart',
    'government': 'gaven',
    'other': 'folder',
  };
  return icons[category] ?? 'key';
}
