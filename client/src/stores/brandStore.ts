import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { broadcastBrandUpdate } from '@/hooks/customizationBroadcast';

export interface BrandConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkPrimaryColor: string;
  darkSecondaryColor: string;
  darkAccentColor: string;
  lightGray: string;
  darkGray: string;
  lightText: string;
  darkText: string;
  fontFamily: string;
  headingFontSize: string;
  bodyFontSize: string;
  buttonBorderRadius: string;
  buttonPadding: string;
  buttonFontWeight: string;
}

export interface CompanyBrandGuide {
  companyName: string;
  companyDescription: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  logoUrl?: string;
  tagline: string;
  missionStatement: string;
  primaryBrandColor: string;
  secondaryBrandColor: string;
  accentBrandColor: string;
  fontFamilyBrand: string;
  brandVoice: "professional" | "friendly" | "creative" | "corporate";
}

const DEFAULT_BRAND_CONFIG: BrandConfig = {
  primaryColor: "#3B82F6",
  secondaryColor: "#10B981",
  accentColor: "#F59E0B",
  darkPrimaryColor: "#60A5FA",
  darkSecondaryColor: "#34D399",
  darkAccentColor: "#FBBF24",
  lightGray: "#F3F4F6",
  darkGray: "#374151",
  lightText: "#FFFFFF",
  darkText: "#1F2937",
  fontFamily: "Inter",
  headingFontSize: "32",
  bodyFontSize: "14",
  buttonBorderRadius: "8",
  buttonPadding: "12",
  buttonFontWeight: "500",
};

const DEFAULT_COMPANY_BRAND: CompanyBrandGuide = {
  companyName: "Your Company",
  companyDescription: "Company description",
  website: "https://yourcompany.com",
  email: "info@yourcompany.com",
  phone: "+1 (555) 000-0000",
  address: "123 Business Street, City, State",
  tagline: "Your company tagline",
  missionStatement: "Our mission statement",
  primaryBrandColor: "#3B82F6",
  secondaryBrandColor: "#10B981",
  accentBrandColor: "#F59E0B",
  fontFamilyBrand: "Inter",
  brandVoice: "professional",
};

interface BrandStore {
  // Brand Config
  brandConfig: BrandConfig;
  updateBrandConfig: (config: Partial<BrandConfig>) => void;
  resetBrandConfig: () => void;

  // Company Brand Guide
  companyBrand: CompanyBrandGuide;
  updateCompanyBrand: (guide: Partial<CompanyBrandGuide>) => void;
  resetCompanyBrand: () => void;

  // Utility
  applyBrandToDOM: () => void;
}

export const useBrandStore = create<BrandStore>()(
  persist(
    (set, get) => ({
      brandConfig: DEFAULT_BRAND_CONFIG,
      companyBrand: DEFAULT_COMPANY_BRAND,

      updateBrandConfig: (config) => {
        set((state) => ({
          brandConfig: { ...state.brandConfig, ...config },
        }));
        get().applyBrandToDOM();
        // Broadcast to all tabs
        const state = get();
        broadcastBrandUpdate(state.brandConfig, state.companyBrand);
      },

      resetBrandConfig: () => {
        set({ brandConfig: DEFAULT_BRAND_CONFIG });
        get().applyBrandToDOM();
      },

      updateCompanyBrand: (guide) => {
        set((state) => ({
          companyBrand: { ...state.companyBrand, ...guide },
        }));
      },

      resetCompanyBrand: () => {
        set({ companyBrand: DEFAULT_COMPANY_BRAND });
      },

      applyBrandToDOM: () => {
        const { brandConfig } = get();
        const root = document.documentElement;

        // Apply CSS custom properties for brand
        root.style.setProperty("--brand-primary", brandConfig.primaryColor);
        root.style.setProperty("--brand-secondary", brandConfig.secondaryColor);
        root.style.setProperty("--brand-accent", brandConfig.accentColor);
        root.style.setProperty("--brand-primary-dark", brandConfig.darkPrimaryColor);
        root.style.setProperty("--brand-secondary-dark", brandConfig.darkSecondaryColor);
        root.style.setProperty("--brand-accent-dark", brandConfig.darkAccentColor);
        root.style.setProperty("--brand-light-gray", brandConfig.lightGray);
        root.style.setProperty("--brand-dark-gray", brandConfig.darkGray);
        root.style.setProperty("--brand-light-text", brandConfig.lightText);
        root.style.setProperty("--brand-dark-text", brandConfig.darkText);
      },
    }),
    {
      name: "brand-store",
      version: 1,
    }
  )
);

// Apply brand on store initialization
if (typeof window !== "undefined") {
  useBrandStore.getState().applyBrandToDOM();
}
