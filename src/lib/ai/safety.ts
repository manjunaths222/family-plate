/**
 * Hard constraint safety pass.
 *
 * The model is instructed to respect constraints, but we NEVER rely solely
 * on the model for allergy safety. This module runs after generateObject()
 * and verifies / flags violations in code.
 */
import type { WeekPlan, Slot } from './schema';
import type { FamilyMember } from '@/types';

// Expanded allergen synonym map
const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  peanut:    ['peanut', 'groundnut', 'arachis'],
  treenut:   ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut', 'nut'],
  milk:      ['milk', 'dairy', 'cream', 'butter', 'cheese', 'yogurt', 'ghee', 'lactose', 'whey', 'casein'],
  egg:       ['egg', 'mayonnaise', 'mayo', 'meringue'],
  wheat:     ['wheat', 'flour', 'gluten', 'bread', 'pasta', 'noodle', 'seitan', 'soy sauce', 'roti', 'naan'],
  soy:       ['soy', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari'],
  fish:      ['fish', 'cod', 'salmon', 'tuna', 'tilapia', 'anchovy', 'sardine', 'herring', 'haddock'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'oyster', 'mussel', 'scallop', 'shellfish'],
  sesame:    ['sesame', 'tahini'],
  mustard:   ['mustard'],
  sulphite:  ['sulphite', 'sulfite', 'wine', 'dried fruit'],
};

function expandAllergen(allergen: string): string[] {
  const lower = allergen.toLowerCase();
  for (const [key, synonyms] of Object.entries(ALLERGEN_SYNONYMS)) {
    if (lower.includes(key) || synonyms.some(s => lower.includes(s))) {
      return synonyms;
    }
  }
  return [lower];
}

function ingredientContainsAllergen(ingredientName: string, allergenTerms: string[]): boolean {
  const lower = ingredientName.toLowerCase();
  return allergenTerms.some(term => lower.includes(term));
}

// All term lists declared before any function that references them
const MEAT_TERMS      = ['chicken', 'beef', 'pork', 'lamb', 'mutton', 'goat', 'turkey', 'duck', 'veal', 'meat', 'bacon', 'ham', 'sausage', 'pepperoni', 'lard', 'gelatin'];
const PORK_TERMS      = ['pork', 'bacon', 'ham', 'lard', 'pig', 'prosciutto', 'pepperoni', 'salami'];
const FISH_TERMS      = ['fish', 'shrimp', 'prawn', 'crab', 'lobster', 'clam', 'oyster', 'mussel', 'scallop', 'anchovy', 'tuna', 'salmon', 'cod'];
const SHELLFISH_TERMS = ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'oyster', 'mussel', 'scallop', 'shellfish'];
const ANIMAL_TERMS    = [...MEAT_TERMS, ...FISH_TERMS, 'egg', 'milk', 'dairy', 'cheese', 'butter', 'cream', 'yogurt', 'ghee', 'honey'];

function checkDietViolation(diet: string | null, ingredientName: string): string | null {
  if (!diet) return null;
  const lower = ingredientName.toLowerCase();
  switch (diet) {
    case 'vegan':
      if (ANIMAL_TERMS.some(t => lower.includes(t))) return `vegan violation: ${ingredientName}`;
      break;
    case 'veg':
      if ([...MEAT_TERMS, ...FISH_TERMS].some(t => lower.includes(t))) return `vegetarian violation: ${ingredientName}`;
      break;
    case 'halal':
      if (PORK_TERMS.some(t => lower.includes(t))) return `halal violation (pork): ${ingredientName}`;
      if (['wine', 'beer', 'alcohol', 'spirits', 'brandy', 'rum'].some(t => lower.includes(t))) return `halal violation (alcohol): ${ingredientName}`;
      break;
    case 'kosher':
      if (PORK_TERMS.some(t => lower.includes(t))) return `kosher violation (pork): ${ingredientName}`;
      if (SHELLFISH_TERMS.some(t => lower.includes(t))) return `kosher violation (shellfish): ${ingredientName}`;
      break;
    case 'jain':
      if ([...MEAT_TERMS, ...FISH_TERMS, 'egg', 'onion', 'garlic', 'potato', 'carrot', 'beet', 'radish'].some(t => lower.includes(t))) {
        return `jain violation: ${ingredientName}`;
      }
      break;
  }
  return null;
}

export interface SafetyResult {
  plan: WeekPlan;
  violations: string[];
}

export function enforceHardConstraints(plan: WeekPlan, family: FamilyMember[]): SafetyResult {
  const violations: string[] = [];

  for (const day of plan.days) {
    for (const [mealKey, slot] of Object.entries(day.slots) as [string, Slot][]) {
      const slotLabel      = `${day.dayLabel} ${mealKey}`;
      const ingredientNames = slot.baseDish.ingredients.map(i => i.name);

      for (const member of family) {
        // 1. Allergy check
        for (const allergen of (member.hardConstraints.allergies ?? [])) {
          const terms = expandAllergen(allergen);
          for (const ing of ingredientNames) {
            if (ingredientContainsAllergen(ing, terms)) {
              const msg = `ALLERGY VIOLATION — ${slotLabel} | ${member.name} is allergic to ${allergen} but ingredient "${ing}" found`;
              violations.push(msg);
              if (!slot.allergenFlags.includes(allergen)) slot.allergenFlags.push(allergen);
            }
          }
        }

        // 2. Diet check
        if (member.hardConstraints.diet) {
          for (const ing of ingredientNames) {
            const violation = checkDietViolation(member.hardConstraints.diet, ing);
            if (violation) violations.push(`DIET VIOLATION — ${slotLabel} | ${member.name}: ${violation}`);
          }
        }
      }

      // 3. Soft spice warnings for kids
      const kids = family.filter(m => m.archetype === 'kid' || m.ageBand === 'child');
      if (kids.length > 0) {
        const spicy = ['chilli', 'chili', 'cayenne', 'jalapeño', 'serrano', 'habanero'];
        for (const ing of ingredientNames) {
          if (spicy.some(s => ing.toLowerCase().includes(s))) {
            const flag = `High spice ingredient "${ing}" — reduce or omit for ${kids.map(k => k.name).join(', ')}`;
            if (!slot.safetyFlags.includes(flag)) slot.safetyFlags.push(flag);
          }
        }
      }
    }
  }

  return { plan, violations };
}

export function findDuplicateDishes(plan: WeekPlan): string[] {
  const seen = new Map<string, number>();
  for (const day of plan.days) {
    for (const slot of Object.values(day.slots)) {
      const title = slot.baseDish.title.toLowerCase();
      seen.set(title, (seen.get(title) ?? 0) + 1);
    }
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([title]) => title);
}
