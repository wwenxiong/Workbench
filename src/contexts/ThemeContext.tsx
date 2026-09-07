import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'apple';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isOledTheme: boolean;
  isAppleTheme: boolean;
  isGoogleTheme: boolean; // Backwards-compatible alias (always false)
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'workbench_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Clear legacy theme setting to prevent dark mode persistence
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // ignore
    }
    const root = document.documentElement;
    root.setAttribute('data-theme', 'apple');
    root.classList.remove('dark');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'apple',
        setTheme: () => {},
        toggleTheme: () => {},
        isOledTheme: false,
        isAppleTheme: true,
        isGoogleTheme: false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
