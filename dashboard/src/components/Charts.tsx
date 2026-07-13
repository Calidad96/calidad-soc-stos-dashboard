'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORY_COLORS } from '@/lib/metrics';
import { useChartTheme } from '@/hooks/useChartTheme';

export function CategoryBarChart({
  data,
  horizontal = false,
}: {
  data: { category: string; score: number }[];
  horizontal?: boolean;
}) {
  const chart = useChartTheme();

  if (!data.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-[var(--muted)]">
        No KPI data for this period
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 8, left: horizontal ? 80 : 0, bottom: 0 }}
        >
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          {horizontal ? (
            <>
              <XAxis type="number" domain={[0, 5]} tick={{ fill: chart.axis, fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fill: chart.axis, fontSize: 11 }}
                width={75}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="category"
                tick={{ fill: chart.axis, fontSize: 10 }}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis domain={[0, 5]} tick={{ fill: chart.axis, fontSize: 11 }} />
            </>
          )}
          <Tooltip
            cursor={false}
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: chart.tooltipText,
            }}
            labelStyle={{ color: chart.tooltipText, fontWeight: 600 }}
            itemStyle={{ color: chart.tooltipText }}
            formatter={(v) => [Number(v).toFixed(1), 'Score']}
          />
          <Bar
            dataKey="score"
            radius={[4, 4, 4, 4]}
            maxBarSize={horizontal ? 20 : 40}
            activeBar={false}
          >
            {data.map((d) => (
              <Cell key={d.category} fill={CATEGORY_COLORS[d.category] ?? chart.bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeptBarChart({ data }: { data: { department: string; score: number }[] }) {
  const chart = useChartTheme();

  if (!data.length) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-[var(--muted)]">
        No department scores
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 5]} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="department"
            tick={{ fill: chart.axis, fontSize: 10 }}
            width={120}
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: chart.tooltipText,
            }}
            labelStyle={{ color: chart.tooltipText, fontWeight: 600 }}
            itemStyle={{ color: chart.tooltipText }}
            formatter={(v) => [Number(v).toFixed(1), 'Avg']}
          />
          <Bar
            dataKey="score"
            fill={chart.bar}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            activeBar={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type TrendRow = {
  label: string;
  teamAvg?: number | null;
  socAvg?: number | null;
  stosAvg?: number | null;
  onTarget?: number;
};

export function TeamTrendChart({
  data,
  lines = ['teamAvg'],
}: {
  data: TrendRow[];
  lines?: ('teamAvg' | 'socAvg' | 'stosAvg')[];
}) {
  const chart = useChartTheme();
  const hasData = data.some((d) =>
    lines.some((key) => d[key] != null)
  );

  if (!hasData) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-[var(--muted)]">
        Not enough monthly history yet — trends appear as more months are recorded.
      </div>
    );
  }

  const stroke: Record<string, string> = {
    teamAvg: 'var(--gold)',
    socAvg: 'var(--royal-light)',
    stosAvg: 'var(--green)',
  };
  const names: Record<string, string> = {
    teamAvg: 'Team avg',
    socAvg: 'SOC',
    stosAvg: 'STOS',
  };

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: chart.axis, fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis domain={[0, 5]} tick={{ fill: chart.axis, fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: chart.tooltipText,
            }}
            formatter={(v, name) => [
              v != null ? Number(v).toFixed(1) : '—',
              names[String(name)] ?? String(name),
            ]}
          />
          {lines.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: chart.axis }}
              formatter={(v) => names[v] ?? v}
            />
          )}
          {lines.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={stroke[key]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: stroke[key] }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OnTargetTrendChart({ data }: { data: TrendRow[] }) {
  const chart = useChartTheme();
  const hasData = data.some((d) => (d.onTarget ?? 0) > 0);

  if (!hasData) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-[var(--muted)]">
        On-target counts will appear as monthly KPI data builds up.
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: chart.axis, fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis allowDecimals={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              borderRadius: 8,
              fontSize: 12,
              color: chart.tooltipText,
            }}
            formatter={(v) => [v, 'KPIs on target']}
          />
          <Line
            type="monotone"
            dataKey="onTarget"
            stroke="var(--green)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--green)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
