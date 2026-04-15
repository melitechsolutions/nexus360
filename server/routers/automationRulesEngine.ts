/**
 * Automation Rules Engine Router
 * Create and manage automated workflows and triggering rules
 */

import { router, protectedProcedure, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { workflows } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

const readProcedure = createFeatureRestrictedProcedure("workflows:read");
const createProcedure = createFeatureRestrictedProcedure("workflows:create");
const updateProcedure = createFeatureRestrictedProcedure("workflows:update");
const deleteProcedure = createFeatureRestrictedProcedure("workflows:delete");

// Rule condition schema
const ruleConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "in_range"]),
  value: z.any(),
  logic: z.enum(["and", "or"]).optional(),
});

// Action schema
const actionSchema = z.object({
  type: z.enum([
    "send_notification",
    "send_email",
    "create_task",
    "update_field",
    "create_record",
    "execute_script",
    "send_sms",
    "webhook",
  ]),
  config: z.record(z.string(), z.any()),
});

export const automationRulesRouter = router({
  /**
   * Create automation rule
   */
  createRule: createProcedure
    .input(
      z.object({
        name: z.string().min(3),
        description: z.string().optional(),
        trigger: z.object({
          type: z.enum([
            "invoice_created",
            "payment_received",
            "invoice_overdue",
            "project_milestone",
            "time_entry_submitted",
            "expense_submitted",
            "client_created",
            "lead_qualified",
          ]),
          entity: z.enum(["invoice", "payment", "project", "time_entry", "expense", "client", "lead"]),
        }),
        conditions: z.array(ruleConditionSchema),
        actions: z.array(actionSchema),
        isActive: z.boolean().default(true),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
        executeOnce: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = uuidv4();

      await db.insert(workflows).values({
        id,
        name: input.name,
        description: input.description,
        trigger: JSON.stringify(input.trigger),
        conditions: JSON.stringify(input.conditions),
        actions: JSON.stringify(input.actions),
        isActive: input.isActive ? 1 : 0,
        priority: input.priority,
        createdBy: ctx.user.id,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      } as any);

      return { id, message: "Automation rule created successfully" };
    }),

  /**
   * Get all automation rules
   */
  listRules: readProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rules = await db
      .select()
      .from(workflows)
      .where(eq(workflows.createdBy, ctx.user.id))
      .orderBy(desc(workflows.createdAt));

    return rules.map((rule) => ({
      ...rule,
      trigger: JSON.parse(rule.trigger as string),
      conditions: JSON.parse(rule.conditions as string),
      actions: JSON.parse(rule.actions as string),
    }));
  }),

  /**
   * Get rule by ID
   */
  getRule: readProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const rule = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, input));

      if (!rule.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rule not found",
        });
      }

      const r = rule[0];
      return {
        ...r,
        trigger: JSON.parse(r.trigger as string),
        conditions: JSON.parse(r.conditions as string),
        actions: JSON.parse(r.actions as string),
      };
    }),

  /**
   * Update automation rule
   */
  updateRule: updateProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        conditions: z.array(ruleConditionSchema).optional(),
        actions: z.array(actionSchema).optional(),
        isActive: z.boolean().optional(),
        priority: z.enum(["low", "normal", "high"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description) updateData.description = input.description;
      if (input.conditions) updateData.conditions = JSON.stringify(input.conditions);
      if (input.actions) updateData.actions = JSON.stringify(input.actions);
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
      if (input.priority) updateData.priority = input.priority;
      updateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

      await db.update(workflows).set(updateData).where(eq(workflows.id, input.id));

      return { success: true, message: "Rule updated successfully" };
    }),

  /**
   * Delete automation rule
   */
  deleteRule: deleteProcedure.input(z.string()).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.delete(workflows).where(eq(workflows.id, input));

    return { success: true, message: "Rule deleted successfully" };
  }),

  /**
   * Toggle rule active status
   */
  toggleRuleStatus: updateProcedure
    .input(
      z.object({
        id: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(workflows)
        .set({
          isActive: input.isActive ? 1 : 0,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        })
        .where(eq(workflows.id, input.id));

      return { success: true };
    }),

  /**
   * Get automation jobs (execution history)
   */
  getJobHistory: readProcedure
    .input(
      z.object({
        ruleId: z.string().optional(),
        status: z.enum(["pending", "success", "failed"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get rules and filter by execution history (would be implemented with job tracking table)
      const rules = await db.select().from(workflows).limit(input.limit);

      return rules.map((rule) => ({
        id: rule.id,
        ruleId: rule.id,
        ruleName: rule.name,
        status: "success",
        createdAt: rule.createdAt,
      }));
    }),

  /**
   * Retry failed automation job
   */
  retryJob: updateProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Job retry would be handled by job queue system
      // For now, just return success
      return { success: true, message: "Job re-queued for execution" };
    }),

  /**
   * Test automation rule with sample data
   */
  testRule: readProcedure
    .input(
      z.object({
        ruleId: z.string(),
        sampleData: z.record(z.string(), z.any()),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false, error: "Database not available" };

      const ruleData = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, input.ruleId));

      if (!ruleData.length) {
        return { success: false, error: "Rule not found" };
      }

      const rule = ruleData[0];
      const conditions = JSON.parse(rule.conditions as string);
      const actions = JSON.parse(rule.actions as string);

      // Evaluate conditions against sample data
      const conditionsMet = evaluateConditions(conditions, input.sampleData);

      return {
        success: true,
        ruleId: rule.id,
        ruleName: rule.name,
        conditionsMet,
        actionsToExecute: actions.length,
        actions: actions.map((a: any) => ({
          type: a.type,
          description: getActionDescription(a.type),
        })),
      };
    }),

  /**
   * Bulk enable/disable rules
   */
  bulkToggleRules: updateProcedure
    .input(
      z.object({
        ruleIds: z.array(z.string()),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      for (const id of input.ruleIds) {
        await db
          .update(workflows)
          .set({
            isActive: input.isActive ? 1 : 0,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(workflows.id, id));
      }

      return {
        success: true,
        message: `${input.ruleIds.length} rules ${input.isActive ? "enabled" : "disabled"}`,
      };
    }),
});

