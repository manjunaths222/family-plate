'use client';
import { useAuth }  from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function SettingsPage() {
  const { user, signOut }   = useAuth();
  const { theme, setTheme, themes, themeLabels } = useTheme();

  const THEME_PALETTES: Record<string, string> = {
    'warm-kitchen':    '#c2674a',
    'fresh-market':    '#2e7d32',
    'midnight-pantry': '#7986cb',
    'spice-route':     '#a52829',
  };

  return (
    <div className="space-y-8 max-w-sm">
      <h1 className="text-2xl font-bold text-on-surface">Settings</h1>

      {/* Profile */}
      <section>
        <h2 className="text-sm font-semibold text-on-surface-muted uppercase tracking-wide mb-3">Profile</h2>
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

      {/* Theme picker */}
      <section>
        <h2 className="text-sm font-semibold text-on-surface-muted uppercase tracking-wide mb-3">Theme</h2>
        <div className="grid grid-cols-2 gap-3">
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
              <span
                className="h-4 w-4 rounded-full flex-shrink-0"
                style={{ background: THEME_PALETTES[t] }}
              />
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
