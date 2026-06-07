/**
 * GET /api/cron/weekly
 *
 * Called by Vercel Cron every Friday at 13:00 UTC (≈ Friday morning US).
 * Generates next week's draft plan for every active user.
 *
 * Protected by the CRON_SECRET header (Vercel injects this automatically
 * when CRON_SECRET env var is set — see vercel.json and docs).
 *
 * For large user bases, replace the inline loop with a queue (e.g. Vercel
 * Queue, QStash, or Cloud Tasks) so this function stays within its time limit.
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { generateWeek } from '@/lib/ai/generateWeek';
import { aggregateGrocery } from '@/lib/grocery';
import { nextWeekId } from '@/lib/ai/prompts';
import type { FamilyMember, UserSettings } from '@/types';

export const maxDuration = 300; // Vercel Pro: up to 5 min

export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = request.headers.get('authorization');
  const expected   = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || cronSecret !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const weekId = nextWeekId();
  console.log(`[cron/weekly] Generating week ${weekId} for all active users`);

  // Acquire a global lock in Firestore to prevent double-firing on retries
  const lockRef = adminDb.doc(`__cron__/weekly_${weekId}`);
  const lockSnap = await lockRef.get();
  if (lockSnap.exists && lockSnap.data()?.locked) {
    console.log('[cron/weekly] Already locked — skipping duplicate run');
    return NextResponse.json({ status: 'already_ran' });
  }
  await lockRef.set({ locked: true, startedAt: new Date().toISOString() });

  // Fetch all active users (limit 100 per run; scale with pagination / queue)
  const usersSnap = await adminDb.collection('users').limit(100).get();

  let success = 0;
  let failed  = 0;
  const errors: string[] = [];

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;

    try {
      // Skip if this week already generated
      const existingPlan = await adminDb.doc(`users/${uid}/plans/${weekId}`).get();
      if (existingPlan.exists) {
        console.log(`[cron/weekly] User ${uid}: plan already exists, skipping`);
        continue;
      }

      const [familySnap, userDataSnap] = await Promise.all([
        adminDb.collection(`users/${uid}/family`).get(),
        adminDb.doc(`users/${uid}`).get(),
      ]);

      if (familySnap.empty) continue; // not yet onboarded

      const family   = familySnap.docs.map(d => d.data() as FamilyMember);
      const settings = (userDataSnap.data()?.settings ?? {}) as Partial<UserSettings>;

      const input = {
        weekId,
        weekNumber: 0,
        family,
        preferredCuisines: settings.defaultCuisines ?? [],
        pantry:            [],
        busyNights:        [],
        budget:            settings.budget ?? 'mid',
        recentDishTitles:  [],
        recentCuisines:    [],
      };

      const plan = await generateWeek(input, uid);
      const groceryItems = aggregateGrocery(plan);

      await adminDb.doc(`users/${uid}/plans/${weekId}`).set({
        ...plan,
        status:      'draft',
        generatedAt: new Date().toISOString(),
        pantry:      [],
      });

      await adminDb.doc(`users/${uid}/plans/${weekId}/grocery/list`).set({ items: groceryItems });

      // TODO: send push notification / email here
      // await sendPlanReadyNotification(uid, weekId);

      success++;
    } catch (err) {
      failed++;
      const msg = `User ${uid}: ${(err as Error).message}`;
      errors.push(msg);
      console.error(`[cron/weekly] ${msg}`);
    }
  }

  // Release lock
  await lockRef.update({ locked: false, completedAt: new Date().toISOString() });

  return NextResponse.json({
    weekId,
    total: usersSnap.size,
    success,
    failed,
    errors: errors.slice(0, 10), // don't return too many
  });
}
