/** KPI names to exclude (finance, HR, sales, etc.) */
const EXCLUDE_PATTERNS = [
  /gross margin/i,
  /AR percentage/i,
  /accounts receivable/i,
  /revenue/i,
  /payroll/i,
  /headcount/i,
  /pipeline/i,
  /sales/i,
  /burden/i,
  /overhead/i,
  /COGS/i,
  /net income/i,
  /P&L/i,
  /hiring/i,
  /requisition/i,
  /customer acquisition/i,
  /churn/i,
  /billable/i,
  /utilization.*install/i,
];

/** Classify into dashboard departments */
const SOC_PATTERNS = [
  /alarm/i,
  /dispersal/i,
  /incident/i,
  /uptime/i,
  /DSA/i,
  /operator/i,
  /remote guard/i,
  /missed incident/i,
  /investigation/i,
  /events per/i,
  /# of alarms/i,
  /camera/i,
  /MSU deployed/i,
  /sites monitored/i,
  /audio/i,
  /loudspeaker/i,
  /guard dispers/i,
  /response time.*alarm/i,
  /action time/i,
];

const STOS_PATTERNS = [
  /ticket/i,
  /SLA/i,
  /tech/i,
  /install/i,
  /service ticket/i,
  /fleet/i,
  /assembly/i,
  /scheduled within/i,
  /resolved within/i,
  /ack within/i,
  /MSU(?! deployed)/i,
  /backlog/i,
  /P0/i,
];

export function isExcludedKpi(name: string): boolean {
  return EXCLUDE_PATTERNS.some((p) => p.test(name));
}

export function classifyKpiDepartment(name: string): string | null {
  if (isExcludedKpi(name)) return null;
  if (SOC_PATTERNS.some((p) => p.test(name))) return 'SOC / Remote Guarding';
  if (STOS_PATTERNS.some((p) => p.test(name))) return 'STOS / Tech';
  return null;
}

export function isDashboardKpi(name: string): boolean {
  return classifyKpiDepartment(name) != null;
}

/** Extract YYYY-MM from hub item name suffix: "KPI Name — 2025-04" */
export function monthFromName(name: string): string | null {
  const m = name.match(/(?:—|-)\s*(\d{4}-\d{2})\s*$/);
  return m ? m[1] : null;
}

export function normalizeMonth(
  raw: string | number | null | undefined,
  itemName: string
): string {
  if (typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw.trim())) return raw.trim();
  const fromName = monthFromName(itemName);
  if (fromName) return fromName;
  return '';
}
