import type { TabId } from '@/components/Sidebar';

export type DashboardViewId =
  | 'soc-stos'
  | 'soc'
  | 'stos'
  | 'physical'
  | 'operations';

export interface DashboardView {
  id: DashboardViewId;
  label: string;
  shortLabel: string;
  subtitle: string;
  /** false = show as "Coming soon" in selector */
  enabled: boolean;
  tabs: TabId[];
  filter: {
    kpiDepartments?: string[];
    actionDepartments?: string[];
    includeCapa?: boolean;
    includeRg?: boolean;
    includePhysical?: boolean;
  };
}

export const DASHBOARD_VIEWS: DashboardView[] = [
  {
    id: 'soc-stos',
    label: 'SOC + STOS Command Center',
    shortLabel: 'Command Center',
    subtitle: 'KPIs · Actions · CAPA · RG Clients · Physical Security',
    enabled: true,
    tabs: ['overview', 'insights', 'kpis', 'trends', 'actions', 'capa', 'clients', 'physical', 'settings'],
    filter: {
      kpiDepartments: ['SOC / Remote Guarding', 'STOS / Tech'],
      actionDepartments: ['SOC', 'Physical Security'],
      includeCapa: true,
      includeRg: true,
      includePhysical: true,
    },
  },
  {
    id: 'soc',
    label: 'SOC / Remote Guarding',
    shortLabel: 'SOC',
    subtitle: 'Remote monitoring & operator performance',
    enabled: false,
    tabs: ['overview', 'insights', 'kpis', 'trends', 'actions', 'capa', 'clients', 'settings'],
    filter: {
      kpiDepartments: ['SOC / Remote Guarding'],
      actionDepartments: ['SOC'],
      includeCapa: true,
      includeRg: true,
      includePhysical: false,
    },
  },
  {
    id: 'stos',
    label: 'STOS / Tech Operations',
    shortLabel: 'STOS',
    subtitle: 'Tickets, SLAs & technology KPIs',
    enabled: false,
    tabs: ['overview', 'insights', 'kpis', 'trends', 'actions', 'capa', 'settings'],
    filter: {
      kpiDepartments: ['STOS / Tech'],
      actionDepartments: [],
      includeCapa: true,
      includeRg: false,
      includePhysical: false,
    },
  },
  {
    id: 'physical',
    label: 'Physical Security / Patrol',
    shortLabel: 'Physical Sec',
    subtitle: 'Guard posts, contracts & patrol actions',
    enabled: false,
    tabs: ['overview', 'insights', 'actions', 'capa', 'physical'],
    filter: {
      actionDepartments: ['Physical Security'],
      includeCapa: true,
      includeRg: false,
      includePhysical: true,
    },
  },
  {
    id: 'operations',
    label: 'Company Operations (All)',
    shortLabel: 'All Ops',
    subtitle: 'Cross-department view — coming soon',
    enabled: false,
    tabs: ['overview', 'kpis', 'trends'],
    filter: {},
  },
];

/** Dashboards shown in the header selector (live only for now) */
export const LIVE_DASHBOARDS = DASHBOARD_VIEWS.filter((v) => v.enabled);

/** Future dashboards — shown disabled in selector as "Coming soon" */
export const UPCOMING_DASHBOARDS = DASHBOARD_VIEWS.filter((v) => !v.enabled);

export function getView(id: DashboardViewId): DashboardView {
  return DASHBOARD_VIEWS.find((v) => v.id === id) ?? DASHBOARD_VIEWS[0];
}

/** Tooltip copy — plain language for operators and leadership */
export const INSIGHT_TIPS: Record<string, string> = {
  kpiAvg:
    'Average KPI score for the selected months, on a 1–5 scale. Target is 4.0+.',
  periodRange:
    'KPI scores are monthly. Choose a month or range to compare performance over time. Actions and CAPA always show what is open today.',
  kpiGreen:
    'KPIs scoring 4.0 or above — on or ahead of target.',
  openActions:
    'Action items still in progress across SOC and Physical Security teams.',
  overdueActions:
    'Items past their due date. These should be reviewed first.',
  overdueRate:
    'Percent of open actions that are overdue. Goal is under 20%.',
  openCapa:
    'Open corrective and preventive actions tracking systemic issues.',
  capaCritical:
    'High-priority CAPA items that need management attention.',
  rgClients:
    'Remote Guarding client contracts — active sites and accounts.',
  rgAtRisk:
    'Contracts flagged as stuck, inactive, or needing follow-up.',
  psContracts:
    'Physical security patrol and guarding contracts.',
  socScore:
    'SOC / Remote Guarding team average for the selected period.',
  stosScore:
    'STOS / Technology team average for the selected period.',
  actionCompletion:
    'Estimated completion rate based on closed vs open action items.',
  dataFreshness:
    'Data loads when you open or return to this page. All times use the US client timezone — change it in Settings → Data.',
  tickets:
    'Service ticket queue for the technology team. Available in a future release.',
  dispersalLeaderboard:
    'Operator performance rankings. Available in a future release.',
  dataSync:
    'Schedule when dashboard data is refreshed from your operations systems.',
  categoryScores:
    'Average score by category — Cost, Productivity, Quality, and more.',
  departmentStandings:
    'Compare SOC and STOS performance side by side for the selected period.',
  departmentFilter:
    'Narrow the dashboard to one or more departments. KPIs, actions, CAPA, and summary cards update together.',
  trendHistory:
    'Line charts use the last 12 recorded months. The KPIs tab shows the detailed scorecard for your selected period only.',
  dueThisWeek:
    'Highest-priority items due this week or already overdue.',
  guardPosts:
    'Active guard post and patrol locations.',
  capaDepartments:
    'How many departments currently have open CAPA items.',
};
