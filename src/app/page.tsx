'use client';
/**
 * Landing page — shown to unauthenticated visitors.
 * Authenticated users are redirected to /plan.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/plan');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
      {/* Logo / hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-lg"
      >
        <div className="mb-6 text-6xl">🍲</div>
        <h1 className="text-4xl font-bold text-on-surface leading-tight mb-3">
          One pot on the stove.
          <br />
          <span className="text-brand">Everyone's plate matches their goal.</span>
        </h1>
        <p className="text-on-surface-muted text-lg mt-4 mb-8 leading-relaxed">
          FamilyPlate generates your full week of meals — one base dish per
          night that flexes for every diet, age, and goal in your household.
          Grocery list ready for the weekend shop.
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-10 text-sm text-on-surface-muted">
          {[
            ['🎯', 'One dish,\nmany goals'],
            ['🛒', 'Auto grocery\nlist'],
            ['🔄', 'New menus\nevery week'],
          ].map(([emoji, label]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{emoji}</span>
              <span className="whitespace-pre-line leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={signIn}
          className="inline-flex items-center gap-3 rounded-2xl bg-brand px-8 py-4 text-white font-semibold text-lg shadow-card hover:shadow-card-hover transition-shadow"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </motion.button>

        <p className="mt-4 text-xs text-on-surface-muted">
          Free to use · No credit card · Your data stays yours
        </p>
      </motion.div>
    </main>
  );
}
