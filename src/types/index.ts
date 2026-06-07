// ── Family & profiles ────────────────────────────────────────────────────────

export type Archetype =
  | 'weight_loss'
  | 'heart_health'
  | 'kid'
  | 'senior'
  | 'diabetic'
  | 'active'
  | 'none';

export type AgeBand = 'child' | 'teen' | 'adult' | 'senior';

export type Diet =
  | 'veg'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'jain'
  | null;

export interface HardConstraints {
  allergies: string[];
  diet: Diet;
}

export interface SoftPrefs {
  cuisines: string[];
  dislikes: string[];
  /** 0 = none, 1 = mild, 2 = medium, 3 = hot */
  spice: 0 | 1 | 2 | 3;
  texture: 'any' | 'soft';
}

export interface FamilyMember {
  memberId:        string;
  name:            string;
  avatar?:         string;
  ageBand:         AgeBand;
  archetype:       Archetype;
  hardConstraints: HardConstraints;
  softPrefs:       SoftPrefs;
  goal:            string;
}

// ── User settings ────────────────────────────────────────────────────────────

export type Theme = 'warm-kitchen' | 'fresh-market' | 'midnight-pantry' | 'spice-route';
export type Budget = 'low' | 'mid' | 'high';

export interface UserSettings {
  theme:           Theme;
  defaultCuisines: string[];
  variety:         'mix' | 'favorites';
  budget:          Budget;
}

// ── Generation input ─────────────────────────────────────────────────────────

export interface GenerationInput {
  weekId:            string;         // e.g. "2026-W24"
  weekNumber:        number;         // numeric week, used as variety seed
  family:            FamilyMember[];
  preferredCuisines: string[];
  pantry:            string[];       // items already in the fridge
  busyNights:        string[];       // day labels of busy nights
  budget:            Budget;
  recentDishTitles:  string[];       // from last 4 weeks — do not repeat
  recentCuisines:    string[];       // cuisines used recently
}

// ── Grocery ──────────────────────────────────────────────────────────────────

export type Aisle =
  | 'produce'
  | 'dairy'
  | 'proteins'
  | 'pantry'
  | 'spices'
  | 'frozen'
  | 'bakery'
  | 'other';

export interface GroceryItem {
  id:    string;
  name:  string;
  qty:   string;
  unit:  string;
  aisle: Aisle;
  have:  boolean;       // user marked "already have"
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export interface SlotFeedback {
  memberId?: string;
  rating:    1 | -1;
  cooked:    boolean;
  ts:        string;
}

// ── Plan status ──────────────────────────────────────────────────────────────

export type PlanStatus = 'draft' | 'locked';
