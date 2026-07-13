'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Database,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Save,
  LogOut,
} from 'lucide-react';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import {
  SYNC_INTERVAL_OPTIONS,
  type SyncSettings,
} from '@/lib/sync-settings-constants';
import { US_TIMEZONE_OPTIONS, formatDashboardTime } from '@/lib/client-time';
import { InfoTip } from '../InfoTip';

interface SyncRun {
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  output: string;
  error: string | null;
}

const INTERVALS = SYNC_INTERVAL_OPTIONS;

function statusMeta(status: string): {
  label: string;
  tone: 'idle' | 'running' | 'success' | 'warn' | 'error';
} {
  switch (status) {
    case 'running':
      return { label: 'Updating…', tone: 'running' };
    case 'success':
      return { label: 'Success', tone: 'success' };
    case 'partial':
      return { label: 'Partial', tone: 'warn' };
    case 'error':
      return { label: 'Failed', tone: 'error' };
    default:
      return { label: 'Ready', tone: 'idle' };
  }
}

function StatusBadge({ status }: { status: string }) {
  const { label, tone } = statusMeta(status);
  const styles: Record<string, string> = {
    idle: 'bg-[var(--status-neutral-bg)] text-[var(--muted)]',
    running: 'bg-[var(--count-active-bg)] text-[var(--gold)]',
    success: 'bg-[var(--status-good-bg)] text-[var(--green)]',
    warn: 'bg-[var(--status-warn-bg)] text-[var(--amber)]',
    error: 'bg-[var(--status-bad-bg)] text-[var(--red)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[tone]}`}
    >
      {tone === 'running' && <Loader2 size={11} className="animate-spin" />}
      {tone === 'success' && <CheckCircle2 size={11} />}
      {tone === 'error' && <AlertCircle size={11} />}
      {label}
    </span>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-[14px] font-extrabold text-[var(--ink)]">
        {value}
      </p>
    </div>
  );
}

