'use client';

import type { DashboardData } from '@/lib/types';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { buildMonthlyTrendPoints } from '@/lib/kpi-trends';
import { formatMonthChart } from '@/lib/period-format';
import { scoreClass } from '@/lib/score-class';
import { OnTargetTrendChart, TeamTrendChart } from '../Charts';
import { DataTable } from '../DataTable';
import { KpiCard } from '../KpiCard';
import { Panel, PanelGrid } from '../Panel';

export function TrendsTab({ data }: { data: DashboardData }) {
  const scope = data.meta.departmentScope;
  const showDeptTrend =
    (scope?.showSoc ?? true) && (scope?.showStos ?? true);

  const points = buildMonthlyTrendPoints(data.kpis, data.months, 12);
  const chartData = points.map((p) => ({
    ...p,
    label: formatMonthChart(p.period),
  }));

  const latest = [...points].reverse().find((p) => p.teamAvg != null);
  const prior = [...points]
    .reverse()
    .filter((p) => p.teamAvg != null)
    .slice(1)[0];
  const delta =
    latest?.teamAvg != null && prior?.teamAvg != null
      ? latest.teamAvg - prior.teamAvg
      : null;

  const monthCount = points.filter((p) => p.teamAvg != null).length;

  return (
    <div className="space-y-6">
      <div className="kpi-grid lg:grid-cols-3">
        <KpiCard
          label="Latest Team Avg"
          value={latest?.teamAvg?.toFixed(1) ?? '—'}
          meta={
            delta != null
              ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs prior month`
              : 'most recent month with data'
          }
          accent={latest && latest.teamAvg != null && latest.teamAvg >= 3 ? 'green' : 'amber'}
          tip={INSIGHT_TIPS.kpiAvg}
        />
        <KpiCard
          label="Months of History"
          value={monthCount}
          meta={`of ${data.months.length} recorded`}
          accent="royal"
          tip={INSIGHT_TIPS.periodRange}
        />
        <KpiCard
          label="On Target (Latest)"
          value={latest?.onTarget ?? '—'}
          meta={`of ${data.kpis.length} KPIs`}
          accent="green"
          tip={INSIGHT_TIPS.kpiGreen}
        />
      </div>

      <PanelGrid>
        <Panel
          title="Team Score Over Time"
          subtitle="Average across filtered KPIs — last 12 recorded months"
          tip={INSIGHT_TIPS.kpiAvg}
        >
          <TeamTrendChart data={chartData} lines={['teamAvg']} />
        </Panel>
        {showDeptTrend && (
          <Panel
            title="SOC vs STOS"
            subtitle="Department averages month by month"
            accent="royal"
            tip={INSIGHT_TIPS.departmentStandings}
          >
            <TeamTrendChart data={chartData} lines={['socAvg', 'stosAvg']} />
          </Panel>
        )}
      </PanelGrid>

      <Panel
        title="KPIs On Target"
        subtitle="How many metrics hit score 4.0+ each month"
        accent="green"
        tip={INSIGHT_TIPS.kpiGreen}
      >
        <OnTargetTrendChart data={chartData} />
      </Panel>

      <Panel
        title="Monthly Summary"
        subtitle="Team-level history — use KPIs tab for the full per-metric scorecard"
        accent="gold"
      >
        <DataTable
          maxHeight={320}
          headers={[
            { label: 'Month' },
            { label: 'Team Avg', align: 'right' },
            ...((scope?.showSoc ?? true) ? [{ label: 'SOC', align: 'right' as const }] : []),
            ...((scope?.showStos ?? true) ? [{ label: 'STOS', align: 'right' as const }] : []),
            { label: 'On Target', align: 'right' },
          ]}
          rows={[...chartData].reverse().map((p) => [
            <span key="m" className="font-semibold">{p.label}</span>,
            <span key="t" className={scoreClass(p.teamAvg)}>
              {p.teamAvg?.toFixed(1) ?? '—'}
            </span>,
            ...((scope?.showSoc ?? true)
              ? [
                  <span key="s" className={scoreClass(p.socAvg)}>
                    {p.socAvg?.toFixed(1) ?? '—'}
                  </span>,
                ]
              : []),
            ...((scope?.showStos ?? true)
              ? [
                  <span key="o" className={scoreClass(p.stosAvg)}>
                    {p.stosAvg?.toFixed(1) ?? '—'}
                  </span>,
                ]
              : []),
            <span key="g" className="font-semibold text-[var(--ink)]">
              {p.onTarget > 0 ? p.onTarget : '—'}
            </span>,
          ])}
        />
      </Panel>
    </div>
  );
}
