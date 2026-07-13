import { DONE_STATUSES, HUB_BOARDS } from './config';
import { fetchBoardItems, parseItem } from './monday';
import { categoryScores, departmentScores, computeScore } from './metrics';
import {
  classifyKpiDepartment,
  isDashboardKpi,
  normalizeMonth,
} from './kpi-classify';
import { getClientTimezoneLabel } from './client-time';
import { periodLabel, resolvePeriodRange } from './period-range';
import { readSyncSettings } from './sync-settings';
import { clampTimezone } from './sync-schedule';
import type {
  ActionItem,
  CapaItem,
  ContractItem,
  DashboardData,
  HubItem,
  KpiRecord,
} from './types';

function isOpenStatus(status: string) {
  const s = status.toLowerCase();
  return !DONE_STATUSES.some((d) => s.includes(d));
}

function buildKpis(
  rows: { fields: ReturnType<typeof parseItem>; itemName: string }[]
): KpiRecord[] {
  const byKey = new Map<string, KpiRecord>();

  for (const { fields: f, itemName } of rows) {
    const name = String(f['KPI Name'] ?? f._name ?? itemName ?? 'Unknown');
    if (!isDashboardKpi(name)) continue;

    const dept =
      classifyKpiDepartment(name) ||
      (String(f.Department ?? '') !== 'Unknown' ? String(f.Department) : 'SOC / STOS');

    const sourceId = String(f['Source Item ID'] ?? '');
    const key = sourceId || name;
    const month = normalizeMonth(f.Month, itemName);

    let kpi = byKey.get(key);
    if (!kpi) {
      kpi = {
        key,
        name,
        department: dept,
        category: String(f.Category ?? 'Uncategorized'),
        target: typeof f.Target === 'number' ? f.Target : null,
        exceed: String(f['Exceed Level'] ?? ''),
        monthly: [],
        latestValue: null,
        score: null,
      };
      byKey.set(key, kpi);
    }

    const val = typeof f['Actual Value'] === 'number' ? f['Actual Value'] : null;
    if (month && val != null) {
      const existing = kpi.monthly.find((m) => m.period === month);
      if (!existing) kpi.monthly.push({ period: month, value: val });
    }
  }

  return [...byKey.values()].map((k) => {
    k.monthly.sort((a, b) => a.period.localeCompare(b.period));
    return k;
  });
}

function monthsWithData(kpis: KpiRecord[]): string[] {
  const set = new Set<string>();
  for (const k of kpis) {
    for (const m of k.monthly) set.add(m.period);
  }
  return [...set].sort();
}


function applyDisplayRange(
  kpis: KpiRecord[],
  from?: string | null,
  to?: string | null
): KpiRecord[] {
  const fromM = from ?? to ?? null;
  const toM = to ?? from ?? null;

  return kpis.map((k) => {
    let inRange = k.monthly;
    if (fromM) inRange = inRange.filter((m) => m.period >= fromM);
    if (toM) inRange = inRange.filter((m) => m.period <= toM);

    if (!inRange.length) {
      const fallback = k.monthly.at(-1);
      const val = fallback?.value ?? null;
      return {
        ...k,
        latestValue: val,
        score: val != null ? computeScore(val, k.target, k.exceed) : null,
      };
    }

    const avg = inRange.reduce((a, m) => a + m.value, 0) / inRange.length;
    const rounded = Math.round(avg * 100) / 100;
    return {
      ...k,
      latestValue: rounded,
      score: computeScore(rounded, k.target, k.exceed),
    };
  });
}

