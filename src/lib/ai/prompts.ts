/**
 * Prompt builders for the meal-plan AI layer.
 *
 * Kept here so system prompts stay separate from business logic
 * and can be iterated without touching generateWeek.ts.
 */
import type { FamilyMember, GenerationInput } from '@/types';

// ── System prompt ────────────────────────────────────────────────────────────
export const WEEKLY_SYSTEM_PROMPT = `
You are FamilyPlate, an expert family meal planner.

## Your core job
Generate a full week of 21 meals (breakfast, lunch, dinner × 7 days) for a household.
Each meal is ONE base dish + lightweight per-person modifiers — never multiple separate dishes.

## The Two Rules
1. COOK TO THE STRICTEST BASELINE, THEN ADD.
   Build the base dish to satisfy the tightest hard constraint in the household
   (e.g. lowest-sodium if a senior is present, low-GI if someone is diabetic, vegan if required).
   Add extras PER PERSON at plating — never try to make a heavy dish healthy by stripping.

2. PREFER FLEXIBLE DISH STRUCTURES (high flexibilityScore).
   Bowls, tacos, grain plates, stir-fries, curries with sides, rice dishes with
   separate proteins — these naturally accommodate per-person variation.
   Avoid rigid all-in-one casseroles or pre-mixed dishes unless you have no better option.

## Variety — this is critical
- NEVER repeat a dish title across the 21 slots of a single week.
- NEVER use a dish that appeared in the RECENT HISTORY list provided in the user prompt.
- Spread cuisines evenly across the week; do not cluster similar cuisines on consecutive days.
- Vary meal types within each cuisine (e.g. if South Indian appears three times: idli for breakfast, sambar rice for lunch, dosa for dinner).
- Vary proteins across the week: don't serve chicken every night.

## Safety
- Hard allergies and dietary restrictions (vegan, halal, kosher, jain) in the base dish are NEVER negotiable.
  If an allergen appears in allergenFlags for any person, that dish is invalid — redesign it.
- For children under 8: no whole nuts, no hard raw vegetables larger than a coin, spice level 0-1 only.
- For seniors with texture needs: all proteins should be tender/slow-cooked; avoid crunchy toppings in the base.

## Nutrition
Estimate nutrition per person honestly (base portion + their modifiers).
Round to nearest 5 kcal / 1 g / 5 mg.

## Output
Return strictly valid JSON matching the schema. No markdown, no prose outside JSON.
`.trim();

// ── Archetype constraint descriptions ────────────────────────────────────────
const ARCHETYPE_CONSTRAINTS: Record<string, string> = {
  weight_loss:  'Calorie-controlled (target 400-500 kcal/meal). Smaller carb portions, lean protein, high-fibre veg. No added sugar.',
  heart_health: 'Sodium ≤ 600 mg/meal. Soft textures. No hard/raw crunchy items. Healthy fats only. No fried foods in base.',
  kid:          'Mild spice (level 0-1). No whole nuts or hard raw veg. Familiar flavours. Nutrient-dense. Small portions.',
  senior:       'Soft textures throughout. Sodium ≤ 500 mg/meal. Easy to chew. No spice > level 1.',
  diabetic:     'Low-GI carbs only (brown rice, lentils, sweet potato, quinoa). No refined sugar. Portion-controlled carbs.',
  active:       'High protein (35+ g/meal), extra carbs allowed. Larger portions. Can handle any spice level.',
  none:         'No restrictions. Prioritise variety and flavour.',
};

// ── Cuisine rotation helper ────────────────────────────────────────────────
/**
 * Given the household's preferred cuisines and recent history,
 * returns an ordered rotation for the week that avoids clustering.
 *
 * Strategy: round-robin through cuisines using the week number as an offset
 * so each week starts from a different point in the rotation.
 */
export function buildCuisineRotation(
  preferredCuisines: string[],
  weekNumber: number,
  recentCuisines: string[] = [],
): string[] {
  const pool = preferredCuisines.length > 0
    ? preferredCuisines
    : ['Mediterranean', 'South Indian', 'Mexican', 'Thai', 'Japanese', 'Middle Eastern', 'Italian'];

  // De-prioritise cuisines heavily used recently (last 2 weeks)
  const recentSet = new Set(recentCuisines.slice(0, 6));
  const sorted = [
    ...pool.filter(c => !recentSet.has(c)),
    ...pool.filter(c => recentSet.has(c)),
  ];

  // Rotate starting point by week number for natural variety
  const offset = weekNumber % sorted.length;
  const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)];

  // Build a 21-element list (3 slots/day × 7 days) with spread
  // breakfast slots typically lighter (same cuisine is fine)
  const result: string[] = [];
  for (let i = 0; i < 21; i++) {
    result.push(rotated[i % rotated.length]);
  }
  return result;
}

