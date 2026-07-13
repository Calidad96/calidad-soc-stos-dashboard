'use client';

import type { DashboardData } from '@/lib/types';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { monthlyKpiAvgSeries, monthlyOnTargetSeries } from '@/lib/kpi-trends';
import { scoreClass } from '@/lib/score-class';
import { KpiCard } from '../KpiCard';
import { CategoryBarChart } from '../Charts';
import { DataTable } from '../DataTable';
import { Panel } from '../Panel';

export function KpisTab({ data }: { data: DashboardData }) {
  const topCat = data.categoryScores[0];
  const kpiTrend = monthlyKpiAvgSeries(data.kpis, data.months);
  const onTargetTrend = monthlyOnTargetSeries(data.kpis, data.months);

  return (
    <div className="space-y-6">
      <div className="kpi-grid">
        <KpiCard
          label="KPIs Tracked"
          value={data.kpis.length}
          meta="in scorecard"
          accent="royal"
          tip={INSIGHT_TIPS.kpiAvg}
          sparkline={kpiTrend}
        />
        <KpiCard
          label="Average Score"
          value={data.summary.kpiAvg?.toFixed(1) ?? '—'}
          meta="out of 5"
          accent="gold"
          tip={INSIGHT_TIPS.kpiAvg}
          sparkline={kpiTrend}
          gauge={data.summary.kpiAvg}
        />
        <KpiCard
          label="Categories"
          value={data.categoryScores.length}
          meta={topCat ? `leading: ${topCat.category}` : ''}
          accent="green"
        />
        <KpiCard
          label="On Target"
          value={data.summary.kpiGreen}
          meta="scoring ≥ 4.0"
          accent="green"
          tip={INSIGHT_TIPS.kpiGreen}
          sparkline={onTargetTrend}
        />
      </div>

      <Panel title="By Category" subtitle="Where the team is strongest and weakest">
        <CategoryBarChart data={data.categoryScores} horizontal />
      </Panel>

      <Panel title="Full Scorecard" subtitle="All KPIs for the selected period">
        <DataTable
          maxHeight={520}
          headers={[
            { label: 'KPI' },
            { label: 'Department' },
            { label: 'Category' },
            { label: 'Actual', align: 'right' },
            { label: 'Target', align: 'right' },
            { label: 'Score', align: 'right' },
          ]}
          rows={data.kpis.map((k) => [
            <span key="n" className="font-semibold">{k.name}</span>,
            <span key="d" className="text-[var(--muted)]">{k.department}</span>,
            k.category,
            k.latestValue?.toFixed(1) ?? '—',
            k.target?.toFixed(1) ?? '—',
            <span key="s" className={`font-extrabold ${scoreClass(k.score)}`}>
              {k.score?.toFixed(1) ?? '—'}
            </span>,
          ])}
        />
      </Panel>
    </div>
  );
}
