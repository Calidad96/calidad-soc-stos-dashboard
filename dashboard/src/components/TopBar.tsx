'use client';

import { Sun, Moon, Loader2, Circle } from 'lucide-react';
import type { TabId } from '@/components/Sidebar';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { TAB_TITLES, TAB_SUBTITLES } from '@/lib/tab-titles';
import { formatDashboardTime } from '@/lib/client-time';
import { InfoTip } from './InfoTip';
import { PeriodPicker } from './PeriodPicker';
import { DepartmentFilter } from './DepartmentFilter';
import { useTheme } from './ThemeProvider';
import type { DashboardView } from '@/lib/dashboard-views';
import type { DepartmentFilterId } from '@/lib/department-filter';

export function TopBar({
  tab,
  view,
  periodFrom,
  periodTo,
  months,
  onPeriodChange,
  selectedDepartments,
  onDepartmentChange,
  loading,
  lastSync,
  loadedAt,
  clientTimezone,
}: {
  tab: TabId;
  view: DashboardView;
  periodFrom: string;
  periodTo: string;
  periodLabel: string | null;
  months: string[];
  onPeriodChange: (from: string, to: string) => void;
  selectedDepartments: DepartmentFilterId[];
  onDepartmentChange: (next: DepartmentFilterId[]) => void;
  departmentLabel?: string;
  loading: boolean;
  lastSync: string | null;
  loadedAt: string;
  clientTimezone: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const pageTitle = TAB_TITLES[tab];
  const subtitle = TAB_SUBTITLES[tab];
  const showFilters = tab !== 'settings';

  return (
    <header className="app-header sticky top-0 z-30">
      <div className="app-header-main px-6 py-5 lg:px-8">
        <div className="flex items-center justify-between gap-8">
          <div className="min-w-0">
            <h1 className="app-header-title font-display">{pageTitle}</h1>
            {subtitle && <p className="app-header-subtitle">{subtitle}</p>}
          </div>

          <div className="app-header-status">
            <span className="status-pill status-pill-live">
              <Circle
                size={7}
                className="fill-[var(--green)] text-[var(--green)]"
                strokeWidth={0}
              />
              <span>Live</span>
            </span>

            <span className="header-status-divider" aria-hidden />

            <span className="status-pill status-pill-time">
              {loading && (
                <Loader2 size={12} className="animate-spin text-[var(--muted)]" />
              )}
              <span className="status-pill-label">As of</span>
              <span className="status-pill-value tabular-nums">
                {formatDashboardTime(loadedAt, clientTimezone)}
              </span>
              <InfoTip
                text={INSIGHT_TIPS.dataFreshness}
                placement="bottom-end"
              />
            </span>

            {lastSync && (
              <>
                <span className="header-status-divider hidden md:block" aria-hidden />
                <span className="status-pill hidden md:inline-flex">
                  <span className="status-pill-label">Updated</span>
                  <span className="status-pill-value tabular-nums">
                    {formatDashboardTime(lastSync, clientTimezone)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="app-header-toolbar px-6 pb-4 lg:px-8">
        {showFilters ? (
          <div className="header-toolbar-panel">
            <DepartmentFilter
              view={view}
              selected={selectedDepartments}
              onChange={onDepartmentChange}
              embedded
            />

            <span className="header-toolbar-divider" aria-hidden />

            <PeriodPicker
              months={months}
              from={periodFrom}
              to={periodTo}
              onChange={onPeriodChange}
              embedded
            />

            <div className="header-toolbar-spacer" />

            <button
              type="button"
              onClick={toggleTheme}
              className="header-icon-btn"
              aria-label={
                theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'
              }
              title={theme === 'dark' ? 'Day mode' : 'Night mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        ) : (
          <div className="header-toolbar-panel header-toolbar-panel-minimal">
            <div className="header-toolbar-spacer" />
            <button
              type="button"
              onClick={toggleTheme}
              className="header-icon-btn"
              aria-label={
                theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'
              }
              title={theme === 'dark' ? 'Day mode' : 'Night mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
