/**
 * POST /api/generate
 *
 * Generates a full 21-slot weekly meal plan for the authenticated user.
 * Persists the draft plan to Firestore and returns it.
 *
 * Body: {
 *   weekId: string,          // e.g. "2026-W24"
 *   pantry?: string[],
 *   busyNights?: string[],
 * }
 */
import { NextResponse } from 'next/server';
import { verifyIdToken, adminDb } from '@/lib/firebase/admin';
import { generateWeek } from '@/lib/ai/generateWeek';
import { aggregateGrocery } from '@/lib/grocery';
import type { FamilyMember, UserSettings } from '@/types';

export const maxDuration = 120; // Vercel: allow up to 2 min for LLM call

export async function POST(request: Request) {
  let uid: string;
  try {
    const token = await verifyIdToken(request);
    uid = token.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { weekId: string; pantry?: string[]; busyNights?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.weekId) {
    return NextResponse.json({ error: 'weekId is required' }, { status: 400 });
  }

  // Load family profiles and user settings from Firestore
  const [familySnap, userSnap] = await Promise.all([
    adminDb.collection(`users/${uid}/family`).get(),
    adminDb.doc(`users/${uid}`).get(),
  ]);

  if (familySnap.empty) {
    return NextResponse.json({ error: 'No family profiles found. Complete onboarding first.' }, { status: 400 });
  }

  const family = familySnap.docs.map(d => d.data() as FamilyMember);
  const userData = userSnap.data() ?? {};
  const settings = (userData.settings ?? {}) as Partial<UserSettings>;

  const input = {
    weekId:            body.weekId,
    weekNumber:        0, // set inside generateWeek
    family,
    preferredCuisines: settings.defaultCuisines ?? [],
    pantry:            body.pantry ?? [],
    busyNights:        body.busyNights ?? [],
    budget:            settings.budget ?? 'mid',
    recentDishTitles:  [],
    recentCuisines:    [],
    onboardingText:    (userData.onboardingText as string | undefined) ?? '',
  };

  try {
    const plan = await generateWeek(input, uid);

    // Aggregate grocery list
    const groceryItems = aggregateGrocery(plan);

    // Persist plan as draft
    const planRef = adminDb.doc(`users/${uid}/plans/${body.weekId}`);
    await planRef.set({
      ...plan,
      status:      'draft',
      generatedAt: new Date().toISOString(),
      pantry:      body.pantry ?? [],
    });

    // Persist grocery
    await adminDb.doc(`users/${uid}/plans/${body.weekId}/grocery/list`).set({ items: groceryItems });

    return NextResponse.json({ plan, grocery: groceryItems });
  } catch (err) {
    console.error('[/api/generate]', err);
    return NextResponse.json(
      { error: 'Plan generation failed. Please try again.' },
      { status: 500 },
    );
  }
}
