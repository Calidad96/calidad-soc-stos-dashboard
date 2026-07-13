export function EmptyState({
  icon,
  title,
  description,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card-surface card-surface-premium flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--muted)] shadow-sm">
        {icon}
      </div>
      <h3 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}
