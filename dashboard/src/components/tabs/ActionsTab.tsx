'use client';

import type { DashboardData } from '@/lib/types';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { KpiCard } from '../KpiCard';
import { DataTable } from '../DataTable';
import { StatusTag, priorityTone } from '../StatusTag';
import { Panel, PanelGrid } from '../Panel';

const BUCKETS = [
  { key: 'Due Today', label: 'Due Today', accent: 'amber' as const },
  { key: 'Due This Week', label: 'This Week', accent: 'royal' as const },
  { key: 'Due Next Week', label: 'Next Week', accent: 'royal' as const },
  { key: 'Later / No Date', label: 'Later', accent: 'none' as const },
];

function ActionList({ items }: { items: DashboardData['actionItems'] }) {
  if (!items.length) {
    return (
      <p className="text-[13px] text-[var(--muted)]">Nothing in this bucket.</p>
    );
  }
  return (
    <div className="space-y-1">
      {items.slice(0, 10).map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-[var(--hover-row)]"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{a.name}</div>
            <div className="text-[12px] text-[var(--muted)]">
              {a.accountable || 'Unassigned'}
              {a.dueDate ? ` · ${a.dueDate.slice(5)}` : ''}
            </div>
          </div>
          {a.priority && (
            <StatusTag label={a.priority} tone={priorityTone(a.priority)} />
          )}
        </div>
      ))}
    </div>
  );
}

export function ActionsTab({ data }: { data: DashboardData }) {
  const done = data.actionItems.filter((a) =>
    /done|complete/i.test(a.status)
  ).length;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="kpi-grid">
        <KpiCard
          label="Open"
          value={data.summary.openActions}
          accent="royal"
          tip={INSIGHT_TIPS.openActions}
        />
        <KpiCard
          label="Overdue"
          value={data.summary.overdueActions}
          accent="red"
          tip={INSIGHT_TIPS.overdueActions}
        />
        <KpiCard
          label="Due This Week"
          value={data.actionBuckets['Due This Week']?.length ?? 0}
          accent="amber"
          tip={INSIGHT_TIPS.dueThisWeek}
        />
        <KpiCard
          label="Closed"
          value={
            data.summary.openActions
              ? `${Math.round((done / (done + data.summary.openActions)) * 100)}%`
              : '—'
          }
          meta="completion rate"
          accent="green"
          tip={INSIGHT_TIPS.actionCompletion}
        />
      </div>

      <Panel
        title="Overdue — Act First"
        subtitle="Past due date"
        accent="red"
        className="border-l-[3px] border-l-[var(--red)]"
      >
        <ActionList items={data.actionBuckets['Overdue'] ?? []} />
      </Panel>

      <PanelGrid>
        {BUCKETS.map((b) => (
          <Panel key={b.key} title={b.label} accent={b.accent}>
            <ActionList items={data.actionBuckets[b.key] ?? []} />
          </Panel>
        ))}
      </PanelGrid>

      <Panel title="Complete List" subtitle="All open and recent action items">
        <DataTable
          maxHeight={480}
          headers={[
            { label: 'Item' },
            { label: 'Team' },
            { label: 'Priority' },
            { label: 'Status' },
            { label: 'Due' },
            { label: 'Timeline' },
          ]}
          rows={data.actionItems.map((a) => [
            <span key="n" className="font-medium">{a.name}</span>,
            a.department,
            <StatusTag key="p" label={a.priority} tone={priorityTone(a.priority)} />,
            a.status,
            a.dueDate || '—',
            a.bucket,
          ])}
        />
      </Panel>
    </div>
  );
}
