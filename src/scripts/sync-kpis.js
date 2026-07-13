import { getAllBoardItems } from '../lib/monday.js';
import { SOURCE_BOARDS } from '../config/boards.js';
import { loadHubRegistry, hubColumnMap, extractKpiMonthlyRows, buildColumnValues, colText, todayDate } from '../lib/sync-utils.js';
import { createItem } from '../lib/monday.js';

const TODAY = todayDate();

async function writeItems(boardId, colMap, rows) {
  let written = 0;
  for (const row of rows) {
    try {
      await createItem(boardId, row.itemName, buildColumnValues(colMap, row.values));
      written++;
      if (written % 5 === 0) await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.warn(`Skip: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return written;
}

async function main() {
  const registry = loadHubRegistry();
  const hubId = registry.boards.kpiHistory.id;
  const colMap = hubColumnMap(registry, 'kpiHistory');
  const items = await getAllBoardItems(SOURCE_BOARDS.departmentKpis.id);
  const existing = await getAllBoardItems(hubId);
  const existingKeys = new Set(existing.map((e) => colText(e, 'KPI Key')));

  const rows = [];
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

  console.log(`KPI History: ${existing.length} existing, ${rows.length} remaining to write`);
  const written = await writeItems(hubId, colMap, rows);
  console.log(`Done. Wrote ${written} rows.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
