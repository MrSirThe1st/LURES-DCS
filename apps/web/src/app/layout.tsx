import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'LURES-DCS',
  description: 'Truck Loading & Dispatch Control System',
};

/**
 * Foundation shell only.
 * Product languages: Mandarin, English, French (DRC-only deployment).
 * TODO: wire i18n and set document language from the active locale.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
