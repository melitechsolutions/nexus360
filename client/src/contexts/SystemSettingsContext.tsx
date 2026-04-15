import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { broadcastSystemUpdate } from '@/hooks/customizationBroadcast';

export interface SystemSettings {
  maintenanceMode?: boolean;
  maxUploadSize?: number;
  defaultLanguage?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  sessionTimeout?: number;
  enableNotifications?: boolean;
  enableAnalytics?: boolean;
  applicationName?: string;
  applicationDescription?: string;
  maintenanceMessage?: string;
  autoBackupEnabled?: boolean;
  autoBackupFrequency?: string;
  apiRateLimit?: number;
  fileUploadLimit?: number;
  [key: string]: any;
}

interface SystemSettingsContextType {
  settings: SystemSettings;
  updateSettings: (config: SystemSettings) => void;
  applySettingsToDOM: () => void;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

interface SystemSettingsProviderProps {
  children: ReactNode;
}

export function SystemSettingsProvider({ children }: SystemSettingsProviderProps) {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const stored = localStorage.getItem('melitech_system_settings');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const updateSettings = (config: SystemSettings) => {
    setSettings(prev => ({ ...prev, ...config }));
  };

  const applySettingsToDOM = () => {
    const root = document.documentElement;
    if (settings.maintenanceMode) {
      root.setAttribute('data-maintenance-mode', 'true');
    } else {
      root.removeAttribute('data-maintenance-mode');
    }
    
    if (settings.timezone) {
      root.setAttribute('data-timezone', settings.timezone);
    }
    
    if (settings.defaultLanguage) {
      root.setAttribute('lang', settings.defaultLanguage);
    }
  };

  // Persist to localStorage when settings change
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      localStorage.setItem('melitech_system_settings', JSON.stringify(settings));
      applySettingsToDOM();
      broadcastSystemUpdate(settings);
    }
  }, [settings]);

  return (
    <SystemSettingsContext.Provider value={{ settings, updateSettings, applySettingsToDOM }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  }
  return context;
}

// For store-like interface compatibility
export const useSystemSettingsStore = useSystemSettings;
