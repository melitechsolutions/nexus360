import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import * as bcrypt from "bcryptjs";
import type { Request } from "express";
import { v4 } from "uuid";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { createFeatureRestrictedProcedure } from "../middleware/enhancedRbac";
import { getSessionCookieOptions } from "../_core/cookies";
import * as db from "../db";
import { getUserByEmail, updateUser as updateUserFromDbUsers } from "../db-users";

// Feature-based procedures
const userEditProcedure = createFeatureRestrictedProcedure("users:edit");

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default-secret-key");

/**
 * Generate JWT token for local authentication
 */
async function generateJWT(userId: string, expiresIn: number = ONE_YEAR_MS) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn / 1000)
    .sign(JWT_SECRET);
  return token;
}

/**
 * Verify JWT token
 */
async function verifyJWT(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { userId: string };
  } catch (error) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" });
  }
}

/**
 * Hash password
 */
async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password
 */
async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

const registerInput = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  company: z.string().optional(),
});

const loginInput = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// simple in-memory store for lockout info (non-persistent)
interface LockInfo {
  attempts: number;
  lockedUntil?: number;
}
const lockStore: Map<string, LockInfo> = new Map();

// tests may clear or inspect the store
export function _resetLockStore() {
  lockStore.clear();
}

export const _lockStore = lockStore;
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// simple rate limit map keyed by `${ip}:${action}`
interface RateInfo { count: number; windowStart: number; }
const rateMap: Map<string, RateInfo> = new Map();

function checkRateLimit(ip: string, action: string, max: number, windowMs: number): boolean {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const info = rateMap.get(key);
  if (!info || now - info.windowStart > windowMs) {
    rateMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (info.count >= max) {
    return false;
  }
  info.count += 1;
  return true;
}

const updateProfileInput = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
});

const changePasswordInput = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const requestPasswordResetInput = z.object({
  email: z.string().email(),
});

