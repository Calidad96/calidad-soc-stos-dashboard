'use client';

import { Trophy } from 'lucide-react';
import { INSIGHT_TIPS } from '@/lib/dashboard-views';
import { EmptyState } from '../EmptyState';
import { InfoTip } from '../InfoTip';

export function LeaderboardTab() {
  return (
    <EmptyState
      icon={<Trophy size={28} className="text-[var(--gold)]" />}
      title="Operator Rankings"
      description="Monthly and seasonal performance standings for remote guarding operators. This view will be available in an upcoming release."
      footer={
        <span className="inline-flex items-center text-xs text-[var(--muted)]">
          Planned feature
          <InfoTip text={INSIGHT_TIPS.dispersalLeaderboard} />
        </span>
      }
    />
  );
}
