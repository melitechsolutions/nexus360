import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const readProcedure = createFeatureRestrictedProcedure("settings:view");
const writeProcedure = createFeatureRestrictedProcedure("settings:edit");

// Zod schema for theme configuration
const ThemePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  surfaceColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  mutedColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
});

const CardBackgroundSchema = z.object({
  id: z.string(),
  name: z.string(),
  lightMode: z.string(),
  darkMode: z.string(),
});

const ThemeConfigSchema = z.object({
  darkModePreset: z.string().default("slate_dark"),
  cardBackgroundStyle: z.string().default("solid"),
  customDarkPresets: z.array(ThemePresetSchema).optional(),
  customCardStyles: z.array(CardBackgroundSchema).optional(),
  customDarkBackground: z.string().optional(),
  customDarkSurface: z.string().optional(),
  customDarkText: z.string().optional(),
  customCardBackground: z.string().optional(),
  accentColor: z.string().default("#3b82f6"),
  
  // Font Colors - Light Mode
  h1ColorLight: z.string().default("#000000"),
  h2ColorLight: z.string().default("#000000"),
  h3ColorLight: z.string().default("#000000"),
  h4ColorLight: z.string().default("#000000"),
  h5ColorLight: z.string().default("#000000"),
  h6ColorLight: z.string().default("#000000"),
  bodyColorLight: z.string().default("#333333"),
  mutedColorLight: z.string().default("#666666"),
  
  // Font Colors - Dark Mode
  h1ColorDark: z.string().default("#ffffff"),
  h2ColorDark: z.string().default("#ffffff"),
  h3ColorDark: z.string().default("#ffffff"),
  h4ColorDark: z.string().default("#ffffff"),
  h5ColorDark: z.string().default("#ffffff"),
  h6ColorDark: z.string().default("#ffffff"),
  bodyColorDark: z.string().default("#e5e5e5"),
  mutedColorDark: z.string().default("#999999"),
  
  lastUpdated: z.string().optional(),
});

type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

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
  h2ColorDark: "#ffffff",
  h3ColorDark: "#ffffff",
  h4ColorDark: "#ffffff",
  h5ColorDark: "#ffffff",
  h6ColorDark: "#ffffff",
  bodyColorDark: "#e5e5e5",
  mutedColorDark: "#999999",
  
  lastUpdated: new Date().toISOString(),
};