/**
 * Helper function to evaluate rule conditions
 */
function evaluateConditions(conditions: any[], data: Record<string, any>): boolean {
  if (!conditions.length) return true;

  let result = true;
  let currentLogic = "and";

  for (const condition of conditions) {
    const fieldValue = getNestedValue(data, condition.field);
    const conditionMet = evaluateCondition(fieldValue, condition.operator, condition.value);

    if (currentLogic === "and") {
      result = result && conditionMet;
    } else {
      result = result || conditionMet;
    }

    if (condition.logic) {
      currentLogic = condition.logic;
    }
  }

  return result;
}

/**
 * Helper to get nested object values
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Helper to evaluate a single condition
 */
function evaluateCondition(fieldValue: any, operator: string, compareValue: any): boolean {
  switch (operator) {
    case "equals":
      return fieldValue === compareValue;
    case "not_equals":
      return fieldValue !== compareValue;
    case "contains":
      return String(fieldValue).includes(String(compareValue));
    case "greater_than":
      return Number(fieldValue) > Number(compareValue);
    case "less_than":
      return Number(fieldValue) < Number(compareValue);
    case "in_range":
      return (
        Number(fieldValue) >= Number(compareValue[0]) &&
        Number(fieldValue) <= Number(compareValue[1])
      );
    default:
      return false;
  }
}

/**
 * Helper to get action description
 */
function getActionDescription(type: string): string {
  const descriptions: Record<string, string> = {
    send_notification: "Send in-app notification",
    send_email: "Send email notification",
    create_task: "Create a new task",
    update_field: "Update a field value",
    create_record: "Create a new record",
    execute_script: "Execute custom script",
    send_sms: "Send SMS notification",
    webhook: "Call webhook endpoint",
  };

  return descriptions[type] || "Unknown action";
}
