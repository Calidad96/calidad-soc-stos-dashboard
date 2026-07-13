import fs from 'fs';

export function loadHubRegistry() {
  const path = 'data/hub-registry.json';
  if (!fs.existsSync(path)) {
    throw new Error('Hub registry not found. Run: npm run setup-hub');
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

/** Get column text value by title from a Monday item */
export function colText(item, title) {
  const cv = item.column_values?.find((c) => c.column?.title === title);
  return cv?.text?.trim() || '';
}

/** Build map of column title -> column id for hub board */
export function hubColumnMap(registry, boardKey) {
  const ids = registry.columnIds?.[boardKey] ?? {};
  const map = {};
  for (const [title, id] of Object.entries(ids)) {
    map[title] = id;
  }
  return map;
}

/** Format date for Monday date column (YYYY-MM-DD) */
export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

/** Due date bucket matching dashboard prototype */
export function dueBucket(dueStr) {
  if (!dueStr) return 'Later / No Date';
  const due = new Date(dueStr);
  if (Number.isNaN(due.getTime())) return 'Later / No Date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due Today';
  if (diff <= 7) return 'Due This Week';
  if (diff <= 14) return 'Due Next Week';
  return 'Later / No Date';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function classifyKpiDepartment(name) {
  if (/gross margin|AR percentage|revenue|payroll|headcount|pipeline|sales|burden|overhead/i.test(name)) return null;
  if (/alarm|dispersal|incident|uptime|DSA|operator|missed incident|investigation|# of alarms|camera|MSU deployed|sites monitored|action time/i.test(name)) return 'SOC / Remote Guarding';
  if (/ticket|SLA|tech|install|service ticket|fleet|assembly|scheduled within|resolved within|ack within|backlog/i.test(name)) return 'STOS / Tech';
  return null;
}

export function extractKpiMonthlyRows(item, year = new Date().getFullYear()) {
  const rows = [];
  const name = item.name;
  const category = colText(item, 'Category');
  const target = parseFloat(colText(item, 'Target')) || null;
  const exceed = colText(item, 'Exceed Level');
  const scoreText = colText(item, 'KPI Score (Out of 5)');
  const boardScore = parseFloat(scoreText) || null;
  const sourceId = item.id;
  const dept = colText(item, 'Departments') || classifyKpiDepartment(name) || 'Unknown';

  for (let i = 0; i < MONTHS.length; i++) {
    const m = MONTHS[i];
    const valText = colText(item, m);
    if (!valText) continue;
    const actual = parseFloat(valText);
    if (Number.isNaN(actual)) continue;
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
    rows.push({
      kpiKey: `${sourceId}_${monthKey}`,
      kpiName: name,
      department: dept,
      category,
      month: monthKey,
      actual,
      target,
      boardScore,
      exceed,
      year: String(year),
      sourceItemId: sourceId,
    });
  }
  return rows;
}

export function buildColumnValues(colMap, values) {
  const out = {};
  for (const [title, value] of Object.entries(values)) {
    const colId = colMap[title];
    if (!colId || value === undefined || value === null || value === '') continue;
    if (title.includes('Date') || title === 'Snapshot At' || title === 'Synced At' || title === 'Started' || title === 'Finished') {
      out[colId] = { date: String(value).slice(0, 10) };
    } else if (['Actual Value', 'Target', 'KPI Score', 'Monthly Bill', 'Setup Fee', 'Hours Per Shift', 'Shifts Per Week', 'Pay Rate', 'Bill Rate', 'Items Written'].includes(title)) {
      const n = Number(value);
      if (!Number.isNaN(n)) out[colId] = String(n);
    } else {
      out[colId] = String(value);
    }
  }
  return out;
}
