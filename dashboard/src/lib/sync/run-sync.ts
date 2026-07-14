import { createItem, deleteItemsById, getAllBoardItems, getBoardItemIdsLight, getBoardItemIds } from './monday-write';
import { loadHubRegistry } from './hub-registry';
import { SOURCE_BOARDS } from './source-boards';
import {
  buildColumnValues,
  colText,
  dueBucket,
  extractKpiMonthlyRows,
  hubColumnMap,
  todayDate,
} from './sync-utils';
import {
  clearStagingIds,
  clearStagingRows,
  loadSession,
  loadStagingIds,
  loadStagingRows,
  saveSession,
  saveStagingIds,
  saveStagingRows,
  type SyncRow,
  type SyncSession,
} from './sync-session';
import type { SyncStepId } from './sync-steps';
import { getSyncStep } from './sync-steps';

const TODAY = todayDate();

async function writeRows(
  boardId: string,
  colMap: Record<string, string>,
  rows: SyncRow[],
  label: string,
  offset = 0,
  limit = rows.length
): Promise<number> {
  const slice = rows.slice(offset, offset + limit);
  let written = 0;
  let failed = 0;

  for (const row of slice) {
    const columnValues = buildColumnValues(colMap, row.values);
    try {
      await createItem(boardId, row.itemName, columnValues);
      written++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ${label} skip: ${row.itemName.slice(0, 40)} — ${msg}`);
      await new Promise((r) => setTimeout(r, 400));
    }
    if (written % 10 === 0 && written > 0) {
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  console.log(`  ${label}: wrote ${written}/${slice.length} (${failed} skipped)`);
  return written;
}

async function buildActionItemRowsPartial(sourceIndex: number) {
  const sources = [SOURCE_BOARDS.socActionItems, SOURCE_BOARDS.physecActionItems];
  const src = sources[sourceIndex];
  if (!src) return { rows: [] as SyncRow[], hasMoreSources: false };

  const rows: SyncRow[] = [];
  const items = await getAllBoardItems(src.id);
  for (const item of items) {
    const due = colText(item, 'Due Date');
    rows.push({
      itemName: item.name.slice(0, 120),
      values: {
        'Source Item ID': item.id,
        'Source Board ID': src.id,
        Department: src.department,
        Accountable: colText(item, 'Accountable'),
        Priority: colText(item, 'Priority'),
        Status: colText(item, 'Status'),
        'Due Date': due || undefined,
        'Next Action Date': colText(item, 'Next Action Date') || undefined,
        'Due Bucket': dueBucket(due),
        Client: colText(item, 'Client'),
        'Task Description': colText(item, 'Task Description'),
        'Snapshot At': TODAY,
      },
    });
  }
  console.log(`  Pulled ${items.length} from ${src.name}`);
  return { rows, hasMoreSources: sourceIndex + 1 < sources.length };
}

async function buildActionItemRows(registry: ReturnType<typeof loadHubRegistry>) {
  const all: SyncRow[] = [];
  for (let i = 0; i < 2; i++) {
    const part = await buildActionItemRowsPartial(i);
    all.push(...part.rows);
  }
  return all;
}

async function buildCapaRows() {
  const items = await getAllBoardItems(SOURCE_BOARDS.capa.id);
  console.log(`  Pulled ${items.length} CAPA items`);
  return items.map((item) => ({
    itemName: item.name.slice(0, 120),
    values: {
      'Source Item ID': item.id,
      Criticality: colText(item, 'Criticality'),
      Status: colText(item, 'Status'),
      Departments: colText(item, 'Departments'),
      Requester: colText(item, 'Requester Name'),
      'Issue Description': colText(item, 'Issue Description'),
      'Date Requested': colText(item, 'Date Requested') || undefined,
      'Snapshot At': TODAY,
    },
  }));
}

async function buildKpiRows(registry: ReturnType<typeof loadHubRegistry>) {
  const items = await getAllBoardItems(SOURCE_BOARDS.departmentKpis.id);
  const hubId = registry.boards.kpiHistory.id;
  const existing = await getAllBoardItems(hubId);
  const existingKeys = new Set(existing.map((e) => colText(e, 'KPI Key')));
  const rows: SyncRow[] = [];

  for (const item of items) {
    const year = parseInt(colText(item, 'Year'), 10) || new Date().getFullYear();
    for (const m of extractKpiMonthlyRows(item, year)) {
      if (existingKeys.has(m.kpiKey)) continue;
      rows.push({
        itemName: `${m.kpiName} — ${m.month}`.slice(0, 120),
        values: {
          'KPI Key': m.kpiKey,
          'KPI Name': m.kpiName,
          Department: m.department,
          Category: m.category,
          Month: m.month,
          'Actual Value': m.actual,
          Target: m.target ?? undefined,
          'KPI Score': m.boardScore ?? undefined,
          Year: m.year,
          'Exceed Level': m.exceed,
          'Source Item ID': m.sourceItemId,
          'Synced At': TODAY,
        },
      });
    }
  }

  console.log(`  Pulled ${items.length} KPIs, ${rows.length} new monthly rows`);
  return rows;
}

async function buildRgContractRows() {
  const items = await getAllBoardItems(SOURCE_BOARDS.rgContracts.id);
  console.log(`  Pulled ${items.length} RG contracts`);
  return items.map((item) => ({
    itemName: item.name.slice(0, 120),
    values: {
      'Source Item ID': item.id,
      Status: colText(item, 'Status'),
      'Project ID': colText(item, 'Project ID'),
      'Standard SLA': colText(item, 'Standard SLA'),
      MSU: colText(item, 'MSU'),
      'Contract Start': colText(item, 'Contract Start Date') || undefined,
      'Contract End': colText(item, 'Contract End Date') || undefined,
      'Monthly Bill': colText(item, 'Monthly Bill Amount') || undefined,
      'Setup Fee': colText(item, 'One-time Setup Fee') || undefined,
      'Snapshot At': TODAY,
    },
  }));
}

async function buildRgAreaRows() {
  const items = await getAllBoardItems(SOURCE_BOARDS.rgAreaScope.id);
  console.log(`  Pulled ${items.length} RG area scope items`);
  return items.map((item) => ({
    itemName: item.name.slice(0, 120),
    values: {
      'Source Item ID': item.id,
      Status: colText(item, 'Status'),
      'Service Type': colText(item, 'Service Type'),
      'Volume of Alarms': colText(item, 'Volume of Alarms'),
      CCTV: colText(item, 'CCTV (Yes/No)'),
      'VMS Platform': colText(item, 'VMS Platform'),
      'AI Platform': colText(item, 'AI Platform'),
      'Virtual Patrols': colText(item, 'Virtual Patrols'),
      'Snapshot At': TODAY,
    },
  }));
}

async function buildPsContractRows() {
  const items = await getAllBoardItems(SOURCE_BOARDS.psRmrContract.id);
  console.log(`  Pulled ${items.length} PS contracts`);
  return items.map((item) => ({
    itemName: item.name.slice(0, 120),
    values: {
      'Source Item ID': item.id,
      Status: colText(item, 'Status'),
      Lead: colText(item, 'Lead'),
      'Start Date': colText(item, 'Start Date') || undefined,
      'End Date': colText(item, 'End Date') || undefined,
      'Renewal Date': colText(item, 'Renewal Date') || undefined,
      'Project ID': colText(item, 'Project ID'),
      'Snapshot At': TODAY,
    },
  }));
}

async function buildPsGuardRows() {
  const items = await getAllBoardItems(SOURCE_BOARDS.psGuardPosts.id);
  console.log(`  Pulled ${items.length} PS guard posts`);
  return items.map((item) => ({
    itemName: item.name.slice(0, 120),
    values: {
      'Source Item ID': item.id,
      'Post Type': colText(item, 'Post Type'),
      'Armed Status': colText(item, 'Armed / Unarmed'),
      Status: colText(item, 'Status'),
      'Hours Per Shift': colText(item, 'Hours / Shift (without Lunch)') || undefined,
      'Shifts Per Week': colText(item, 'Shifts / Week') || undefined,
      'Pay Rate': colText(item, 'Pay Rate $/hr') || undefined,
      'Bill Rate': colText(item, 'Bill Rate $/hr') || undefined,
      'Snapshot At': TODAY,
    },
  }));
}

async function prepareRows(stepId: SyncStepId, registry: ReturnType<typeof loadHubRegistry>) {
  switch (stepId) {
    case 'actionItems':
      return buildActionItemRows(registry);
    case 'capa':
      return buildCapaRows();
    case 'kpiHistory':
      return buildKpiRows(registry);
    case 'rgContracts':
      return buildRgContractRows();
    case 'rgAreaScope':
      return buildRgAreaRows();
    case 'psContracts':
      return buildPsContractRows();
    case 'psGuardPosts':
      return buildPsGuardRows();
    default:
      throw new Error(`Unknown step: ${stepId}`);
  }
}

export async function pullStepRows(stepId: SyncStepId, sourceIndex = 0) {
  const registry = loadHubRegistry();
  const meta = getSyncStep(stepId);
  if (!meta) throw new Error(`Unknown step: ${stepId}`);

  console.log(`\n[${meta.label}] pull rows`);
  let rows: SyncRow[];
  let hasMoreSources = false;

  if (stepId === 'actionItems') {
    const partial = await buildActionItemRowsPartial(sourceIndex);
    rows = partial.rows;
    hasMoreSources = partial.hasMoreSources;
  } else {
    rows = await prepareRows(stepId, registry);
  }

  return {
    step: stepId,
    label: meta.label,
    rows,
    rowCount: rows.length,
    hasMoreSources,
    batched: meta.batched,
    batchSize: meta.batchSize,
    clearBatchSize: meta.clearBatchSize,
    appendOnly: 'appendOnly' in meta && Boolean(meta.appendOnly),
  };
}

export async function pullStepHubIds(stepId: SyncStepId) {
  const registry = loadHubRegistry();
  const meta = getSyncStep(stepId);
  if (!meta) throw new Error(`Unknown step: ${stepId}`);
  const appendOnly = 'appendOnly' in meta && Boolean(meta.appendOnly);

  console.log(`\n[${meta.label}] pull hub ids`);
  let hubIds: string[] = [];
  if (!appendOnly) {
    hubIds = await getBoardItemIdsLight(registry.boards[stepId].id);
    console.log(`  Hub has ${hubIds.length} existing items to clear`);
  }

  return {
    step: stepId,
    label: meta.label,
    hubIds,
    appendOnly,
    batched: meta.batched,
    batchSize: meta.batchSize,
    clearBatchSize: meta.clearBatchSize,
  };
}

export async function pullStepData(stepId: SyncStepId) {
  const rowsResult = await pullStepRows(stepId);
  const idsResult = await pullStepHubIds(stepId);
  return {
    ...rowsResult,
    hubIds: idsResult.hubIds,
    appendOnly: idsResult.appendOnly,
  };
}

export async function clearHubItemIds(itemIds: string[]) {
  if (!itemIds.length) return { deleted: 0 };
  console.log(`  Clearing ${itemIds.length} hub items`);
  const deleted = await deleteItemsById(itemIds);
  return { deleted };
}

export async function writeHubRows(stepId: SyncStepId, rows: SyncRow[]) {
  if (!rows.length) return { written: 0 };
  const registry = loadHubRegistry();
  const meta = getSyncStep(stepId);
  const colMap = hubColumnMap(registry, stepId);
  const hubId = registry.boards[stepId].id;
  console.log(`\n[${meta?.label ?? stepId}] write ${rows.length} rows`);
  const written = await writeRows(hubId, colMap, rows, stepId);
  return { written };
}

export async function logSyncResult(opts: {
  runId: string;
  started: string;
  totalWritten: number;
  errors: string[];
}) {
  const registry = loadHubRegistry();
  const boardKey = 'syncLog' as const;
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  await createItem(
    hubId,
    `Sync ${opts.runId}`,
    buildColumnValues(colMap, {
      'Run ID': opts.runId,
      Started: opts.started,
      Finished: TODAY,
      Status: opts.errors.length ? 'Partial' : 'Success',
      'Boards Pulled': Object.values(SOURCE_BOARDS).map((b) => b.name).join(', '),
      'Items Written': opts.totalWritten,
      Errors: opts.errors.length ? opts.errors.join('\n') : '',
    })
  );
}

export async function runSyncStateless(): Promise<{ totalWritten: number; errors: string[] }> {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const started = TODAY;
  let totalWritten = 0;
  const errors: string[] = [];
  const { SYNC_STEPS } = await import('./sync-steps');

  for (const step of SYNC_STEPS) {
    try {
      const pulled = await pullStepData(step.id);
      if (!pulled.appendOnly) {
        const clearSize = step.batched ? step.clearBatchSize : pulled.hubIds.length;
        for (let i = 0; i < pulled.hubIds.length; i += clearSize) {
          await clearHubItemIds(pulled.hubIds.slice(i, i + clearSize));
        }
      }
      const writeSize = step.batched ? step.batchSize : pulled.rows.length;
      for (let i = 0; i < pulled.rows.length; i += writeSize) {
        const result = await writeHubRows(step.id, pulled.rows.slice(i, i + writeSize));
        totalWritten += result.written;
      }
    } catch (err) {
      errors.push(`${step.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await logSyncResult({ runId, started, totalWritten, errors });
  if (errors.length) throw new Error(errors.join('; '));
  return { totalWritten, errors };
}

export async function pullSyncStep(runId: string, stepId: SyncStepId) {
  const session = loadSession(runId);
  if (!session) throw new Error('Sync session not found');

  const registry = loadHubRegistry();
  const meta = getSyncStep(stepId);
  if (!meta) throw new Error(`Unknown step: ${stepId}`);

  console.log(`\n[${meta.label}] pull`);
  const rows = await prepareRows(stepId, registry);
  saveStagingRows(runId, stepId, rows);

  if (!('appendOnly' in meta && meta.appendOnly)) {
    const hubId = registry.boards[stepId].id;
    const ids = await getBoardItemIds(hubId);
    saveStagingIds(runId, stepId, ids);
    console.log(`  Hub has ${ids.length} existing items to clear`);
  }

  return { rowCount: rows.length, batched: meta.batched, batchSize: meta.batchSize };
}

export async function clearSyncStepBatch(
  runId: string,
  stepId: SyncStepId,
  batchIndex: number
) {
  const session = loadSession(runId);
  if (!session) throw new Error('Sync session not found');

  const meta = getSyncStep(stepId);
  if (!meta) throw new Error(`Unknown step: ${stepId}`);

  const ids = loadStagingIds(runId, stepId);
  if (!ids.length) {
    return { deleted: 0, hasMore: false, total: 0 };
  }

  const batchSize = meta.batched ? meta.clearBatchSize : ids.length;
  const offset = batchIndex * batchSize;
  const slice = ids.slice(offset, offset + batchSize);

  if (!slice.length) {
    clearStagingIds(runId, stepId);
    return { deleted: 0, hasMore: false, total: ids.length };
  }

  console.log(`\n[${meta.label}] clear batch ${batchIndex + 1}`);
  const deleted = await deleteItemsById(slice);
  const hasMore = offset + batchSize < ids.length;

  if (!hasMore) clearStagingIds(runId, stepId);

  return { deleted, hasMore, total: ids.length };
}

export async function prepareSyncStep(runId: string, stepId: SyncStepId) {
  return pullSyncStep(runId, stepId);
}

export async function writeSyncStepBatch(
  runId: string,
  stepId: SyncStepId,
  batchIndex: number
) {
  const session = loadSession(runId);
  if (!session) throw new Error('Sync session not found');

  const registry = loadHubRegistry();
  const meta = getSyncStep(stepId);
  if (!meta) throw new Error(`Unknown step: ${stepId}`);

  const rows = loadStagingRows(runId, stepId);
  const colMap = hubColumnMap(registry, stepId);
  const hubId = registry.boards[stepId].id;
  const offset = batchIndex * meta.batchSize;
  const limit = meta.batched ? meta.batchSize : rows.length;

  if (offset >= rows.length) {
    return { written: 0, hasMore: false, total: rows.length };
  }

  console.log(`\n[${meta.label}] batch ${batchIndex + 1}`);
  const written = await writeRows(hubId, colMap, rows, stepId, offset, limit);
  session.totalWritten += written;
  saveSession(session);

  const nextOffset = offset + limit;
  const hasMore = nextOffset < rows.length;
  if (!hasMore) {
    session.completedSteps.push(stepId);
    saveSession(session);
    clearStagingRows(runId, stepId);
    clearStagingIds(runId, stepId);
  }

  return { written, hasMore, total: rows.length, completed: !hasMore };
}

export async function runSyncStepWhole(runId: string, stepId: SyncStepId) {
  await pullSyncStep(runId, stepId);
  const meta = getSyncStep(stepId);
  if (meta && !('appendOnly' in meta && meta.appendOnly)) {
    let clearBatch = 0;
    let clearing = true;
    while (clearing) {
      const result = await clearSyncStepBatch(runId, stepId, clearBatch);
      clearing = result.hasMore;
      clearBatch++;
    }
  }

  const rows = loadStagingRows(runId, stepId);
  if (!rows.length) {
    const session = loadSession(runId);
    if (session) {
      session.completedSteps.push(stepId);
      saveSession(session);
    }
    return { written: 0, hasMore: false, total: 0, completed: true };
  }

  if (meta?.batched) {
    let batchIndex = 0;
    let hasMore = true;
    let totalWritten = 0;
    while (hasMore) {
      const result = await writeSyncStepBatch(runId, stepId, batchIndex);
      totalWritten += result.written;
      hasMore = result.hasMore;
      batchIndex++;
    }
    return { written: totalWritten, hasMore: false, total: rows.length, completed: true };
  }

  const result = await writeSyncStepBatch(runId, stepId, 0);
  return { written: result.written, hasMore: false, total: rows.length, completed: true };
}

async function logSync(session: SyncSession) {
  const registry = loadHubRegistry();
  const boardKey = 'syncLog' as const;
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  await createItem(
    hubId,
    `Sync ${session.runId}`,
    buildColumnValues(colMap, {
      'Run ID': session.runId,
      Started: session.started,
      Finished: TODAY,
      Status: session.errors.length ? 'Partial' : 'Success',
      'Boards Pulled': Object.values(SOURCE_BOARDS).map((b) => b.name).join(', '),
      'Items Written': session.totalWritten,
      Errors: session.errors.length ? session.errors.join('\n') : '',
    })
  );
}

export async function finishSyncRun(runId: string) {
  const session = loadSession(runId);
  if (!session) throw new Error('Sync session not found');
  await logSync(session);
  console.log(`\n=== Sync complete ===`);
  console.log(`Items written: ${session.totalWritten}`);
  return session;
}

export async function runSync(): Promise<{ totalWritten: number; errors: string[] }> {
  return runSyncStateless();
}
