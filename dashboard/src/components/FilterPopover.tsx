'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

export type PopoverAlign = 'start' | 'end';

const GAP = 6;
const VIEWPORT_MARGIN = 12;

export function useFilterPopover(align: PopoverAlign = 'start') {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = panel?.offsetWidth ?? 272;
    let left = align === 'end' ? rect.right - panelWidth : rect.left;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, window.innerWidth - panelWidth - VIEWPORT_MARGIN)
    );

    setCoords({ top: rect.bottom + GAP, left });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return { open, setOpen, coords, triggerRef, panelRef, updatePosition };
}

/** Position-only hook when open state is controlled by the parent. */
export function usePopoverPosition(align: PopoverAlign, open: boolean) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = panel?.offsetWidth ?? 272;
    let left = align === 'end' ? rect.right - panelWidth : rect.left;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, window.innerWidth - panelWidth - VIEWPORT_MARGIN)
    );

    setCoords({ top: rect.bottom + GAP, left });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return { triggerRef, panelRef, coords };
}

export function usePopoverDismiss(
  open: boolean,
  onClose: () => void,
  refs: RefObject<HTMLElement | null>[]
) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (refs.some((r) => r.current?.contains(target))) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, refs]);
}

export function FilterPopover({
  open,
  coords,
  panelRef,
  width = 272,
  children,
  className = '',
}: {
  open: boolean;
  coords: { top: number; left: number };
  panelRef: RefObject<HTMLDivElement | null>;
  width?: number;
  children: ReactNode;
  className?: string;
}) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className={`filter-popover ${className}`}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}
