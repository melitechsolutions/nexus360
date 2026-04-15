/**
 * Cross-Tab Communication Hook
 * Listens for customization changes from other tabs via BroadcastChannel
 * Automatically applies changes to local state and DOM
 */

import { useEffect } from "react";
import { useBrand } from "@/contexts/BrandContext";
import { useThemeCustomization } from "@/contexts/ThemeCustomizationContext";
import { useHomepageBuilder } from "@/contexts/HomepageBuilderContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

type CustomizationEvent =
  | { type: "brand"; payload: any }
  | { type: "theme"; payload: any }
  | { type: "homepage"; payload: any }
  | { type: "system"; payload: any };

/**
 * Get BroadcastChannel instance for customization updates
 * Gracefully handles environments where BroadcastChannel is not available
 */
const getBroadcastChannel = (): BroadcastChannel | null => {
  if (typeof window === "undefined") return null;
  try {
    return new BroadcastChannel("melitech_crm_customization");
  } catch (e) {
    return null;
  }
};

/**
 * Hook to listen for customization changes from other tabs
 * Automatically updates local state when changes are broadcast
 */
export const useCustomizationListener = () => {
  const { updateBrandConfig, updateCompanyBrand, applyBrandToDOM } = useBrand();
  const { updateThemeConfig, applyThemeToDOM } = useThemeCustomization();
  const { reorderWidgets } = useHomepageBuilder();
  const { updateSettings, applySettingsToDOM } = useSystemSettings();

  useEffect(() => {
    const channel = getBroadcastChannel();
    if (!channel) return;

    const handleMessage = (event: MessageEvent<CustomizationEvent>) => {
      const { type, payload } = event.data;

      switch (type) {
        case "brand":
          if (payload.brandConfig) updateBrandConfig(payload.brandConfig);
          if (payload.companyBrand) updateCompanyBrand(payload.companyBrand);
          applyBrandToDOM();
          break;
        case "theme":
          if (payload.config) updateThemeConfig(payload.config);
          applyThemeToDOM();
          break;
        case "homepage":
          if (payload.widgetOrder) reorderWidgets(payload.widgetOrder);
          break;
        case "system":
          if (payload.settings) updateSettings(payload.settings);
          applySettingsToDOM();
          break;
        default:
          break;
      }
    };

    channel.addEventListener("message", handleMessage);
    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [updateBrandConfig, updateCompanyBrand, applyBrandToDOM, updateThemeConfig, applyThemeToDOM, reorderWidgets, updateSettings, applySettingsToDOM]);
};


