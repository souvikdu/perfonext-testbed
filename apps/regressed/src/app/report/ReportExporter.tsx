'use client';

import { useState } from 'react';
// B1 DEFECT: jspdf (~350 KB) is imported statically even though it is only reachable
// behind a click. apps/baseline awaits import('jspdf') inside the handler.
import { jsPDF } from 'jspdf';

type Row = { region: string; count: number; totalKm: number };

export default function ReportExporter({ rows }: { rows: Row[] }) {
  const [busy, setBusy] = useState(false);

  const onExport = () => {
    setBusy(true);
    try {
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
  };

  return (
    <button type="button" data-testid="export-pdf" onClick={onExport} disabled={busy}>
      {busy ? 'Generating…' : 'Export PDF'}
    </button>
  );
}
