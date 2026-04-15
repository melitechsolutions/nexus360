import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { broadcastThemeUpdate } from '@/hooks/customizationBroadcast';

export interface ThemeConfig {
  darkModePreset: string;
  cardBackgroundStyle: string;
  customDarkBackground?: string;
  customDarkSurface?: string;
  customDarkText?: string;
  customCardBackground?: string;
  accentColor: string;

  // Font Colors - Light Mode
  h1ColorLight: string;
  h2ColorLight: string;
  h3ColorLight: string;
  h4ColorLight: string;
  h5ColorLight: string;
  h6ColorLight: string;
  bodyColorLight: string;
  mutedColorLight: string;

  // Font Colors - Dark Mode
  h1ColorDark: string;
  h2ColorDark: string;
  h3ColorDark: string;
  h4ColorDark: string;
  h5ColorDark: string;
  h6ColorDark: string;
  bodyColorDark: string;
  mutedColorDark: string;
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  darkModePreset: "slate_dark",
  cardBackgroundStyle: "solid",
  accentColor: "#3b82f6",

  // Light Mode Colors
  h1ColorLight: "#000000",
  h2ColorLight: "#000000",
  h3ColorLight: "#000000",
  h4ColorLight: "#000000",
  h5ColorLight: "#000000",
  h6ColorLight: "#000000",
  bodyColorLight: "#333333",
  mutedColorLight: "#666666",

  // Dark Mode Colors
  h1ColorDark: "#ffffff",
  h2ColorDark: "#e5e5e5",
  h3ColorDark: "#d4d4d4",
  h4ColorDark: "#d4d4d4",
  h5ColorDark: "#a3a3a3",
  h6ColorDark: "#737373",
  bodyColorDark: "#d4d4d4",
  mutedColorDark: "#737373",
};

interface ThemeStore {
  config: ThemeConfig;
  updateThemeConfig: (config: Partial<ThemeConfig>) => void;
  resetThemeConfig: () => void;
  applyThemeToDOM: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_THEME_CONFIG,

      updateThemeConfig: (config) => {
        set((state) => ({
          config: { ...state.config, ...config },
        }));
        get().applyThemeToDOM();
        // Broadcast to all tabs
        const state = get();
        broadcastThemeUpdate(state.config);
      },

      resetThemeConfig: () => {
        set({ config: DEFAULT_THEME_CONFIG });
        get().applyThemeToDOM();
      },

      applyThemeToDOM: () => {
        const { config } = get();
        const root = document.documentElement;

        // Apply CSS custom properties for theme
        root.style.setProperty("--theme-accent", config.accentColor);

        // Light Mode
        root.style.setProperty("--theme-h1-light", config.h1ColorLight);
        root.style.setProperty("--theme-h2-light", config.h2ColorLight);
        root.style.setProperty("--theme-h3-light", config.h3ColorLight);
        root.style.setProperty("--theme-h4-light", config.h4ColorLight);
        root.style.setProperty("--theme-h5-light", config.h5ColorLight);
        root.style.setProperty("--theme-h6-light", config.h6ColorLight);
        root.style.setProperty("--theme-body-light", config.bodyColorLight);
        root.style.setProperty("--theme-muted-light", config.mutedColorLight);

        // Dark Mode
        root.style.setProperty("--theme-h1-dark", config.h1ColorDark);
        root.style.setProperty("--theme-h2-dark", config.h2ColorDark);
        root.style.setProperty("--theme-h3-dark", config.h3ColorDark);
        root.style.setProperty("--theme-h4-dark", config.h4ColorDark);
        root.style.setProperty("--theme-h5-dark", config.h5ColorDark);
        root.style.setProperty("--theme-h6-dark", config.h6ColorDark);
        root.style.setProperty("--theme-body-dark", config.bodyColorDark);
        root.style.setProperty("--theme-muted-dark", config.mutedColorDark);

        // Apply card background styles
        if (config.cardBackgroundStyle && config.cardBackgroundStyle !== "solid") {
          root.style.setProperty("--card-background", `var(--card-${config.cardBackgroundStyle})`);
        }
      },
    }),
    {
      name: "theme-store",
      version: 1,
    }
  )
);

// Apply theme on store initialization
if (typeof window !== "undefined") {
  useThemeStore.getState().applyThemeToDOM();
}
