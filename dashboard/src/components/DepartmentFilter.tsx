'use client';

import { ChevronDown, Check } from 'lucide-react';
import type { DashboardView } from '@/lib/dashboard-views';
import {
  DEPARTMENT_OPTIONS,
  getAvailableDepartments,
  isAllDepartmentsSelected,
  type DepartmentFilterId,
} from '@/lib/department-filter';
import {
  FilterPopover,
  useFilterPopover,
  usePopoverDismiss,
} from './FilterPopover';

function FilterCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`filter-checkbox ${checked ? 'filter-checkbox-checked' : ''}`}
      aria-hidden
    >
      {checked && <Check size={11} strokeWidth={3} />}
    </span>
  );
}

export function DepartmentFilter({
  view,
  selected,
  onChange,
  embedded = false,
}: {
  view: DashboardView;
  selected: DepartmentFilterId[];
  onChange: (next: DepartmentFilterId[]) => void;
  embedded?: boolean;
}) {
  const available = getAvailableDepartments(view);
  const { open, setOpen, coords, triggerRef, panelRef } =
    useFilterPopover('start');

  usePopoverDismiss(open, () => setOpen(false), [triggerRef, panelRef]);

  if (available.length <= 1) return null;

  const allSelected = isAllDepartmentsSelected(available, selected);
  const active = !allSelected;

  const triggerLabel = active
    ? selected.map((id) => DEPARTMENT_OPTIONS[id].shortLabel).join(' · ')
    : 'All';

  const toggle = (id: DepartmentFilterId) => {
    if (allSelected) {
      onChange([id]);
      return;
    }

    const has = selected.includes(id);
    if (has) {
      const next = selected.filter((s) => s !== id);
      onChange(next.length ? next : []);
      return;
    }

    const next = [...selected, id];
    onChange(isAllDepartmentsSelected(available, next) ? [] : next);
  };

  const selectAll = () => {
    onChange([]);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Department filter: ${triggerLabel}`}
        className={
          embedded
            ? `header-toolbar-field ${active ? 'header-toolbar-field-active' : ''} ${open ? 'header-toolbar-field-open' : ''}`
            : `department-filter-trigger flex h-10 items-center gap-1.5 rounded-xl border px-2.5 transition ${
                active
                  ? 'border-[var(--royal)]/40 bg-[var(--hover-nav-active)] text-[var(--ink)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--border-light)]'
              }`
        }
      >
        <span className="header-toolbar-field-label">Department</span>
        <span className="header-toolbar-field-value max-w-[8rem] truncate sm:max-w-[10rem]">
          {triggerLabel}
        </span>
        <ChevronDown
          size={13}
          className={`header-toolbar-chevron shrink-0 ${open ? 'is-open' : ''}`}
        />
      </button>

      <FilterPopover open={open} coords={coords} panelRef={panelRef} width={280}>
        <div className="filter-popover-header">
          <span className="filter-popover-title">Department</span>
          <span className="filter-popover-subtitle">Select one or more</span>
        </div>

        <div role="listbox" aria-label="Filter by department" aria-multiselectable="true">
          <button
            type="button"
            role="option"
            aria-selected={allSelected}
            onClick={selectAll}
            className={`filter-popover-item ${allSelected ? 'is-selected' : ''}`}
          >
            <FilterCheckbox checked={allSelected} />
            <span className="filter-popover-item-text">All departments</span>
          </button>

          <div className="filter-popover-divider" />

          {available.map((id) => {
            const opt = DEPARTMENT_OPTIONS[id];
            const on = !allSelected && selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(id)}
                className={`filter-popover-item ${on ? 'is-selected' : ''}`}
              >
                <FilterCheckbox checked={on} />
                <span className="filter-popover-item-body">
                  <span className="filter-popover-item-text">{opt.shortLabel}</span>
                  <span className="filter-popover-item-meta">{opt.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </FilterPopover>
    </>
  );
}
