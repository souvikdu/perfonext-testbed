'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type RegionDatum = { region: string; count: number; totalKm: number };

export default function RegionChart({ data }: { data: RegionDatum[] }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262b35" />
          <XAxis dataKey="region" stroke="#9aa3b2" fontSize={11} />
          <YAxis stroke="#9aa3b2" fontSize={11} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#6ee7b7" />
          <Bar dataKey="totalKm" fill="#7dd3fc" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
