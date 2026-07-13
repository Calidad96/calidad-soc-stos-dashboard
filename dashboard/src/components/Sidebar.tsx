'use client';

import { BrandLogo } from './BrandLogo';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Radio,
  Shield,
  Lightbulb,
  Settings,
} from 'lucide-react';
import {
  LIVE_DASHBOARDS,
  type DashboardView,
  type DashboardViewId,
} from '@/lib/dashboard-views';

export type TabId =
  | 'overview'
  | 'insights'
  | 'kpis'
  | 'trends'
  | 'actions'
  | 'capa'
  | 'clients'
  | 'physical'
  | 'tickets'
  | 'leaderboard'
  | 'settings';

const TAB_META: Record<
  TabId,
  { label: string; icon: React.ReactNode; countKey?: string; soon?: boolean }
> = {
  overview: { label: 'Summary', icon: <LayoutDashboard size={16} /> },
  insights: { label: 'Insights', icon: <Lightbulb size={16} /> },
  kpis: { label: 'KPIs', icon: <Target size={16} /> },
  trends: { label: 'Trends', icon: <TrendingUp size={16} /> },
  actions: { label: 'Actions', icon: <CheckSquare size={16} />, countKey: 'actions' },
  capa: { label: 'CAPA', icon: <AlertTriangle size={16} />, countKey: 'capa' },
  clients: { label: 'RG Clients', icon: <Radio size={16} />, countKey: 'rg' },
  physical: { label: 'Physical', icon: <Shield size={16} /> },
  tickets: { label: 'Tickets', icon: <LayoutDashboard size={16} />, soon: true },
  leaderboard: { label: 'Rankings', icon: <LayoutDashboard size={16} />, soon: true },
  settings: { label: 'Data', icon: <Settings size={16} /> },
};

const NAV_GROUPS: { label: string; tabs: TabId[] }[] = [
  { label: 'Performance', tabs: ['overview', 'insights', 'kpis', 'trends'] },
  { label: 'Operations', tabs: ['actions', 'capa', 'clients', 'physical'] },
  { label: 'Admin', tabs: ['settings'] },
];

export function Sidebar({
  view,
  active,
  onChange,
  onViewChange,
  counts,
}: {
  view: DashboardView;
  active: TabId;
  onChange: (tab: TabId) => void;
  onViewChange: (id: DashboardViewId) => void;
  counts: Record<string, number>;
}) {
  const allowed = new Set(view.tabs);

  return (
    <aside className="sidebar-premium fixed bottom-0 left-0 top-0 z-20 flex w-[var(--sidebar)] flex-col border-r border-[var(--border)]">
      <div className="border-b border-[var(--border)] px-3 pb-3 pt-5">
        <BrandLogo />

        <div className="mt-4">
          <p className="nav-section-label flex items-center gap-1.5 px-1">
            <LayoutGrid size={11} />
            Dashboard
          </p>

          <div className="relative mt-1.5">
            <label htmlFor="sidebar-dashboard-select" className="sr-only">
              Select dashboard
            </label>
            <select
              id="sidebar-dashboard-select"
              value={view.id}
              onChange={(e) => onViewChange(e.target.value as DashboardViewId)}
              aria-label="Select dashboard"
              className="h-10 w-full cursor-pointer appearance-none truncate rounded-xl border border-[var(--border)] bg-[var(--card)] py-0 pl-3 pr-8 text-[12px] font-semibold leading-tight text-[var(--ink)] shadow-sm outline-none transition hover:border-[var(--border-light)] focus:border-[var(--royal)]"
            >
              {LIVE_DASHBOARDS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV_GROUPS.map((group) => {
          const items = group.tabs
            .filter((id) => allowed.has(id) && !TAB_META[id]?.soon)
            .map((id) => ({ id, ...TAB_META[id] }));

          if (!items.length) return null;

          return (
            <div key={group.label} className="sidebar-nav-group mb-4 last:mb-0">
              <p className="nav-section-label">{group.label}</p>
              <div className="space-y-0.5">
                {items.map((tab) => {
                  const isOn = active === tab.id;
                  const count = tab.countKey ? counts[tab.countKey] : null;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onChange(tab.id)}
                      className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-200 ${
                        isOn
                          ? 'bg-[var(--hover-nav-active)] text-[var(--ink)] shadow-[var(--shadow-card)]'
                          : 'text-[var(--muted)] hover:bg-[var(--hover-nav)] hover:text-[var(--ink)]'
                      }`}
                    >
                      {isOn && (
                        <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r bg-[var(--gold)]" />
                      )}
                      <span className="w-[18px] shrink-0 opacity-90">{tab.icon}</span>
                      <span className="truncate">{tab.label}</span>
                      {count != null && count > 0 && (
                        <span
                          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isOn
                              ? 'bg-[var(--count-active-bg)] text-[var(--gold)]'
                              : 'bg-[var(--hover-row)] text-[var(--muted)]'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] opacity-70">
          Calidad Services
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">Executive Dashboard</p>
      </div>
    </aside>
  );
}
