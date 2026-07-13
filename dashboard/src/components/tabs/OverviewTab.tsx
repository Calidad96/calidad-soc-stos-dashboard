'use client';

import type { DashboardData } from '@/lib/types';
import type { DashboardView } from '@/lib/dashboard-views';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { monthlyKpiAvgSeries } from '@/lib/kpi-trends';
import { KpiCard } from '../KpiCard';
import { CategoryBarChart, DeptBarChart } from '../Charts';
import { StatusTag } from '../StatusTag';
import { Panel, PanelGrid } from '../Panel';

function useOverviewCards(data: DashboardData, view: DashboardView) {
  const { summary } = data;
  const f = view.filter;
  const scope = data.meta.departmentScope;
  const cards = [];
  const kpiTrend = monthlyKpiAvgSeries(data.kpis, data.months);
  const showKpis = (f.kpiDepartments?.length ?? 0) > 0 && data.kpis.length > 0;
  const showActions =
    (f.actionDepartments?.length ?? 0) > 0 &&
    (!scope?.active || scope.showSoc || scope.showPhysical);
  const showCapa = f.includeCapa !== false && (scope?.active ? data.capa.length > 0 || scope.showSoc || scope.showStos || scope.showPhysical : true);
  const showRg = f.includeRg && (scope?.showRg ?? true);
  const showPhysical = f.includePhysical && (scope?.showPhysical ?? true);

  if (showKpis) {
    cards.push(
      <KpiCard
        key="kpi"
        label="KPI Average"
        value={summary.kpiAvg?.toFixed(1) ?? '—'}
        meta={`${summary.kpiGreen} on target · ${summary.kpiTotal} total`}
        accent={summary.kpiAvg != null && summary.kpiAvg >= 3 ? 'green' : 'amber'}
        tip={INSIGHT_TIPS.kpiAvg}
        sparkline={kpiTrend}
        gauge={summary.kpiAvg}
      />
    );
  }

  if (showActions) {
    cards.push(
      <KpiCard
        key="actions"
        label="Open Actions"
        value={summary.openActions}
        meta={`${summary.overdueActions} overdue`}
        accent={summary.overdueActions > 0 ? 'red' : 'royal'}
        tip={INSIGHT_TIPS.openActions}
      />,
      <KpiCard
        key="overdue"
        label="Overdue Rate"
        value={`${summary.overdueRate ?? 0}%`}
        meta="of open actions"
        accent={(summary.overdueRate ?? 0) > 25 ? 'red' : 'amber'}
        tip={INSIGHT_TIPS.overdueRate}
      />
    );
  }

  if (showCapa) {
    cards.push(
      <KpiCard
        key="capa"
        label="Open CAPA"
        value={summary.openCapa}
        meta={`${summary.capaCritical ?? 0} high priority`}
        accent="amber"
        tip={INSIGHT_TIPS.openCapa}
      />
    );
  }

  if (showRg) {
    cards.push(
      <KpiCard
        key="rg"
        label="RG Clients"
        value={summary.rgClients}
        meta={`${summary.rgAtRisk ?? 0} need attention`}
        accent="gold"
        tip={INSIGHT_TIPS.rgClients}
      />
    );
  }

  if (showPhysical) {
    cards.push(
      <KpiCard
        key="ps"
        label="PS Contracts"
        value={summary.psContracts}
        meta="patrol & guarding"
        accent="royal"
        tip={INSIGHT_TIPS.psContracts}
      />,
      <KpiCard
        key="posts"
        label="Guard Posts"
        value={data.psGuardPosts.length}
        meta="active sites"
        accent="green"
        tip={INSIGHT_TIPS.guardPosts}
      />
    );
  }

  return cards;
}

export function OverviewTab({ data, view }: { data: DashboardData; view: DashboardView }) {
  const cards = useOverviewCards(data, view);
  const scope = data.meta.departmentScope;
  const showActions =
    (view.filter.actionDepartments?.length ?? 0) > 0 &&
    (!scope?.active || scope.showSoc || scope.showPhysical);
  const focus = [
    ...(data.actionBuckets['Overdue'] ?? []),
    ...(data.actionBuckets['Due This Week'] ?? []),
  ].slice(0, 8);
  const showKpiCharts = data.kpis.length > 0;
  const showDeptComparison =
    (scope?.showSoc ?? true) && (scope?.showStos ?? true) && data.departmentScores.length > 1;

  return (
    <div className="space-y-6">
      <div
        className={`kpi-grid ${
          cards.length > 4 ? 'lg:grid-cols-3 xl:grid-cols-6' : ''
        }`}
      >
        {cards}
      </div>

      {showKpiCharts && (
        <PanelGrid>
          <Panel
            title="Score by Category"
            subtitle="Average out of 5 — higher is better"
            tip={INSIGHT_TIPS.categoryScores}
          >
            <CategoryBarChart data={data.categoryScores} />
          </Panel>
          {showDeptComparison ? (
            <Panel
              title="Department Comparison"
              subtitle="SOC vs STOS for this period"
              accent="royal"
              tip={INSIGHT_TIPS.departmentStandings}
            >
              <DeptBarChart data={data.departmentScores} />
            </Panel>
          ) : data.departmentScores.length > 0 ? (
            <Panel
              title="Department Score"
              subtitle="Average for the selected period"
              accent="royal"
              tip={INSIGHT_TIPS.departmentStandings}
            >
              <DeptBarChart data={data.departmentScores} />
            </Panel>
          ) : null}
        </PanelGrid>
      )}

      {showActions && (
        <Panel
          title="Priority Actions"
          subtitle="Overdue and due this week"
          accent="red"
          tip={INSIGHT_TIPS.dueThisWeek}
        >
          {focus.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">
              No urgent items — good standing this week.
            </p>
          ) : (
            <div className="space-y-1">
              {focus.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-[var(--hover-row)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[var(--ink)]">
                      {a.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[var(--muted)]">
                      {a.accountable || 'Unassigned'} · {a.department}
                      {a.dueDate ? ` · Due ${a.dueDate}` : ''}
                    </div>
                  </div>
                  <StatusTag
                    label={a.bucket}
                    tone={a.bucket === 'Overdue' ? 'bad' : 'warn'}
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}