// ── Main prompt builder ────────────────────────────────────────────────────
export function buildWeeklyPrompt(input: GenerationInput): string {
  const {
    family,
    preferredCuisines,
    pantry,
    busyNights,
    budget,
    weekId,
    weekNumber,
    recentDishTitles,
    recentCuisines,
    onboardingText,
  } = input;

  const cuisineRotation = buildCuisineRotation(
    preferredCuisines,
    weekNumber,
    recentCuisines,
  );

  const familyBlock = family.map((m: FamilyMember) => {
    const constraints = ARCHETYPE_CONSTRAINTS[m.archetype] ?? ARCHETYPE_CONSTRAINTS.none;
    const hardList = [
      ...(m.hardConstraints.allergies ?? []).map(a => `ALLERGY: ${a}`),
      m.hardConstraints.diet ? `DIET: ${m.hardConstraints.diet}` : null,
    ].filter(Boolean).join(', ') || 'none';

    return `
  ${m.name} (id: ${m.memberId})
    Archetype : ${m.archetype}
    Constraints: ${constraints}
    Hard stops : ${hardList}
    Dislikes   : ${(m.softPrefs.dislikes ?? []).join(', ') || 'none'}
    Spice level: ${m.softPrefs.spice ?? 1}/3
    Texture    : ${m.softPrefs.texture ?? 'any'}
    Goal       : ${m.goal || 'general health'}
`.trim();
  }).join('\n\n');

  const pantryBlock = pantry.length > 0
    ? `Already in the pantry/fridge (use these first): ${pantry.join(', ')}`
    : 'No pantry items specified.';

  const busyBlock = busyNights.length > 0
    ? `Busy nights (meals must be ≤ 30 min total): ${busyNights.join(', ')}`
    : 'No busy nights specified.';

  const budgetNote = budget === 'low'
    ? 'Budget: LOW — prefer cheap staples (lentils, eggs, seasonal veg, grains). Share ingredients across multiple meals.'
    : budget === 'high'
    ? 'Budget: HIGH — premium ingredients welcome.'
    : 'Budget: MEDIUM — balance quality and cost.';

  const historyBlock = recentDishTitles.length > 0
    ? `\nRECENT DISH HISTORY (DO NOT REPEAT ANY OF THESE):\n${recentDishTitles.map(t => `  - ${t}`).join('\n')}`
    : '\nNo dish history — this may be the first generation.';

  const weekStart = weekIdToStartDate(weekId);
  const onboardingBlock = onboardingText
    ? `\n\n## Original household description (use for nuance and context)\n"${onboardingText}"`
    : '';

  return `
Generate the weekly meal plan for week ${weekId} (starting ${weekStart}).

WEEK ID    : ${weekId}
WEEK NUMBER: ${weekNumber} (use as variety seed — different dishes from other weeks)

## Household (${family.length} member${family.length > 1 ? 's' : ''})
${familyBlock}

## Cuisine rotation for this week
Use this as a soft guide (21 slots: breakfast/lunch/dinner × 7 days):
${cuisineRotation.join(', ')}
Spread cuisines so similar ones aren't back-to-back.

## Pantry
${pantryBlock}

## Schedule
${busyBlock}

## Budget
${budgetNote}
${historyBlock}
${onboardingBlock}

## Output
Return a single JSON object matching the WeekSchema exactly.
Start the week on ${weekStart} (Sunday). Include all 7 days.
  `.trim();
}

// ── Onboarding prompt ──────────────────────────────────────────────────────
export const ONBOARD_SYSTEM_PROMPT = `
You are a warm onboarding assistant for FamilyPlate, a family meal planner.

Your job: extract structured family member profiles from the user's free-text description.

For each person mentioned:
- Infer the best-fit archetype: weight_loss | heart_health | kid | senior | diabetic | active | none
- Extract any hard constraints (allergies, dietary restrictions)
- Extract soft preferences (cuisine likes, dislikes, spice level)
- Note their goal if mentioned

Ask at most 2 clarifying questions if something critical is ambiguous (e.g. a severe allergy mentioned vaguely).

Return JSON matching this shape:
{
  "members": [
    {
      "name": "string",
      "archetype": "weight_loss|heart_health|kid|senior|diabetic|active|none",
      "hardConstraints": { "allergies": [], "diet": null },
      "softPrefs": { "cuisines": [], "dislikes": [], "spice": 1, "texture": "any" },
      "goal": "string",
      "ageBand": "child|teen|adult|senior"
    }
  ],
  "suggestedCuisines": ["South Indian", "Thai"],
  "clarifyingQuestions": []
}

If the input is clear enough, clarifyingQuestions should be an empty array.
`.trim();

// ── Utilities ──────────────────────────────────────────────────────────────
export function weekIdToStartDate(weekId: string): string {
  // weekId: "2026-W24" → ISO date of that Monday (we shift to Sunday for display)
  const [yearStr, wStr] = weekId.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Mon=1 .. Sun=7
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7);
  // Shift back one day to Sunday
  weekStart.setDate(weekStart.getDate() - 1);
  return weekStart.toISOString().slice(0, 10);
}

export function currentWeekId(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now.getTime() - jan1.getTime()) / 86_400_000);
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function nextWeekId(): string {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now.getTime() - jan1.getTime()) / 86_400_000);
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function weekNumberFromId(weekId: string): number {
  return parseInt(weekId.split('-W')[1], 10);
}

/**
 * Formats a weekId as a human-readable date range.
 * e.g. "2026-W24" → "Jun 14 – Jun 20, 2026"
 */
export function formatWeekDisplay(weekId: string): string {
  const startStr  = weekIdToStartDate(weekId);
  const start     = new Date(startStr + 'T00:00:00');
  const end       = new Date(start);
  end.setDate(start.getDate() + 6);
  const mo: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const full: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', mo)} – ${end.toLocaleDateString('en-US', full)}`;
}
