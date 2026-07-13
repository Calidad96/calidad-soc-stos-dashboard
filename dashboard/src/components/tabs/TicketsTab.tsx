'use client';

import { Ticket } from 'lucide-react';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { EmptyState } from '../EmptyState';
import { InfoTip } from '../InfoTip';

export function TicketsTab() {
  return (
    <EmptyState
      icon={<Ticket size={28} />}
      title="Service Tickets"
      description="Track open technology tickets, SLA response times, and priority queues. This view will be available in an upcoming release."
      footer={
        <span className="inline-flex items-center text-xs text-[var(--muted)]">
          Planned feature
          <InfoTip text={INSIGHT_TIPS.tickets} />
        </span>
      }
    />
  );
}