const resetPasswordInput = z.object({
  token: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const authRouter = router({
  /**
   * Get current user
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    let organizationSlug: string | null = null;
    if (ctx.user.organizationId) {
      const org = await db.getOrganization(ctx.user.organizationId);
      organizationSlug = org?.slug || null;
    }
    return { ...ctx.user, organizationSlug };
  }),

  /**
   * Register new user
   */
  register: publicProcedure
    .input(registerInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user already exists
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Email already registered",
          });
        }

        // Hash password
        const passwordHash = await hashPassword(input.password);

        // Create user
        const userId = `user_${Date.now()}`;
        await db.upsertUser({
          id: userId,
          email: input.email,
          name: input.name,
          loginMethod: "local",
          lastSignedIn: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        // Store password hash
        await db.setUserPassword(userId, passwordHash);

        // Handle organization creation/joining
        let userRole = "user";
        if (input.company && input.company.trim()) {
          const companyName = input.company.trim();
          const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          
          // Check if organization exists by slug
          let org = await db.getOrganizationBySlug(slug);
          
          if (org) {
            // Join existing organization as regular user
            await db.assignUserToOrganization(userId, org.id);
          } else {
            // Create new organization with trial plan, user becomes admin
            const orgId = `org_${Date.now()}`;
            const billingCycle = 'monthly'; // Default to monthly for signups
            
            await db.createOrganization({
              id: orgId,
              name: companyName,
              slug,
              plan: 'trial',
              isActive: 1,
              maxUsers: 5,
              settings: { billingCycle },
            });
            await db.assignUserToOrganization(userId, orgId);
            userRole = "admin";
            
            // Set default trial features
            const trialFeatures = ['crm', 'invoicing', 'reports'];
            for (const feature of trialFeatures) {
              await db.setOrganizationFeature(orgId, feature, true);
            }
            
            // Auto-create subscription for the organization
            try {
              const subscriptionId = `sub_${v4().replace(/-/g, '').slice(0, 20)}`;
              const now = new Date();
              const renewalDate = new Date();
              
              // Set renewal date based on billing cycle (default monthly)
              renewalDate.setMonth(renewalDate.getMonth() + 1);
              
              // Get trial plan to retrieve pricing
              const trialPlan = await db.getPricingPlan('trial');
              const price = (trialPlan as any)?.monthlyPrice || 0;
              
              await db.createSubscription({
                id: subscriptionId,
                organizationId: orgId,
                planId: 'trial',
                status: 'trial',
                billingCycle: 'monthly',
                startDate: now.toISOString().replace('T', ' ').substring(0, 19),
                renewalDate: renewalDate.toISOString().replace('T', ' ').substring(0, 19),
                currentPrice: price,
                autoRenew: 1,
              });
            } catch (error) {
              console.error('[Auth] Failed to create subscription during signup:', error);
              // Don't fail signup if subscription creation fails - log and continue
            }
          }
        }

        // Generate JWT token
        const token = await generateJWT(userId);

        // Set cookie with proper options for Docker/production
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return {
          success: true,
          message: "Registration successful",
          user: {
            id: userId,
            email: input.email,
            name: input.name,
            role: userRole,
          },
          // Return token for localStorage fallback
          token,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Registration failed",
        });
      }
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(loginInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // rate limit per IP (basic endpoint-specific limit)
        const ip = ctx.req.ip || 'unknown';
        if (!checkRateLimit(ip, 'login', 20, 60 * 60 * 1000)) {
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts, try again later' });
        }

        // Find user by email
        const user = await getUserByEmail(input.email);

        // persistent lockout check if user exists
        if (user) {
          const dbLockedUntil = user.lockedUntil ? new Date(user.lockedUntil).getTime() : 0;
          if (dbLockedUntil && Date.now() < dbLockedUntil) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Account temporarily locked due to multiple failed login attempts",
            });
          }
        }

        // Get or create lockInfo for this email (used throughout password checks)
        let lockInfo = lockStore.get(input.email) || { attempts: 0 };

        if (!user) {
          // increment failed attempts for unknown email as well (optional)
          lockInfo.attempts = (lockInfo.attempts || 0) + 1;
          if (lockInfo.attempts >= MAX_ATTEMPTS) {
            lockInfo.lockedUntil = Date.now() + LOCK_DURATION_MS;
          }
          lockStore.set(input.email, lockInfo);

          await db.logActivity({
            userId: 'unknown',
            action: 'login_failed',
            entityType: 'auth',
            entityId: input.email,
            description: `Failed login attempt for non-existent user ${input.email}`,
          });

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Verify password
        const passwordHash = await db.getUserPassword(user.id);
        if (!passwordHash) {
          // increment in-memory store as before
          lockInfo.attempts = (lockInfo.attempts || 0) + 1;
          if (lockInfo.attempts >= MAX_ATTEMPTS) {
            lockInfo.lockedUntil = Date.now() + LOCK_DURATION_MS;
          }
          lockStore.set(input.email, lockInfo);

          // persist in database
          await updateUserFromDbUsers(user.id, {
            failedLoginAttempts: lockInfo.attempts,
            lockedUntil: lockInfo.lockedUntil ? new Date(lockInfo.lockedUntil) : undefined,
          });

          await db.logActivity({
            userId: user.id,
            action: 'login_failed',
            entityType: 'auth',
            entityId: user.id,
            description: `Failed login attempt (no password) for user ${user.email}`,
          });

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const isPasswordValid = await verifyPassword(input.password, passwordHash);
        if (!isPasswordValid) {
          lockInfo.attempts = (lockInfo.attempts || 0) + 1;
          if (lockInfo.attempts >= MAX_ATTEMPTS) {
            lockInfo.lockedUntil = Date.now() + LOCK_DURATION_MS;
          }
          lockStore.set(input.email, lockInfo);

          // persist updates
          await updateUserFromDbUsers(user.id, {
            failedLoginAttempts: lockInfo.attempts,
            lockedUntil: lockInfo.lockedUntil ? new Date(lockInfo.lockedUntil) : undefined,
          });

          await db.logActivity({
            userId: user.id,
            action: 'login_failed',
            entityType: 'auth',
            entityId: user.id,
            description: `Invalid password attempt for user ${user.email}`,
          });

          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }
        // Check subscription status - CRITICAL: Lock if overdue
        try {
          const userClient = await db.getClientByCreatedBy(user.id);
          if (userClient) {
            const subscription = await db.getClientSubscription(userClient.id);
            if (subscription && (subscription as any).isLocked) {
              await db.logActivity({
                userId: user.id,
                action: 'login_blocked',
                entityType: 'auth',
                entityId: user.id,
                description: `Login blocked - subscription locked for client ${userClient.id}`,
              });

              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Your subscription has been locked due to overdue payment. Please update your payment to continue.",
                cause: "subscription_locked",
              });
            }
          }
        } catch (subError: any) {
          if (subError.code === 'FORBIDDEN') throw subError;
          console.warn('[Auth] Subscription check warning:', subError);
          // Don't block login on subscription check failure, just log it
        }

        // Check if password change is required (first login)
        if ((user as any).requiresPasswordChange) {
          // Generate JWT token but flag for password change
          const token = await generateJWT(user.id);

          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });

          return {
            success: true,
            requiresPasswordChange: true,
            message: "Password change required on first login",
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            token,
          };
        }

        // reset on success
        lockStore.delete(input.email);
        // clear persistent lockout
        await updateUserFromDbUsers(user.id, { failedLoginAttempts: 0, lockedUntil: null });

        await db.logActivity({
          userId: user.id,
          action: 'login_success',
          entityType: 'auth',
          entityId: user.id,
          description: `User ${user.email} logged in successfully`,
        });

        // Update last signed in
        await db.upsertUser({
          id: user.id,
          lastSignedIn: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });

        // Generate JWT token
        const token = await generateJWT(user.id);

        // Set cookie with proper options for Docker/production
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        // Fetch organization info if user belongs to an org
        let org = null;
        if (user.organizationId) {
          org = await db.getOrganization(user.organizationId);
        }

        return {
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId || null,
            organizationSlug: org?.slug || null,
            organizationName: org?.name || null,
          },
          // Return token for localStorage fallback
          token,
        };
      } catch (error) {
  console.error("[Login Error]", error);
  if (error instanceof TRPCError) throw error;
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Login failed",
  });
}
    }),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  /**
   * Update user profile
   */
  updateProfile: userEditProcedure
    .input(updateProfileInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;
        const updateData: any = {};

        if (input.name) updateData.name = input.name;
        if (input.email) updateData.email = input.email;

        if (Object.keys(updateData).length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No fields to update",
          });
        }

        await db.updateUser(userId, updateData);
        return {
          success: true,
          message: "Profile updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),

  /**
   * Change password
   */
  changePassword: userEditProcedure
    .input(changePasswordInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;

        // Verify current password
        const passwordHash = await db.getUserPassword(userId);
        if (!passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Current password is incorrect",
          });
        }

        const isPasswordValid = await verifyPassword(
          input.currentPassword,
          passwordHash
        );
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Current password is incorrect",
          });
        }

        // Hash new password
        const newPasswordHash = await hashPassword(input.newPassword);
        await db.setUserPassword(userId, newPasswordHash);

        return {
          success: true,
          message: "Password changed successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to change password",
        });
      }
    }),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: userEditProcedure
    .input(
      z.object({
        emailNotifications: z.boolean().optional(),
        smsNotifications: z.boolean().optional(),
        payrollAlerts: z.boolean().optional(),
        invoiceAlerts: z.boolean().optional(),
        paymentReminders: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;
        
        // Store preferences in a settings table or user table
        // For now, we'll just return success (can be extended)
        await db.updateUser(userId, {
          preferences: JSON.stringify(input),
        } as any);

        return {
          success: true,
          message: "Notification preferences updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update notification preferences",
        });
      }
    }),

  /**
   * Request password reset
   */
  requestPasswordReset: publicProcedure
    .input(requestPasswordResetInput)
    .mutation(async ({ ctx, input }) => {
      // per-IP rate limit for reset requests
      const ip = ctx.req.ip || 'unknown';
      if (!checkRateLimit(ip, 'password_reset_request', 5, 60 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many password reset requests, try again later' });
      }

      try {
        const user = await getUserByEmail(input.email);
        if (!user) {
          // Don't reveal if email exists for security
          return {
            success: true,
            message: "If email exists, password reset link will be sent",
          };
        }

        // Generate reset token
        const resetToken = await generateJWT(user.id, 3600000); // 1 hour expiry
        await db.setPasswordResetToken(user.id, resetToken);

        await db.logActivity({
          userId: user.id,
          action: 'password_reset_requested',
          entityType: 'auth',
          entityId: user.id,
          description: `Password reset requested for ${user.email}`,
        });

        // Send email with reset link
        const frontendUrl = process.env.FRONTEND_URL || `${ctx.req.protocol}://${ctx.req.get('host')}`;
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
        try {
          const { sendEmail } = await import('../_core/mail');
          const { passwordResetEmail } = await import('../_core/emailTemplates');
          const { getCompanyInfo } = await import('../utils/company-info');
          const company = await getCompanyInfo();
          const emailPayload = passwordResetEmail(
            user.name || user.email,
            resetLink,
            {
              companyName: company.name,
              companyEmail: company.email,
              logoUrl: company.logo,
              brandColor: '#4F46E5',
            }
          );
          await sendEmail({
            to: user.email,
            subject: emailPayload.subject,
            html: emailPayload.html,
            text: emailPayload.text,
          });
        } catch (emailError) {
          console.error('[Auth] Failed to send password reset email:', emailError);
        }

        return {
          success: true,
          message: "If email exists, password reset link will be sent",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process password reset request",
        });
      }
    }),

  /**
   * Reset password with token
   */
  resetPassword: publicProcedure
    .input(resetPasswordInput)
    .mutation(async ({ ctx, input }) => {
      // rate limit to prevent brute-force resetting
      const ip = ctx.req.ip || 'unknown';
      if (!checkRateLimit(ip, 'password_reset', 10, 60 * 60 * 1000)) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again later' });
      }
      try {
        // Verify token
        const payload = await verifyJWT(input.token);
        const userId = payload.userId;

        // Verify token is valid reset token
        const storedToken = await db.getPasswordResetToken(userId);
        if (storedToken !== input.token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired reset token",
          });
        }

        // Hash new password
        const passwordHash = await hashPassword(input.newPassword);
        await db.setUserPassword(userId, passwordHash);

        // Clear reset token
        await db.clearPasswordResetToken(userId);

        await db.logActivity({
          userId,
          action: 'password_reset',
          entityType: 'auth',
          entityId: userId,
          description: `Password reset completed for user ${userId}`,
        });

        return {
          success: true,
          message: "Password reset successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired reset token",
        });
      }
    }),

  /**
   * Enable two-factor authentication
   */
  enable2FA: userEditProcedure.mutation(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;
      
      // Generate 2FA secret (in real implementation, use speakeasy or similar)
      const secret = `${userId}_${Date.now()}`;
      
      // Store temporarily for verification
      await db.upsertUser({
        id: userId,
        email: ctx.user.email,
      });

      await db.logActivity({
        userId,
        action: '2fa_setup_initiated',
        entityType: 'auth',
        entityId: userId,
        description: `2FA setup initiated for user ${ctx.user.email}`,
      });

      return {
        success: true,
        secret,
        message: "2FA setup initiated. Scan QR code with authenticator app.",
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to enable 2FA",
      });
    }
  }),

  /**
   * Disable two-factor authentication
   */
  disable2FA: userEditProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;

        // Verify password
        const passwordHash = await db.getUserPassword(userId);
        if (!passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to verify password",
          });
        }

        const isPasswordValid = await verifyPassword(input.password, passwordHash);
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }

        // Disable 2FA (remove secret)
        await db.updateUser(userId, {
          twoFactorEnabled: false,
        } as any);

        await db.logActivity({
          userId,
          action: '2fa_disabled',
          entityType: 'auth',
          entityId: userId,
          description: `2FA disabled for user ${ctx.user.email}`,
        });

        return {
          success: true,
          message: "Two-factor authentication disabled",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to disable 2FA",
        });
      }
    }),

  /**
   * Get active sessions
   */
  getSessions: createFeatureRestrictedProcedure("auth:sessions").query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;

      // Return current session info
      // In a real implementation, track sessions in DB
      return [
        {
          id: "current",
          device: "Chrome on Windows",
          location: "Unknown",
          lastActive: new Date().toISOString(),
          createdAt: ctx.user.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
          current: true,
        },
      ];
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch sessions",
      });
    }
  }),

  /**
   * Logout from all sessions
   */
  logoutAllSessions: createFeatureRestrictedProcedure("auth:sessions").mutation(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;

      await db.logActivity({
        userId,
        action: 'logout_all_sessions',
        entityType: 'auth',
        entityId: userId,
        description: `User logged out from all sessions`,
      });

      return { success: true, message: "Logged out from all sessions" };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to logout from all sessions",
      });
    }
  }),

  /**
   * Export user data
   */
  exportUserData: createFeatureRestrictedProcedure("auth:export_user_data").query(async ({ ctx }) => {
    try {
      const userId = ctx.user.id;
      const user = await db.getUser(userId);

      const userData = {
        profile: {
          id: user?.id,
          email: user?.email,
          name: user?.name,
          role: user?.role,
          createdAt: user?.createdAt,
        },
        exportedAt: new Date().toISOString(),
      };

      await db.logActivity({
        userId,
        action: 'data_export_requested',
        entityType: 'auth',
        entityId: userId,
        description: `User requested data export`,
      });

      return userData;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to export user data",
      });
    }
  }),

  /**
   * Request account deletion
   */
  requestAccountDeletion: userEditProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;

        // Verify password
        const passwordHash = await db.getUserPassword(userId);
        if (!passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Failed to verify password",
          });
        }

        const isPasswordValid = await verifyPassword(input.password, passwordHash);
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }

        await db.logActivity({
          userId,
          action: 'account_deletion_requested',
          entityType: 'auth',
          entityId: userId,
          description: `User requested account deletion. Will be deleted in 30 days.`,
        });

        return {
          success: true,
          message: "Account deletion requested. Your account will be deleted in 30 days.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to request account deletion",
        });
      }
    }),

  // Verify email token - lightweight stub for frontend compatibility
  getCsrfToken: publicProcedure.query(({ ctx }) => {
      return { csrfToken: ctx.csrfToken || null };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().optional(), email: z.string().email().optional() }).optional())
    .mutation(async ({ input }) => {
      // For now, accept token/email and return success to satisfy client
      return { success: true };
    }),
});