export const themeCustomizationRouter = router({
  /**
   * Get current theme customization settings
   */
  getConfig: readProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return DEFAULT_THEME_CONFIG;

      const setting = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.category, "theme"),
            eq(systemSettings.key, "customization")
          )
        )
        .limit(1);

      if (setting.length === 0) return DEFAULT_THEME_CONFIG;

      if (setting[0].dataType === "json" && setting[0].value) {
        return JSON.parse(setting[0].value) as ThemeConfig;
      }

      return DEFAULT_THEME_CONFIG;
    } catch (error) {
      console.error("Error fetching theme config:", error);
      return DEFAULT_THEME_CONFIG;
    }
  }),

  /**
   * Save theme customization settings (admin/super_admin only)
   */
  saveConfig: writeProcedure
    .input(ThemeConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin or super_admin
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new Error("Unauthorized: Only admins can modify theme settings");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const configWithTimestamp = {
          ...input,
          lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        const existingSetting = await db
          .select()
          .from(systemSettings)
          .where(
            and(
              eq(systemSettings.category, "theme"),
              eq(systemSettings.key, "customization")
            )
          )
          .limit(1);

        const settingId = uuid();

        if (existingSetting.length === 0) {
          // Create new setting
          await db.insert(systemSettings).values({
            id: settingId,
            category: "theme",
            key: "customization",
            value: JSON.stringify(configWithTimestamp),
            dataType: "json",
            description: "Theme customization settings for the application",
            isPublic: 1,
            updatedBy: ctx.user.id,
          });
        } else {
          // Update existing setting
          await db
            .update(systemSettings)
            .set({
              value: JSON.stringify(configWithTimestamp),
              updatedBy: ctx.user.id,
            })
            .where(
              and(
                eq(systemSettings.category, "theme"),
                eq(systemSettings.key, "customization")
              )
            );
        }

        return {
          success: true,
          config: configWithTimestamp,
          message: "Theme settings saved successfully",
        };
      } catch (error) {
        console.error("Error saving theme config:", error);
        throw new Error("Failed to save theme settings");
      }
    }),

  /**
   * Reset theme settings to default
   */
  resetToDefault: writeProcedure.mutation(async ({ ctx }) => {
    // Check if user is admin or super_admin
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
      throw new Error("Unauthorized: Only admins can reset theme settings");
    }

    try {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const settingId = uuid();
      const defaultConfigWithTimestamp = {
        ...DEFAULT_THEME_CONFIG,
        lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };

      const existingSetting = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.category, "theme"),
            eq(systemSettings.key, "customization")
          )
        )
        .limit(1);

      if (existingSetting.length === 0) {
        await db.insert(systemSettings).values({
          id: settingId,
          category: "theme",
          key: "customization",
          value: JSON.stringify(defaultConfigWithTimestamp),
          dataType: "json",
          description: "Theme customization settings for the application",
          isPublic: 1,
          updatedBy: ctx.user.id,
        });
      } else {
        await db
          .update(systemSettings)
          .set({
            value: JSON.stringify(defaultConfigWithTimestamp),
            updatedBy: ctx.user.id,
          })
          .where(
            and(
              eq(systemSettings.category, "theme"),
              eq(systemSettings.key, "customization")
            )
          );
      }

      return {
        success: true,
        config: defaultConfigWithTimestamp,
        message: "Theme settings reset to default",
      };
    } catch (error) {
      console.error("Error resetting theme config:", error);
      throw new Error("Failed to reset theme settings");
    }
  }),

  /**
   * Add custom dark mode preset
   */
  addCustomPreset: writeProcedure
    .input(ThemePresetSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new Error("Unauthorized: Only admins can modify theme presets");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const currentConfig = await db
          .select()
          .from(systemSettings)
          .where(
            and(
              eq(systemSettings.category, "theme"),
              eq(systemSettings.key, "customization")
            )
          )
          .limit(1);

        let config: ThemeConfig = DEFAULT_THEME_CONFIG;
        if (currentConfig.length > 0 && currentConfig[0].value) {
          config = JSON.parse(currentConfig[0].value);
        }

        if (!config.customDarkPresets) {
          config.customDarkPresets = [];
        }

        config.customDarkPresets.push(input);
        config.lastUpdated = new Date().toISOString().replace('T', ' ').substring(0, 19);

        if (currentConfig.length === 0) {
          await db.insert(systemSettings).values({
            id: uuid(),
            category: "theme",
            key: "customization",
            value: JSON.stringify(config),
            dataType: "json",
            description: "Theme customization settings for the application",
            isPublic: 1,
            updatedBy: ctx.user.id,
          });
        } else {
          await db
            .update(systemSettings)
            .set({
              value: JSON.stringify(config),
              updatedBy: ctx.user.id,
            })
            .where(
              and(
                eq(systemSettings.category, "theme"),
                eq(systemSettings.key, "customization")
              )
            );
        }

        return {
          success: true,
          preset: input,
          message: "Custom preset added successfully",
        };
      } catch (error) {
        console.error("Error adding custom preset:", error);
        throw new Error("Failed to add custom preset");
      }
    }),

  /**
   * Export theme configuration as JSON
   */
  exportConfig: readProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return DEFAULT_THEME_CONFIG;

      const setting = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.category, "theme"),
            eq(systemSettings.key, "customization")
          )
        )
        .limit(1);

      if (setting.length === 0) return DEFAULT_THEME_CONFIG;

      if (setting[0].dataType === "json" && setting[0].value) {
        return JSON.parse(setting[0].value) as ThemeConfig;
      }

      return DEFAULT_THEME_CONFIG;
    } catch (error) {
      console.error("Error exporting theme config:", error);
      return DEFAULT_THEME_CONFIG;
    }
  }),
});
