import { InfoTip } from './InfoTip';

type Accent = 'gold' | 'royal' | 'red' | 'green' | 'amber' | 'none';

const accentBar: Record<Accent, string> = {
  gold: 'bg-[var(--gold)]',
  royal: 'bg-[var(--royal)]',
  red: 'bg-[var(--red)]',
  green: 'bg-[var(--green)]',
  amber: 'bg-[var(--amber)]',
  none: 'bg-transparent',
};

const accentVar: Record<Accent, string> = {
  gold: 'var(--gold)',
  royal: 'var(--royal)',
  red: 'var(--red)',
  green: 'var(--green)',
  amber: 'var(--amber)',
  none: 'transparent',
};

export function Panel({
  title,
  subtitle,
  accent = 'gold',
  tip,
  children,
  className = '',
  padding = 'p-5',
}: {
  title: string;
  subtitle?: string;
  accent?: Accent;
  tip?: string;
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section
      className={`card-surface card-surface-premium panel-accent-top relative overflow-hidden ${padding} ${className}`}
      style={{ '--panel-accent': accentVar[accent] } as React.CSSProperties}
    >
      <header className="relative mb-5 border-b border-[var(--border)]/50 pb-4">
        <h3 className="font-display flex items-center gap-2.5 text-[14px] font-bold tracking-tight text-[var(--ink)]">
          {accent !== 'none' && (
            <span
              className={`inline-block h-4 w-1 shrink-0 rounded-full ${accentBar[accent]}`}
            />
          )}
          {title}
          {tip && <InfoTip text={tip} />}
        </h3>
        {subtitle && (
          <p className="mt-1.5 pl-3.5 text-[12px] leading-relaxed text-[var(--muted)]">
            {subtitle}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export function PanelGrid({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${className}`}>{children}</div>
  );
}
