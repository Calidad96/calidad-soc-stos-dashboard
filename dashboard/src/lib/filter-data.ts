import type { DashboardView } from './dashboard-views';
import {
  buildDepartmentScope,
  getAvailableDepartments,
  selectedOptions,
  type DepartmentFilterId,
} from './department-filter';
import { categoryScores, departmentScores, kpiScore } from './metrics';
import type { ActionItem, CapaItem, DashboardData, KpiRecord } from './types';

function matchDept(value: string, patterns: string[]): boolean {
  if (!patterns.length) return false;
  const v = value.toLowerCase();
  return patterns.some((p) => v.includes(p.toLowerCase().split('/')[0].trim()));
}

function filterKpis(kpis: KpiRecord[], patterns?: string[]): KpiRecord[] {
  if (!patterns?.length) return kpis;
  return kpis.filter((k) =>
    patterns.some((p) => k.department.toLowerCase().includes(p.toLowerCase().split('/')[0].trim()))
  );
}

function filterActions(actions: ActionItem[], patterns?: string[]): ActionItem[] {
  if (!patterns?.length) return [];
  return actions.filter((a) => matchDept(a.department, patterns));
}

function filterCapa(capa: CapaItem[], patterns?: string[]): CapaItem[] {
  if (!patterns?.length) return [];
  return capa.filter((c) => {
    const d = (c.departments || '').toLowerCase();
    if (!d) return false;
    return patterns.some((p) => d.includes(p.toLowerCase()));
  });
}

function rebuildBuckets(actions: ActionItem[]): Record<string, ActionItem[]> {
  const buckets: Record<string, ActionItem[]> = {};
  for (const a of actions) {
    (buckets[a.bucket] ??= []).push(a);
  }
  return buckets;
}

function rebuildSummary(
  kpis: KpiRecord[],
  actions: ActionItem[],
  buckets: Record<string, ActionItem[]>,
  capa: DashboardData['capa'],
  rg: DashboardData['rgContracts'],
  ps: number
) {
  const scores = kpis.map((k) => k.score).filter((s): s is number => s != null);
  const kpiAvg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const criticalCapa = capa.filter((c) => /critical|high/i.test(c.criticality)).length;
  const rgAtRisk = rg.filter((c) =>
    /stuck|inactive|undefined|terminated/i.test(c.status)
  ).length;

  const socKpis = kpis.filter((k) => k.department.includes('SOC'));
  const stosKpis = kpis.filter((k) => k.department.includes('STOS'));
  const socScores = socKpis.map(kpiScore).filter((s): s is number => s != null);
  const stosScores = stosKpis.map(kpiScore).filter((s): s is number => s != null);

  return {
    kpiAvg: kpiAvg != null ? Math.round(kpiAvg * 10) / 10 : null,
    kpiGreen: kpis.filter((k) => (k.score ?? 0) >= 4).length,
    kpiTotal: kpis.length,
    openActions: actions.length,
    overdueActions: buckets['Overdue']?.length ?? 0,
    openCapa: capa.length,
    rgClients: rg.length,
    psContracts: ps,
    capaCritical: criticalCapa,
    rgAtRisk,
    overdueRate:
      actions.length > 0
        ? Math.round(((buckets['Overdue']?.length ?? 0) / actions.length) * 100)
        : 0,
    socScore:
      socScores.length
        ? Math.round((socScores.reduce((a, b) => a + b, 0) / socScores.length) * 10) / 10
        : null,
    stosScore:
      stosScores.length
        ? Math.round((stosScores.reduce((a, b) => a + b, 0) / stosScores.length) * 10) / 10
        : null,
  };
}

