import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useBrand } from '@/contexts/BrandContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { useCurrency, CurrencyCode, CURRENCIES } from '@/pages/website/CurrencyContext';
import { useThemeCustomization } from '@/contexts/ThemeCustomizationContext';

/**
 * Fetches settings from the DB and syncs them to the frontend contexts.
 * Should be called once inside authenticated layouts (DashboardLayout, OrgLayout).
 */
export function useSettingsSync() {
  const { user } = useAuth();
  const lastDataRef = useRef<string>('');

  const { updateBrandConfig, updateCompanyBrand } = useBrand();
  const { updateSettings } = useSystemSettings();
  const { setCurrency } = useCurrency();
  const { updateThemeConfig } = useThemeCustomization();

  const { data } = trpc.settings.getPublicSettings.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data) return;

    // Only re-sync when data actually changes
    const dataHash = JSON.stringify(data);
    if (dataHash === lastDataRef.current) return;
    lastDataRef.current = dataHash;

    const { general, currency, theme, logos } = data;

    // ── Company name → BrandContext ─────────────────────────
    if (general.companyName) {
      updateBrandConfig({ companyName: general.companyName, brandName: general.companyName });
      updateCompanyBrand({ companyName: general.companyName });
    }

    // ── General settings → SystemSettingsContext ─────────────
    updateSettings({
      dateFormat: general.dateFormat || undefined,
      timezone: general.timezone || undefined,
      leftMenuPosition: general.leftMenuPosition || undefined,
    });

    // ── Currency → CurrencyContext ──────────────────────────
    // Settings page saves as "defaultCurrency", fallback to "currency" or general.currency
    const currCode = currency.defaultCurrency || currency.currency || general.currency;
    if (currCode) {
      const validCurrency = CURRENCIES.find(c => c.code === currCode);
      if (validCurrency) {
        setCurrency(currCode as CurrencyCode);
      }
    }

    // ── Theme settings → ThemeCustomizationContext ───────────
    // Map Settings page keys to ThemeCustomizationContext keys
    if (Object.keys(theme).length > 0) {
      const mapped: Record<string, string> = {};
      if (theme.primaryColor) mapped.customLightPrimary = theme.primaryColor;
      if (theme.primaryColor) mapped.customDarkPrimary = theme.primaryColor;
      if (theme.primaryColor) mapped.accentColor = theme.primaryColor;
      if (theme.sidebarColor) mapped.customDarkBackground = theme.sidebarColor;
      if (theme.headerColor) mapped.customLightBackground = theme.headerColor;
      if (theme.fontFamily) mapped.fontFamily = theme.fontFamily;
      if (theme.fontFamily) mapped.bodyFont = theme.fontFamily;
      if (theme.borderRadius) mapped.borderRadius = theme.borderRadius;
      if (theme.compactMode) mapped.compactMode = theme.compactMode;
      if (theme.sidebarStyle) mapped.sidebarStyle = theme.sidebarStyle;
      updateThemeConfig(mapped);
    }

    // ── Logos → BrandContext ──────────────────────────────────
    // Settings page saves as "largeLogo" and "smallLogo"
    const logoUrl = logos.largeLogo || logos.smallLogo;
    if (logoUrl) {
      updateBrandConfig({ brandLogoUrl: logoUrl });
    }
  }, [data]);

  return { data };
}
