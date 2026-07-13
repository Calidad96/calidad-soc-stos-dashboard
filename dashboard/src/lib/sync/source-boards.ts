/** Source boards — READ ONLY. Never write to these. */
export const SOURCE_BOARDS = {
  socActionItems: {
    id: '18415782190',
    name: 'SOC / Remote Guarding — Action Items',
    domain: 'action_items',
    department: 'SOC',
  },
  physecActionItems: {
    id: '18415782211',
    name: 'Physical Security / Patrol — Action Items',
    domain: 'action_items',
    department: 'Physical Security',
  },
  capa: {
    id: '18077202351',
    name: 'CAPA (Corrective/Preventive Action)',
    domain: 'capa',
  },
  departmentKpis: {
    id: '18387162217',
    name: 'Department KPIs',
    domain: 'kpis',
  },
  rgContracts: {
    id: '18270346166',
    name: 'Remote Guarding Contracts (RMR)',
    domain: 'rg_contracts',
  },
  rgAreaScope: {
    id: '18270362307',
    name: 'RG Area Service Scope',
    domain: 'rg_area_scope',
  },
  psRmrContract: {
    id: '18415110274',
    name: 'PS RMR Contract',
    domain: 'ps_contracts',
  },
  psGuardPosts: {
    id: '18415110284',
    name: 'PS Guard Posts',
    domain: 'ps_guard_posts',
  },
} as const;