export function SettingsTab({
  hubLastSync,
  clientTimezone,
}: {
  hubLastSync: string | null;
  clientTimezone: string;
}) {
  const [settings, setSettings] = useState<SyncSettings>({
    autoSyncEnabled: true,
    intervalMinutes: 1440,
    clientTimezone: 'America/Los_Angeles',
    syncTimeLocal: '06:00',
  });
  const [run, setRun] = useState<SyncRun | null>(null);
  const [scheduleLabel, setScheduleLabel] = useState('');
  const [clientTimeNow, setClientTimeNow] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch('/api/sync', { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json();
    setSettings(json.settings);
    setRun(json.run);
    setScheduleLabel(json.scheduleLabel ?? '');
    setClientTimeNow(json.clientTimeNow ?? '');
    setSyncing(json.run?.status === 'running');
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, syncing ? 3000 : 15000);
    return () => clearInterval(id);
  }, [fetchStatus, syncing]);

  useEffect(() => {
    if (run?.status === 'success' || run?.status === 'partial') {
      window.dispatchEvent(new CustomEvent('calidad-sync-complete'));
    }
  }, [run?.status, run?.finishedAt]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/sync/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Could not save settings');
      setMessage('Schedule saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runSyncNow = async () => {
    setMessage(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Sync could not start');
      setSyncing(true);
      setMessage('Update in progress…');
      await fetchStatus();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed to start');
    }
  };

  const runStatus = run?.status ?? 'idle';
  const isRunning = runStatus === 'running';

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-5">
      <p className="text-[13px] leading-relaxed text-[var(--muted)]">
        Control when dashboard numbers are refreshed. Updates run automatically
        on a US-time schedule, or on demand below.
        <InfoTip text={INSIGHT_TIPS.dataSync} />
      </p>

      <div className="card-surface overflow-hidden">
        {/* Status strip */}
        <div className="flex flex-col divide-y divide-[var(--border)] sm:flex-row sm:divide-x sm:divide-y-0">
          <MetricCell
            label="Last data update"
            value={formatDashboardTime(hubLastSync, clientTimezone)}
          />
          <MetricCell
            label="Last refresh run"
            value={formatDashboardTime(
              run?.finishedAt ?? run?.startedAt ?? null,
              settings.clientTimezone || clientTimezone
            )}
          />
          <div className="min-w-0 flex-1 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Status
            </p>
            <div className="mt-1.5">
              <StatusBadge status={runStatus} />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Manual sync */}
            <section>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--hover-nav-active)] text-[var(--gold)]">
                  <Database size={18} />
                </span>
                <div>
                  <h3 className="text-[15px] font-extrabold text-[var(--ink)]">
                    Update now
                  </h3>
                  <p className="text-[12px] text-[var(--muted)]">
                    Pull the latest operations data
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
                Refreshes KPIs, actions, CAPA, and contract data. Takes a few
                minutes — use when teams have made important updates.
              </p>
              <button
                type="button"
                onClick={runSyncNow}
                disabled={isRunning}
                className="btn-gold mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold shadow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                {isRunning ? 'Updating…' : 'Update data now'}
              </button>
            </section>

            {/* Auto schedule */}
            <section className="lg:border-l lg:border-[var(--border)] lg:pl-8">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--hover-nav-active)] text-[var(--royal-light)]">
                  <Clock size={18} />
                </span>
                <div>
                  <h3 className="text-[15px] font-extrabold text-[var(--ink)]">
                    Automatic schedule
                  </h3>
                  <p className="text-[12px] text-[var(--muted)]">
                    US client timezone
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    Enable automatic updates
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.autoSyncEnabled}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        autoSyncEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 shrink-0 rounded accent-[var(--gold)]"
                  />
                </label>

                <div>
                  <label
                    htmlFor="client-timezone"
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]"
                  >
                    Client timezone
                  </label>
                  <select
                    id="client-timezone"
                    value={settings.clientTimezone}
                    disabled={!settings.autoSyncEnabled}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        clientTimezone: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--select-bg)] px-3 py-2.5 text-[13px] font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--royal)] disabled:opacity-45"
                  >
                    {US_TIMEZONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {clientTimeNow && (
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Client time now:{' '}
                      <span className="font-semibold text-[var(--ink)]">
                        {clientTimeNow}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="sync-time"
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]"
                  >
                    Update time
                  </label>
                  <input
                    id="sync-time"
                    type="time"
                    value={settings.syncTimeLocal}
                    disabled={!settings.autoSyncEnabled}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        syncTimeLocal: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--select-bg)] px-3 py-2.5 text-[13px] font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--royal)] disabled:opacity-45"
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
                    Default 6:00 AM US — fresh data before the workday starts.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="sync-interval"
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]"
                  >
                    Interval
                  </label>
                  <select
                    id="sync-interval"
                    value={settings.intervalMinutes}
                    disabled={!settings.autoSyncEnabled}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        intervalMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--select-bg)] px-3 py-2.5 text-[13px] font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--royal)] disabled:opacity-45"
                  >
                    {INTERVALS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
                    {
                      INTERVALS.find(
                        (o) => o.value === settings.intervalMinutes
                      )?.hint
                    }
                  </p>
                </div>

                {scheduleLabel && settings.autoSyncEnabled && (
                  <p className="rounded-xl bg-[var(--hover-row)] px-4 py-3 text-[12px] font-semibold text-[var(--ink)]">
                    {scheduleLabel}
                  </p>
                )}

                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-2.5 text-xs font-extrabold text-[var(--ink)] transition hover:border-[var(--border-light)] disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? 'Saving…' : 'Save schedule'}
                </button>
              </div>
            </section>
          </div>

          {(message || run?.error) && (
            <div
              className={`mt-5 rounded-xl px-4 py-3 text-[13px] ${
                run?.error
                  ? 'bg-[var(--status-bad-bg)] text-[var(--red)]'
                  : 'bg-[var(--hover-row)] text-[var(--muted)]'
              }`}
            >
              {run?.error || message}
            </div>
          )}
        </div>
      </div>

      {/* Data flow */}
      <div className="card-surface px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
          How updates work
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-semibold">
          <span className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-[var(--ink)]">
            Operations data
          </span>
          <ArrowRight size={14} className="text-[var(--gold)]" />
          <span className="rounded-lg bg-[var(--count-active-bg)] px-3 py-2 text-[var(--gold)]">
            Daily refresh
          </span>
          <ArrowRight size={14} className="text-[var(--gold)]" />
          <span className="rounded-lg bg-[var(--hover-nav-active)] px-3 py-2 text-[var(--ink)]">
            Dashboard
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
          The dashboard loads the latest numbers when you open it. Scheduled
          updates keep everything current for the US workday.
        </p>
      </div>

      <div className="card-surface flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Session
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Sign out when you are done on a shared device.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--royal)] hover:bg-[var(--hover-row)]"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}
