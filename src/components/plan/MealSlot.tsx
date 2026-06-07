'use client';
/**
 * MealSlot — expandable card for one breakfast/lunch/dinner slot.
 * Shows base dish title + per-person tweaks when expanded.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Slot } from '@/lib/ai/schema';
import type { FamilyMember } from '@/types';

interface MealSlotProps {
  meal:       'breakfast' | 'lunch' | 'dinner';
  slot:       Slot;
  family:     FamilyMember[];
  onSwap?:    (meal: string, dislikedTitle: string) => void;
  locked?:    boolean;
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch:     '☀️',
  dinner:    '🌙',
};

export function MealSlot({ meal, slot, family, onSwap, locked }: MealSlotProps) {
  const [expanded, setExpanded] = useState(false);
  const { baseDish, perPerson, allergenFlags, safetyFlags } = slot;

  return (
    <div className="rounded-2xl bg-surface-raised border border-border overflow-hidden">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xl">{MEAL_EMOJI[meal]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-on-surface-muted capitalize">{meal}</span>
            {allergenFlags.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                <AlertTriangle size={10} /> Allergen
              </span>
            )}
          </div>
          <p className="font-semibold text-on-surface text-sm truncate">{baseDish.title}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-on-surface-muted">{baseDish.cuisine}</span>
            <span className="text-xs text-on-surface-muted flex items-center gap-1">
              <Clock size={10} /> {baseDish.prepMinutes + baseDish.cookMinutes} min
            </span>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={cn('text-on-surface-muted transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
              {/* Description */}
              <p className="text-sm text-on-surface-muted">{baseDish.description}</p>

              {/* Safety flags */}
              {safetyFlags.length > 0 && (
                <div className="space-y-1">
                  {safetyFlags.map((f, i) => (
                    <p key={i} className="text-xs text-amber-600 flex items-start gap-1">
                      <span className="mt-0.5">⚠️</span> {f}
                    </p>
                  ))}
                </div>
              )}

              {/* Per-person tweaks */}
              {perPerson.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wide mb-2">Per person</p>
                  <div className="space-y-2">
                    {perPerson.map(p => {
                      const member = family.find(m => m.memberId === p.memberId);
                      return (
                        <div key={p.memberId} className="text-sm">
                          <span className="font-medium text-on-surface">{member?.name ?? p.memberId}</span>
                          <span className="text-on-surface-muted ml-1 text-xs">({p.portion} portion)</span>
                          {p.swaps.length > 0 && (
                            <ul className="mt-0.5 pl-3 text-xs text-on-surface-muted list-disc list-inside space-y-0.5">
                              {p.swaps.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          )}
                          {p.sauceOnSide && (
                            <p className="text-xs text-on-surface-muted pl-3">+ {p.sauceOnSide} on the side</p>
                          )}
                          <div className="mt-1 text-xs text-on-surface-muted pl-3">
                            {p.nutrition.calories} kcal · {p.nutrition.proteinG}g protein · {p.nutrition.sodiumMg}mg sodium
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Serving notes */}
              {baseDish.servingNotes && (
                <p className="text-xs text-brand italic">{baseDish.servingNotes}</p>
              )}

              {/* Ingredients summary */}
              <details className="text-xs text-on-surface-muted">
                <summary className="cursor-pointer font-medium text-on-surface">
                  Ingredients ({baseDish.ingredients.length})
                </summary>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside pl-2">
                  {baseDish.ingredients.map((ing, i) => (
                    <li key={i}>{ing.qty} {ing.name}</li>
                  ))}
                </ul>
              </details>

              {/* Steps */}
              <details className="text-xs text-on-surface-muted">
                <summary className="cursor-pointer font-medium text-on-surface">
                  Steps ({baseDish.steps.length})
                </summary>
                <ol className="mt-2 space-y-1.5 list-decimal list-inside pl-2">
                  {baseDish.steps.map((step, i) => (
                    <li key={i} className="leading-snug">{step}</li>
                  ))}
                </ol>
              </details>

              {/* Swap button */}
              {!locked && onSwap && (
                <button
                  onClick={() => onSwap(meal, baseDish.title)}
                  className="flex items-center gap-2 text-xs text-on-surface-muted hover:text-brand transition-colors"
                >
                  <RefreshCw size={12} /> Replace this meal
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
