import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title:       'FamilyPlate — One pot. Everyone\'s plate.',
  description: 'A weekly family meal planner that cooks one dish but satisfies everyone\'s goals.',
  manifest:    '/manifest.json',
  themeColor:  '#c2674a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="warm-kitchen" className={inter.variable}>
      <body>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: 'var(--color-surface-raised)',
                  color:      'var(--color-on-surface)',
                  border:     '1px solid var(--color-border)',
                  borderRadius: '0.75rem',
                },
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
