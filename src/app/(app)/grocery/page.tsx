'use client';
import { currentWeekId, nextWeekId } from '@/lib/ai/prompts';
import { useWeekPlan } from '@/hooks/useWeekPlan';
import { GroceryList } from '@/components/plan/GroceryList';

export default function GroceryPage() {
  const today     = new Date();
  const dayOfWeek = today.getDay();
  const weekId    = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0)
    ? nextWeekId()
    : currentWeekId();

  const { grocery, loading } = useWeekPlan(weekId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface mb-1">Grocery List</h1>
      <p className="text-sm text-on-surface-muted mb-6">Week {weekId}</p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-surface-raised animate-pulse" />
          ))}
        </div>
      ) : grocery.length === 0 ? (
        <div className="text-center py-16 text-on-surface-muted">
          <div className="text-4xl mb-3">🛒</div>
          <p>No grocery list yet. Lock your plan first.</p>
        </div>
      ) : (
        <GroceryList items={grocery} weekId={weekId} />
      )}
    </div>
  );
}
