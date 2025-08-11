'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeName, themes } from '../types/theme';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const { user } = useAuth();

  const setTheme = async (newTheme: ThemeName) => {
    setThemeState(newTheme);
    if (user?.uid) {
      await setDoc(doc(db, "users", user.uid), { theme: newTheme }, { merge: true });
    }
  };

  useEffect(() => {
    const loadTheme = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.theme) setThemeState(data.theme);
        }
      }
    };
    loadTheme();
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = themes[theme];
    
    root.style.setProperty('--background', currentTheme.background);
    root.style.setProperty('--surface', currentTheme.surface);
    root.style.setProperty('--surface-hover', currentTheme.surfaceHover);
    root.style.setProperty('--border', currentTheme.border);
    root.style.setProperty('--border-hover', currentTheme.borderHover);
    root.style.setProperty('--text', currentTheme.text);
    root.style.setProperty('--text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--accent', currentTheme.accent);
    root.style.setProperty('--accent-hover', currentTheme.accentHover);
    root.style.setProperty('--theme-mode', currentTheme.mode);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
