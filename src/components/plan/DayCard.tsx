'use client';
import { motion } from 'framer-motion';
import { MealSlot } from './MealSlot';
import type { Day } from '@/lib/ai/schema';
import type { FamilyMember } from '@/types';

interface DayCardProps {
  day:     Day;
  family:  FamilyMember[];
  onSwap?: (dayLabel: string, meal: string, dislikedTitle: string) => void;
  locked?: boolean;
  index:   number;
}

export function DayCard({ day, family, onSwap, locked, index }: DayCardProps) {
  const isToday = new Date().toISOString().slice(0, 10) === day.date;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: 'easeOut' }}
      className="rounded-card bg-surface-raised border border-border shadow-card hover:shadow-card-hover transition-shadow"
    >
      {/* Day header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
          isToday ? 'bg-brand text-white' : 'bg-border text-on-surface-muted'
        }`}>
          {new Date(day.date + 'T00:00:00').getDate()}
        </div>
        <div>
          <p className="font-semibold text-on-surface">{day.dayLabel}</p>
          <p className="text-xs text-on-surface-muted">
            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        {isToday && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">Today</span>
        )}
      </div>

      {/* Meals */}
      <div className="px-3 pb-3 space-y-2">
        {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
          <MealSlot
            key={meal}
            meal={meal}
            slot={day.slots[meal]}
            family={family}
            locked={locked}
            onSwap={onSwap ? (m, t) => onSwap(day.dayLabel, m, t) : undefined}
          />
        ))}
      </div>
    </motion.div>
  );
}
