/**
 * POST /api/onboard
 *
 * Accepts a free-text description of the household and returns structured
 * family member profiles extracted by the LLM.
 *
 * Body: { text: string }
 * Response: { members: FamilyMember[], suggestedCuisines: string[], clarifyingQuestions: string[] }
 */
import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '@/lib/ai/provider';
import { ONBOARD_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { verifyIdToken } from '@/lib/firebase/admin';

const OnboardOutputSchema = z.object({
  members: z.array(z.object({
    name:           z.string(),
    archetype:      z.enum(['weight_loss', 'heart_health', 'kid', 'senior', 'diabetic', 'active', 'none']),
    hardConstraints: z.object({
      allergies: z.array(z.string()),
      diet:      z.enum(['veg', 'vegan', 'halal', 'kosher', 'jain']).nullable(),
    }),
    softPrefs: z.object({
      cuisines: z.array(z.string()),
      dislikes: z.array(z.string()),
      spice:    z.number().int().min(0).max(3),
      texture:  z.enum(['any', 'soft']),
    }),
    goal:    z.string(),
    ageBand: z.enum(['child', 'teen', 'adult', 'senior']),
  })),
  suggestedCuisines:    z.array(z.string()),
  clarifyingQuestions:  z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    await verifyIdToken(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  try {
    const { object } = await generateObject({
      model:  getModel(),
      schema: OnboardOutputSchema,
      system: ONBOARD_SYSTEM_PROMPT,
      prompt: body.text,
    });

    // Assign deterministic memberIds
    const members = object.members.map((m, i) => ({
      ...m,
      memberId: `member_${Date.now()}_${i}`,
      hardConstraints: {
        allergies: m.hardConstraints.allergies,
        diet:      m.hardConstraints.diet ?? null,
      },
    }));

    return NextResponse.json({ members, suggestedCuisines: object.suggestedCuisines, clarifyingQuestions: object.clarifyingQuestions });
  } catch (err) {
    console.error('[/api/onboard]', err);
    return NextResponse.json({ error: 'Onboarding extraction failed. Please try again.' }, { status: 500 });
  }
}
