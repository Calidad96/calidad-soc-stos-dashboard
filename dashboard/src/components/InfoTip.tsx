'use client';

import { Info } from 'lucide-react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type InfoTipPlacement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-end';

const GAP = 10;
const TOOLTIP_WIDTH = 288;

export function InfoTip({
  text,
  placement = 'top',
}: {
  text: string;
  placement?: InfoTipPlacement;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowLeft: 144 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const margin = 12;
    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - TOOLTIP_WIDTH / 2;
    let top = rect.top - GAP;

    if (placement === 'top-end' || placement === 'bottom-end') {
      left = rect.right - TOOLTIP_WIDTH;
    } else if (placement === 'top-start') {
      left = rect.left;
    }

    if (placement.startsWith('bottom')) {
      top = rect.bottom + GAP;
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - margin));

    const arrowLeft = Math.max(
      18,
      Math.min(triggerCenter - left, TOOLTIP_WIDTH - 18)
    );

    setCoords({ top, left, arrowLeft });
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const opensBelow = placement.startsWith('bottom');

  const tooltip =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <span
        role="tooltip"
        className="info-tip-popover"
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: TOOLTIP_WIDTH,
          transform: opensBelow ? 'none' : 'translateY(-100%)',
          zIndex: 9999,
        }}
      >
        <span
          className="info-tip-arrow"
          style={{
            left: coords.arrowLeft,
            ...(opensBelow
              ? { top: -5, transform: 'translateX(-50%) rotate(180deg)' }
              : { bottom: -5, transform: 'translateX(-50%)' }),
          }}
        />
        {text}
      </span>,
      document.body
    );

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--hover-tip)] hover:text-[var(--royal)]"
        onMouseEnter={() => {
          updatePosition();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          updatePosition();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        aria-label="More information"
      >
        <Info size={11} strokeWidth={2.5} />
      </button>
      {tooltip}
    </span>
  );
}
