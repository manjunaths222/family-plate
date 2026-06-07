'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LogOut, Save, ChevronRight } from 'lucide-react';
import {
  doc, getDoc, setDoc, collection, getDocs, updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';
import type { FamilyMember, Archetype, Diet } from '@/types';

const ARCHETYPES: { key: Archetype; label: string; emoji: string }[] = [
  { key: 'weight_loss',  label: 'Weight Loss',      emoji: '⚖️'  },
  { key: 'heart_health', label: 'Heart-Healthy',    emoji: '❤️'  },
  { key: 'kid',          label: 'Growing Kid',      emoji: '🧒'  },
  { key: 'senior',       label: 'Senior',           emoji: '👴'  },
  { key: 'diabetic',     label: 'Diabetic',         emoji: '🩺'  },
  { key: 'active',       label: 'Active / Bulking',  emoji: '💪' },
  { key: 'none',         label: 'No Restrictions',  emoji: '🍽️' },
];

const DIET_OPTIONS: { value: Diet; label: string; emoji: string }[] = [
  { value: null,    label: 'Non-Veg',    emoji: '🍗' },
  { value: 'veg',   label: 'Vegetarian', emoji: '🥗' },
  { value: 'vegan', label: 'Vegan',      emoji: '🌱' },
  { value: 'halal', label: 'Halal',      emoji: '☪️' },
  { value: 'jain',  label: 'Jain',       emoji: '🟢' },
];

const ALL_CUISINES = [
  'South Indian','North Indian','Thai','Mediterranean',
  'Mexican','Japanese','Middle Eastern','Italian','Chinese','Korean',
];

const THEME_PALETTES: Record<string, string> = {
  'warm-kitchen':    '#c2674a',
  'fresh-market':    '#2e7d32',
  'midnight-pantry': '#7986cb',
  'spice-route':     '#a52829',
};

type Section = 'family' | 'cuisines' | 'theme' | null;

export default function SettingsPage() {
  const { user, signOut }  = useAuth();
  const { theme, setTheme, themes, themeLabels } = useTheme();

  const [section,   setSection]   = useState<Section>(null);
  const [members,   setMembers]   = useState<FamilyMember[]>([]);
  const [cuisines,  setCuisines]  = useState<string[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [loadingFam, setLoadingFam] = useState(false);

  // Load family + settings on mount
  useEffect(() => {
    if (!user) return;
    setLoadingFam(true);

    Promise.all([
      getDocs(collection(db, `users/${user.uid}/family`)),
      getDoc(doc(db, `users/${user.uid}`)),
    ]).then(([famSnap, userSnap]) => {
      setMembers(famSnap.docs.map(d => d.data() as FamilyMember));
      setCuisines(userSnap.data()?.settings?.defaultCuisines ?? []);
    }).finally(() => setLoadingFam(false));
  }, [user]);

  function updateMember(idx: number, patch: Partial<FamilyMember>) {
    setMembers(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  }

  function setDiet(idx: number, diet: Diet) {
    setMembers(prev => prev.map((m, i) =>
      i === idx
        ? { ...m, hardConstraints: { ...m.hardConstraints, diet } }
        : m
    ));
  }

  async function saveFamily() {
    if (!user) return;
    setSaving(true);
    try {
      await Promise.all(members.map(m =>
        setDoc(doc(collection(db, `users/${user.uid}/family`), m.memberId), m)
      ));
      toast.success('Family updated!');
      setSection(null);
    } catch {
      toast.error('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function saveCuisines() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, `users/${user.uid}`), {
        'settings.defaultCuisines': cuisines,
      });
      toast.success('Cuisines updated!');
      setSection(null);
    } catch {
      toast.error('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const RowButton = ({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-surface-raised border border-border hover:border-brand/40 transition-colors text-left"
    >
      <div>
        <p className="font-medium text-on-surface text-sm">{label}</p>
        <p className="text-xs text-on-surface-muted mt-0.5">{sub}</p>
      </div>
      <ChevronRight size={16} className="text-on-surface-muted" />
    </button>
  );

  // ── Family edit panel ───────────────────────────────────────────────────
  if (section === 'family') {
    return (
      <div className="max-w-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSection(null)} className="text-brand text-sm">← Back</button>
          <h2 className="text-lg font-bold text-on-surface">Family Members</h2>
        </div>

        {loadingFam ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-surface-raised animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4">
            {members.map((m, idx) => (
              <div key={m.memberId} className="rounded-2xl bg-surface-raised border border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-brand/20 flex items-center justify-center font-bold text-brand">{m.name[0]}</div>
                  <input
                    value={m.name}
                    onChange={e => updateMember(idx, { name: e.target.value })}
                    className="font-semibold text-on-surface bg-transparent border-b border-border focus:outline-none focus:border-brand text-sm"
                  />
                </div>

                {/* Archetype */}
                <div>
                  <p className="text-xs text-on-surface-muted mb-1.5">Goal / Health</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ARCHETYPES.map(a => (
                      <button
                        key={a.key}
                        onClick={() => updateMember(idx, { archetype: a.key })}
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
                          m.archetype === a.key ? 'bg-brand text-white' : 'bg-surface border border-border text-on-surface-muted'
                        }`}
                      >
                        <span>{a.emoji}</span> {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diet */}
                <div>
                  <p className="text-xs text-on-surface-muted mb-1.5">Diet</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIET_OPTIONS.map(d => (
                      <button
                        key={String(d.value)}
                        onClick={() => setDiet(idx, d.value)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          m.hardConstraints.diet === d.value ? 'bg-brand text-white' : 'bg-surface border border-border text-on-surface-muted'
                        }`}
                      >
                        {d.emoji} {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={saveFamily}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-white font-semibold disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    );
  }

  // ── Cuisine edit panel ──────────────────────────────────────────────────
  if (section === 'cuisines') {
    return (
      <div className="max-w-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSection(null)} className="text-brand text-sm">← Back</button>
          <h2 className="text-lg font-bold text-on-surface">Preferred Cuisines</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_CUISINES.map(c => (
            <button
              key={c}
              onClick={() => setCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                cuisines.includes(c)
                  ? 'bg-brand text-white'
                  : 'bg-surface-raised border border-border text-on-surface-muted hover:border-brand/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {cuisines.length === 0 && (
          <p className="text-xs text-on-surface-muted">No cuisines selected — app will use a varied default.</p>
        )}

        <button
          onClick={saveCuisines}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-white font-semibold disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Saving…' : 'Save Cuisines'}
        </button>
      </div>
    );
  }

  // ── Main settings screen ────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-sm">
      <h1 className="text-2xl font-bold text-on-surface">Settings</h1>

      {/* Profile */}
      <section>
        <h2 className="text-xs font-semibold text-on-surface-muted uppercase tracking-wide mb-3">Profile</h2>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-raised border border-border p-4">
          {user?.photoURL && (
            <Image src={user.photoURL} alt="" width={40} height={40} className="rounded-full" />
          )}
          <div>
            <p className="font-medium text-on-surface">{user?.displayName}</p>
            <p className="text-xs text-on-surface-muted">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* Household */}
      <section>
        <h2 className="text-xs font-semibold text-on-surface-muted uppercase tracking-wide mb-3">Household</h2>
        <div className="space-y-2">
          <RowButton
            label="Family Members"
            sub={members.length > 0 ? `${members.length} member${members.length > 1 ? 's' : ''} — tap to edit goals & diet` : 'Loading…'}
            onClick={() => setSection('family')}
          />
          <RowButton
            label="Cuisine Preferences"
            sub={cuisines.length > 0 ? cuisines.join(', ') : 'No cuisines selected'}
            onClick={() => setSection('cuisines')}
          />
        </div>
      </section>

      {/* Theme */}
      <section>
        <h2 className="text-xs font-semibold text-on-surface-muted uppercase tracking-wide mb-3">Theme</h2>
        <div className="grid grid-cols-2 gap-2">
          {themes.map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all',
                theme === t
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface-raised text-on-surface-muted hover:border-brand/40',
              )}
            >
              <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ background: THEME_PALETTES[t] }} />
              {themeLabels[t]}
            </button>
          ))}
        </div>
      </section>

      {/* Sign out */}
      <section>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-on-surface-muted hover:text-brand transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </section>
    </div>
  );
}
