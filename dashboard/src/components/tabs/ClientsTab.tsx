'use client';

import type { DashboardData } from '@/lib/types';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { KpiCard } from '../KpiCard';
import { DataTable } from '../DataTable';
import { StatusTag, statusTone } from '../StatusTag';
import { Panel } from '../Panel';

export function ClientsTab({ data }: { data: DashboardData }) {
  const active = data.rgContracts.filter((c) =>
    /active|setup|progress|on track/i.test(c.status)
  ).length;
  const inactive = data.rgContracts.filter((c) =>
    /inactive|terminated|cancelled/i.test(c.status)
  ).length;
  const undefined_ = data.rgContracts.length - active - inactive;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="kpi-grid">
        <KpiCard
          label="Total Clients"
          value={data.rgContracts.length}
          accent="royal"
          tip={INSIGHT_TIPS.rgClients}
        />
        <KpiCard label="Active" value={active} accent="green" />
        <KpiCard
          label="Need Review"
          value={undefined_}
          accent="amber"
          tip={INSIGHT_TIPS.rgAtRisk}
        />
        <KpiCard label="Service Areas" value={data.rgAreaScope.length} accent="gold" />
      </div>

      <Panel title="Client Contracts" subtitle="Remote guarding accounts and status">
        <DataTable
          maxHeight={400}
          headers={[
            { label: 'Client' },
            { label: 'Status' },
            { label: 'MSU' },
            { label: 'SLA' },
            { label: 'Monthly', align: 'right' },
          ]}
          rows={data.rgContracts.map((c) => [
            <span key="n" className="font-semibold">{c.name}</span>,
            <StatusTag key="s" label={c.status || 'Review'} tone={statusTone(c.status)} />,
            c.msu || '—',
            c.standardSla || '—',
            c.monthlyBill != null ? `$${c.monthlyBill.toLocaleString()}` : '—',
          ])}
        />
      </Panel>

      <Panel title="Service Scope by Area" subtitle="Coverage, alarms, and platform details">
        <DataTable
          maxHeight={360}
          headers={[
            { label: 'Area' },
            { label: 'Status' },
            { label: 'Service' },
            { label: 'Alarms' },
            { label: 'VMS' },
          ]}
          rows={data.rgAreaScope.slice(0, 60).map((a) => [
            a.name,
            <StatusTag
              key="s"
              label={String(a.fields.Status ?? '—')}
              tone={statusTone(String(a.fields.Status ?? ''))}
            />,
            String(a.fields['Service Type'] ?? '—'),
            String(a.fields['Volume of Alarms'] ?? '—'),
            String(a.fields['VMS Platform'] ?? '—'),
          ])}
        />
      </Panel>
    </div>
  );
}
