import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider, themeBootstrapScript } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'تمكين — منصة المحاكاة المهنية',
  description: 'محاكاة مهنية للخريجين السعوديين — جرّب أول شهر في وظيفتك قبل أن تبدأ',
  icons: { icon: '/mark.png' },
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
        {/* Apply theme before first paint — eliminates light-to-dark flash */}
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
