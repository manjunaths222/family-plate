'use client';
/**
 * useWeekPlan — fetches and manages the week plan for a given weekId.
 *
 * Subscribes to the Firestore document in real-time so the UI updates
 * immediately when the cron job generates a new plan or a swap completes.
 */
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { WeekPlan } from '@/lib/ai/schema';
import type { GroceryItem, PlanStatus } from '@/types';

interface WeekPlanData extends WeekPlan {
  status:      PlanStatus;
  generatedAt: string;
  lockedAt?:   string;
  pantry:      string[];
}

interface UseWeekPlanResult {
  plan:      WeekPlanData | null;
  grocery:   GroceryItem[];
  loading:   boolean;
  error:     string | null;
}

export function useWeekPlan(weekId: string | null): UseWeekPlanResult {
  const { user } = useAuth();
  const [plan,    setPlan]    = useState<WeekPlanData | null>(null);
  const [grocery, setGrocery] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user || !weekId) { setLoading(false); return; }

    setLoading(true);

    // Subscribe to the plan document
    const planRef = doc(db, `users/${user.uid}/plans/${weekId}`);
    const unsub = onSnapshot(
      planRef,
      (snap) => {
        if (snap.exists()) {
          setPlan(snap.data() as WeekPlanData);
        } else {
          setPlan(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    // Subscribe to the grocery sub-document
    const grocRef = doc(db, `users/${user.uid}/plans/${weekId}/grocery/list`);
    const grocUnsub = onSnapshot(grocRef, (snap) => {
      setGrocery(snap.exists() ? (snap.data()?.items ?? []) : []);
    });

    return () => { unsub(); grocUnsub(); };
  }, [user, weekId]);

  return { plan, grocery, loading, error };
}
