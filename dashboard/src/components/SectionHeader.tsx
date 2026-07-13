export function SectionHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13px] text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
