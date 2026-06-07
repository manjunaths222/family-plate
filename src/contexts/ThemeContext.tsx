'use client';
/**
 * ThemeContext — manages the active visual theme.
 *
 * Themes are implemented as a `data-theme` attribute on <html>, which
 * activates CSS custom-property overrides defined in globals.css.
 * Switching is instant because CSS transitions animate the token values.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '@/types';

const THEMES: Theme[] = ['warm-kitchen', 'fresh-market', 'midnight-pantry', 'spice-route'];

const THEME_LABELS: Record<Theme, string> = {
  'warm-kitchen':    'Warm Kitchen',
  'fresh-market':    'Fresh Market',
  'midnight-pantry': 'Midnight Pantry',
  'spice-route':     'Spice Route',
};

interface ThemeContextValue {
  theme:       Theme;
  setTheme:    (t: Theme) => void;
  themes:      Theme[];
  themeLabels: typeof THEME_LABELS;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'fp_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('warm-kitchen');

  // Read persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored && THEMES.includes(stored)) {
      applyTheme(stored);
    }
  }, []);

  function applyTheme(t: Theme) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: applyTheme, themes: THEMES, themeLabels: THEME_LABELS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
