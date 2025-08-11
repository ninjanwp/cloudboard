export type ThemeColor = {
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderHover: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  mode: 'dark' | 'light';  // Add this to determine text colors
};

export type ThemeName = 'dark' | 'light' | 'mono' | 'navy' | 'forest' | 'purple' | 'pink' | 'midnight' | 'coral' | 'amber' | 'mint' | 'coffee' | 'sky';

export const themes: Record<ThemeName, ThemeColor> = {
  dark: {
    background: '#171717', // neutral-900
    surface: '#262626',    // neutral-800
    surfaceHover: '#333333',
    border: '#404040',
    borderHover: '#525252',
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    accent: '#3b82f6',    // blue-500
    accentHover: '#2563eb', // blue-600
    mode: 'dark'
  },
  light: {
    background: '#ffffff', // neutral-100
    surface: '#fbfbfb',    // neutral-200
    surfaceHover: '#f3f4f6',
    border: '#e5e7eb',
    borderHover: '#d1d5db',
    text: '#1f1f1f',
    textSecondary: '#8c7a80',
    accent: '#3b82f6',    // blue-500
    accentHover: '#2563eb', // blue-600
    mode: 'light'
  },
    mono: {
    background: '#000000', // neutral-900
    surface: '#000000',    // neutral-800
    surfaceHover: '#333333',
    border: '#404040',
    borderHover: '#525252',
    text: '#ffffff',
    textSecondary: '#a3a3a3',
    accent: '#3b82f6',    // blue-500
    accentHover: '#2563eb', // blue-600
    mode: 'dark'
  },
  navy: {
    background: '#0c1220',
    surface: '#1a2736',
    surfaceHover: '#243b52',
    border: '#2d4a6d',
    borderHover: '#385785',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    accent: '#38bdf8',    // sky-500
    accentHover: '#0284c7', // sky-600
    mode: 'dark'
  },
  forest: {
    background: '#1a2416',
    surface: '#2a3726',
    surfaceHover: '#374d2f',
    border: '#465d3e',
    borderHover: '#557047',
    text: '#ffffff',
    textSecondary: '#a6b5a3',
    accent: '#22c55e',    // green-500
    accentHover: '#16a34a', // green-600
    mode: 'dark'
  },
  purple: {
    background: '#1a1625',
    surface: '#2a253d',
    surfaceHover: '#382f52',
    border: '#463a66',
    borderHover: '#574579',
    text: '#ffffff',
    textSecondary: '#b1a6c9',
    accent: '#a855f7',    // purple-500
    accentHover: '#9333ea', // purple-600
    mode: 'dark'
  },

  midnight: {
    background: '#0f172a',    // slate-900
    surface: '#1e293b',       // slate-800
    surfaceHover: '#334155',  // slate-700
    border: '#475569',        // slate-600
    borderHover: '#64748b',   // slate-500
    text: '#f8fafc',          // slate-50
    textSecondary: '#94a3b8', // slate-400
    accent: '#6366f1',        // indigo-500
    accentHover: '#4f46e5',   // indigo-600
    mode: 'dark'
  },
  coral: {
    background: '#18181b',    // zinc-900
    surface: '#27272a',       // zinc-800
    surfaceHover: '#3f3f46',  // zinc-700
    border: '#52525b',        // zinc-600
    borderHover: '#71717a',   // zinc-500
    text: '#fafafa',          // zinc-50
    textSecondary: '#a1a1aa', // zinc-400
    accent: '#f97316',        // orange-500
    accentHover: '#ea580c',   // orange-600
    mode: 'dark'
  },
  amber: {
    background: '#1c1917',    // stone-900
    surface: '#292524',       // stone-800
    surfaceHover: '#44403c',  // stone-700
    border: '#57534e',        // stone-600
    borderHover: '#78716c',   // stone-500
    text: '#fafaf9',          // stone-50
    textSecondary: '#a8a29e', // stone-400
    accent: '#f59e0b',        // amber-500
    accentHover: '#d97706',   // amber-600
    mode: 'dark'
  },
  pink: {
    background: '#fce7f3',    // pink-100
    surface: '#fbcfe8',       // pink-200
    surfaceHover: '#f9a8d4',  // pink-300
    border: '#f472b6',        // pink-400
    borderHover: '#ec4899',   // pink-500
    text: '#1f1f1f',          // dark text for light background
    textSecondary: '#8c7a80',
    accent: '#ec4899',        // pink-500
    accentHover: '#db2777',   // pink-600
    mode: 'light'             // Light mode
  },
  mint: {
    background: '#ecfdf5',    // green-50
    surface: '#d1fae5',       // green-100
    surfaceHover: '#a7f3d0',  // green-200
    border: '#6ee7b7',        // green-300
    borderHover: '#34d399',   // green-400
    text: '#064e3b',          // green-900
    textSecondary: '#047857', // green-800
    accent: '#10b981',        // green-500
    accentHover: '#059669',   // green-600
    mode: 'light'
  },
  coffee: {
    background: '#fef3c7',    // amber-100
    surface: '#fde68a',       // amber-200
    surfaceHover: '#fcd34d',  // amber-300
    border: '#fbbf24',        // amber-400
    borderHover: '#f59e0b',   // amber-500
    text: '#78350f',          // amber-900
    textSecondary: '#92400e', // amber-800
    accent: '#d97706',        // amber-600
    accentHover: '#b45309',   // amber-700
    mode: 'light'
  },
  sky: {
    background: '#f0f9ff',    // sky-50
    surface: '#e0f2fe',       // sky-100
    surfaceHover: '#bae6fd',  // sky-200
    border: '#7dd3fc',        // sky-300
    borderHover: '#38bdf8',   // sky-400
    text: '#0c4a6e',          // sky-900
    textSecondary: '#075985', // sky-800
    accent: '#0ea5e9',        // sky-500
    accentHover: '#0284c7',   // sky-600
    mode: 'light'
  }
};
