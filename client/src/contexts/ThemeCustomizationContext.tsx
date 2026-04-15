import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { broadcastThemeUpdate } from '@/hooks/customizationBroadcast';

export interface ThemeConfig {
  // Dark Mode Presets
  darkModePreset?: string;
  
  // Card Styling
  cardBackgroundStyle?: string;
  customCardBackground?: string;
  customCardForeground?: string;
  
  // Dark Mode Colors
  customDarkBackground?: string;
  customDarkSurface?: string;
  customDarkText?: string;
  customDarkPrimary?: string;
  customDarkSecondary?: string;
  customDarkAccent?: string;
  
  // Light Mode Colors
  customLightBackground?: string;
  customLightSurface?: string;
  customLightText?: string;
  customLightPrimary?: string;
  customLightSecondary?: string;
  customLightAccent?: string;
  
  // Font Configuration
  fontFamily?: string;
  headingFont?: string;
  bodyFont?: string;
  fontSize?: string;
  fontWeight?: string;
  
  // Accent Color (applies to both themes)
  accentColor?: string;
  
  // Light Mode Typography
  h1ColorLight?: string;
  h2ColorLight?: string;
  h3ColorLight?: string;
  h4ColorLight?: string;
  h5ColorLight?: string;
  h6ColorLight?: string;
  bodyColorLight?: string;
  mutedColorLight?: string;
  
  // Dark Mode Typography
  h1ColorDark?: string;
  h2ColorDark?: string;
  h3ColorDark?: string;
  h4ColorDark?: string;
  h5ColorDark?: string;
  h6ColorDark?: string;
  bodyColorDark?: string;
  mutedColorDark?: string;
  
  // Additional customizations
  [key: string]: any;
}

interface ThemeContextType {
  config: ThemeConfig;
  updateThemeConfig: (config: ThemeConfig) => void;
  applyThemeToDOM: () => void;
}

const ThemeCustomizationContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeCustomizationProvider({ children }: ThemeProviderProps) {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    try {
      const stored = localStorage.getItem('melitech_theme_config');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Fetch saved theme settings from the backend API on mount
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/trpc/settings.getPublicSettings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const theme = json?.result?.data ?? {};
        const t = theme.theme;
        if (!t || typeof t !== 'object') return;
        // Map DB theme_settings keys to ThemeConfig
        const mapped: ThemeConfig = {};
        if (t.primaryColor) { mapped.accentColor = t.primaryColor; mapped.customLightPrimary = t.primaryColor; mapped.customDarkPrimary = t.primaryColor; }
        if (t.sidebarColor) { mapped.customDarkBackground = t.sidebarColor; }
        if (t.headerColor) { mapped.customLightSurface = t.headerColor; }
        if (t.fontFamily) mapped.fontFamily = t.fontFamily;
        if (t.borderRadius) mapped.borderRadius = t.borderRadius;
        if (t.sidebarStyle) mapped.sidebarStyle = t.sidebarStyle;
        if (t.compactMode === 'true') mapped.compactMode = true;
        if (t.cssStyle) mapped.customCSS = t.cssStyle;
        // Only apply if we got meaningful data
        if (Object.keys(mapped).length > 0) {
          setConfig(prev => {
            // Don't override user's local changes if they exist
            const hasLocal = Object.keys(prev).length > 0;
            if (hasLocal) return prev;
            return { ...prev, ...mapped };
          });
        }
      } catch {
        // Silently fail — localStorage config is the fallback
      }
    })();
  }, []);

  const updateThemeConfig = (newConfig: ThemeConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const applyThemeToDOM = () => {
    const root = document.documentElement;
    
    // Font Configuration
    if (config.fontFamily) {
      root.style.setProperty('--font-family', config.fontFamily);
      document.body.style.fontFamily = config.fontFamily;
    }
    if (config.headingFont) {
      root.style.setProperty('--heading-font', config.headingFont);
    }
    if (config.bodyFont) {
      root.style.setProperty('--body-font', config.bodyFont);
      document.body.style.fontFamily = config.bodyFont;
    }
    if (config.fontSize) {
      root.style.setProperty('--font-size-base', config.fontSize);
    }
    if (config.fontWeight) {
      root.style.setProperty('--font-weight', config.fontWeight);
    }
    
    // Accent Color (applies to both themes)
    if (config.accentColor) {
      root.style.setProperty('--theme-accent', config.accentColor);
    }
    
    // Light Mode Colors — theme sets scoped --theme-* vars only
    if (config.customLightBackground) {
      root.style.setProperty('--theme-light-bg', config.customLightBackground);
    }
    if (config.customLightSurface) {
      root.style.setProperty('--theme-light-surface', config.customLightSurface);
    }
    if (config.customLightText) {
      root.style.setProperty('--theme-light-text', config.customLightText);
    }
    if (config.customLightPrimary) {
      root.style.setProperty('--theme-light-primary', config.customLightPrimary);
    }
    if (config.customLightSecondary) {
      root.style.setProperty('--theme-light-secondary', config.customLightSecondary);
    }
    if (config.customLightAccent) {
      root.style.setProperty('--theme-light-accent', config.customLightAccent);
    }
    
    // Light Mode Typography
    if (config.h1ColorLight) {
      root.style.setProperty('--theme-h1-light', config.h1ColorLight);
    }
    if (config.h2ColorLight) {
      root.style.setProperty('--theme-h2-light', config.h2ColorLight);
    }
    if (config.h3ColorLight) {
      root.style.setProperty('--theme-h3-light', config.h3ColorLight);
    }
    if (config.h4ColorLight) {
      root.style.setProperty('--theme-h4-light', config.h4ColorLight);
    }
    if (config.h5ColorLight) {
      root.style.setProperty('--theme-h5-light', config.h5ColorLight);
    }
    if (config.h6ColorLight) {
      root.style.setProperty('--theme-h6-light', config.h6ColorLight);
    }
    if (config.bodyColorLight) {
      root.style.setProperty('--theme-body-light', config.bodyColorLight);
    }
    if (config.mutedColorLight) {
      root.style.setProperty('--theme-muted-light', config.mutedColorLight);
    }
    
    // Dark Mode Colors - for .dark class
    const darkClass = document.createElement('style');
    darkClass.textContent = `.dark { color-scheme: dark; }`;
    
    if (config.customDarkBackground) {
      root.style.setProperty('--theme-dark-bg', config.customDarkBackground);
      // This will apply when .dark class is present on root
    }
    if (config.customDarkSurface) {
      root.style.setProperty('--theme-dark-surface', config.customDarkSurface);
    }
    if (config.customDarkText) {
      root.style.setProperty('--theme-dark-text', config.customDarkText);
    }
    if (config.customDarkPrimary) {
      root.style.setProperty('--theme-dark-primary', config.customDarkPrimary);
    }
    if (config.customDarkSecondary) {
      root.style.setProperty('--theme-dark-secondary', config.customDarkSecondary);
    }
    if (config.customDarkAccent) {
      root.style.setProperty('--theme-dark-accent', config.customDarkAccent);
    }
    
    // Dark Mode Typography
    if (config.h1ColorDark) {
      root.style.setProperty('--theme-h1-dark', config.h1ColorDark);
    }
    if (config.h2ColorDark) {
      root.style.setProperty('--theme-h2-dark', config.h2ColorDark);
    }
    if (config.h3ColorDark) {
      root.style.setProperty('--theme-h3-dark', config.h3ColorDark);
    }
    if (config.h4ColorDark) {
      root.style.setProperty('--theme-h4-dark', config.h4ColorDark);
    }
    if (config.h5ColorDark) {
      root.style.setProperty('--theme-h5-dark', config.h5ColorDark);
    }
    if (config.h6ColorDark) {
      root.style.setProperty('--theme-h6-dark', config.h6ColorDark);
    }
    if (config.bodyColorDark) {
      root.style.setProperty('--theme-body-dark', config.bodyColorDark);
    }
    if (config.mutedColorDark) {
      root.style.setProperty('--theme-muted-dark', config.mutedColorDark);
    }
    
    // Card Background Styling
    if (config.cardBackgroundStyle) {
      root.style.setProperty('--card-bg-style', config.cardBackgroundStyle);
    }
    if (config.customCardBackground) {
      root.style.setProperty('--custom-card-bg', config.customCardBackground);
    }
    if (config.customCardForeground) {
      root.style.setProperty('--custom-card-fg', config.customCardForeground);
    }

    // ====== Bridge theme vars to Tailwind CSS variables for sitewide effect ======
    const isDark = document.documentElement.classList.contains('dark');

    // Primary color → Tailwind --primary, --sidebar-primary, --ring
    const primary = isDark ? config.customDarkPrimary : config.customLightPrimary;
    if (primary) {
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--sidebar-primary', primary);
      root.style.setProperty('--ring', primary);
    }
    if (config.accentColor) {
      root.style.setProperty('--primary', config.accentColor);
      root.style.setProperty('--sidebar-primary', config.accentColor);
      root.style.setProperty('--ring', config.accentColor);
    }

    // Accent color → Tailwind --accent
    const accent = isDark ? config.customDarkAccent : config.customLightAccent;
    if (accent) {
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--sidebar-accent', accent);
    }

    // Background color → Tailwind --background
    const bg = isDark ? config.customDarkBackground : config.customLightBackground;
    if (bg) {
      root.style.setProperty('--background', bg);
    }

    // Sidebar background — always apply customDarkBackground as sidebar color since
    // sidebars typically stay dark even in light mode, but respect sidebarStyle
    if (config.customDarkBackground) {
      root.style.setProperty('--sidebar', config.customDarkBackground);
      // Auto-detect if sidebar color is dark → set light foreground text
      const hex = config.customDarkBackground.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (luminance < 0.5) {
          // Dark sidebar → light text
          root.style.setProperty('--sidebar-foreground', '#e2e8f0');
          root.style.setProperty('--sidebar-accent', hex.length === 6 ? `#${Math.min(255, r + 30).toString(16).padStart(2, '0')}${Math.min(255, g + 30).toString(16).padStart(2, '0')}${Math.min(255, b + 30).toString(16).padStart(2, '0')}` : '#334155');
          root.style.setProperty('--sidebar-accent-foreground', '#f1f5f9');
          root.style.setProperty('--sidebar-border', `rgba(255,255,255,0.1)`);
        } else {
          // Light sidebar → dark text
          root.style.setProperty('--sidebar-foreground', '#1e293b');
          root.style.setProperty('--sidebar-accent-foreground', '#0f172a');
          root.style.setProperty('--sidebar-border', `rgba(0,0,0,0.1)`);
        }
      }
    }

    // Surface color → Tailwind --card, --popover
    const surface = isDark ? config.customDarkSurface : config.customLightSurface;
    if (surface) {
      root.style.setProperty('--card', surface);
      root.style.setProperty('--popover', surface);
    }

    // Text color → Tailwind --foreground
    const text = isDark ? config.customDarkText : config.customLightText;
    if (text) {
      root.style.setProperty('--foreground', text);
      root.style.setProperty('--card-foreground', text);
      root.style.setProperty('--popover-foreground', text);
      root.style.setProperty('--sidebar-foreground', text);
    }

    // Secondary color → Tailwind --secondary
    const secondary = isDark ? config.customDarkSecondary : config.customLightSecondary;
    if (secondary) {
      root.style.setProperty('--secondary', secondary);
    }

    // Border radius — convert raw number to px unit for CSS calc() compatibility
    if (config.borderRadius) {
      const val = config.borderRadius;
      // If it's a plain number (e.g. "8"), append "px"; otherwise use as-is (e.g. "0.65rem")
      const radiusValue = /^\d+(\.\d+)?$/.test(val) ? `${val}px` : val;
      root.style.setProperty('--radius', radiusValue);
    }
  };

  // Persist to localStorage and apply when config changes
  useEffect(() => {
    if (Object.keys(config).length > 0) {
      localStorage.setItem('melitech_theme_config', JSON.stringify(config));
      applyThemeToDOM();
      broadcastThemeUpdate(config);
    }
  }, [config]);

  // Re-apply theme when dark/light mode toggles (MutationObserver on html class)
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          applyThemeToDOM();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [config]);

  return (
    <ThemeCustomizationContext.Provider value={{ config, updateThemeConfig, applyThemeToDOM }}>
      {children}
    </ThemeCustomizationContext.Provider>
  );
}

export function useThemeCustomization() {
  const context = useContext(ThemeCustomizationContext);
  if (!context) {
    throw new Error('useThemeCustomization must be used within ThemeCustomizationProvider');
  }
  return context;
}

// For store-like interface compatibility
export const useThemeStore = useThemeCustomization;
