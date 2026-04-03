import { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app_theme_mode_v1';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!isMounted) return;

        if (stored === 'dark') {
          setIsDark(true);
          return;
        }

        if (stored === 'light') {
          setIsDark(false);
          return;
        }

        setIsDark(Appearance.getColorScheme() === 'dark');
      } catch {
        if (!isMounted) return;
        setIsDark(Appearance.getColorScheme() === 'dark');
      }
    };

    void hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
