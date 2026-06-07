'use client';
/**
 * Authenticated app shell layout.
 * Redirects to landing if not signed in.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppNav } from '@/components/ui/AppNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <AppNav />
      <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 md:pb-8 md:pt-6 max-w-4xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
