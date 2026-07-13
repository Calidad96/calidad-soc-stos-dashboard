# Calidad SOC + STOS Dashboard — Monday Sync

Auto-syncs data from client Monday boards (read-only) into the **Dashboard Data Hub** workspace.

## Hub Workspace

- **Name:** Dashboard Data Hub (Auto-Sync)
- **URL:** https://blakesmallie.monday.com/workspaces/16379553
- **Rule:** Never write to source boards — hub only.

## Commands

```bash
npm run inspect    # Read-only: inspect source board columns
npm run setup-hub  # Create [SYNC] boards + columns (one-time)
npm run sync       # Pull source → push hub
```

## Hub Boards Created

| Board | ID |
|-------|-----|
| [SYNC] Action Items Snapshot | 18421237656 |
| [SYNC] CAPA Snapshot | 18421237790 |
| [SYNC] KPI History | 18421237837 |
| [SYNC] RG Contracts Snapshot | 18421237888 |
| [SYNC] RG Area Scope Snapshot | 18421237943 |
| [SYNC] PS Contracts Snapshot | 18421237989 |
| [SYNC] PS Guard Posts Snapshot | 18421238055 |
| [SYNC] Sync Log | 18421238098 |

## Source Boards (READ ONLY)

| Board | ID |
|-------|-----|
| SOC Action Items | 18415782190 |
| Physical Security Action Items | 18415782211 |
| CAPA | 18077202351 |
| Department KPIs | 18387162217 |
| RG Contracts | 18270346166 |
| RG Area Service Scope | 18270362307 |
| PS RMR Contract | 18415110274 |
| PS Guard Posts | 18415110284 |

## Sync Behavior

- **Snapshots** (Actions, CAPA, Contracts): replaced each sync with latest data
- **KPI History**: appended by month — old months are never deleted
- **Sync Log**: one row per run

## Environment

Copy `.env` and set:

```
MONDAY_API_TOKEN=your_token
MONDAY_HUB_WORKSPACE_ID=16379553
```

## Dashboard UI

Professional web dashboard reading live from the Monday Data Hub.

```bash
cd dashboard
npm install
npm run dev
```

Open **http://localhost:3000**

### Tabs
- **Overview** — KPI summary, category charts, top focus items
- **KPIs** — Full scorecard with scores
- **Trends** — Monthly history from KPI archive
- **Actions** — Due buckets (Overdue, Today, This Week…)
- **CAPA** — Open corrective actions
- **RG Clients** — Contracts + area scope
- **Physical Sec** — PS contracts & guard posts

### Period picker
Use the sidebar **KPI Period** dropdown to view any past month from `[SYNC] KPI History`.
