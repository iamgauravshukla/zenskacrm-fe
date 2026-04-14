import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { DomErrorBoundary } from '@/components/DomErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: { default: 'Zenska CRM', template: '%s | Zenska CRM' },
  description: 'Lead Management · Pipeline Tracking · Onboarding Automation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <DomErrorBoundary>
            {children}
          </DomErrorBoundary>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
