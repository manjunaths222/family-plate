/**
 * Core week-generation logic.
 *
 * Variety guarantee:
 *   - Passes the last 4 weeks of dish titles to the prompt ("do not repeat").
 *   - Uses week number as a rotation seed so cuisines shift each week.
 *   - After generation, validates for intra-week duplicates and retries once.
 *   - Hard-constraint safety pass runs in code (not trusted to the model).
 */
import { generateObject } from 'ai';
import { getModel }       from './provider';
import { WeekSchema }     from './schema';
import {
  WEEKLY_SYSTEM_PROMPT,
  buildWeeklyPrompt,
  weekNumberFromId,
} from './prompts';
import { enforceHardConstraints, findDuplicateDishes } from './safety';
import { adminDb } from '@/lib/firebase/admin';
import type { GenerationInput } from '@/types';

const MAX_RETRIES = 2;

// ── Fetch recent dish history from Firestore ─────────────────────────────
async function fetchRecentDishTitles(uid: string, currentWeekId: string): Promise<{
  titles: string[];
  cuisines: string[];
}> {
  // Fetch the last 4 weeks of plans (excluding the current one being generated)
  const snapshot = await adminDb
    .collection(`users/${uid}/plans`)
    .orderBy('generatedAt', 'desc')
    .limit(4)
    .get();

  const titles: string[] = [];
  const cuisines: string[] = [];

  for (const doc of snapshot.docs) {
    if (doc.id === currentWeekId) continue;
    const data = doc.data();
    if (data.days) {
      for (const day of data.days) {
        for (const slot of Object.values(day.slots ?? {})) {
          const s = slot as any;
          if (s?.baseDish?.title) titles.push(s.baseDish.title);
        }
      }
    }
    if (data.cuisinesUsed) cuisines.push(...data.cuisinesUsed);
  }

  return { titles: [...new Set(titles)], cuisines: [...new Set(cuisines)] };
}

// ── Main entry point ─────────────────────────────────────────────────────
export async function generateWeek(input: GenerationInput, uid: string) {
  // Build variety context from history
  const { titles: recentDishTitles, cuisines: recentCuisines } =
    await fetchRecentDishTitles(uid, input.weekId);

  const enrichedInput: GenerationInput = {
    ...input,
    weekNumber: weekNumberFromId(input.weekId),
    recentDishTitles,
    recentCuisines,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = buildWeeklyPrompt(enrichedInput);

      const { object } = await generateObject({
        model:  getModel(),
        schema: WeekSchema,
        system: WEEKLY_SYSTEM_PROMPT,
        prompt,
        // Higher temperature on retries to get different dishes
        temperature: attempt === 1 ? 0.85 : 0.95,
      });

      // ── Intra-week duplicate check ───────────────────────────────────
      const duplicates = findDuplicateDishes(object);
      if (duplicates.length > 0 && attempt < MAX_RETRIES) {
        console.warn(`[generateWeek] Duplicate dishes found (attempt ${attempt}): ${duplicates.join(', ')}. Retrying…`);
        // Add the duplicates to the recent history so the retry avoids them
        enrichedInput.recentDishTitles = [...recentDishTitles, ...duplicates];
        continue;
      }

      // ── Hard-constraint safety pass ──────────────────────────────────
      const { plan, violations } = enforceHardConstraints(object, input.family);

      if (violations.length > 0) {
        console.error(`[generateWeek] Safety violations (attempt ${attempt}):`, violations);
        if (attempt < MAX_RETRIES) {
          // Add violation context and retry
          enrichedInput.recentDishTitles = [...enrichedInput.recentDishTitles, ...violations];
          continue;
        }
        // On final attempt, still return the plan but flag it so the UI can warn
        (plan as any).__safetyViolations = violations;
      }

      return plan;

    } catch (err) {
      lastError = err as Error;
      console.error(`[generateWeek] Attempt ${attempt} failed:`, err);
      if (attempt < MAX_RETRIES) continue;
    }
  }

  throw lastError ?? new Error('Week generation failed after retries');
}

// ── Single-slot regeneration (for swap) ─────────────────────────────────
export async function regenerateSlot(
  uid: string,
  weekId: string,
  dayLabel: string,
  meal: 'breakfast' | 'lunch' | 'dinner',
  family: GenerationInput['family'],
  preferredCuisines: string[],
  dislikedTitle?: string,
) {
  const { titles: recentTitles, cuisines: recentCuisines } =
    await fetchRecentDishTitles(uid, weekId);

  // Also pull the current week's plan to avoid duplicating any slot in the same week
  const planDoc = await adminDb.doc(`users/${uid}/plans/${weekId}`).get();
  const currentPlanTitles: string[] = [];
  if (planDoc.exists) {
    const data = planDoc.data()!;
    for (const day of data.days ?? []) {
      for (const slot of Object.values(day.slots ?? {})) {
        const s = slot as any;
        if (s?.baseDish?.title) currentPlanTitles.push(s.baseDish.title);
      }
    }
  }

  const avoidTitles = [...new Set([
    ...recentTitles,
    ...currentPlanTitles,
    ...(dislikedTitle ? [dislikedTitle] : []),
  ])];

  const { object } = await generateObject({
    model:  getModel(),
    schema: WeekSchema,
    system: WEEKLY_SYSTEM_PROMPT,
    prompt: `
Regenerate ONLY the ${meal} slot for ${dayLabel} of week ${weekId}.
Return a full WeekSchema but only make this one slot meaningful;
keep all other slot baseDish.title as "__unchanged__" so the caller can filter.

DO NOT use any of these dish titles: ${avoidTitles.join(', ')}

Family members: ${JSON.stringify(family, null, 2)}
Preferred cuisines: ${preferredCuisines.join(', ')}
    `.trim(),
    temperature: 0.9,
  });

  // Extract just the regenerated slot
  const targetDay = object.days.find(d => d.dayLabel === dayLabel);
  return targetDay?.slots?.[meal] ?? null;
}
