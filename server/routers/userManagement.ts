import { router } from "./base.js";
import { protectedProcedure } from "../_core/trpc.js";
import { z } from "zod";
import { getDb } from "../db.js";
import { eq, and } from "drizzle-orm";
import { users, userDeletions } from "../../drizzle/schema.js";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac.js";
import { nanoid } from "nanoid";

/**
 * User Management Router
 * Handles user deletion, restoration, and admin functions
 */
export const userManagementRouter = router({
  /**
   * Delete a user (soft delete) - requires super_admin or ict_manager
   */
  deleteUser: createFeatureRestrictedProcedure("users:delete")
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get user being deleted
        const userToDelete = await db.query.users.findFirst({
          where: eq(users.id, input.userId),
        });

        if (!userToDelete) {
          throw new Error("User not found");
        }

        // Create deletion record
        const deletion = {
          id: nanoid(16),
          userId: input.userId,
          userName: userToDelete.name || "Unknown",
          userEmail: userToDelete.email || "unknown@example.com",
          deletedReason: input.reason || "Deleted by admin",
          deletedBy: ctx.user.id,
          archived: 1,
          deletedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };

        // Insert deletion record
        await db.insert(userDeletions).values(deletion);

        // Mark user as inactive (soft delete)
        await db
          .update(users)
          .set({
            isActive: 0,
            lastSignedIn: new Date().toISOString().replace('T', ' ').substring(0, 19), // Update to prevent confusion
          })
          .where(eq(users.id, input.userId));

        return {
          success: true,
          message: `User ${userToDelete.email} has been archived`,
          deletionId: deletion.id,
        };
      } catch (error) {
        console.error("[User Management] Delete user error:", error);
        throw error;
      }
    }),

  /**
   * List all deleted users
   */
  listDeletedUsers: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const deletedUsers = await db.query.userDeletions.findMany({
          limit: input.limit,
          offset: input.offset,
          orderBy: (ud, { desc }) => desc(ud.deletedAt),
        });

        const total = await db.query.userDeletions.findMany();

        return {
          success: true,
          data: deletedUsers,
          pagination: {
            total: total.length,
            limit: input.limit,
            offset: input.offset,
          },
        };
      } catch (error) {
        console.error("[User Management] List deleted users error:", error);
        throw error;
      }
    }),

  /**
   * Restore a deleted user
   */
  restoreUser: createFeatureRestrictedProcedure("users:edit")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Get deletion record
        const deletion = await db.query.userDeletions.findFirst({
          where: eq(userDeletions.userId, input.userId),
        });

        if (!deletion) {
          throw new Error("No deletion record found for this user");
        }

        // Update deletion record
        await db
          .update(userDeletions)
          .set({
            archived: 0,
            restoredAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            restoredBy: ctx.user.id,
          })
          .where(eq(userDeletions.userId, input.userId));

        // Reactivate user
        await db
          .update(users)
          .set({ isActive: 1 })
          .where(eq(users.id, input.userId));

        return {
          success: true,
          message: "User has been restored successfully",
        };
      } catch (error) {
        console.error("[User Management] Restore user error:", error);
        throw error;
      }
    }),

  /**
   * Permanently delete a user (hard delete - irreversible)
   */
  permanentlyDeleteUser: createFeatureRestrictedProcedure("users:delete")
    .input(
      z.object({
        userId: z.string(),
        confirmationPhrase: z.literal("PERMANENT_DELETE"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        // Safety check - user must confirm
        if (input.confirmationPhrase !== "PERMANENT_DELETE") {
          throw new Error("Confirmation phrase incorrect");
        }

        // Get user
        const userToDelete = await db.query.users.findFirst({
          where: eq(users.id, input.userId),
        });

        if (!userToDelete) {
          throw new Error("User not found");
        }

        // Delete from database (irreversible)
        await db.delete(users).where(eq(users.id, input.userId));

        return {
          success: true,
          message: `User ${userToDelete.email} has been permanently deleted`,
        };
      } catch (error) {
        console.error("[User Management] Permanent delete error:", error);
        throw error;
      }
    }),

  /**
   * Get users with inactive status (candidates for deletion)
   */
  getInactiveUsers: protectedProcedure
    .input(
      z.object({
        inactiveDays: z.number().default(90),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - input.inactiveDays);

        // Query users with no activity in specified days
        const result = await db.query.users.findMany({
          where: and(
            eq(users.isActive, 1),
            (db as any).raw(
              `lastSignedIn < '${sinceDate.toISOString().replace('T', ' ').substring(0, 19)}' OR lastSignedIn IS NULL`
            )
          ),
          limit: input.limit,
        });

        return {
          success: true,
          data: result || [],
          inactiveSince: sinceDate.toISOString(),
        };
      } catch (error) {
        console.error("[User Management] Get inactive users error:", error);
        throw error;
      }
    }),

  /**
   * Enable password change requirement on first login
   */
  requirePasswordChange: createFeatureRestrictedProcedure("users:edit")
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      try {
        await db
          .update(users)
          .set({ requiresPasswordChange: 1 })
          .where(eq(users.id, input.userId));

        return {
          success: true,
          message: "User will be required to change password on next login",
        };
      } catch (error) {
        console.error("[User Management] Require password change error:", error);
        throw error;
      }
    }),
});
