import { InfoTip } from './InfoTip';
import { ScoreGauge, scoreGaugeColor } from './ScoreGauge';
import { Sparkline } from './Sparkline';

type Accent = 'royal' | 'gold' | 'green' | 'red' | 'amber';

const accents: Record<Accent, string> = {
  royal: 'kpi-accent-royal kpi-glow-royal',
  gold: 'kpi-accent-gold kpi-glow-gold',
  green: 'kpi-accent-green kpi-glow-green',
  red: 'kpi-accent-red kpi-glow-red',
  amber: 'kpi-accent-amber kpi-glow-amber',
};

export function KpiCard({
  label,
  value,
  meta,
  accent = 'royal',
  tip,
  tipPlacement,
  sparkline,
  gauge,
}: {
  label: string;
  value: string | number;
  meta?: string;
  accent?: Accent;
  tip?: string;
  tipPlacement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-end';
  sparkline?: number[];
  gauge?: number | null;
}) {
  const showGauge = gauge !== undefined;
  const hasSparkline = sparkline && sparkline.filter((v) => Number.isFinite(v)).length >= 2;
  const gaugeColor = showGauge ? scoreGaugeColor(gauge ?? null) : undefined;
  const gaugeDisplay =
    gauge != null && Number.isFinite(gauge) ? gauge.toFixed(1) : '—';

  return (
    <div
      className={`card-surface card-surface-premium group relative p-5 before:absolute before:bottom-0 before:left-0 before:top-0 before:z-[1] before:w-[3px] before:content-[''] after:absolute after:-right-8 after:-top-8 after:z-0 after:h-28 after:w-28 after:rounded-full after:bg-[var(--kpi-glow)] after:opacity-80 after:blur-2xl after:content-[''] after:transition-opacity after:duration-300 group-hover:after:opacity-100 ${accents[accent]}`}
    >
      <div className="relative z-[2]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
            {label}
            {tip && <InfoTip text={tip} placement={tipPlacement} />}
          </div>
          {hasSparkline && (
            <Sparkline data={sparkline} accent={accent} />
          )}
        </div>

        {showGauge ? (
          <div className="mt-3 flex items-center gap-3">
            <ScoreGauge value={gauge ?? null} size={76} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1">
                <span
                  className="font-display text-[34px] font-extrabold leading-none tracking-tight tabular-nums"
                  style={{ color: gaugeColor }}
                >
                  {gaugeDisplay}
                </span>
                <span className="pb-0.5 text-[14px] font-semibold text-[var(--muted)]">
                  / 5
                </span>
              </div>
              {meta && (
                <div className="mt-1.5 text-[12px] font-medium leading-snug text-[var(--muted)]">
                  {meta}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="font-display mt-3 text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-[var(--ink)]">
              {value}
            </div>
            {meta && (
              <div className="mt-2 text-[12px] font-medium leading-snug text-[var(--muted)]">
                {meta}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
