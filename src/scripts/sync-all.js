import {
  createItem,
  getAllBoardItems,
  getBoardStructure,
  mondayQuery,
} from '../lib/monday.js';
import {
  buildColumnValues,
  colText,
  dueBucket,
  extractKpiMonthlyRows,
  hubColumnMap,
  loadHubRegistry,
  todayDate,
} from '../lib/sync-utils.js';
import { SOURCE_BOARDS } from '../config/boards.js';

const TODAY = todayDate();

async function deleteBoardItems(boardId) {
  const items = await getAllBoardItems(boardId);
  if (!items.length) return 0;
  let deleted = 0;
  for (const item of items) {
    const query = `mutation ($itemId: ID!) { delete_item(item_id: $itemId) { id } }`;
    await mondayQuery(query, { itemId: String(item.id) });
    deleted++;
    if (deleted % 10 === 0) await new Promise((r) => setTimeout(r, 500));
  }
  return deleted;
}

async function writeItems(boardId, colMap, rows, label) {
  let written = 0;
  let failed = 0;
  for (const row of rows) {
    const { itemName, values } = row;
    const columnValues = buildColumnValues(colMap, values);
    try {
      await createItem(boardId, itemName, columnValues);
      written++;
    } catch (err) {
      failed++;
      console.warn(`  ${label} skip: ${itemName.slice(0, 40)} — ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (written % 5 === 0 && written > 0) {
      process.stdout.write(`  ${label}: ${written}/${rows.length} (${failed} skipped)\r`);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  console.log(`  ${label}: wrote ${written} items (${failed} skipped)`);
  return written;
}

async function syncActionItems(registry, runId) {
  const boardKey = 'actionItems';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  const sources = [SOURCE_BOARDS.socActionItems, SOURCE_BOARDS.physecActionItems];
  const rows = [];

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

  console.log(`  Clearing hub board ${boardKey}...`);
  await deleteBoardItems(hubId);
  return writeItems(hubId, colMap, rows, boardKey);
}

async function syncCapa(registry) {
  const boardKey = 'capa';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  const items = await getAllBoardItems(SOURCE_BOARDS.capa.id);
  const rows = items.map((item) => ({
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

  console.log(`  Pulled ${items.length} CAPA items`);
  await deleteBoardItems(hubId);
  return writeItems(hubId, colMap, rows, boardKey);
}

async function syncKpis(registry) {
  const boardKey = 'kpiHistory';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  const items = await getAllBoardItems(SOURCE_BOARDS.departmentKpis.id);

  const existing = await getAllBoardItems(hubId);
  const existingKeys = new Set(
    existing.map((e) => `${colText(e, 'KPI Key')}`)
  );

  const rows = [];
  for (const item of items) {
    const year = parseInt(colText(item, 'Year'), 10) || new Date().getFullYear();
    const monthly = extractKpiMonthlyRows(item, year);
    for (const m of monthly) {
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

  console.log(`  Pulled ${items.length} KPIs, ${rows.length} new monthly rows to append`);
  return writeItems(hubId, colMap, rows, boardKey);
}

async function syncRgContracts(registry) {
  const boardKey = 'rgContracts';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  const items = await getAllBoardItems(SOURCE_BOARDS.rgContracts.id);
  const rows = items.map((item) => ({
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

  console.log(`  Pulled ${items.length} RG contracts`);
  await deleteBoardItems(hubId);
  return writeItems(hubId, colMap, rows, boardKey);
}

async function syncRgAreaScope(registry) {
  const boardKey = 'rgAreaScope';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  const items = await getAllBoardItems(SOURCE_BOARDS.rgAreaScope.id);
  const rows = items.map((item) => ({
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

  console.log(`  Pulled ${items.length} RG area scope items`);
  await deleteBoardItems(hubId);
  return writeItems(hubId, colMap, rows, boardKey);
}

async function syncPsContracts(registry) {
  const boardKey = 'psContracts';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  const items = await getAllBoardItems(SOURCE_BOARDS.psRmrContract.id);
  const rows = items.map((item) => ({
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

  console.log(`  Pulled ${items.length} PS contracts`);
  await deleteBoardItems(hubId);
  return writeItems(hubId, colMap, rows, boardKey);
}

async function syncPsGuardPosts(registry) {
  const boardKey = 'psGuardPosts';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  const items = await getAllBoardItems(SOURCE_BOARDS.psGuardPosts.id);
  const rows = items.map((item) => ({
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

  console.log(`  Pulled ${items.length} PS guard posts`);
  await deleteBoardItems(hubId);
  return writeItems(hubId, colMap, rows, boardKey);
}

async function logSync(registry, runId, started, status, boardsPulled, itemsWritten, errors) {
  const boardKey = 'syncLog';
  const hubId = registry.boards[boardKey].id;
  const colMap = hubColumnMap(registry, boardKey);
  await createItem(hubId, `Sync ${runId}`, buildColumnValues(colMap, {
    'Run ID': runId,
    Started: started,
    Finished: TODAY,
    Status: status,
    'Boards Pulled': boardsPulled.join(', '),
    'Items Written': itemsWritten,
    Errors: errors.length ? errors.join('\n') : '',
  }));
}

async function main() {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const started = TODAY;
  const registry = loadHubRegistry();
  const errors = [];
  let totalWritten = 0;

  const steps = [
    ['Action Items', () => syncActionItems(registry, runId)],
    ['CAPA', () => syncCapa(registry)],
    ['KPI History', () => syncKpis(registry)],
    ['RG Contracts', () => syncRgContracts(registry)],
    ['RG Area Scope', () => syncRgAreaScope(registry)],
    ['PS Contracts', () => syncPsContracts(registry)],
    ['PS Guard Posts', () => syncPsGuardPosts(registry)],
  ];

  console.log(`\n=== Calidad Dashboard Sync — ${runId} ===\n`);
  console.log('READ ONLY on source boards. WRITE only to hub workspace.\n');

  for (const [name, fn] of steps) {
    try {
      console.log(`\n[${name}]`);
      totalWritten += await fn();
    } catch (err) {
      const msg = `${name}: ${err.message}`;
      console.error(`  ERROR: ${msg}`);
      errors.push(msg);
    }
  }

  await logSync(
    registry,
    runId,
    started,
    errors.length ? 'Partial' : 'Success',
    Object.values(SOURCE_BOARDS).map((b) => b.name),
    totalWritten,
    errors
  );

  console.log(`\n=== Sync complete ===`);
  console.log(`Items written: ${totalWritten}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length) errors.forEach((e) => console.log(`  - ${e}`));
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
