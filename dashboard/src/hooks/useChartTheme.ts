'use client';

import { useEffect, useState } from 'react';

export interface ChartTheme {
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  axis: string;
  grid: string;
  bar: string;
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function readChartTheme(): ChartTheme {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    tooltipBg: cssVar('--card', light ? '#ffffff' : '#101c38'),
    tooltipBorder: cssVar('--border', light ? '#c8d6ea' : '#1e2c4d'),
    tooltipText: cssVar('--ink', light ? '#1a2d4d' : '#eaf0fb'),
    axis: cssVar('--muted', light ? '#5a6f8f' : '#8294b6'),
    grid: light ? 'rgba(90, 111, 143, 0.18)' : 'rgba(130, 148, 182, 0.12)',
    bar: cssVar('--royal', '#2e75b6'),
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readChartTheme);

  useEffect(() => {
    const update = () => setTheme(readChartTheme());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => obs.disconnect();
  }, []);

  return theme;
}
