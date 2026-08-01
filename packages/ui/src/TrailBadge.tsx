import type { ReactNode } from 'react';

export function TrailBadge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
