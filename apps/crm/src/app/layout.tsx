import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { PwaRegister } from '@/components/PwaRegister';

const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: 'BuildCRM',
  description: 'CRM с воронкой продаж',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'BuildCRM' },
};

export const viewport: Viewport = {
  themeColor: '#137fec',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body className={manrope.className}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
