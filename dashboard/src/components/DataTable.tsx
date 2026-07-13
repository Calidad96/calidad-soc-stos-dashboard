export function DataTable({
  headers,
  rows,
  maxHeight,
}: {
  headers: { label: string; align?: 'left' | 'right' }[];
  rows: React.ReactNode[][];
  maxHeight?: number;
}) {
  return (
    <div
      className="overflow-auto rounded-xl border border-[var(--border)]/70 shadow-sm"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-[1]">
          <tr className="bg-[var(--table-header)] backdrop-blur-sm">
            {headers.map((h) => (
              <th
                key={h.label}
                className={`border-b border-[var(--border)] px-4 py-3.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--muted)] ${
                  h.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-4 py-12 text-center text-[13px] text-[var(--muted)]"
              >
                No records for this period
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border)]/35 transition-colors last:border-0 even:bg-[var(--hover-row)]/40 hover:bg-[var(--hover-row)]"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3 align-middle text-[var(--ink)] ${
                      headers[j]?.align === 'right'
                        ? 'text-right tabular-nums'
                        : 'text-left'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
