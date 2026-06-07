'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, RefreshCw, ShoppingCart } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { useWeekPlan } from '@/hooks/useWeekPlan';
import { DayCard } from '@/components/plan/DayCard';
import { nextWeekId, currentWeekId, formatWeekDisplay } from '@/lib/ai/prompts';
import toast from 'react-hot-toast';

export default function PlanPage() {
  const router = useRouter();
  const { user, idToken }   = useAuth();
  const { family, loading: familyLoading } = useFamily();

  const today     = new Date();
  const dayOfWeek = today.getDay();
  const showWeekId = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0)
    ? nextWeekId() : currentWeekId();

  const [weekId, setWeekId]           = useState(showWeekId);
  const { plan, loading: planLoading } = useWeekPlan(weekId);

  const [generating, setGenerating] = useState(false);
  const [swapping,   setSwapping]   = useState<string | null>(null);
  const [locking,    setLocking]    = useState(false);

  useEffect(() => {
    if (!familyLoading && family.length === 0) router.push('/onboarding');
  }, [family, familyLoading, router]);

  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);
    try {
      const token = await idToken();
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weekId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Week generated!');
    } catch (err) {
      toast.error('Generation failed. Please try again.');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSwap(dayLabel: string, meal: string, dislikedTitle: string) {
    if (!user) return;
    const key = `${dayLabel}_${meal}`;
    setSwapping(key);
    try {
      const token = await idToken();
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weekId, dayLabel, meal, dislikedTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${meal} on ${dayLabel} replaced!`);
    } catch (err) {
      toast.error('Swap failed. Try again.');
      console.error(err);
    } finally {
      setSwapping(null);
    }
  }

  async function handleLock() {
    if (!user || !plan) return;
    setLocking(true);
    try {
      await updateDoc(doc(db, `users/${user.uid}/plans/${weekId}`), {
        status: 'locked',
        lockedAt: new Date().toISOString(),
      });
      toast.success('Plan locked! Grocery list is ready.');
      router.push('/grocery');
    } catch (err) {
      toast.error('Could not lock plan.');
      console.error(err);
    } finally {
      setLocking(false);
    }
  }

  const isLoading = familyLoading || planLoading;
  const isLocked  = plan?.status === 'locked';
  const weekLabel = formatWeekDisplay(weekId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-card bg-surface-raised animate-pulse" />
        ))}
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="text-6xl"
        >🍳</motion.div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-on-surface mb-1">Cooking up your week…</h2>
          <p className="text-on-surface-muted text-sm">
            Building 21 meals tailored to everyone's goals.<br />
            This usually takes 20–40 seconds.
          </p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
              className="h-2 w-2 rounded-full bg-brand"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="text-5xl">📋</div>
        <h2 className="text-xl font-semibold text-on-surface">{weekLabel}</h2>
        <p className="text-on-surface-muted text-sm max-w-xs">
          The plan auto-generates every Friday. Or tap below to generate now.
        </p>
        <button
          onClick={handleGenerate}
          className="mt-2 flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-white font-semibold"
        >
          <RefreshCw size={16} /> Generate this week
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface">{weekLabel}</h1>
          <p className="text-sm text-on-surface-muted">
            {isLocked ? '🔒 Plan locked' : '✏️ Review & lock before Saturday'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              title="Regenerate week"
              className="p-2 rounded-xl border border-border text-on-surface-muted hover:text-brand hover:border-brand/40 transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          )}
          {!isLocked && (
            <button
              onClick={handleLock}
              disabled={locking}
              className="flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-white text-sm font-semibold"
            >
              <Lock size={14} />
              {locking ? 'Locking…' : 'Lock & Shop'}
            </button>
          )}
          {isLocked && (
            <button
              onClick={() => router.push('/grocery')}
              className="flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-white text-sm font-semibold"
            >
              <ShoppingCart size={14} /> Grocery List
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {plan.days.map((day, i) => (
          <DayCard
            key={day.date}
            day={day}
            family={family}
            locked={isLocked}
            onSwap={swapping ? undefined : handleSwap}
            index={i}
          />
        ))}
      </AnimatePresence>

      {swapping && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-surface-raised rounded-2xl p-6 text-center shadow-card">
            <div className="text-3xl mb-2 animate-spin">🔄</div>
            <p className="font-medium text-on-surface">Finding a replacement…</p>
          </div>
        </div>
      )}
    </div>
  );
}
