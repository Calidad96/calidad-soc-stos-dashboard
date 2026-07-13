import { normalizeMonth, classifyKpiDepartment, isDashboardKpi } from '../src/lib/kpi-classify.ts';

const samples = [
  'Alarm Action Time – Speed of operator response to alarms. — 2026-04',
  'SLA Success Rate – % of Tickets Ack within 30 mins — 2026-03',
  'Gross Margin % – Profit after labor & materials. — 2025-04',
];

for (const s of samples) {
  console.log(s.slice(0, 55));
  console.log('  month:', normalizeMonth(2026, s));
  console.log('  dept:', classifyKpiDepartment(s));
  console.log('  include:', isDashboardKpi(s));
}
