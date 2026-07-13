import fs from 'fs';
import path from 'path';
import { SOURCE_BOARDS } from '../config/boards.js';
import { getBoardStructure, getBoardItems } from '../lib/monday.js';

const outDir = 'data/inspection';

async function inspect() {
  fs.mkdirSync(outDir, { recursive: true });
  const report = { inspectedAt: new Date().toISOString(), boards: {} };

  for (const [key, board] of Object.entries(SOURCE_BOARDS)) {
    console.log(`Inspecting: ${board.name} (${board.id})...`);
    const structure = await getBoardStructure(board.id);
    const sample = await getBoardItems(board.id, 5);

    report.boards[key] = {
      ...board,
      structure: structure
        ? {
            id: structure.id,
            name: structure.name,
            workspace_id: structure.workspace_id,
            columns: structure.columns?.map((c) => ({
              id: c.id,
              title: c.title,
              type: c.type,
            })),
            groups: structure.groups?.map((g) => ({
              id: g.id,
              title: g.title,
            })),
          }
        : null,
      sampleItemCount: sample?.items_page?.items?.length ?? 0,
      sampleItems: sample?.items_page?.items?.map((item) => ({
        id: item.id,
        name: item.name,
        group: item.group?.title,
        columns: item.column_values?.map((cv) => ({
          title: cv.column?.title ?? cv.id,
          type: cv.type,
          text: cv.text,
        })),
      })),
    };
  }

  const outFile = path.join(outDir, 'source-boards.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\nSaved inspection report to ${outFile}`);

  for (const [key, b] of Object.entries(report.boards)) {
    console.log(`\n--- ${b.name} ---`);
    console.log(`Columns (${b.structure?.columns?.length ?? 0}):`);
    for (const col of b.structure?.columns ?? []) {
      console.log(`  • ${col.title} (${col.type})`);
    }
    console.log(`Sample items: ${b.sampleItemCount}`);
  }
}

inspect().catch((err) => {
  console.error('Inspection failed:', err.message);
  process.exit(1);
});
