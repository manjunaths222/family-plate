/**
 * POST /api/swap
 *
 * Regenerates a single meal slot. Updates the plan in Firestore and
 * returns the new slot + grocery list delta.
 *
 * Body: {
 *   weekId: string,
 *   dayLabel: string,           // e.g. "Monday"
 *   meal: "breakfast"|"lunch"|"dinner",
 *   dislikedTitle?: string,     // title of the dish being replaced
 * }
 */
import { NextResponse } from 'next/server';
import { verifyIdToken, adminDb } from '@/lib/firebase/admin';
import { regenerateSlot } from '@/lib/ai/generateWeek';
import { aggregateGrocery } from '@/lib/grocery';
import type { FamilyMember, UserSettings } from '@/types';
import type { Slot } from '@/lib/ai/schema';

export const maxDuration = 60;

export async function POST(request: Request) {
  let uid: string;
  try {
    const token = await verifyIdToken(request);
    uid = token.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    weekId: string;
    dayLabel: string;
    meal: 'breakfast' | 'lunch' | 'dinner';
    dislikedTitle?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { weekId, dayLabel, meal, dislikedTitle } = body;
  if (!weekId || !dayLabel || !meal) {
    return NextResponse.json({ error: 'weekId, dayLabel, and meal are required' }, { status: 400 });
  }

  const [familySnap, userSnap] = await Promise.all([
    adminDb.collection(`users/${uid}/family`).get(),
    adminDb.doc(`users/${uid}`).get(),
  ]);

  const family = familySnap.docs.map(d => d.data() as FamilyMember);
  const settings = (userSnap.data()?.settings ?? {}) as Partial<UserSettings>;

  try {
    const newSlot = await regenerateSlot(
      uid, weekId, dayLabel, meal, family,
      settings.defaultCuisines ?? [], dislikedTitle,
    );

    if (!newSlot) {
      return NextResponse.json({ error: 'Could not regenerate slot' }, { status: 500 });
    }

    // Patch the plan document
    const planRef  = adminDb.doc(`users/${uid}/plans/${weekId}`);
    const planSnap = await planRef.get();
    if (!planSnap.exists) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const planData = planSnap.data()!;
    const days = planData.days.map((day: any) => {
      if (day.dayLabel !== dayLabel) return day;
      return {
        ...day,
        slots: { ...day.slots, [meal]: newSlot },
      };
    });

    await planRef.update({ days });

    // Recompute grocery
    const updatedPlan = { ...planData, days };
    const groceryItems = aggregateGrocery(updatedPlan as any);
    await adminDb.doc(`users/${uid}/plans/${weekId}/grocery/list`).set({ items: groceryItems });

    return NextResponse.json({ slot: newSlot, grocery: groceryItems });
  } catch (err) {
    console.error('[/api/swap]', err);
    return NextResponse.json({ error: 'Swap failed. Please try again.' }, { status: 500 });
  }
}
