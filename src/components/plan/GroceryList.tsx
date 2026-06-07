'use client';
/**
 * GroceryList — aisle-grouped, check-off grocery view.
 * Optimistic updates: item is struck through immediately,
 * then PATCH fires in the background.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/cn';
import type { GroceryItem, Aisle } from '@/types';

const AISLE_LABELS: Record<Aisle, { emoji: string; label: string }> = {
  produce:  { emoji: '🥦', label: 'Produce'     },
  proteins: { emoji: '🥩', label: 'Proteins'    },
  dairy:    { emoji: '🧀', label: 'Dairy'        },
  pantry:   { emoji: '🥫', label: 'Pantry'       },
  spices:   { emoji: '🌶️', label: 'Spices'      },
  frozen:   { emoji: '🧊', label: 'Frozen'       },
  bakery:   { emoji: '🍞', label: 'Bakery'       },
  other:    { emoji: '📦', label: 'Other'        },
};

interface GroceryListProps {
  items:   GroceryItem[];
  weekId:  string;
  onUpdate?: (items: GroceryItem[]) => void;
}

export function GroceryList({ items, weekId, onUpdate }: GroceryListProps) {
  const { idToken } = useAuth();
  const [localItems, setLocalItems] = useState<GroceryItem[]>(items);
  const [toggling, setToggling]     = useState<Set<string>>(new Set());

  async function toggleHave(item: GroceryItem) {
    const newHave = !item.have;

    // Optimistic update
    const updated = localItems.map(i => i.id === item.id ? { ...i, have: newHave } : i);
    setLocalItems(updated);
    onUpdate?.(updated);
    setToggling(prev => new Set(prev).add(item.id));

    try {
      const token = await idToken();
      await fetch('/api/grocery', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ weekId, itemId: item.id, have: newHave }),
      });
    } catch {
      // Rollback on failure
      setLocalItems(items);
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  }

  // Group by aisle
  const byAisle = localItems.reduce<Record<Aisle, GroceryItem[]>>((acc, item) => {
    const aisle = item.aisle as Aisle;
    if (!acc[aisle]) acc[aisle] = [];
    acc[aisle].push(item);
    return acc;
  }, {} as Record<Aisle, GroceryItem[]>);

  const remaining = localItems.filter(i => !i.have).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-muted">
          {remaining === 0
            ? '✅ All items accounted for!'
            : `${remaining} item${remaining > 1 ? 's' : ''} remaining`}
        </p>
        {remaining < localItems.length && (
          <span className="text-xs px-2 py-1 rounded-full bg-brand/10 text-brand">
            {localItems.length - remaining} / {localItems.length} done
          </span>
        )}
      </div>

      {/* Aisle groups */}
      {(Object.keys(AISLE_LABELS) as Aisle[]).map(aisle => {
        const group = byAisle[aisle];
        if (!group || group.length === 0) return null;
        const { emoji, label } = AISLE_LABELS[aisle];

        return (
          <div key={aisle}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface-muted uppercase tracking-wide mb-2">
              <span>{emoji}</span> {label}
              <span className="ml-auto text-xs font-normal normal-case">
                {group.filter(i => !i.have).length}/{group.length}
              </span>
            </h3>

            <div className="space-y-1">
              {group.map((item, idx) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => toggleHave(item)}
                  disabled={toggling.has(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                    item.have
                      ? 'bg-surface opacity-50'
                      : 'bg-surface-raised hover:bg-border/50',
                  )}
                >
                  {item.have
                    ? <CheckCircle2 size={18} className="text-brand flex-shrink-0" />
                    : <Circle      size={18} className="text-on-surface-muted flex-shrink-0" />
                  }
                  <span className={cn('flex-1 text-sm text-on-surface', item.have && 'line-through')}>
                    {item.name}
                  </span>
                  <span className="text-xs text-on-surface-muted">{item.qty}</span>
                </motion.button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
