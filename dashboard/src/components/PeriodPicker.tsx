'use client';

import { useState } from 'react';
import {
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  activePresetId,
  availableYears,
  formatMonth,
  hasMonthData,
  inlinePresets,
  monthKey,
} from '@/lib/period-format';
import {
  FilterPopover,
  useFilterPopover,
  usePopoverDismiss,
  usePopoverPosition,
} from './FilterPopover';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function MonthYearPicker({
  months,
  value,
  fieldLabel,
  open,
  coords,
  panelRef,
  onSelect,
}: {
  months: string[];
  value: string;
  fieldLabel: string;
  open: boolean;
  coords: { top: number; left: number };
  panelRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (m: string) => void;
}) {
  const years = availableYears(months);
  const initialYear = value.split('-')[0] || years.at(-1) || '';
  const [year, setYear] = useState(initialYear);

  const yearIdx = years.indexOf(year);
  const canPrev = yearIdx > 0;
  const canNext = yearIdx >= 0 && yearIdx < years.length - 1;

  return (
    <FilterPopover open={open} coords={coords} panelRef={panelRef} width={280}>
      <div className="filter-popover-header">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-light)] bg-[var(--bg-elevated)] text-[var(--royal)]">
          <Calendar size={15} />
        </span>
        <div className="min-w-0">
          <span className="filter-popover-title">{fieldLabel}</span>
          <span className="filter-popover-subtitle">{formatMonth(value)}</span>
        </div>
      </div>

      <div className="filter-popover-year-nav">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && setYear(years[yearIdx - 1])}
          className="filter-popover-nav-btn"
          aria-label="Previous year"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span className="filter-popover-year">{year}</span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && setYear(years[yearIdx + 1])}
          className="filter-popover-nav-btn"
          aria-label="Next year"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="filter-popover-month-grid" role="grid">
        {MONTH_LABELS.map((label, i) => {
          const ym = monthKey(year, i);
          const has = hasMonthData(months, ym);
          const active = ym === value;
          return (
            <button
              key={label}
              type="button"
              role="gridcell"
              disabled={!has}
              onClick={() => onSelect(ym)}
              className={`filter-popover-month ${active ? 'is-active' : ''} ${
                !has ? 'is-disabled' : ''
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </FilterPopover>
  );
}

function MonthField({
  label,
  value,
  open,
  onToggle,
  align,
  months,
  onSelect,
  embedded = false,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  align?: 'start' | 'end';
  months: string[];
  onSelect: (m: string) => void;
  embedded?: boolean;
}) {
  const { triggerRef, panelRef, coords } = usePopoverPosition(align ?? 'start', open);

  usePopoverDismiss(open, onToggle, [triggerRef, panelRef]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${label}: ${formatMonth(value)}`}
        className={`period-picker-field group flex items-center gap-2 px-2.5 transition ${
          embedded
            ? `header-toolbar-field h-9 ${open ? 'header-toolbar-field-open' : ''}`
            : `h-9 rounded-lg ${
                open
                  ? 'bg-[var(--hover-nav-active)] text-[var(--ink)]'
                  : 'hover:bg-[var(--hover-row)]'
              }`
        }`}
      >
        <span
          className={
            embedded
              ? 'header-toolbar-field-label'
              : 'shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]'
          }
        >
          {label}
        </span>
        <span
          className={
            embedded
              ? 'header-toolbar-field-value whitespace-nowrap'
              : 'whitespace-nowrap text-[13px] font-semibold leading-none text-[var(--ink)]'
          }
        >
          {formatMonth(value)}
        </span>
        <ChevronDown
          size={13}
          className={
            embedded
              ? `header-toolbar-chevron shrink-0 ${open ? 'is-open' : ''}`
              : `shrink-0 text-[var(--muted)] transition ${
                  open ? 'rotate-180 text-[var(--ink)]' : 'group-hover:text-[var(--ink)]'
                }`
          }
        />
      </button>

      <MonthYearPicker
        months={months}
        value={value}
        fieldLabel={label}
        open={open}
        coords={coords}
        panelRef={panelRef}
        onSelect={onSelect}
      />
    </>
  );
}

export function PeriodPicker({
  months,
  from,
  to,
  onChange,
  embedded = false,
}: {
  months: string[];
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  embedded?: boolean;
}) {
  const [openField, setOpenField] = useState<'from' | 'to' | null>(null);

  const presets = inlinePresets(months);
  const activePreset = activePresetId(presets, from, to);

  const applyRange = (f: string, t: string) => {
    const start = f <= t ? f : t;
    const end = f <= t ? t : f;
    onChange(start, end);
    setOpenField(null);
  };

  if (!months.length) return null;

  return (
    <div
      className={
        embedded
          ? 'period-picker-embedded flex flex-wrap items-center gap-0.5'
          : 'period-picker-inline flex h-10 items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-1.5'
      }
    >
      {!embedded && (
        <Calendar size={15} className="ml-1 shrink-0 text-[var(--muted)]" />
      )}

      {embedded && (
        <span className="header-toolbar-field-label mr-0.5 hidden pl-2 sm:inline">
          Period
        </span>
      )}

      <div
        className={
          embedded
            ? 'period-picker-presets-embedded hidden sm:flex'
            : 'period-picker-presets hidden items-center gap-0.5 sm:flex'
        }
      >
        {presets.map((p) => {
          const on = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={p.label}
              aria-label={p.label}
              onClick={() => applyRange(p.from, p.to)}
              className={
                embedded
                  ? `period-preset-embedded ${on ? 'is-active' : ''}`
                  : `rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide transition ${
                      on
                        ? 'bg-[var(--royal)] text-white'
                        : 'text-[var(--muted)] hover:bg-[var(--hover-row)] hover:text-[var(--ink)]'
                    }`
              }
            >
              {p.short}
            </button>
          );
        })}
      </div>

      <span
        className={
          embedded
            ? 'header-toolbar-divider mx-0.5 hidden sm:block'
            : 'mx-1 hidden h-5 w-px shrink-0 bg-[var(--border)] sm:block'
        }
        aria-hidden
      />

      <MonthField
        label="From"
        value={from}
        open={openField === 'from'}
        onToggle={() => setOpenField(openField === 'from' ? null : 'from')}
        align="start"
        months={months}
        onSelect={(m) => applyRange(m, m > to ? m : to)}
        embedded={embedded}
      />

      <ArrowRight
        size={12}
        strokeWidth={2.5}
        className="mx-0.5 shrink-0 text-[color-mix(in_srgb,var(--ink)_35%,var(--muted))]"
      />

      <MonthField
        label="To"
        value={to}
        open={openField === 'to'}
        onToggle={() => setOpenField(openField === 'to' ? null : 'to')}
        align="end"
        months={months}
        onSelect={(m) => applyRange(m < from ? m : from, m)}
        embedded={embedded}
      />
    </div>
  );
}
