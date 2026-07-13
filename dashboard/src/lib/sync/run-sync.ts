import { createItem, deleteBoardItems, getAllBoardItems } from './monday-write';
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
  clearStagingRows,
  loadSession,
  loadStagingRows,
  saveSession,
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

async function buildActionItemRows(registry: ReturnType<typeof loadHubRegistry>) {
  const sources = [SOURCE_BOARDS.socActionItems, SOURCE_BOARDS.physecActionItems];
  const rows: SyncRow[] = [];

  for (const src of sources) {
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
  }

  const hubId = registry.boards.actionItems.id;
  console.log('  Clearing hub board actionItems...');
  await deleteBoardItems(hubId);
  return rows;
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
    case 'capa': {
      const rows = await buildCapaRows();
      await deleteBoardItems(registry.boards.capa.id);
      return rows;
    }
    case 'kpiHistory':
      return buildKpiRows(registry);
    case 'rgContracts': {
      const rows = await buildRgContractRows();
      await deleteBoardItems(registry.boards.rgContracts.id);
      return rows;
    }
    case 'rgAreaScope': {
      const rows = await buildRgAreaRows();
      await deleteBoardItems(registry.boards.rgAreaScope.id);
      return rows;
    }
    case 'psContracts': {
      const rows = await buildPsContractRows();
      await deleteBoardItems(registry.boards.psContracts.id);
      return rows;
    }
    case 'psGuardPosts': {
      const rows = await buildPsGuardRows();
      await deleteBoardItems(registry.boards.psGuardPosts.id);
      return rows;
    }
    default:
      throw new Error(`Unknown step: ${stepId}`);
  }
}

export async function prepareSyncStep(runId: string, stepId: SyncStepId) {
  const session = loadSession(runId);
  if (!session) throw new Error('Sync session not found');

  const registry = loadHubRegistry();
  const meta = getSyncStep(stepId);
  if (!meta) throw new Error(`Unknown step: ${stepId}`);

  console.log(`\n[${meta.label}] prepare`);
  const rows = await prepareRows(stepId, registry);
  saveStagingRows(runId, stepId, rows);

  return { rowCount: rows.length, batched: meta.batched, batchSize: meta.batchSize };
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
  }

  return { written, hasMore, total: rows.length, completed: !hasMore };
}

export async function runSyncStepWhole(runId: string, stepId: SyncStepId) {
  const prep = await prepareSyncStep(runId, stepId);
  if (prep.rowCount === 0) {
    const session = loadSession(runId);
    if (session) {
      session.completedSteps.push(stepId);
      saveSession(session);
    }
    return { written: 0, hasMore: false, total: 0, completed: true };
  }

  if (prep.batched) {
    let batchIndex = 0;
    let hasMore = true;
    let totalWritten = 0;
    while (hasMore) {
      const result = await writeSyncStepBatch(runId, stepId, batchIndex);
      totalWritten += result.written;
      hasMore = result.hasMore;
      batchIndex++;
    }
    return { written: totalWritten, hasMore: false, total: prep.rowCount, completed: true };
  }

  const registry = loadHubRegistry();
  const rows = loadStagingRows(runId, stepId);
  const colMap = hubColumnMap(registry, stepId);
  const hubId = registry.boards[stepId].id;
  const written = await writeRows(hubId, colMap, rows, stepId);
  const session = loadSession(runId);
  if (session) {
    session.totalWritten += written;
    session.completedSteps.push(stepId);
    saveSession(session);
  }
  clearStagingRows(runId, stepId);
  return { written, hasMore: false, total: rows.length, completed: true };
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
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const { createSession } = await import('./sync-session');
  createSession(runId, TODAY);

  const errors: string[] = [];
  const { SYNC_STEPS } = await import('./sync-steps');

  for (const step of SYNC_STEPS) {
    try {
      await runSyncStepWhole(runId, step.id);
    } catch (err) {
      const msg = `${step.label}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      const session = loadSession(runId);
      if (session) {
        session.errors.push(msg);
        saveSession(session);
      }
    }
  }

  const session = await finishSyncRun(runId);
  if (errors.length) throw new Error(errors.join('; '));
  return { totalWritten: session.totalWritten, errors };
}
