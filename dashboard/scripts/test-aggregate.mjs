import 'dotenv/config';
import { aggregateDashboard } from '../src/lib/aggregate.ts';

const data = await aggregateDashboard();
console.log('KPIs:', data.kpis.length);
console.log('Months:', data.months);
console.log('KPI Avg:', data.summary.kpiAvg);
console.log('Categories:', data.categoryScores);
console.log('Departments:', data.departmentScores);
console.log('Sample KPIs:');
data.kpis.slice(0, 5).forEach((k) =>
  console.log(`  ${k.name.slice(0, 50)} | ${k.department} | score ${k.score} | months ${k.monthly.length}`)
);
