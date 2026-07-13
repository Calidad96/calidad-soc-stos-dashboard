'use client';

import type { DashboardData } from '@/lib/types';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import {
  monthlyDeptAvgSeries,
  monthlyOnTargetSeries,
} from '@/lib/kpi-trends';
import { KpiCard } from '../KpiCard';
import { StatusTag } from '../StatusTag';
import { Panel, PanelGrid } from '../Panel';

export function InsightsTab({ data }: { data: DashboardData }) {
  const { summary } = data;
  const scope = data.meta.departmentScope;
  const showRg = scope?.showRg ?? true;
  const flags: { tone: 'bad' | 'warn' | 'good'; title: string; detail: string }[] = [];

  if ((summary.overdueActions ?? 0) > 0) {
    flags.push({
      tone: 'bad',
      title: `${summary.overdueActions} overdue actions`,
      detail: 'Review the Actions tab and assign owners.',
    });
  }
  if ((summary.capaCritical ?? 0) > 0) {
    flags.push({
      tone: 'warn',
      title: `${summary.capaCritical} high-priority CAPA items`,
      detail: 'Systemic issues requiring management review.',
    });
  }
  if (showRg && (summary.rgAtRisk ?? 0) > 0) {
    flags.push({
      tone: 'warn',
      title: `${summary.rgAtRisk} clients need attention`,
      detail: 'Contract status may require account follow-up.',
    });
  }
  if (summary.kpiAvg != null && summary.kpiAvg >= 3.5) {
    flags.push({
      tone: 'good',
      title: `Strong KPI average — ${summary.kpiAvg} / 5`,
      detail: 'Team performance is above target for this period.',
    });
  }
  if (
    summary.stosScore != null &&
    summary.socScore != null &&
    (scope?.showSoc ?? true) &&
    (scope?.showStos ?? true)
  ) {
    const leader = summary.stosScore >= summary.socScore ? 'STOS' : 'SOC';
    flags.push({
      tone: 'good',
      title: `${leader} leads this period`,
      detail: `SOC ${summary.socScore} · STOS ${summary.stosScore} (out of 5).`,
    });
  }

  const weakKpis = [...data.kpis]
    .filter((k) => k.score != null && k.score < 2.5)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 6);

  const strongKpis = [...data.kpis]
    .filter((k) => k.score != null && k.score >= 4)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);

  const onTargetTrend = monthlyOnTargetSeries(data.kpis, data.months);
  const socTrend = monthlyDeptAvgSeries(data.kpis, data.months, 'SOC');
  const stosTrend = monthlyDeptAvgSeries(data.kpis, data.months, 'STOS');

  return (
    <div className="space-y-6">
      <div className="kpi-grid">
        <KpiCard
          label="Overdue Rate"
          value={`${summary.overdueRate ?? 0}%`}
          meta={`${summary.overdueActions} of ${summary.openActions} actions`}
          accent={(summary.overdueRate ?? 0) > 20 ? 'red' : 'green'}
          tip={INSIGHT_TIPS.overdueRate}
        />
        <KpiCard
          label="CAPA Priority"
          value={summary.capaCritical ?? 0}
          meta={`of ${summary.openCapa} open`}
          accent="amber"
          tip={INSIGHT_TIPS.capaCritical}
        />
        {showRg && (
          <KpiCard
            label="Clients at Risk"
            value={summary.rgAtRisk ?? 0}
            meta={`of ${summary.rgClients} contracts`}
            accent="gold"
            tip={INSIGHT_TIPS.rgAtRisk}
          />
        )}
        <KpiCard
          label="On Target"
          value={summary.kpiGreen}
          meta={`of ${summary.kpiTotal} KPIs`}
          accent="green"
          tip={INSIGHT_TIPS.kpiGreen}
          sparkline={onTargetTrend}
        />
      </div>

      {(summary.socScore != null || summary.stosScore != null) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(scope?.showSoc ?? true) && summary.socScore != null && (
            <KpiCard
              label="SOC Score"
              value={summary.socScore?.toFixed(1) ?? '—'}
              meta="Remote Guarding"
              accent="royal"
              tip={INSIGHT_TIPS.socScore}
              sparkline={socTrend}
              gauge={summary.socScore}
            />
          )}
          {(scope?.showStos ?? true) && summary.stosScore != null && (
            <KpiCard
              label="STOS Score"
              value={summary.stosScore?.toFixed(1) ?? '—'}
              meta="Technology & SLA"
              accent="gold"
              tip={INSIGHT_TIPS.stosScore}
              sparkline={stosTrend}
              gauge={summary.stosScore}
            />
          )}
        </div>
      )}

      <PanelGrid>
        <Panel title="Executive Alerts" accent="red">
          {flags.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">
              No critical alerts — operations look stable.
            </p>
          ) : (
            <div className="space-y-2">
              {flags.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-[var(--hover-row)]"
                >
                  <StatusTag
                    label={
                      f.tone === 'bad'
                        ? 'Alert'
                        : f.tone === 'warn'
                          ? 'Watch'
                          : 'Good'
                    }
                    tone={f.tone}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{f.title}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--muted)]">
                      {f.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Period Summary"
          subtitle="What the selected months tell us"
          accent="royal"
        >
          <ul className="space-y-3 text-[13px] leading-relaxed text-[var(--muted)]">
            <li>
              <span className="font-bold text-[var(--ink)]">
                {data.kpis.length} KPIs
              </span>{' '}
              tracked with an average of{' '}
              <span className="font-bold text-[var(--ink)]">
                {summary.kpiAvg?.toFixed(1) ?? '—'}
              </span>{' '}
              out of 5.
            </li>
            <li>
              <span className="font-bold text-[var(--ink)]">
                {summary.openActions}
              </span>{' '}
              open actions —{' '}
              <span className="font-bold text-[var(--ink)]">
                {summary.overdueActions}
              </span>{' '}
              overdue.
            </li>
            <li>
              <span className="font-bold text-[var(--ink)]">
                {summary.openCapa}
              </span>{' '}
              open CAPA items across operations.
            </li>
          </ul>
        </Panel>
      </PanelGrid>

      <PanelGrid>
        <Panel title="Needs Improvement" subtitle="Score below 2.5" accent="red">
          {weakKpis.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">No KPIs in the red zone.</p>
          ) : (
            weakKpis.map((k) => (
              <div
                key={k.key}
                className="border-b border-[var(--border)]/40 py-2.5 last:border-0"
              >
                <div className="text-[13px] font-semibold">{k.name}</div>
                <div className="text-[12px] text-[var(--muted)]">
                  {k.category} · Score {k.score?.toFixed(1)}
                </div>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Top Performers" subtitle="Score 4.0 or above" accent="green">
          {strongKpis.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">
              No KPIs at target this period.
            </p>
          ) : (
            strongKpis.map((k) => (
              <div
                key={k.key}
                className="border-b border-[var(--border)]/40 py-2.5 last:border-0"
              >
                <div className="text-[13px] font-semibold">{k.name}</div>
                <div className="text-[12px] text-[var(--muted)]">
                  {k.category} · Score {k.score?.toFixed(1)}
                </div>
              </div>
            ))
          )}
        </Panel>
      </PanelGrid>
    </div>
  );
}
