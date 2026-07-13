'use client';

import { useEffect, useState } from 'react';

export function TabTransition({
  tabKey,
  children,
}: {
  tabKey: string;
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<'enter' | 'idle'>('enter');

  useEffect(() => {
    setPhase('enter');
    const id = requestAnimationFrame(() => setPhase('idle'));
    return () => cancelAnimationFrame(id);
  }, [tabKey]);

  return (
    <div className={`tab-transition ${phase === 'idle' ? 'tab-transition-in' : ''}`}>
      {children}
    </div>
  );
}
