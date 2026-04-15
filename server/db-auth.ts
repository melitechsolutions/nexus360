import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";
import { hashPassword, verifyPassword, hashResetToken } from "./_core/auth";

/**
 * Create a new local user with username and password
 */
export async function createLocalUser(data: {
  id: string;
  username: string;
  email?: string;
  name?: string;
  password: string;
  role?: "user" | "admin" | "staff" | "accountant" | "client" | "super_admin";
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const passwordHash = hashPassword(data.password);

  try {
    await db.insert(users).values({
      id: data.id,
      // this app uses email as the canonical login field; accept `username` for
      // backward compatibility and store it in `email` when `email` not provided
      email: data.email || data.username || null,
      name: data.name || null,
      passwordHash,
      loginMethod: "local",
      role: data.role || "user",
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      lastSignedIn: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isActive: 1,
    } as any);

    return { success: true };
  } catch (error) {
    console.error("[Auth] Failed to create local user:", error);
    throw error;
  }
}

/**
 * Authenticate a user with username and password
 */
export async function authenticateLocalUser(username: string, password: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, username))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Invalid username or password" };
    }

    const user = result[0];

    // Check if user is active
    if (!user.isActive) {
      return { success: false, error: "User account is disabled" };
    }

    // Check if user has a password hash (local auth)
    if (!user.passwordHash) {
      return { success: false, error: "This account uses external authentication" };
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid username or password" };
    }

    // Update last signed in
    await db
      .update(users)
      .set({ lastSignedIn: new Date().toISOString().replace('T', ' ').substring(0, 19) })
      .where(eq(users.id, user.id));

    return {
      success: true,
      user: {
        id: user.id,
        // expose username for callers that expect it (map to email)
        username: user.email,
        email: user.email,
        name: user.name,
        role: user.role,
        loginMethod: user.loginMethod,
      },
    };
  } catch (error) {
    console.error("[Auth] Authentication failed:", error);
    throw error;
  }
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, username))
      .limit(1);

    return result.length === 0;
  } catch (error) {
    console.error("[Auth] Failed to check username availability:", error);
    throw error;
  }
}

/**
 * Check if email is available
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result.length === 0;
  } catch (error) {
    console.error("[Auth] Failed to check email availability:", error);
    throw error;
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      // Don't reveal if email exists
      return { success: true };
    }

    const user = result[0];
    const { token, expiresAt } = generatePasswordResetToken();
    const hashedToken = hashResetToken(token);

    await db
      .update(users)
      .set({
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: expiresAt.toISOString().replace('T', ' ').substring(0, 19),
      })
      .where(eq(users.id, user.id));

    return { success: true, token, email };
  } catch (error) {
    console.error("[Auth] Failed to request password reset:", error);
    throw error;
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const hashedToken = hashResetToken(token);
    const now = new Date();

    // Find user with valid reset token
    const result = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, hashedToken))
      .limit(1);

    if (result.length === 0) {
      return { success: false, error: "Invalid or expired reset token" };
    }

    const user = result[0];

    // Check if token is expired
    if (user.passwordResetExpiresAt && new Date(user.passwordResetExpiresAt) < now) {
      return { success: false, error: "Reset token has expired" };
    }

    // Update password and clear reset token
    const newPasswordHash = hashPassword(newPassword);
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("[Auth] Failed to reset password:", error);
    throw error;
  }
}

/**
 * Helper function to generate password reset token
 */
function generatePasswordResetToken() {
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return { token, expiresAt };
}
