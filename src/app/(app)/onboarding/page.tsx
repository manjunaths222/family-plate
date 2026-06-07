'use client';
/**
 * Onboarding page — free-text intake + archetype assignment.
 * Flow:
 *   1. User types a description of their household.
 *   2. /api/onboard returns structured member profiles.
 *   3. User reviews and confirms (can edit names/archetypes).
 *   4. Profiles saved to Firestore → redirect to /plan.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { FamilyMember, Archetype } from '@/types';

const ARCHETYPES: { key: Archetype; label: string; emoji: string; desc: string }[] = [
  { key: 'weight_loss',  label: 'Weight Loss',    emoji: '⚖️',  desc: 'Calorie-controlled, lean protein' },
  { key: 'heart_health', label: 'Heart-Healthy',  emoji: '❤️',  desc: 'Low sodium, soft textures'        },
  { key: 'kid',          label: 'Growing Kid',    emoji: '🧒',  desc: 'Mild, familiar, nutrient-dense'   },
  { key: 'senior',       label: 'Senior',         emoji: '👴',  desc: 'Soft foods, low sodium'           },
  { key: 'diabetic',     label: 'Diabetic',       emoji: '🩺',  desc: 'Low-GI, controlled carbs'         },
  { key: 'active',       label: 'Active / Bulking',emoji: '💪', desc: 'High protein, bigger portions'    },
  { key: 'none',         label: 'No Restrictions',emoji: '🍽️', desc: 'Variety and flavour first'         },
];

type Step = 'intake' | 'review' | 'done';

export default function OnboardingPage() {
  const { user, idToken } = useAuth();
  const router = useRouter();

  const [step,         setStep]         = useState<Step>('intake');
  const [text,         setText]         = useState('');
  const [loading,      setLoading]      = useState(false);
  const [members,      setMembers]      = useState<FamilyMember[]>([]);
  const [cuisines,     setCuisines]     = useState<string[]>([]);
  const [clarifying,   setClarifying]   = useState<string[]>([]);

  // ── Step 1: extract profiles ──────────────────────────────────────────
  async function handleExtract() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const token = await idToken();
      const res   = await fetch('/api/onboard', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members);
      setCuisines(data.suggestedCuisines ?? []);
      setClarifying(data.clarifyingQuestions ?? []);
      setStep('review');
    } catch (err) {
      toast.error('Could not extract profiles. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: save & go ─────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    setLoading(true);
    try {
      // Save user settings
      await setDoc(doc(db, `users/${user.uid}`), {
        email:       user.email,
        displayName: user.displayName,
        photoURL:    user.photoURL,
        createdAt:   new Date().toISOString(),
        settings: {
          theme:           'warm-kitchen',
          defaultCuisines: cuisines,
          variety:         'mix',
          budget:          'mid',
        },
      }, { merge: true });

      // Save family members
      await Promise.all(members.map(m =>
        setDoc(doc(collection(db, `users/${user.uid}/family`), m.memberId), m)
      ));

      setStep('done');
      toast.success('Family saved! Generating your first week…');
      router.push('/plan');
    } catch (err) {
      toast.error('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto py-8">
      <AnimatePresence mode="wait">

        {/* ── Intake step ─────────────────────────────────────────────── */}
        {step === 'intake' && (
          <motion.div
            key="intake"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h1 className="text-2xl font-bold text-on-surface mb-1">Tell me about your family</h1>
            <p className="text-on-surface-muted mb-6">
              Just write naturally — I'll figure out who needs what.
            </p>

            {/* Example prompt chip */}
            <button
              onClick={() => setText('My dad is diabetic, my 6-year-old daughter is picky, I'm trying to lose weight, and we love South Indian and Thai food.')}
              className="mb-4 text-xs px-3 py-1.5 rounded-full bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
            >
              💡 Try an example
            </button>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. My dad's diabetic, my daughter is 6 and picky, I'm trying to lose weight, we love South Indian and Thai…"
              rows={5}
              className="w-full rounded-2xl bg-surface-raised border border-border p-4 text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-brand text-base"
            />

            <button
              onClick={handleExtract}
              disabled={!text.trim() || loading}
              className="mt-4 w-full rounded-2xl bg-brand py-4 text-white font-semibold text-base disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Extracting profiles…' : 'Continue →'}
            </button>
          </motion.div>
        )}

        {/* ── Review step ─────────────────────────────────────────────── */}
        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="text-2xl font-bold text-on-surface mb-1">Does this look right?</h2>
            <p className="text-on-surface-muted mb-6">Tap an archetype card to change it.</p>

            {/* Clarifying questions */}
            {clarifying.length > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-accent/10 border border-accent/30">
                <p className="font-medium text-on-surface mb-2">A couple of quick questions:</p>
                <ul className="space-y-1 text-sm text-on-surface-muted list-disc list-inside">
                  {clarifying.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}

            {/* Member cards */}
            <div className="space-y-4 mb-6">
              {members.map((m, idx) => (
                <motion.div
                  key={m.memberId}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.08 }}
                  className="rounded-2xl bg-surface-raised border border-border p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center text-lg font-bold text-brand">
                      {m.name[0]}
                    </div>
                    <input
                      value={m.name}
                      onChange={e => setMembers(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                      className="font-semibold text-on-surface bg-transparent border-b border-border focus:outline-none focus:border-brand text-base"
                    />
                  </div>

                  {/* Archetype selector */}
                  <div className="grid grid-cols-2 gap-2">
                    {ARCHETYPES.map(a => (
                      <button
                        key={a.key}
                        onClick={() => setMembers(prev => prev.map((x, i) => i === idx ? { ...x, archetype: a.key } : x))}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all ${
                          m.archetype === a.key
                            ? 'bg-brand text-white'
                            : 'bg-surface border border-border text-on-surface-muted hover:border-brand/50'
                        }`}
                      >
                        <span className="text-base">{a.emoji}</span>
                        <span className="font-medium leading-tight">{a.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Show hard constraints */}
                  {(m.hardConstraints.allergies.length > 0 || m.hardConstraints.diet) && (
                    <div className="mt-3 text-xs text-on-surface-muted">
                      {m.hardConstraints.diet && <span className="mr-2 px-2 py-0.5 rounded-full bg-brand/10 text-brand">{m.hardConstraints.diet}</span>}
                      {m.hardConstraints.allergies.map(a => (
                        <span key={a} className="mr-2 px-2 py-0.5 rounded-full bg-red-100 text-red-600">⚠️ {a}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Cuisine picks */}
            <div className="mb-6">
              <p className="text-sm font-medium text-on-surface mb-2">Preferred cuisines</p>
              <div className="flex flex-wrap gap-2">
                {['South Indian','North Indian','Thai','Mediterranean','Mexican','Japanese','Middle Eastern','Italian','Chinese','Korean'].map(c => (
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
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('intake')} className="flex-1 rounded-2xl border border-border py-3 text-on-surface-muted font-medium">
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-2 rounded-2xl bg-brand px-8 py-3 text-white font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save & Generate Week →'}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
