'use client';

import { useCallback, useState } from 'react';

type Row = { region: string; count: number; totalKm: number };

export default function ReportExporter({ rows }: { rows: Row[] }) {
  const [busy, setBusy] = useState(false);

  // B1 fixture (correct side): jspdf is ~350 KB and is only reachable behind a
  // click, so it is loaded on demand rather than shipped with the route.
  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Trailhead region report', 14, 18);
      rows.forEach((row, i) => {
        doc.setFontSize(10);
        doc.text(`${row.region}: ${row.count} trails, ${row.totalKm} km`, 14, 30 + i * 7);
      });
      doc.save('trailhead-report.pdf');
    } finally {
      setBusy(false);
    }
  }, [rows]);

  return (
    <button type="button" data-testid="export-pdf" onClick={onExport} disabled={busy}>
      {busy ? 'Generating…' : 'Export PDF'}
    </button>
  );
}
