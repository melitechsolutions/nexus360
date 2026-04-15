import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { TRPCError } from "@trpc/server";

const readProcedure = createFeatureRestrictedProcedure("settings:view");
const writeProcedure = createFeatureRestrictedProcedure("settings:edit");

// Zod schema for brand configuration
const BrandConfigSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  darkPrimaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  darkSecondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  darkAccentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  lightGray: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  darkGray: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  lightText: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  darkText: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color"),
  fontFamily: z.string().min(1),
  headingFontSize: z.string().regex(/^\d+$/, "Must be a number"),
  bodyFontSize: z.string().regex(/^\d+$/, "Must be a number"),
  buttonBorderRadius: z.string().regex(/^\d+$/, "Must be a number"),
  buttonPadding: z.string().regex(/^\d+$/, "Must be a number"),
  buttonFontWeight: z.string().regex(/^\d+$/, "Must be a number"),
});

type BrandConfig = z.infer<typeof BrandConfigSchema>;

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

export const brandCustomizationRouter = router({
  /**
   * Get current brand customization settings
   */
  getConfig: readProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return DEFAULT_BRAND_CONFIG;

      const setting = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.category, "brand"),
            eq(systemSettings.key, "customization")
          )
        )
        .limit(1);

      if (setting.length === 0) return DEFAULT_BRAND_CONFIG;

      if (setting[0].dataType === "json" && setting[0].value) {
        return JSON.parse(setting[0].value) as BrandConfig;
      }

      return DEFAULT_BRAND_CONFIG;
    } catch (error) {
      console.error("Error fetching brand config:", error);
      return DEFAULT_BRAND_CONFIG;
    }
  }),

  /**
   * Save brand customization settings (admin/super_admin only)
   */
  saveConfig: writeProcedure
    .input(BrandConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin or super_admin
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can modify brand settings"
        });
      }

      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed"
          });
        }

        const existingSetting = await db
          .select()
          .from(systemSettings)
          .where(
            and(
              eq(systemSettings.category, "brand"),
              eq(systemSettings.key, "customization")
            )
          )
          .limit(1);

        const settingId = uuid();
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");

        if (existingSetting.length === 0) {
          // Create new setting
          await db.insert(systemSettings).values({
            id: settingId,
            category: "brand",
            key: "customization",
            value: JSON.stringify(input),
            dataType: "json",
            description: "Brand customization settings for the application",
            isPublic: 1,
            updatedBy: ctx.user.id,
            updatedAt: now,
          });
        } else {
          // Update existing setting
          await db
            .update(systemSettings)
            .set({
              value: JSON.stringify(input),
              updatedBy: ctx.user.id,
              updatedAt: now,
            })
            .where(
              and(
                eq(systemSettings.category, "brand"),
                eq(systemSettings.key, "customization")
              )
            );
        }

        return {
          success: true,
          config: input,
          message: "Brand settings saved successfully",
        };
      } catch (error) {
        console.error("Error saving brand config:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save brand settings"
        });
      }
    }),

  /**
   * Reset brand settings to default
   */
  resetToDefault: writeProcedure.mutation(async ({ ctx }) => {
    // Check if user is admin or super_admin
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can reset brand settings"
      });
    }

    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed"
        });
      }

      const settingId = uuid();
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      const existingSetting = await db
        .select()
        .from(systemSettings)
        .where(
          and(
            eq(systemSettings.category, "brand"),
            eq(systemSettings.key, "customization")
          )
        )
        .limit(1);

      if (existingSetting.length === 0) {
        await db.insert(systemSettings).values({
          id: settingId,
          category: "brand",
          key: "customization",
          value: JSON.stringify(DEFAULT_BRAND_CONFIG),
          dataType: "json",
          description: "Brand customization settings for the application",
          isPublic: 1,
          updatedBy: ctx.user.id,
          updatedAt: now,
        });
      } else {
        await db
          .update(systemSettings)
          .set({
            value: JSON.stringify(DEFAULT_BRAND_CONFIG),
            updatedBy: ctx.user.id,
            updatedAt: now,
          })
          .where(
            and(
              eq(systemSettings.category, "brand"),
              eq(systemSettings.key, "customization")
            )
          );
      }

      return {
        success: true,
        config: DEFAULT_BRAND_CONFIG,
        message: "Brand settings reset to default",
      };
    } catch (error) {
      console.error("Error resetting brand config:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reset brand settings"
      });
    }
  }),
});