export async function aggregateDashboard(opts?: {
  from?: string;
  to?: string;
  /** @deprecated use from/to */
  month?: string;
}): Promise<DashboardData> {
  const [
    actionRaw,
    capaRaw,
    kpiRaw,
    rgRaw,
    areaRaw,
    psRaw,
    postsRaw,
    syncRaw,
  ] = await Promise.all([
    fetchBoardItems(HUB_BOARDS.actionItems),
    fetchBoardItems(HUB_BOARDS.capa),
    fetchBoardItems(HUB_BOARDS.kpiHistory),
    fetchBoardItems(HUB_BOARDS.rgContracts),
    fetchBoardItems(HUB_BOARDS.rgAreaScope),
    fetchBoardItems(HUB_BOARDS.psContracts),
    fetchBoardItems(HUB_BOARDS.psGuardPosts),
    fetchBoardItems(HUB_BOARDS.syncLog),
  ]);

  const kpiFields = kpiRaw.map((item) => ({
    fields: parseItem(item),
    itemName: item.name,
  }));

  const kpisBuilt = buildKpis(kpiFields);
  const months = monthsWithData(kpisBuilt);
  const range = resolvePeriodRange(
    months,
    opts?.from ?? opts?.month,
    opts?.to ?? opts?.month
  );
  const kpis = applyDisplayRange(kpisBuilt, range?.from, range?.to);

  const actionItems: ActionItem[] = actionRaw
    .map((item) => {
      const f = parseItem(item);
      return {
        id: item.id,
        name: item.name,
        department: String(f.Department ?? ''),
        accountable: String(f.Accountable ?? ''),
        priority: String(f.Priority ?? ''),
        status: String(f.Status ?? ''),
        dueDate: String(f['Due Date'] ?? ''),
        bucket: String(f['Due Bucket'] ?? 'Later / No Date'),
        client: String(f.Client ?? ''),
      };
    })
    .filter((a) => isOpenStatus(a.status));

  const actionBuckets: Record<string, ActionItem[]> = {};
  for (const a of actionItems) {
    (actionBuckets[a.bucket] ??= []).push(a);
  }

  const capa: CapaItem[] = capaRaw
    .map((item) => {
      const f = parseItem(item);
      return {
        id: item.id,
        name: item.name,
        criticality: String(f.Criticality ?? ''),
        status: String(f.Status ?? ''),
        departments: String(f.Departments ?? ''),
        requester: String(f.Requester ?? ''),
        description: String(f['Issue Description'] ?? ''),
        dateRequested: String(f['Date Requested'] ?? ''),
      };
    })
    .filter((c) => isOpenStatus(c.status));

  const rgContracts: ContractItem[] = rgRaw.map((item) => {
    const f = parseItem(item);
    return {
      id: item.id,
      name: item.name,
      status: String(f.Status ?? 'Undefined'),
      projectId: String(f['Project ID'] ?? ''),
      contractStart: String(f['Contract Start'] ?? ''),
      contractEnd: String(f['Contract End'] ?? ''),
      monthlyBill: typeof f['Monthly Bill'] === 'number' ? f['Monthly Bill'] : null,
      msu: String(f.MSU ?? ''),
      standardSla: String(f['Standard SLA'] ?? ''),
    };
  });

  const toHub = (items: typeof areaRaw): HubItem[] =>
    items.map((item) => ({ id: item.id, name: item.name, fields: parseItem(item) }));

  const scores = kpis.map((k) => k.score).filter((s): s is number => s != null);
  const kpiAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const lastSyncItem = syncRaw[0];
  const syncFields = lastSyncItem ? parseItem(lastSyncItem) : null;

  const criticalCapa = capa.filter((c) => /critical|high/i.test(c.criticality)).length;
  const rgAtRisk = rgContracts.filter((c) =>
    /stuck|inactive|undefined|terminated/i.test(c.status)
  ).length;
  const overdue = actionBuckets['Overdue']?.length ?? 0;

  const syncSettings = await readSyncSettings();
  const clientTimezone = clampTimezone(syncSettings.clientTimezone);

  return {
    meta: {
      asOf: new Date().toISOString(),
      lastSync: syncFields ? String(syncFields.Finished ?? syncFields.Started ?? '') : null,
      clientTimezone,
      clientTimezoneLabel: getClientTimezoneLabel(clientTimezone),
      syncStatus: syncFields ? String(syncFields.Status ?? '') : null,
      kpiMonth: range?.to ?? null,
      kpiFrom: range?.from ?? null,
      kpiTo: range?.to ?? null,
      kpiPeriodLabel: periodLabel(range),
      itemCounts: {
        actions: actionItems.length,
        capa: capa.length,
        kpis: kpis.length,
        rg: rgContracts.length,
        area: areaRaw.length,
        ps: psRaw.length,
        posts: postsRaw.length,
      },
    },
    summary: {
      kpiAvg: kpiAvg != null ? Math.round(kpiAvg * 10) / 10 : null,
      kpiGreen: kpis.filter((k) => (k.score ?? 0) >= 4).length,
      kpiTotal: kpis.length,
      openActions: actionItems.length,
      overdueActions: overdue,
      openCapa: capa.length,
      rgClients: rgContracts.length,
      psContracts: psRaw.length,
      capaCritical: criticalCapa,
      rgAtRisk,
      overdueRate:
        actionItems.length > 0 ? Math.round((overdue / actionItems.length) * 100) : 0,
      socScore: null,
      stosScore: null,
    },
    kpis,
    categoryScores: categoryScores(kpis),
    departmentScores: departmentScores(kpis),
    months,
    actionItems,
    actionBuckets,
    capa,
    rgContracts,
    rgAreaScope: toHub(areaRaw),
    psContracts: toHub(psRaw),
    psGuardPosts: toHub(postsRaw),
  };
}
