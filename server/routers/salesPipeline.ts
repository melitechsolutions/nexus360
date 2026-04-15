import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { opportunities, clients } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

const readProcedure = createFeatureRestrictedProcedure("sales:opportunities");
const writeProcedure = createFeatureRestrictedProcedure("sales:opportunities:create");

const PIPELINE_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

const stageLabelMap: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  negotiation: "Negotiating",
  closed_won: "Won",
  closed_lost: "Lost",
};

type PipelineStage = (typeof PIPELINE_STAGES)[number];

const moveOpportunitySchema = z.object({
  id: z.string(),
  newStage: z.enum(PIPELINE_STAGES),
  winReason: z.string().optional(),
  lossReason: z.string().optional(),
});

const createOpportunitySchema = z.object({
  clientId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  value: z.number().int().min(0),
  probability: z.number().int().min(0).max(100).default(0),
  expectedCloseDate: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const salesPipelineRouter = router({
  // Get opportunities grouped by stage (for Kanban)
  getPipelineBoard: readProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) return { stages: [] };

        // Filter to org's opportunities via client join if org user
        const orgId = ctx.user?.organizationId;
        let allOpportunities: any[];

        if (orgId) {
          allOpportunities = await db
            .select({ opp: opportunities })
            .from(opportunities)
            .innerJoin(clients, eq(opportunities.clientId, clients.id))
            .where(eq(clients.organizationId, orgId))
            .orderBy(desc(opportunities.createdAt))
            .then((rows: any[]) => rows.map((r: any) => r.opp));
        } else {
          allOpportunities = await db
            .select()
            .from(opportunities)
            .orderBy(desc(opportunities.createdAt));
        }

        // Group by stage
        const board: Record<string, any[]> = {};
        PIPELINE_STAGES.forEach((stage) => {
          board[stage] = [];
        });

        allOpportunities.forEach((opp: any) => {
          if (board[opp.stage as PipelineStage]) {
            board[opp.stage as PipelineStage].push(opp);
          }
        });

        return {
          stages: PIPELINE_STAGES.map((stage) => ({
            id: stage,
            title: stageLabelMap[stage],
            opportunities: board[stage] || [],
            count: (board[stage] || []).length,
          })),
        };
      } catch (error) {
        console.error("[SALES_PIPELINE] getPipelineBoard error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch pipeline board",
        });
      }
    }),

  // Move opportunity to a new stage
  moveOpportunity: writeProcedure
    .input(moveOpportunitySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get current opportunity
        const opp = await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, input.id))
          .limit(1);

        if (!opp.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Opportunity not found",
          });
        }

        const currentOpp = opp[0];
        const now = new Date().toISOString();

        // Prepare update data
        const updateData: any = {
          stage: input.newStage,
          stageMovedAt: now,
          updatedAt: now,
        };

        // If moving to closed_won, set actualCloseDate and add win reason
        if (input.newStage === "closed_won") {
          updateData.actualCloseDate = now;
          if (input.winReason) {
            updateData.winReason = input.winReason;
          }
        }

        // If moving to closed_lost, add loss reason
        if (input.newStage === "closed_lost") {
          updateData.actualCloseDate = now;
          if (input.lossReason) {
            updateData.lossReason = input.lossReason;
          }
        }

        await db
          .update(opportunities)
          .set(updateData)
          .where(eq(opportunities.id, input.id));

        return { success: true, stage: input.newStage };
      } catch (error) {
        console.error("[SALES_PIPELINE] moveOpportunity error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to move opportunity",
        });
      }
    }),

  // Get sales forecast (weighted by probability)
  getSalesForecast: readProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { totalPipeline: 0, weightedForecast: 0, byStage: {}, opportunities: [] };

        const filters: any[] = [];

        // Get active opportunities
        const activeOpportunities = await db
          .select()
          .from(opportunities)
          .orderBy(desc(opportunities.createdAt));

        // Calculate forecast
        const forecast = {
          totalPipeline: 0,
          weightedForecast: 0,
          byStage: {
            lead: { count: 0, value: 0, forecast: 0 },
            qualified: { count: 0, value: 0, forecast: 0 },
            proposal: { count: 0, value: 0, forecast: 0 },
            negotiation: { count: 0, value: 0, forecast: 0 },
          },
          opportunities: [] as any[],
        };

        activeOpportunities.forEach((opp: any) => {
          // Skip won/lost deals
          if (opp.stage === "closed_won" || opp.stage === "closed_lost") {
            return;
          }

          // Apply date filter if provided
          if (input.startDate && input.endDate && opp.expectedCloseDate) {
            if (opp.expectedCloseDate < input.startDate || opp.expectedCloseDate > input.endDate) {
              return;
            }
          }

          forecast.totalPipeline += opp.value;

          const weightedValue = Math.round((opp.value * (opp.probability || 0)) / 100);
          forecast.weightedForecast += weightedValue;

          const stageForecast = forecast.byStage[opp.stage as keyof typeof forecast.byStage];
          if (stageForecast) {
            stageForecast.count += 1;
            stageForecast.value += opp.value;
            stageForecast.forecast += weightedValue;
          }

          forecast.opportunities.push({
            ...opp,
            forecast: weightedValue,
            stageName: stageLabelMap[opp.stage],
          });
        });

        return forecast;
      } catch (error) {
        console.error("[SALES_PIPELINE] getSalesForecast error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate sales forecast",
        });
      }
    }),

  // Get win/loss statistics
  getWinLossStats: readProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(12).default(3),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { total: 0, won: 0, lost: 0, winRate: 0, totalValue: 0, totalWon: 0, totalLost: 0, avgDealSize: 0, avgWonDealSize: 0, closureTimeAsAvg: 0, byReason: { wins: {}, losses: {} } };

        // Get deals closed in the last N months
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - input.months);

        const closedDeals = await db
          .select()
          .from(opportunities)
          .where(
            and(
              gte(opportunities.actualCloseDate, monthsAgo.toISOString().replace('T', ' ').substring(0, 19)),
              (eq(opportunities.stage, "closed_won") ||
                eq(opportunities.stage, "closed_lost"))
            ) as any
          );

        const stats = {
          total: closedDeals.length,
          won: 0,
          lost: 0,
          winRate: 0,
          totalValue: 0,
          totalWon: 0,
          totalLost: 0,
          avgDealSize: 0,
          avgWonDealSize: 0,
          closureTimeAsAvg: 0,
          byReason: {
            wins: {} as Record<string, number>,
            losses: {} as Record<string, number>,
          },
        };

        let totalDays = 0;

        closedDeals.forEach((deal: any) => {
          stats.totalValue += deal.value;

          if (deal.stage === "closed_won") {
            stats.won += 1;
            stats.totalWon += deal.value;

            // Track win reasons
            if (deal.winReason) {
              stats.byReason.wins[deal.winReason] =
                (stats.byReason.wins[deal.winReason] || 0) + 1;
            }
          } else if (deal.stage === "closed_lost") {
            stats.lost += 1;
            stats.totalLost += deal.value;

            // Track loss reasons
            if (deal.lossReason) {
              stats.byReason.losses[deal.lossReason] =
                (stats.byReason.losses[deal.lossReason] || 0) + 1;
            }
          }

          // Calculate average closure time
          if (deal.createdAt && deal.actualCloseDate) {
            const createdDate = new Date(deal.createdAt);
            const closedDate = new Date(deal.actualCloseDate);
            totalDays += Math.floor(
              (closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          }
        });

        if (stats.total > 0) {
          stats.winRate = Math.round((stats.won / stats.total) * 100);
          stats.avgDealSize = Math.round(stats.totalValue / stats.total);
          stats.closureTimeAsAvg = Math.round(totalDays / stats.total);
        }

        if (stats.won > 0) {
          stats.avgWonDealSize = Math.round(stats.totalWon / stats.won);
        }

        return stats;
      } catch (error) {
        console.error("[SALES_PIPELINE] getWinLossStats error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get win/loss statistics",
        });
      }
    }),

  // Create new opportunity
  create: writeProcedure
    .input(createOpportunitySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verify client exists
        const client = await db
          .select()
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);

        if (!client.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        const id = nanoid();

        await db.insert(opportunities).values({
          id,
          clientId: input.clientId,
          title: input.title,
          description: input.description,
          value: input.value,
          probability: input.probability,
          expectedCloseDate: input.expectedCloseDate,
          assignedTo: input.assignedTo,
          source: input.source,
          notes: input.notes,
          stage: "lead",
          createdBy: ctx.user.id,
        });

        return { id, success: true };
      } catch (error) {
        console.error("[SALES_PIPELINE] Create error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create opportunity",
        });
      }
    }),

  // Update probability
  updateProbability: writeProcedure
    .input(
      z.object({
        id: z.string(),
        probability: z.number().int().min(0).max(100),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const opp = await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, input.id))
          .limit(1);

        if (!opp.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Opportunity not found",
          });
        }

        await db
          .update(opportunities)
          .set({
            probability: input.probability,
            updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          })
          .where(eq(opportunities.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[SALES_PIPELINE] updateProbability error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update probability",
        });
      }
    }),

  // Get opportunity details
  getById: readProcedure
    .input(z.string())
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const opp = await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, input))
          .limit(1);

        if (!opp.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Opportunity not found",
          });
        }

        return { ...opp[0], stageName: stageLabelMap[opp[0].stage] };
      } catch (error) {
        console.error("[SALES_PIPELINE] getById error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch opportunity",
        });
      }
    }),
});
