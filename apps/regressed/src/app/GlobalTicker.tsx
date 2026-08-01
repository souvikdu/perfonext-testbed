'use client';

// B2 + B5 DEFECT: every page imports this, so recharts and lodash land in a chunk
// that most routes download — including routes that never render a chart.
// apps/baseline has no equivalent.
//
// It is imported per-page rather than mounted in the root layout on purpose:
// Next records root-layout client chunks under the synthetic "/layout" key in
// app-build-manifest.json, so a layout-mounted component looks like it belongs to
// exactly one route and never reads as shared.
import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import sortBy from 'lodash/sortBy';
import take from 'lodash/take';
import { Activity } from 'react-feather';

const SEED = [4, 9, 6, 12, 8, 14, 11, 17, 13, 19, 15, 22];

export default function GlobalTicker() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const data = take(
    sortBy(
      SEED.map((v, i) => ({ i, v: v + (tick % 3) })),
      'i',
    ),
    12,
  );

  return (
    <div className="global-ticker" style={{ width: 120, height: 28 }}>
      <Activity size={14} />
      <ResponsiveContainer>
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke="#6ee7b7" dot={false} strokeWidth={1} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
