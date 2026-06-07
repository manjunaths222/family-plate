/**
 * Grocery list aggregation.
 *
 * Takes a generated WeekPlan, walks all 21 slots, de-duplicates ingredients
 * by (name + unit), sums quantities where they match, and groups by aisle.
 */
import type { WeekPlan } from './ai/schema';
import type { GroceryItem, Aisle } from '@/types';

// Simple quantity parser — handles numeric prefixes like "2 cups", "400", "1.5"
function parseQty(qty: string): { amount: number; unit: string } {
  const match = qty.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(.*)/);
  if (match) {
    return { amount: parseFloat(match[1]), unit: match[2].trim() };
  }
  return { amount: 1, unit: qty.trim() };
}

function formatQty(amount: number, unit: string): string {
  // Round to 1 decimal place if needed
  const rounded = Math.round(amount * 10) / 10;
  return unit ? `${rounded} ${unit}` : `${rounded}`;
}

export function aggregateGrocery(plan: WeekPlan): GroceryItem[] {
  // Map: "name|unit" → { amount, aisle }
  const map = new Map<string, { name: string; amount: number; unit: string; aisle: Aisle }>();

  for (const day of plan.days) {
    for (const slot of Object.values(day.slots)) {
      for (const ing of slot.baseDish.ingredients) {
        const { amount, unit } = parseQty(ing.qty);
        const key = `${ing.name.toLowerCase().trim()}|${unit.toLowerCase()}`;

        if (map.has(key)) {
          map.get(key)!.amount += amount;
        } else {
          map.set(key, {
            name:   ing.name,
            amount,
            unit,
            aisle:  ing.aisle as Aisle,
          });
        }
      }
    }
  }

  // Convert to GroceryItem array, sorted by aisle then name
  const AISLE_ORDER: Aisle[] = ['produce', 'proteins', 'dairy', 'pantry', 'spices', 'frozen', 'bakery', 'other'];

  return [...map.entries()]
    .map(([key, v], i) => ({
      id:    `gi_${i}_${key.replace(/[^a-z0-9]/g, '_')}`,
      name:  v.name,
      qty:   formatQty(v.amount, v.unit),
      unit:  v.unit,
      aisle: v.aisle,
      have:  false,
    }))
    .sort((a, b) => {
      const ai = AISLE_ORDER.indexOf(a.aisle);
      const bi = AISLE_ORDER.indexOf(b.aisle);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
}
