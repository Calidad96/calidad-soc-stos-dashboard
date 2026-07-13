import fs from 'fs';
import path from 'path';
import { HUB_BOARD_NAMES } from '../config/boards.js';
import {
  createBoard,
  createColumn,
  getWorkspaceBoards,
} from '../lib/monday.js';

const WORKSPACE_ID = process.env.MONDAY_HUB_WORKSPACE_ID;
const REGISTRY_PATH = 'data/hub-registry.json';

const HUB_DESCRIPTION =
  '⚠️ SYSTEM BOARD — Auto-synced by SOC+STOS Command Center. Do not edit manually.';

/** @type {Record<string, { columns: { title: string, type: string, defaults?: object }[] }>} */
const BOARD_SCHEMAS = {
  actionItems: {
    columns: [
      { title: 'Source Item ID', type: 'text' },
      { title: 'Source Board ID', type: 'text' },
      { title: 'Department', type: 'text' },
      { title: 'Accountable', type: 'text' },
      { title: 'Priority', type: 'text' },
      { title: 'Status', type: 'text' },
      { title: 'Due Date', type: 'date' },
      { title: 'Next Action Date', type: 'date' },
      { title: 'Due Bucket', type: 'text' },
      { title: 'Client', type: 'text' },
      { title: 'Task Description', type: 'long_text' },
      { title: 'Snapshot At', type: 'date' },
    ],
  },
  capa: {
    columns: [
      { title: 'Source Item ID', type: 'text' },
      { title: 'Criticality', type: 'text' },
      { title: 'Status', type: 'text' },
      { title: 'Departments', type: 'text' },
      { title: 'Requester', type: 'text' },
      { title: 'Issue Description', type: 'long_text' },
      { title: 'Date Requested', type: 'date' },
      { title: 'Snapshot At', type: 'date' },
    ],
  },
  kpiHistory: {
    columns: [
      { title: 'KPI Key', type: 'text' },
      { title: 'KPI Name', type: 'text' },
      { title: 'Department', type: 'text' },
      { title: 'Category', type: 'text' },
      { title: 'Month', type: 'text' },
      { title: 'Actual Value', type: 'numbers' },
      { title: 'Target', type: 'numbers' },
      { title: 'KPI Score', type: 'numbers' },
      { title: 'Year', type: 'text' },
      { title: 'Exceed Level', type: 'text' },
      { title: 'Source Item ID', type: 'text' },
      { title: 'Synced At', type: 'date' },
    ],
  },
  rgContracts: {
    columns: [
      { title: 'Source Item ID', type: 'text' },
      { title: 'Status', type: 'text' },
      { title: 'Project ID', type: 'text' },
      { title: 'Standard SLA', type: 'text' },
      { title: 'MSU', type: 'text' },
      { title: 'Contract Start', type: 'date' },
      { title: 'Contract End', type: 'date' },
      { title: 'Monthly Bill', type: 'numbers' },
      { title: 'Setup Fee', type: 'numbers' },
      { title: 'Snapshot At', type: 'date' },
    ],
  },
  rgAreaScope: {
    columns: [
      { title: 'Source Item ID', type: 'text' },
      { title: 'Status', type: 'text' },
      { title: 'Service Type', type: 'text' },
      { title: 'Volume of Alarms', type: 'text' },
      { title: 'CCTV', type: 'text' },
      { title: 'VMS Platform', type: 'text' },
      { title: 'AI Platform', type: 'text' },
      { title: 'Virtual Patrols', type: 'text' },
      { title: 'Snapshot At', type: 'date' },
    ],
  },
  psContracts: {
    columns: [
      { title: 'Source Item ID', type: 'text' },
      { title: 'Status', type: 'text' },
      { title: 'Lead', type: 'text' },
      { title: 'Start Date', type: 'date' },
      { title: 'End Date', type: 'date' },
      { title: 'Renewal Date', type: 'date' },
      { title: 'Project ID', type: 'text' },
      { title: 'Snapshot At', type: 'date' },
    ],
  },
  psGuardPosts: {
    columns: [
      { title: 'Source Item ID', type: 'text' },
      { title: 'Post Type', type: 'text' },
      { title: 'Armed Status', type: 'text' },
      { title: 'Status', type: 'text' },
      { title: 'Hours Per Shift', type: 'numbers' },
      { title: 'Shifts Per Week', type: 'numbers' },
      { title: 'Pay Rate', type: 'numbers' },
      { title: 'Bill Rate', type: 'numbers' },
      { title: 'Snapshot At', type: 'date' },
    ],
  },
  syncLog: {
    columns: [
      { title: 'Run ID', type: 'text' },
      { title: 'Started', type: 'date' },
      { title: 'Finished', type: 'date' },
      { title: 'Status', type: 'text' },
      { title: 'Boards Pulled', type: 'long_text' },
      { title: 'Items Written', type: 'numbers' },
      { title: 'Errors', type: 'long_text' },
    ],
  },
};

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) return { boards: {}, columnIds: {} };
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function saveRegistry(registry) {
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

async function setup() {
  if (!WORKSPACE_ID) throw new Error('MONDAY_HUB_WORKSPACE_ID missing');

  const registry = loadRegistry();
  const existing = await getWorkspaceBoards(WORKSPACE_ID);
  const existingByName = Object.fromEntries(existing.map((b) => [b.name, b]));

  for (const [key, boardName] of Object.entries(HUB_BOARD_NAMES)) {
    let board = existingByName[boardName] ?? registry.boards[key];

    if (!board?.id) {
      console.log(`Creating board: ${boardName}`);
      const created = await createBoard(boardName, WORKSPACE_ID, HUB_DESCRIPTION);
      board = { id: created.id, name: created.name };
      await new Promise((r) => setTimeout(r, 1500));
    } else {
      console.log(`Board exists: ${boardName} (${board.id})`);
    }

    registry.boards[key] = { id: board.id, name: board.name };
    registry.columnIds[key] = registry.columnIds[key] ?? {};

    const schema = BOARD_SCHEMAS[key];
    if (!schema) continue;

    for (const col of schema.columns) {
      if (registry.columnIds[key][col.title]) continue;
      console.log(`  + column: ${col.title}`);
      const created = await createColumn(board.id, col.title, col.type, col.defaults ?? {});
      registry.columnIds[key][col.title] = created.id;
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  saveRegistry(registry);
  console.log(`\nHub setup complete. Registry saved to ${REGISTRY_PATH}`);
  console.log(JSON.stringify(registry.boards, null, 2));
}

setup().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
