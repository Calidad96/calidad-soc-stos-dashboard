'use client';

import type { DashboardData } from '@/lib/types';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { KpiCard } from '../KpiCard';
import { DataTable } from '../DataTable';
import { StatusTag, statusTone } from '../StatusTag';
import { Panel, PanelGrid } from '../Panel';

export function PhysicalTab({ data }: { data: DashboardData }) {
  const armed = data.psGuardPosts.filter((p) =>
    /armed/i.test(String(p.fields['Armed Status'] ?? ''))
  ).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="kpi-grid">
        <KpiCard
          label="Contracts"
          value={data.psContracts.length}
          accent="royal"
          tip={INSIGHT_TIPS.psContracts}
        />
        <KpiCard
          label="Guard Posts"
          value={data.psGuardPosts.length}
          accent="gold"
          tip={INSIGHT_TIPS.guardPosts}
        />
        <KpiCard label="Armed Posts" value={armed} accent="red" />
        <KpiCard
          label="Open Actions"
          value={
            data.actionItems.filter((a) => a.department.includes('Physical')).length
          }
          meta="physical security"
          accent="amber"
        />
      </div>

      <PanelGrid>
        <Panel title="Patrol Contracts" subtitle="RMR and service agreements">
          <DataTable
            maxHeight={360}
            headers={[
              { label: 'Contract' },
              { label: 'Status' },
              { label: 'Lead' },
              { label: 'End Date' },
            ]}
            rows={data.psContracts.map((c) => [
              c.name,
              <StatusTag
                key="s"
                label={String(c.fields.Status ?? '—')}
                tone={statusTone(String(c.fields.Status ?? ''))}
              />,
              String(c.fields.Lead ?? '—'),
              String(c.fields['End Date'] ?? '—'),
            ])}
          />
        </Panel>

        <Panel title="Guard Posts" subtitle="Site coverage and staffing">
          <DataTable
            maxHeight={360}
            headers={[
              { label: 'Post' },
              { label: 'Type' },
              { label: 'Armed' },
              { label: 'Shifts/Wk', align: 'right' },
            ]}
            rows={data.psGuardPosts.map((p) => [
              p.name,
              String(p.fields['Post Type'] ?? '—'),
              <StatusTag
                key="a"
                label={String(p.fields['Armed Status'] ?? '—')}
                tone={/armed/i.test(String(p.fields['Armed Status'])) ? 'bad' : 'neutral'}
              />,
              String(p.fields['Shifts Per Week'] ?? '—'),
            ])}
          />
        </Panel>
      </PanelGrid>
    </div>
  );
}
