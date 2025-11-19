import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GTM Tag Management',
  description: 'Manage Google Tag Manager tags across multiple containers',
  icons: {
    icon: 'https://3enrollment.com/favicon.ico',
    shortcut: 'https://3enrollment.com/favicon.ico',
    apple: 'https://3enrollment.com/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

