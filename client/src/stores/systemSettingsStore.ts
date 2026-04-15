import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { broadcastSystemUpdate } from '@/hooks/customizationBroadcast';

export interface SystemSettings {
  applicationName: string;
  applicationDescription: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  autoBackupEnabled: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
  backupRetentionDays: number;
  emailNotificationsEnabled: boolean;
  systemLogsEnabled: boolean;
  apiRateLimitPerMinute: number;
  sessionTimeoutMinutes: number;
  twoFactorAuthenticationRequired: boolean;
  fileUploadLimitMB: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  applicationName: "CRM Platform",
  applicationDescription: "Enterprise CRM and Business Management System",
  maintenanceMode: false,
  maintenanceMessage: "The system is under maintenance. Please try again later.",
  autoBackupEnabled: true,
  backupFrequency: "daily",
  backupRetentionDays: 30,
  emailNotificationsEnabled: true,
  systemLogsEnabled: true,
  apiRateLimitPerMinute: 60,
  sessionTimeoutMinutes: 30,
  twoFactorAuthenticationRequired: false,
  fileUploadLimitMB: 100,
};

interface SystemSettingsStore {
  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  resetSettings: () => void;
  getSettings: () => SystemSettings;
  applySettingsToDOM: () => void;
}

export const useSystemSettingsStore = create<SystemSettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
        get().applySettingsToDOM();
        // Broadcast to all tabs
        const state = get();
        broadcastSystemUpdate(state.settings);
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
        get().applySettingsToDOM();
      },

      getSettings: () => {
        return get().settings;
      },

      applySettingsToDOM: () => {
        const { settings } = get();

        // Update application title in the document
        if (typeof document !== "undefined") {
          document.title = settings.applicationName;
        }

        // Apply CSS custom properties
        const root = document.documentElement;
        root.style.setProperty("--app-name", JSON.stringify(settings.applicationName));
        root.style.setProperty("--session-timeout", `${settings.sessionTimeoutMinutes}m`);

        // If maintenance mode is enabled, optionally show a banner
        if (settings.maintenanceMode && typeof window !== "undefined") {
          // Dispatch custom event that components can listen to
          window.dispatchEvent(
            new CustomEvent("maintenanceModeChanged", {
              detail: {
                enabled: true,
                message: settings.maintenanceMessage,
              },
            })
          );
        }
      },
    }),
    {
      name: "system-settings-store",
      version: 1,
    }
  )
);

// Apply settings on store initialization
if (typeof window !== "undefined") {
  useSystemSettingsStore.getState().applySettingsToDOM();
}
