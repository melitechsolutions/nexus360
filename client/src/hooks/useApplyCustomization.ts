import { useEffect } from 'react';
import { useBrand } from '@/contexts/BrandContext';
import { useThemeCustomization } from '@/contexts/ThemeCustomizationContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

/**
 * Hook that applies all customizations to the DOM and global styles
 * This ensures changes made in customization modules take effect immediately
 */
export function useApplyCustomization() {
  const { brandConfig } = useBrand();
  const { config: themeConfig } = useThemeCustomization();
  const { settings } = useSystemSettings();

  // Apply brand customization to DOM
  useEffect(() => {
    const style = document.documentElement.style;

    if (brandConfig && brandConfig.primaryColor) {
      style.setProperty('--primary', brandConfig.primaryColor);
      style.setProperty('--brand-primary', brandConfig.primaryColor);
    }
    if (brandConfig && brandConfig.secondaryColor) {
      style.setProperty('--secondary', brandConfig.secondaryColor);
      style.setProperty('--brand-secondary', brandConfig.secondaryColor);
    }
    if (brandConfig && brandConfig.accentColor) {
      style.setProperty('--accent', brandConfig.accentColor);
      style.setProperty('--brand-accent', brandConfig.accentColor);
    }

    // Apply dark mode colors if provided
    if (brandConfig && brandConfig.darkPrimaryColor) {
      style.setProperty('--brand-dark-primary', brandConfig.darkPrimaryColor);
    }
    if (brandConfig && brandConfig.darkSecondaryColor) {
      style.setProperty('--brand-dark-secondary', brandConfig.darkSecondaryColor);
    }
    if (brandConfig && brandConfig.darkAccentColor) {
      style.setProperty('--brand-dark-accent', brandConfig.darkAccentColor);
    }

    // Apply font family if provided
    if (brandConfig && brandConfig.fontFamily) {
      style.setProperty('--font-family', `"${brandConfig.fontFamily}", sans-serif`);
      document.body.style.fontFamily = `"${brandConfig.fontFamily}", sans-serif`;
    }

    // Apply typography
    if (brandConfig && brandConfig.headingFontSize) {
      style.setProperty('--heading-font-size', `${brandConfig.headingFontSize}px`);
    }
    if (brandConfig && brandConfig.bodyFontSize) {
      style.setProperty('--body-font-size', `${brandConfig.bodyFontSize}px`);
      document.body.style.fontSize = `${brandConfig.bodyFontSize}px`;
    }

    // Apply button styles
    if (brandConfig && brandConfig.buttonBorderRadius) {
      style.setProperty('--button-border-radius', `${brandConfig.buttonBorderRadius}px`);
    }
    if (brandConfig && brandConfig.buttonPadding) {
      style.setProperty('--button-padding', `${brandConfig.buttonPadding}px`);
    }
    if (brandConfig && brandConfig.buttonFontWeight) {
      style.setProperty('--button-font-weight', String(brandConfig.buttonFontWeight));
    }
  }, [brandConfig]);

  // Apply theme customization to DOM
  useEffect(() => {
    const style = document.documentElement.style;

    // Apply accent color
    if (themeConfig && themeConfig.accentColor) {
      style.setProperty('--theme-accent', themeConfig.accentColor);
    }

    // Apply custom dark background if provided
    if (themeConfig && themeConfig.customDarkBackground) {
      style.setProperty('--theme-dark-bg', themeConfig.customDarkBackground);
    }
    if (themeConfig && themeConfig.customDarkSurface) {
      style.setProperty('--theme-dark-surface', themeConfig.customDarkSurface);
    }
    if (themeConfig && themeConfig.customDarkText) {
      style.setProperty('--theme-dark-text', themeConfig.customDarkText);
    }

    // Apply light mode colors
    if (themeConfig && themeConfig.h1ColorLight) {
      style.setProperty('--color-h1-light', themeConfig.h1ColorLight);
    }
    if (themeConfig && themeConfig.h2ColorLight) {
      style.setProperty('--color-h2-light', themeConfig.h2ColorLight);
    }
    if (themeConfig && themeConfig.bodyColorLight) {
      style.setProperty('--color-body-light', themeConfig.bodyColorLight);
    }

    // Apply dark mode colors
    if (themeConfig && themeConfig.h1ColorDark) {
      style.setProperty('--color-h1-dark', themeConfig.h1ColorDark);
    }
    if (themeConfig && themeConfig.h2ColorDark) {
      style.setProperty('--color-h2-dark', themeConfig.h2ColorDark);
    }
    if (themeConfig && themeConfig.bodyColorDark) {
      style.setProperty('--color-body-dark', themeConfig.bodyColorDark);
    }
  }, [themeConfig]);

  // Apply system settings to DOM
  useEffect(() => {
    const root = document.documentElement;

    // Apply maintenance mode
    if (settings && settings.maintenanceMode) {
      root.setAttribute('data-maintenance-mode', 'true');
      document.body.style.display = 'none'; // Hide the app in maintenance mode
    } else {
      root.removeAttribute('data-maintenance-mode');
      document.body.style.display = 'block';
    }

    // Apply timezone
    if (settings && settings.timezone) {
      root.setAttribute('data-timezone', settings.timezone);
    }

    // Apply language
    if (settings && settings.defaultLanguage) {
      root.setAttribute('lang', settings.defaultLanguage);
    }
  }, [settings]);
}
