import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { broadcastBrandUpdate } from '@/hooks/customizationBroadcast';

/** Strip any base64 data-URL values (logos etc.) before persisting to localStorage.
 *  These belong in the DB/API, not in a ~5 MB localStorage quota. */
function stripLargeValues(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string' && (val.startsWith('data:') || val.length > 8192)) {
      // Skip base64 data-URLs and unexpectedly large strings
      continue;
    }
    result[key] = val;
  }
  return result;
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      try {
        // Re-try with large fields stripped
        const parsed = JSON.parse(value);
        localStorage.setItem(key, JSON.stringify(stripLargeValues(parsed)));
      } catch {
        console.warn(`[BrandContext] Could not persist "${key}" to localStorage – quota exceeded.`);
      }
    }
  }
}

export interface BrandConfig {
  brandName?: string;
  brandLogoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  companyName?: string;
  tagline?: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

interface BrandContextType {
  brandConfig: BrandConfig;
  companyBrand: BrandConfig;
  updateBrandConfig: (config: BrandConfig) => void;
  updateCompanyBrand: (brand: BrandConfig) => void;
  applyBrandToDOM: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(() => {
    try {
      const stored = localStorage.getItem('melitech_brand_config');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [companyBrand, setCompanyBrand] = useState<BrandConfig>(() => {
    try {
      const stored = localStorage.getItem('melitech_company_brand');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updateBrandConfig = (config: BrandConfig) => {
    setBrandConfig(prev => ({ ...prev, ...config }));
  };

  const updateCompanyBrand = (brand: BrandConfig) => {
    setCompanyBrand(prev => ({ ...prev, ...brand }));
  };

  const applyBrandToDOM = () => {
    const root = document.documentElement;
    // Brand sets only --brand-* scoped CSS vars + sidebar accent
    // Theme Customization controls --primary/--secondary/--accent (UI appearance)
    if (brandConfig.primaryColor) {
      root.style.setProperty('--brand-primary', brandConfig.primaryColor);
      root.style.setProperty('--sidebar-primary', brandConfig.primaryColor);
    }
    if (brandConfig.secondaryColor) {
      root.style.setProperty('--brand-secondary', brandConfig.secondaryColor);
    }
    if (brandConfig.accentColor) {
      root.style.setProperty('--brand-accent', brandConfig.accentColor);
    }
    if (brandConfig.fontFamily) {
      root.style.setProperty('--font-family', brandConfig.fontFamily);
      document.body.style.fontFamily = brandConfig.fontFamily;
    }
  };

  // Persist to localStorage whenever brand config changes
  useEffect(() => {
    if (Object.keys(brandConfig).length > 0) {
      safeSetItem('melitech_brand_config', JSON.stringify(brandConfig));
      applyBrandToDOM();
      broadcastBrandUpdate(brandConfig, companyBrand);
    }
  }, [brandConfig]);

  // Persist company brand to localStorage
  useEffect(() => {
    safeSetItem('melitech_company_brand', JSON.stringify(companyBrand));
  }, [companyBrand]);

  return (
    <BrandContext.Provider value={{ brandConfig, companyBrand, updateBrandConfig, updateCompanyBrand, applyBrandToDOM }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  return context;
}

// For store-like interface compatibility
export const useBrandStore = useBrand;
