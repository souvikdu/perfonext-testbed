import type { ReactNode } from 'react';
import Link from 'next/link';

import ReactScanInstrument from './ReactScanInstrument';
import './globals.css';

export const metadata = {
  title: 'Trailhead — regressed',
  description: 'Deliberately degraded variant of the perfonext testbed app.',
};

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/trails', label: 'Trails' },
  { href: '/stats', label: 'Stats' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/report', label: 'Report' },
  { href: '/legacy/admin', label: 'Admin' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactScanInstrument />
        <header className="site-header">
          <strong>Trailhead</strong>
          <nav>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
