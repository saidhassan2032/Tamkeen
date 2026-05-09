import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'تمكين — منصة المحاكاة المهنية',
  description: 'محاكاة مهنية للخريجين السعوديين — جرّب أول شهر في وظيفتك قبل أن تبدأ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
