'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { Sidebar, type TabId } from './Sidebar';
import { TopBar } from './TopBar';
import { OverviewTab } from './tabs/OverviewTab';
import { InsightsTab } from './tabs/InsightsTab';
import { KpisTab } from './tabs/KpisTab';
import { TrendsTab } from './tabs/TrendsTab';
import { ActionsTab } from './tabs/ActionsTab';
import { CapaTab } from './tabs/CapaTab';
import { ClientsTab } from './tabs/ClientsTab';
import { PhysicalTab } from './tabs/PhysicalTab';
import { TicketsTab } from './tabs/TicketsTab';
import { LeaderboardTab } from './tabs/LeaderboardTab';
import { SettingsTab } from './tabs/SettingsTab';
import {
  type DashboardViewId,
  getView,
} from '@/lib/dashboard-views';
import { type DepartmentFilterId } from '@/lib/department-filter';
import { applyDepartmentFilter, filterDashboardData } from '@/lib/filter-data';
import { TabTransition } from './TabTransition';

function periodQuery(from?: string, to?: string) {
  if (!from && !to) return '';
  const p = new URLSearchParams();
  if (from) p.set('from', from);
  if (to) p.set('to', to);
  return `?${p.toString()}`;
}

export function DashboardApp() {
  const [viewId, setViewId] = useState<DashboardViewId>('soc-stos');
  const [tab, setTab] = useState<TabId>('overview');
  const [rawData, setRawData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<DepartmentFilterId[]>([]);

  const view = getView(viewId);

  const load = useCallback(
    async (from?: string, to?: string, quiet = false) => {
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard${periodQuery(from, to)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load');
        setRawData(json);
        if (!initialized && json.meta.kpiTo) {
          setPeriodFrom(json.meta.kpiFrom ?? json.meta.kpiTo);
          setPeriodTo(json.meta.kpiTo);
          setInitialized(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [initialized]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        load(periodFrom || undefined, periodTo || undefined, true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load, periodFrom, periodTo]);

  useEffect(() => {
    const onSynced = () =>
      load(periodFrom || undefined, periodTo || undefined, true);
    window.addEventListener('calidad-sync-complete', onSynced);
    return () => window.removeEventListener('calidad-sync-complete', onSynced);
  }, [load, periodFrom, periodTo]);

  const handlePeriodChange = (from: string, to: string) => {
    setPeriodFrom(from);
    setPeriodTo(to);
    load(from, to);
  };

  const handleViewChange = (id: DashboardViewId) => {
    const next = getView(id);
    if (!next.enabled) return;
    setViewId(id);
    setSelectedDepartments([]);
    if (!next.tabs.includes(tab)) {
      setTab(next.tabs[0] ?? 'overview');
    }
  };

  const data = useMemo(() => {
    if (!rawData) return null;
    const viewFiltered = filterDashboardData(rawData, view);
    return applyDepartmentFilter(viewFiltered, view, selectedDepartments);
  }, [rawData, view, selectedDepartments]);

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="card-surface max-w-md p-8 text-center">
          <h2 className="text-lg font-bold text-[var(--red)]">Dashboard Error</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{error}</p>
          <button
            type="button"
            onClick={() => load()}
            className="mt-4 rounded-lg bg-[var(--royal)] px-4 py-2 text-sm font-bold text-[var(--btn-on-primary)]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--gold)]" />
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        view={view}
        active={tab}
        onChange={setTab}
        onViewChange={handleViewChange}
        counts={data.meta.itemCounts}
      />

      <div className="ml-[var(--sidebar)] min-h-screen">
        <TopBar
          tab={tab}
          view={view}
          periodFrom={periodFrom || data.meta.kpiFrom || ''}
          periodTo={periodTo || data.meta.kpiTo || ''}
          periodLabel={data.meta.kpiPeriodLabel}
          months={data.months}
          onPeriodChange={handlePeriodChange}
          selectedDepartments={selectedDepartments}
          onDepartmentChange={setSelectedDepartments}
          departmentLabel={data.meta.departmentScope?.label}
          loading={loading}
          lastSync={data.meta.lastSync}
          loadedAt={data.meta.asOf}
          clientTimezone={data.meta.clientTimezone}
        />

        <main className="px-6 py-6 pb-16 lg:px-8">
          <TabTransition tabKey={tab}>
            {tab === 'overview' && <OverviewTab data={data} view={view} />}
            {tab === 'insights' && <InsightsTab data={data} />}
            {tab === 'kpis' && <KpisTab data={data} />}
            {tab === 'trends' && <TrendsTab data={data} />}
            {tab === 'actions' && <ActionsTab data={data} />}
            {tab === 'capa' && <CapaTab data={data} />}
            {tab === 'clients' && <ClientsTab data={data} />}
            {tab === 'physical' && <PhysicalTab data={data} />}
            {tab === 'tickets' && <TicketsTab />}
            {tab === 'leaderboard' && <LeaderboardTab />}
            {tab === 'settings' && (
              <SettingsTab
                hubLastSync={data.meta.lastSync}
                clientTimezone={data.meta.clientTimezone}
              />
            )}
          </TabTransition>
        </main>
      </div>
    </div>
  );
}
