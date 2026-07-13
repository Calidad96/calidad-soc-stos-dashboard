export interface HubItem {
  id: string;
  name: string;
  fields: Record<string, string | number | null>;
}

export interface KpiRecord {
  key: string;
  name: string;
  department: string;
  category: string;
  target: number | null;
  exceed: string;
  monthly: { period: string; value: number }[];
  latestValue: number | null;
  score: number | null;
}

export interface ActionItem {
  id: string;
  name: string;
  department: string;
  accountable: string;
  priority: string;
  status: string;
  dueDate: string;
  bucket: string;
  client: string;
}

export interface CapaItem {
  id: string;
  name: string;
  criticality: string;
  status: string;
  departments: string;
  requester: string;
  description: string;
  dateRequested: string;
}

export interface ContractItem {
  id: string;
  name: string;
  status: string;
  projectId?: string;
  contractStart?: string;
  contractEnd?: string;
  monthlyBill?: number | null;
  msu?: string;
  standardSla?: string;
}

import type { DepartmentScope } from './department-filter';

export interface DashboardData {
  meta: {
    asOf: string;
    lastSync: string | null;
    clientTimezone: string;
    clientTimezoneLabel: string;
    syncStatus: string | null;
    kpiMonth: string | null;
    kpiFrom: string | null;
    kpiTo: string | null;
    kpiPeriodLabel: string | null;
    itemCounts: Record<string, number>;
    departmentScope?: DepartmentScope;
  };
  summary: {
    kpiAvg: number | null;
    kpiGreen: number;
    kpiTotal: number;
    openActions: number;
    overdueActions: number;
    openCapa: number;
    rgClients: number;
    psContracts: number;
    capaCritical?: number;
    rgAtRisk?: number;
    overdueRate?: number;
    socScore?: number | null;
    stosScore?: number | null;
  };
  kpis: KpiRecord[];
  categoryScores: { category: string; score: number }[];
  departmentScores: { department: string; score: number }[];
  months: string[];
  actionItems: ActionItem[];
  actionBuckets: Record<string, ActionItem[]>;
  capa: CapaItem[];
  rgContracts: ContractItem[];
  rgAreaScope: HubItem[];
  psContracts: HubItem[];
  psGuardPosts: HubItem[];
}
