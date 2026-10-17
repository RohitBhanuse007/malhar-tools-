import React, { createContext, useContext, useState, useEffect } from 'react';
import { FontSettings, FontFamilyOption, FontSizeOption, FontWeightOption } from '../types';
import { DEFAULT_FONT_SETTINGS } from '../services/firebase/settingsService';

interface ThemeContextType {
  fontSettings: FontSettings;
  updateFontSettings: (newSettings: Partial<FontSettings>) => void;
  setFontSettings: (settings: FontSettings) => void;
  resetFontSettings: () => void;
  applyThemeToDom: (settings: FontSettings) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FONT_SETTINGS_STORAGE_KEY = 'malhar_tools_font_settings';

export const FONT_FAMILY_STACKS: Record<FontFamilyOption, string> = {
  Inter: `'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  Poppins: `'Poppins', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  Roboto: `'Roboto', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  Arial: `Arial, 'Helvetica Neue', Helvetica, 'Noto Sans Devanagari', sans-serif`,
};

export const FONT_SIZES: Record<FontSizeOption, { label: string; basePx: string; scale: string }> = {
  sm: { label: 'Small (14px)', basePx: '14.5px', scale: '0.9' },
  md: { label: 'Medium (16px)', basePx: '16px', scale: '1.0' },
  lg: { label: 'Large (18px)', basePx: '18px', scale: '1.12' },
};

export const PRESET_COLORS = [
  { id: 'black', label: 'Black / Slate', color: '#0f172a' },
  { id: 'navy', label: 'Dark Blue', color: '#1e3a8a' },
  { id: 'gray', label: 'Slate Gray', color: '#334155' },
  { id: 'green', label: 'Forest Green', color: '#14532d' },
  { id: 'red', label: 'Crimson Red', color: '#991b1b' },
];

export function applyThemeToDom(settings: FontSettings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const familyStack = FONT_FAMILY_STACKS[settings.fontFamily] || FONT_FAMILY_STACKS.Inter;
  const sizeConfig = FONT_SIZES[settings.fontSize] || FONT_SIZES.md;
  const color = settings.fontColor || '#0f172a';

  // CSS variables
  root.style.setProperty('--app-font-family', familyStack);
  root.style.setProperty('--app-font-size-base', sizeConfig.basePx);
  root.style.setProperty('--app-font-color', color);
  root.style.setProperty('--app-heading-color', color);

  // Data attributes for targeted cascading rules
  root.setAttribute('data-custom-font', 'true');
  root.setAttribute('data-font-family', settings.fontFamily);
  root.setAttribute('data-font-size', settings.fontSize);
  root.setAttribute('data-font-weight', settings.fontWeight);
}

export function loadSavedFontSettings(): FontSettings {
  if (typeof window === 'undefined') return DEFAULT_FONT_SETTINGS;
  try {
    const raw = localStorage.getItem(FONT_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_FONT_SETTINGS,
        ...parsed,
      };
    }
  } catch (err) {
    console.error('Failed to parse saved font settings:', err);
  }
  return DEFAULT_FONT_SETTINGS;
}

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialSettings?: FontSettings;
}> = ({ children, initialSettings }) => {
  const [fontSettings, setFontSettingsState] = useState<FontSettings>(() => {
    return initialSettings || loadSavedFontSettings();
  });

  // Apply immediately on mount
  useEffect(() => {
    applyThemeToDom(fontSettings);
  }, []);

  // Update whenever initialSettings changes from remote Firestore
  useEffect(() => {
    if (initialSettings) {
      setFontSettingsState((prev) => {
        // If changed, update and apply
        if (
          prev.fontFamily !== initialSettings.fontFamily ||
          prev.fontSize !== initialSettings.fontSize ||
          prev.fontWeight !== initialSettings.fontWeight ||
          prev.fontColor !== initialSettings.fontColor
        ) {
          applyThemeToDom(initialSettings);
          localStorage.setItem(FONT_SETTINGS_STORAGE_KEY, JSON.stringify(initialSettings));
          return initialSettings;
        }
        return prev;
      });
    }
  }, [initialSettings]);

  const setFontSettings = (settings: FontSettings) => {
    setFontSettingsState(settings);
    applyThemeToDom(settings);
    localStorage.setItem(FONT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  };

  const updateFontSettings = (partial: Partial<FontSettings>) => {
    setFontSettingsState((prev) => {
      const updated = { ...prev, ...partial };
      applyThemeToDom(updated);
      localStorage.setItem(FONT_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const resetFontSettings = () => {
    setFontSettings(DEFAULT_FONT_SETTINGS);
  };

  return (
    <ThemeContext.Provider
      value={{
        fontSettings,
        updateFontSettings,
        setFontSettings,
        resetFontSettings,
        applyThemeToDom,
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
