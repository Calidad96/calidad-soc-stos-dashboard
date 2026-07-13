import type { TabId } from '@/components/Sidebar';

export const TAB_TITLES: Record<TabId, string> = {
  overview: 'Executive Summary',
  insights: 'Performance Insights',
  kpis: 'KPI Scorecard',
  trends: 'Trend Analysis',
  actions: 'Action Items',
  capa: 'CAPA Tracker',
  clients: 'RG Clients',
  physical: 'Physical Security',
  tickets: 'Service Tickets',
  leaderboard: 'Operator Rankings',
  settings: 'Data Settings',
};

export const TAB_SUBTITLES: Partial<Record<TabId, string>> = {
  overview: 'Key metrics at a glance for the selected period',
  insights: 'Alerts, strengths, and areas needing attention',
  kpis: 'Snapshot — scores and targets for the months you selected',
  trends: 'How performance moves month to month (uses all recorded history)',
  actions: 'Open tasks sorted by urgency and due date',
  capa: 'Corrective actions and systemic issue tracking',
  clients: 'Remote guarding contracts and service scope',
  physical: 'Patrol contracts and guard post coverage',
  settings: 'Data refresh schedule and manual updates',
};
