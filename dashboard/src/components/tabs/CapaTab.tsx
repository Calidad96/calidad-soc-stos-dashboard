'use client';

import type { DashboardData } from '@/lib/types';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { KpiCard } from '../KpiCard';
import { DataTable } from '../DataTable';
import { StatusTag, statusTone } from '../StatusTag';
import { Panel } from '../Panel';

export function CapaTab({ data }: { data: DashboardData }) {
  const critical = data.capa.filter((c) =>
    /critical|high/i.test(c.criticality)
  ).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="kpi-grid lg:grid-cols-3">
        <KpiCard
          label="Open Issues"
          value={data.summary.openCapa}
          accent="royal"
          tip={INSIGHT_TIPS.openCapa}
        />
        <KpiCard
          label="High Priority"
          value={critical}
          accent="red"
          tip={INSIGHT_TIPS.capaCritical}
        />
        <KpiCard
          label="Departments"
          value={new Set(data.capa.map((c) => c.departments).filter(Boolean)).size}
          meta="with open items"
          accent="amber"
          tip={INSIGHT_TIPS.capaDepartments}
        />
      </div>

      <Panel title="Open CAPA Items" subtitle="Corrective and preventive actions">
        <DataTable
          maxHeight={560}
          headers={[
            { label: 'Issue' },
            { label: 'Priority' },
            { label: 'Status' },
            { label: 'Department' },
            { label: 'Requested' },
          ]}
          rows={data.capa.map((c) => [
            <span key="n" className="font-semibold">{c.name}</span>,
            <StatusTag
              key="cr"
              label={c.criticality || '—'}
              tone={/critical|high/i.test(c.criticality) ? 'bad' : 'warn'}
            />,
            <StatusTag key="st" label={c.status} tone={statusTone(c.status)} />,
            <span key="d" className="text-[var(--muted)]">{c.departments || '—'}</span>,
            c.dateRequested || '—',
          ])}
        />
      </Panel>
    </div>
  );
}
