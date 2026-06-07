/**
 * Zod schema that the AI model must conform to.
 * generateObject() enforces this structure; the safety pass then verifies
 * hard constraints in code.
 */
import { z } from 'zod';

// ── Per-person modifier ─────────────────────────────────────────────────────
export const PersonModifierSchema = z.object({
  memberId:    z.string(),
  portion:     z.enum(['small', 'regular', 'large', 'extra-large']),
  swaps:       z.array(z.string()).max(3).describe(
    'Ingredient swaps, e.g. "swap white rice for cauliflower rice"'
  ),
  sauceOnSide: z.string().optional().describe(
    'Optional sauce or condiment served on the side for this person'
  ),
  addOns:      z.array(z.string()).max(4).describe(
    'Extras added at plating, e.g. "extra grilled chicken", "cheese on top"'
  ),
  nutrition: z.object({
    calories: z.number().int().positive(),
    proteinG:  z.number().nonnegative(),
    carbsG:    z.number().nonnegative(),
    fatG:      z.number().nonnegative(),
    sodiumMg:  z.number().nonnegative(),
    sugarG:    z.number().nonnegative(),
  }).describe('Estimated nutrition for THIS person (base + their modifiers)'),
});

// ── Base dish ───────────────────────────────────────────────────────────────
export const BaseDishSchema = z.object({
  title:            z.string().min(2).max(80),
  cuisine:          z.string().describe('e.g. South Indian, Mexican, Thai, Mediterranean'),
  description:      z.string().max(200).describe('One or two sentences for the plan card'),
  ingredients: z.array(z.object({
    name:     z.string(),
    qty:      z.string().describe('e.g. "2 cups", "400 g", "1 tbsp"'),
    aisle:    z.enum(['produce', 'dairy', 'proteins', 'pantry', 'spices', 'frozen', 'bakery', 'other']),
    optional: z.boolean().default(false),
  })),
  steps: z.array(z.string()).min(2).max(15).describe('Numbered cooking steps'),
  cookMinutes:      z.number().int().min(5).max(180),
  prepMinutes:      z.number().int().min(0).max(60),
  flexibilityScore: z.number().min(0).max(10).describe(
    '10 = fully modular bowl/taco/plate; 0 = rigid all-in-one casserole'
  ),
  servingNotes:     z.string().optional().describe(
    'Plating guidance, e.g. "serve grain and protein separately so each person can adjust ratio"'
  ),
});

// ── Meal slot ───────────────────────────────────────────────────────────────
export const SlotSchema = z.object({
  baseDish:     BaseDishSchema,
  perPerson:    z.array(PersonModifierSchema),
  allergenFlags: z.array(z.string()).describe(
    'All allergens present in the BASE dish that anyone in the household is allergic to — should be empty'
  ),
  safetyFlags: z.array(z.string()).describe(
    'Non-allergy warnings, e.g. "high spice — reduce chilli for the 6-year-old"'
  ),
});

// ── Day ─────────────────────────────────────────────────────────────────────
export const DaySchema = z.object({
  date:      z.string().describe('ISO 8601 date, e.g. 2026-06-08'),
  dayLabel:  z.string().describe('e.g. "Sunday", "Monday"'),
  slots: z.object({
    breakfast: SlotSchema,
    lunch:     SlotSchema,
    dinner:    SlotSchema,
  }),
});

// ── Full week ────────────────────────────────────────────────────────────────
export const WeekSchema = z.object({
  weekId:      z.string().describe('ISO week identifier, e.g. 2026-W24'),
  generatedAt: z.string().describe('ISO 8601 timestamp'),
  days:        z.array(DaySchema).length(7),
  cuisinesUsed: z.array(z.string()).describe(
    'Distinct cuisines featured this week, for variety tracking'
  ),
});

// TypeScript types
export type Slot         = z.infer<typeof SlotSchema>;
export type Day          = z.infer<typeof DaySchema>;
export type WeekPlan     = z.infer<typeof WeekSchema>;
export type BaseDish     = z.infer<typeof BaseDishSchema>;
export type PersonModifier = z.infer<typeof PersonModifierSchema>;