export function applyDepartmentFilter(
  data: DashboardData,
  view: DashboardView,
  selected: DepartmentFilterId[]
): DashboardData {
  const available = getAvailableDepartments(view);
  const scope = buildDepartmentScope(available, selected);

  if (!scope.active || available.length <= 1) {
    return {
      ...data,
      meta: { ...data.meta, departmentScope: scope },
    };
  }

  const opts = selectedOptions(available, selected);
  const kpiPatterns = [...new Set(opts.flatMap((o) => o.kpiPatterns))];
  const actionPatterns = [...new Set(opts.flatMap((o) => o.actionPatterns))];
  const capaPatterns = [...new Set(opts.flatMap((o) => o.capaPatterns))];
  const includeRg = opts.some((o) => o.includeRg);
  const includePhysical = opts.some((o) => o.includePhysical);

  const kpis = kpiPatterns.length ? filterKpis(data.kpis, kpiPatterns) : [];
  const actionItems = actionPatterns.length
    ? filterActions(data.actionItems, actionPatterns)
    : [];
  const actionBuckets = rebuildBuckets(actionItems);
  const capa =
    capaPatterns.length && view.filter.includeCapa !== false
      ? filterCapa(data.capa, capaPatterns)
      : [];
  const rgContracts = includeRg && view.filter.includeRg ? data.rgContracts : [];
  const rgAreaScope = includeRg && view.filter.includeRg ? data.rgAreaScope : [];
  const psContracts =
    includePhysical && view.filter.includePhysical ? data.psContracts : [];
  const psGuardPosts =
    includePhysical && view.filter.includePhysical ? data.psGuardPosts : [];

  const summary = rebuildSummary(
    kpis,
    actionItems,
    actionBuckets,
    capa,
    rgContracts,
    psContracts.length
  );

  return {
    ...data,
    kpis,
    actionItems,
    actionBuckets,
    capa,
    rgContracts,
    rgAreaScope,
    psContracts,
    psGuardPosts,
    categoryScores: categoryScores(kpis),
    departmentScores: departmentScores(kpis),
    summary: {
      kpiAvg: summary.kpiAvg,
      kpiGreen: summary.kpiGreen,
      kpiTotal: summary.kpiTotal,
      openActions: summary.openActions,
      overdueActions: summary.overdueActions,
      openCapa: summary.openCapa,
      rgClients: summary.rgClients,
      psContracts: summary.psContracts,
      capaCritical: summary.capaCritical,
      rgAtRisk: summary.rgAtRisk,
      overdueRate: summary.overdueRate,
      socScore: summary.socScore,
      stosScore: summary.stosScore,
    },
    meta: {
      ...data.meta,
      departmentScope: scope,
      itemCounts: {
        actions: actionItems.length,
        capa: capa.length,
        kpis: kpis.length,
        rg: rgContracts.length,
        area: rgAreaScope.length,
        ps: psContracts.length,
        posts: psGuardPosts.length,
      },
    },
  };
}

export function filterDashboardData(data: DashboardData, view: DashboardView): DashboardData {
  const f = view.filter;
  const kpis = filterKpis(data.kpis, f.kpiDepartments);
  const actionItems = filterActions(data.actionItems, f.actionDepartments);
  const actionBuckets = rebuildBuckets(actionItems);
  const capa = f.includeCapa !== false ? data.capa : [];
  const rgContracts = f.includeRg ? data.rgContracts : [];
  const rgAreaScope = f.includeRg ? data.rgAreaScope : [];
  const psContracts = f.includePhysical ? data.psContracts : [];
  const psGuardPosts = f.includePhysical ? data.psGuardPosts : [];

  const summary = rebuildSummary(
    kpis,
    actionItems,
    actionBuckets,
    capa,
    rgContracts,
    psContracts.length
  );

  const available = getAvailableDepartments(view);
  const scope = buildDepartmentScope(available, []);

  return {
    ...data,
    kpis,
    actionItems,
    actionBuckets,
    capa,
    rgContracts,
    rgAreaScope,
    psContracts,
    psGuardPosts,
    categoryScores: categoryScores(kpis),
    departmentScores: departmentScores(kpis),
    summary: {
      kpiAvg: summary.kpiAvg,
      kpiGreen: summary.kpiGreen,
      kpiTotal: summary.kpiTotal,
      openActions: summary.openActions,
      overdueActions: summary.overdueActions,
      openCapa: summary.openCapa,
      rgClients: summary.rgClients,
      psContracts: summary.psContracts,
      capaCritical: summary.capaCritical,
      rgAtRisk: summary.rgAtRisk,
      overdueRate: summary.overdueRate,
      socScore: summary.socScore,
      stosScore: summary.stosScore,
    },
    meta: {
      ...data.meta,
      departmentScope: scope,
      itemCounts: {
        actions: actionItems.length,
        capa: capa.length,
        kpis: kpis.length,
        rg: rgContracts.length,
        area: rgAreaScope.length,
        ps: psContracts.length,
        posts: psGuardPosts.length,
      },
    },
  };
}
