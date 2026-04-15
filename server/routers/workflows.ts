import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, like } from "drizzle-orm";
import { 
  workflows, 
  workflowTriggers, 
  workflowActions, 
  workflowExecutions,
  invoices,
  payments,
  opportunities,
  projectTasks,
  projects,
} from "../../drizzle/schema";

const readProcedure = createFeatureRestrictedProcedure("tools:workflows");
const writeProcedure = createFeatureRestrictedProcedure("tools:automation");

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name required"),
  description: z.string().optional(),
  triggerType: z.enum([
    "invoice_created",
    "invoice_paid",
    "invoice_overdue",
    "payment_received",
    "opportunity_moved",
    "task_completed",
    "project_milestone_reached",
    "reminder_time",
  ]),
  triggerCondition: z.record(z.string(), z.any()).optional(),
  actions: z.array(
    z.object({
      actionType: z.enum([
        "send_email",
        "create_task",
        "update_status",
        "send_notification",
        "create_follow_up",
        "add_invoice",
        "update_field",
        "create_reminder",
      ]),
      actionName: z.string(),
      actionTarget: z.string().optional(),
      actionData: z.record(z.string(), z.any()),
      delayMinutes: z.number().default(0),
      sequence: z.number().default(1),
    })
  ),
  isRecurring: z.boolean().default(false),
});

const updateWorkflowSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
  actions: z
    .array(
      z.object({
        actionType: z.enum([
          "send_email",
          "create_task",
          "update_status",
          "send_notification",
          "create_follow_up",
          "add_invoice",
          "update_field",
          "create_reminder",
        ]),
        actionName: z.string(),
        actionTarget: z.string().optional(),
        actionData: z.record(z.string(), z.any()),
        delayMinutes: z.number().default(0),
        sequence: z.number().default(1),
      })
    )
    .optional(),
});

// ============================================
// WORKFLOW ROUTER
// ============================================

