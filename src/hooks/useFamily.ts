'use client';
/**
 * useFamily — fetches and manages family member profiles.
 * Subscribes to the family sub-collection in real-time.
 */
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { FamilyMember } from '@/types';

export function useFamily() {
  const { user } = useAuth();
  const [family,  setFamily]  = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const ref = collection(db, `users/${user.uid}/family`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setFamily(snap.docs.map(d => d.data() as FamilyMember));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [user]);

  return { family, loading, error };
}
