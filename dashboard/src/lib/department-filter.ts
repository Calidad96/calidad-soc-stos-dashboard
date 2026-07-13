import type { DashboardView } from './dashboard-views';

export type DepartmentFilterId = 'soc' | 'stos' | 'physical';

export interface DepartmentFilterOption {
  id: DepartmentFilterId;
  label: string;
  shortLabel: string;
  kpiPatterns: string[];
  actionPatterns: string[];
  capaPatterns: string[];
  includeRg: boolean;
  includePhysical: boolean;
}

export const DEPARTMENT_OPTIONS: Record<DepartmentFilterId, DepartmentFilterOption> = {
  soc: {
    id: 'soc',
    label: 'SOC / Remote Guarding',
    shortLabel: 'SOC',
    kpiPatterns: ['SOC'],
    actionPatterns: ['SOC'],
    capaPatterns: ['SOC'],
    includeRg: true,
    includePhysical: false,
  },
  stos: {
    id: 'stos',
    label: 'STOS / Tech',
    shortLabel: 'STOS',
    kpiPatterns: ['STOS'],
    actionPatterns: [],
    capaPatterns: ['STOS'],
    includeRg: false,
    includePhysical: false,
  },
  physical: {
    id: 'physical',
    label: 'Physical Security',
    shortLabel: 'Physical',
    kpiPatterns: [],
    actionPatterns: ['Physical'],
    capaPatterns: ['Physical'],
    includeRg: false,
    includePhysical: true,
  },
};

export interface DepartmentScope {
  active: boolean;
  label: string;
  selected: DepartmentFilterId[];
  showSoc: boolean;
  showStos: boolean;
  showPhysical: boolean;
  showRg: boolean;
}

/** Departments available for filtering in the current dashboard view. */
export function getAvailableDepartments(view: DashboardView): DepartmentFilterId[] {
  const f = view.filter;
  const ids: DepartmentFilterId[] = [];

  if (
    f.kpiDepartments?.some((d) => d.toLowerCase().includes('soc')) ||
    f.actionDepartments?.some((d) => d.toLowerCase().includes('soc'))
  ) {
    ids.push('soc');
  }
  if (f.kpiDepartments?.some((d) => d.toLowerCase().includes('stos'))) {
    ids.push('stos');
  }
  if (
    f.actionDepartments?.some((d) => d.toLowerCase().includes('physical')) ||
    f.includePhysical
  ) {
    ids.push('physical');
  }

  return ids;
}

export function isAllDepartmentsSelected(
  available: DepartmentFilterId[],
  selected: DepartmentFilterId[]
): boolean {
  if (!available.length) return true;
  if (!selected.length) return true;
  return available.every((id) => selected.includes(id));
}

export function buildDepartmentScope(
  available: DepartmentFilterId[],
  selected: DepartmentFilterId[]
): DepartmentScope {
  const active =
    available.length > 0 && !isAllDepartmentsSelected(available, selected);
  const effective = active ? selected : available;

  const showSoc = effective.includes('soc');
  const showStos = effective.includes('stos');
  const showPhysical = effective.includes('physical');
  const showRg = effective.some((id) => DEPARTMENT_OPTIONS[id].includeRg);

  let label = 'All departments';
  if (active) {
    label = effective.map((id) => DEPARTMENT_OPTIONS[id].shortLabel).join(' · ');
  }

  return {
    active,
    label,
    selected: active ? selected : [],
    showSoc,
    showStos,
    showPhysical,
    showRg,
  };
}

export function selectedOptions(
  available: DepartmentFilterId[],
  selected: DepartmentFilterId[]
): DepartmentFilterOption[] {
  const ids = isAllDepartmentsSelected(available, selected) ? available : selected;
  return ids.map((id) => DEPARTMENT_OPTIONS[id]);
}
