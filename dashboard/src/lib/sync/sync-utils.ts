import type { HubRegistry } from './hub-registry';

export interface MondayColumnValue {
  id?: string;
  text?: string;
  value?: string;
  type?: string;
  column?: { title?: string; type?: string };
}

export interface MondayItem {
  id: string;
  name: string;
  column_values?: MondayColumnValue[];
}

export function colText(item: MondayItem, title: string): string {
  const cv = item.column_values?.find((c) => c.column?.title === title);
  return cv?.text?.trim() ?? '';
}

export function hubColumnMap(
  registry: HubRegistry,
  boardKey: keyof HubRegistry['columnIds']
): Record<string, string> {
  const ids = registry.columnIds?.[boardKey] ?? {};
  return { ...ids };
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dueBucket(dueStr: string): string {
  if (!dueStr) return 'Later / No Date';
  const due = new Date(dueStr);
  if (Number.isNaN(due.getTime())) return 'Later / No Date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due Today';
  if (diff <= 7) return 'Due This Week';
  if (diff <= 14) return 'Due Next Week';
  return 'Later / No Date';
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function classifyKpiDepartment(name: string): string | null {
  if (/gross margin|AR percentage|revenue|payroll|headcount|pipeline|sales|burden|overhead/i.test(name)) {
    return null;
  }
  if (/alarm|dispersal|incident|uptime|DSA|operator|missed incident|investigation|# of alarms|camera|MSU deployed|sites monitored|action time/i.test(name)) {
    return 'SOC / Remote Guarding';
  }
  if (/ticket|SLA|tech|install|service ticket|fleet|assembly|scheduled within|resolved within|ack within|backlog/i.test(name)) {
    return 'STOS / Tech';
  }
  return null;
}

export interface KpiMonthlyRow {
  kpiKey: string;
  kpiName: string;
  department: string;
  category: string;
  month: string;
  actual: number;
  target: number | null;
  boardScore: number | null;
  exceed: string;
  year: string;
  sourceItemId: string;
}

export function extractKpiMonthlyRows(
  item: MondayItem,
  year = new Date().getFullYear()
): KpiMonthlyRow[] {
  const rows: KpiMonthlyRow[] = [];
  const name = item.name;
  const category = colText(item, 'Category');
  const target = parseFloat(colText(item, 'Target')) || null;
  const exceed = colText(item, 'Exceed Level');
  const scoreText = colText(item, 'KPI Score (Out of 5)');
  const boardScore = parseFloat(scoreText) || null;
  const sourceId = item.id;
  const dept =
    colText(item, 'Departments') || classifyKpiDepartment(name) || 'Unknown';

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

const NUMERIC_COLUMNS = new Set([
  'Actual Value',
  'Target',
  'KPI Score',
  'Monthly Bill',
  'Setup Fee',
  'Hours Per Shift',
  'Shifts Per Week',
  'Pay Rate',
  'Bill Rate',
  'Items Written',
]);

const DATE_COLUMNS = new Set([
  'Due Date',
  'Next Action Date',
  'Date Requested',
  'Contract Start',
  'Contract End',
  'Start Date',
  'End Date',
  'Renewal Date',
  'Snapshot At',
  'Synced At',
  'Started',
  'Finished',
]);

const LONG_TEXT_COLUMNS = new Set(['Errors', 'Boards Pulled']);

export function buildColumnValues(
  colMap: Record<string, string>,
  values: Record<string, string | number | undefined | null>
): Record<string, { date: string } | string> {
  const out: Record<string, { date: string } | string> = {};
  for (const [title, value] of Object.entries(values)) {
    const colId = colMap[title];
    if (!colId || value === undefined || value === null || value === '') continue;
    if (title.includes('Date') || DATE_COLUMNS.has(title)) {
      out[colId] = { date: String(value).slice(0, 10) };
    } else if (NUMERIC_COLUMNS.has(title)) {
      const n = Number(value);
      if (!Number.isNaN(n)) out[colId] = String(n);
    } else if (LONG_TEXT_COLUMNS.has(title)) {
      out[colId] = JSON.stringify({ text: String(value) });
    } else {
      out[colId] = String(value);
    }
  }
  return out;
}
