import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'react-datepicker/dist/react-datepicker.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HoaGiang Manager - Quản lý vật tư',
  description: 'Hệ thống quản lý vật tư và thiết bị',
  manifest: '/manifest.webmanifest',
  themeColor: '#0d6efd',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', rel: 'shortcut icon' },
    ],
    apple: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HoaGiang Manager',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

