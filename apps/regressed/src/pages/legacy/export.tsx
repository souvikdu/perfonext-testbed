import { useState } from 'react';
import type { GetStaticProps } from 'next';
import { generateTrailPage } from '@testbed/data';
// B1 DEFECT (Pages Router side): static jspdf import on a legacy route too, so the
// package lands in more than one chunk and find_duplicates has something to rank.
import { jsPDF } from 'jspdf';

type Row = { slug: string; region: string; lengthKm: number };
type Props = { rows: Row[] };

export const getStaticProps: GetStaticProps<Props> = async () => ({
  props: {
    rows: generateTrailPage(60).map((t) => ({
      slug: t.slug,
      region: t.region,
      lengthKm: t.lengthKm,
    })),
  },
});

export default function LegacyExport({ rows }: Props) {
  const [status, setStatus] = useState('idle');

  const onExport = async () => {
    setStatus('working');
    const doc = new jsPDF();
    doc.text('Legacy export', 14, 18);
    rows.slice(0, 30).forEach((row, i) => {
      doc.setFontSize(9);
      doc.text(`${row.slug} — ${row.region} — ${row.lengthKm} km`, 14, 28 + i * 6);
    });
    doc.save('legacy-export.pdf');
    setStatus('done');
  };

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Legacy export</h1>
      <button type="button" onClick={onExport}>Export ({status})</button>
      <ul>
        {rows.slice(0, 20).map((r) => (
          <li key={r.slug}>{r.slug} — {r.region}</li>
        ))}
      </ul>
    </main>
  );
}
