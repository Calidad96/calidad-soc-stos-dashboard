export const SYNC_STEPS = [
  { id: 'actionItems', label: 'Action Items', batched: true, batchSize: 10, clearBatchSize: 12 },
  { id: 'capa', label: 'CAPA', batched: false, batchSize: 0, clearBatchSize: 0 },
  { id: 'kpiHistory', label: 'KPI History', batched: false, batchSize: 0, clearBatchSize: 0, appendOnly: true },
  { id: 'rgContracts', label: 'RG Contracts', batched: false, batchSize: 0, clearBatchSize: 0 },
  { id: 'rgAreaScope', label: 'RG Area Scope', batched: false, batchSize: 0, clearBatchSize: 0 },
  { id: 'psContracts', label: 'PS Contracts', batched: false, batchSize: 0, clearBatchSize: 0 },
  { id: 'psGuardPosts', label: 'PS Guard Posts', batched: false, batchSize: 0, clearBatchSize: 0 },
] as const;

export type SyncStepId = (typeof SYNC_STEPS)[number]['id'];

export function getSyncStep(id: string) {
  return SYNC_STEPS.find((s) => s.id === id);
}