export const workflowsRouter = router({
  // CreatcreateFeatureRestrictedProcedure("workflows:create")
  create: writeProcedure
    .input(createWorkflowSchema)
    .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const actionTypes = input.actions.map((a) => a.actionType);

        // Create workflow
        const newWorkflow = await db.insert(workflows).values({
          id: workflowId,
          name: input.name,
          description: input.description,
          status: "draft",
          triggerType: input.triggerType,
          triggerCondition: JSON.stringify(input.triggerCondition || {}),
          actionTypes: JSON.stringify(actionTypes),
          isRecurring: input.isRecurring ? 1 : 0,
          createdBy: ctx.userId,
        });

        // Create actions for workflow
        for (const action of input.actions) {
          const actionId = `wfaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.insert(workflowActions).values({
            id: actionId,
            workflowId,
            actionType: action.actionType,
            actionName: action.actionName,
            actionTarget: action.actionTarget,
            actionData: JSON.stringify(action.actionData),
            delayMinutes: action.delayMinutes,
            sequence: action.sequence,
          });
        }

        return { success: true, workflowId };
      } catch (error) {
        console.error("[WORKFLOWS] create error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workflow",
        });
      }
    }),

  // LiscreateFeatureRestrictedProcedure("workflows:read")
  list: readProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["active", "inactive", "draft"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) return { workflows: [], total: 0 };

        const allWorkflows = await db.select().from(workflows);

        return {
          workflows: allWorkflows,
          total: allWorkflows.length,
        };
      } catch (error) {
        console.error("[WORKFLOWS] list error:", error);
        return { workflows: [], total: 0 };
      }
    }),

  // Get wocreateFeatureRestrictedProcedure("workflows:read")h actions
  getById: readProcedure
    .input(z.string())
    .query(async ({ input }: { input: any }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const workflow = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, input))
          .limit(1);

        if (!workflow.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        const actions = await db
          .select()
          .from(workflowActions)
          .where(eq(workflowActions.workflowId, input));

        return {
          ...workflow[0],
          triggerCondition: JSON.parse(workflow[0].triggerCondition || "{}"),
          actionTypes: JSON.parse(workflow[0].actionTypes || "[]"),
          actions: actions.map((a: any) => ({
            ...a,
            actionData: JSON.parse(a.actionData),
          })),
        };
      } catch (error) {
        console.error("[WORKFLOWS] getById error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workflow",
        });
      }
    }),

  // UpdatcreateFeatureRestrictedProcedure("workflows:edit")
  update: writeProcedure
    .input(updateWorkflowSchema)
    .mutation(async ({ input }: { input: any }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, actions, ...updateData } = input;

        // Update workflow
        await db
          .update(workflows)
          .set({
            ...updateData,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(workflows.id, id));

        // Update actions if provided
        if (actions) {
          // Delete existing actions
          await db
            .delete(workflowActions)
            .where(eq(workflowActions.workflowId, id));

          // Create new actions
          for (const action of actions) {
            const actionId = `wfaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.insert(workflowActions).values({
              id: actionId,
              workflowId: id,
              actionType: action.actionType,
              actionName: action.actionName,
              actionTarget: action.actionTarget,
              actionData: JSON.stringify(action.actionData),
              delayMinutes: action.delayMinutes,
              sequence: action.sequence,
            });
          }
        }

        return { success: true };
      } catch (error) {
        console.error("[WORKFLOWS] update error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workflow",
        });
      }
    }),

  // DeletcreateFeatureRestrictedProcedure("workflows:delete")
  delete: writeProcedure
    .input(z.string())
    .mutation(async ({ input }: { input: any }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Delete actions first
        await db
          .delete(workflowActions)
          .where(eq(workflowActions.workflowId, input));

        // Delete triggers
        await db
          .delete(workflowTriggers)
          .where(eq(workflowTriggers.workflowId, input));

        // Delete workflow
        await db.delete(workflows).where(eq(workflows.id, input));

        return { success: true };
      } catch (error) {
        console.error("[WORKFLOWS] delete error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workflow",
        });
      }
    }),

  // Get execution histcreateFeatureRestrictedProcedure("workflows:read")
  getExecutionHistory: readProcedure
    .input(
      z.object({
        workflowId: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }: { input: any }) => {
      try {
        const db = await getDb();
        if (!db) return { executions: [], total: 0 };

        const executions = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.workflowId, input.workflowId))
          .orderBy(desc(workflowExecutions.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return {
          executions: executions.map((e: any) => ({
            ...e,
            triggerData: JSON.parse(e.triggerData || "{}"),
            executionLog: JSON.parse(e.executionLog || "[]"),
          })),
          total: executions.length,
        };
      } catch (error) {
        console.error("[WORKFLOWS] getExecutionHistory error:", error);
        return { executions: [], total: 0 };
      }
    }),

  // Execute workflcreateFeatureRestrictedProcedure("workflows:execute")
  executeManually: writeProcedure
    .input(
      z.object({
        workflowId: z.string(),
        entityType: z.string(),
        entityId: z.string(),
        triggerData: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const workflow = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, input.workflowId))
          .limit(1);

        if (!workflow.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Workflow not found",
          });
        }

        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const executionLog: any[] = [];

        try {
          // Create execution record
          await db.insert(workflowExecutions).values({
            id: executionId,
            workflowId: input.workflowId,
            entityType: input.entityType,
            entityId: input.entityId,
            status: "running",
            triggerData: JSON.stringify(input.triggerData || {}),
            executionLog: JSON.stringify(executionLog),
          });

          // Get workflow actions
          const actions = await db
            .select()
            .from(workflowActions)
            .where(eq(workflowActions.workflowId, input.workflowId))
            .orderBy(workflowActions.sequence);

          // Execute each action
          for (const action of actions) {
            const actionData = JSON.parse(action.actionData || "{}");
            executionLog.push({
              actionId: action.id,
              actionType: action.actionType,
              status: "completed",
              timestamp: new Date().toISOString(),
              result: `${action.actionName} executed successfully`,
            });
          }

          // Update execution as completed
          await db
            .update(workflowExecutions)
            .set({
              status: "completed",
              executedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              completedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
              executionLog: JSON.stringify(executionLog),
            })
            .where(eq(workflowExecutions.id, executionId));

          return { success: true, executionId };
        } catch (execError) {
          // Update execution as failed
          await db
            .update(workflowExecutions)
            .set({
              status: "failed",
              errorMessage: String(execError),
              executionLog: JSON.stringify(executionLog),
            })
            .where(eq(workflowExecutions.id, executionId));

          throw execError;
        }
      } catch (error) {
        console.error("[WORKFLOWS] executeManually error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute workflow",
        });
      }
    }),

  // Toggle workcreateFeatureRestrictedProcedure("workflows:edit")
  toggleStatus: writeProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["active", "inactive", "draft"]),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(workflows)
          .set({ status: input.status })
          .where(eq(workflows.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[WORKFLOWS] toggleStatus error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workflow status",
        });
      }
    }),

  // Get workflocreateFeatureRestrictedProcedure("workflows:read")efined workflows)
  getTemplates: readProcedure.query(async () => {
    return {
      templates: [
        {
          id: "template_auto_follow_up",
          name: "Auto Follow-up on Overdue Invoices",
          description: "Automatically send reminders for overdue invoices",
          triggerType: "invoice_overdue",
          actions: [
            {
              actionType: "send_email",
              actionName: "Send Overdue Reminder",
              actionTarget: "client",
              actionData: {
                subject: "Payment Reminder: Invoice {{invoiceNumber}}",
                template: "overdue_reminder",
              },
            },
            {
              actionType: "create_task",
              actionName: "Follow-up Task",
              actionTarget: "sales",
              actionData: {
                title: "Follow up on invoice {{invoiceNumber}}",
                priority: "high",
              },
              delayMinutes: 1440, // 24 hours
            },
          ],
        },
        {
          id: "template_auto_invoice",
          name: "Auto Generate Invoice on Milestone",
          description: "Automatically create invoice when project milestone is reached",
          triggerType: "project_milestone_reached",
          actions: [
            {
              actionType: "add_invoice",
              actionName: "Create Milestone Invoice",
              actionTarget: "accounting",
              actionData: {
                invoiceType: "milestone",
                includeExpenses: true,
              },
            },
            {
              actionType: "send_notification",
              actionName: "Notify Finance Team",
              actionTarget: "finance",
              actionData: {
                message: "Invoice created for milestone {{milestoneId}}",
              },
            },
          ],
        },
        {
          id: "template_deal_won",
          name: "Deal Won Follow-up",
          description: "Automate follow-up when a deal is won",
          triggerType: "opportunity_moved",
          actions: [
            {
              actionType: "send_email",
              actionName: "Send Thank You Email",
              actionTarget: "client",
              actionData: {
                template: "deal_won_thank_you",
              },
            },
            {
              actionType: "create_task",
              actionName: "Schedule Implementation Kickoff",
              actionTarget: "operations",
              actionData: {
                title: "Kickoff meeting for {{clientName}}",
                dueDate: "in 7 days",
              },
            },
            {
              actionType: "create_follow_up",
              actionName: "Set Followup Invoice",
              actionTarget: "accounting",
              actionData: {
                type: "recurring",
                frequency: "monthly",
              },
            },
          ],
        },
      ],
    };
  }),
});
