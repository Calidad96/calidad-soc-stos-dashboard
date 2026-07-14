export const SYNC_STEPS = [
  { id: 'actionItems', label: 'Action Items', batched: true, batchSize: 10, clearBatchSize: 12 },
  { id: 'capa', label: 'CAPA', batched: true, batchSize: 5, clearBatchSize: 10 },
  {
    id: 'kpiHistory',
    label: 'KPI History',
    batched: true,
    batchSize: 8,
    clearBatchSize: 0,
    appendOnly: true,
  },
  { id: 'rgContracts', label: 'RG Contracts', batched: true, batchSize: 6, clearBatchSize: 10 },
  { id: 'rgAreaScope', label: 'RG Area Scope', batched: true, batchSize: 6, clearBatchSize: 10 },
  { id: 'psContracts', label: 'PS Contracts', batched: true, batchSize: 6, clearBatchSize: 10 },
  { id: 'psGuardPosts', label: 'PS Guard Posts', batched: true, batchSize: 6, clearBatchSize: 10 },
] as const;

export type SyncStepId = (typeof SYNC_STEPS)[number]['id'];

export function getSyncStep(id: string) {
  return SYNC_STEPS.find((s) => s.id === id);
}
