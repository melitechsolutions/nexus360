/**
 * Groq AI Router
 *
 * Features:
 * - Document Summarization & Intelligence
 * - Email Generation Assistant
 * - Financial Analytics & Insights
 * - Conversational Chat Interface
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  aiDocuments,
  emailGenerationHistory,
  financialAnalytics,
  aiChatSessions,
  aiChatMessages,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import * as db from "../db";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function getGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI features are not configured. Please set GROQ_API_KEY in your environment.",
    });
  }
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  return { apiKey, model };
}

async function groqChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 1024
): Promise<{ text: string; tokensUsed: number }> {
  const { apiKey, model } = getGroqConfig();
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }
  const data = await response.json() as any;
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    tokensUsed: data.usage?.completion_tokens ?? 0,
  };
}

export const aiRouter = router({
  // ============================================
  // Document Summarization
  // ============================================
  
  summarizeDocument: createFeatureRestrictedProcedure("ai:summarize")
    .input(
      z.object({
        text: z.string().min(50).max(50000),
        focus: z.enum(['key_points', 'action_items', 'financial', 'general']).optional().default('general'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const prompt = `Summarize the following document focusing on ${input.focus}. Be concise and actionable:\n\n${input.text}`;
        
        const { text: summary, tokensUsed } = await groqChat(
          [{ role: "user", content: prompt }],
          1024
        );

        // Log activity
        await db.logActivity({
          userId: ctx.user.id,
          action: "ai_document_summarized",
          entityType: "ai_request",
          entityId: `summary_${Date.now()}`,
          description: `Summarized document (${input.focus})`,
        });

        return { summary, tokensUsed };
      } catch (error: any) {
        console.error("Groq summarization error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to summarize document: ${error.message}`,
        });
      }
    }),

  // ============================================
  // Email Generation
  // ============================================

  generateEmail: createFeatureRestrictedProcedure("ai:generateEmail")
    .input(
      z.object({
        context: z.string().min(20).max(5000),
        tone: z.enum(['professional', 'friendly', 'formal', 'casual']).default('professional'),
        type: z.enum(['invoice', 'proposal', 'follow_up', 'general']).default('general'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const systemPrompt = `You are a professional business email writer. Generate a concise, ${input.tone} email. Return only the email content without subject line.`;
        const userPrompt = `Generate a ${input.tone} ${input.type} email based on this context:\n\n${input.context}`;
        
        const { text: emailContent, tokensUsed } = await groqChat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          800
        );

        await db.logActivity({
          userId: ctx.user.id,
          action: "ai_email_generated",
          entityType: "ai_request",
          entityId: `email_${Date.now()}`,
          description: `Generated ${input.type} email (${input.tone})`,
        });

        return { emailContent, tokensUsed };
      } catch (error: any) {
        console.error("Groq email generation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate email: ${error.message}`,
        });
      }
    }),

  // ============================================
  // Financial Analytics
  // ============================================

  analyzeFinancials: createFeatureRestrictedProcedure("ai:financial")
    .input(
      z.object({
        dataDescription: z.string().min(20),
        metricType: z.enum(['expense_trends', 'revenue_analysis', 'cash_flow', 'profitability']).default('revenue_analysis'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const prompt = `As a financial analyst, provide insights on the following financial data. Focus on ${input.metricType}:\n\n${input.dataDescription}\n\nProvide 3-5 actionable insights.`;
        
        const { text: insights, tokensUsed } = await groqChat(
          [{ role: "user", content: prompt }],
          1024
        );

        await db.logActivity({
          userId: ctx.user.id,
          action: "ai_financial_analysis",
          entityType: "ai_request",
          entityId: `financial_${Date.now()}`,
          description: `Analyzed ${input.metricType}`,
        });

        return { insights, tokensUsed };
      } catch (error: any) {
        console.error("Groq financial analysis error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to analyze financials: ${error.message}`,
        });
      }
    }),

  // ============================================
  // Conversational AI Chat
  // ============================================

  createChatSession: createFeatureRestrictedProcedure("ai:chat")
    .input(
      z.object({
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const database = await getDb();
        if (!database) throw new Error("Database not available");

        const id = uuidv4();

        await database.insert(aiChatSessions).values({
          id,
          userId: ctx.user.id,
          title: input.title || `Chat ${new Date().toLocaleDateString()}`,
        });

        return { id };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create chat session: ${error.message}`,
        });
      }
    }),

  chat: createFeatureRestrictedProcedure("ai:chat")
    .input(
      z.object({
        message: z.string().min(1).max(5000),
        context: z.string().optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        let systemPrompt = 'You are a helpful CRM assistant providing guidance on business processes, invoicing, payments, projects, and customer management. Keep responses concise and actionable.';

        if (input.context) {
          systemPrompt += `\n\nUser Context: ${input.context}`;
        }

        const { text: assistantMessage, tokensUsed } = await groqChat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.message },
          ],
          1024
        );

        await db.logActivity({
          userId: ctx.user.id,
          action: "ai_chat_interaction",
          entityType: "ai_request",
          entityId: input.sessionId || `chat_${Date.now()}`,
          description: `Chat message: ${input.message.substring(0, 100)}`,
        });

        return {
          message: assistantMessage,
          tokensUsed,
          sessionId: input.sessionId,
        };
      } catch (error: any) {
        console.error("Groq chat error:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to process chat message: ${error.message}`,
        });
      }
    }),

  /**
   * Check if Claude AI is available
   */
  checkAvailability: createFeatureRestrictedProcedure("ai:access").query(async () => {
    const isAvailable = !!process.env.GROQ_API_KEY;
    return {
      available: isAvailable,
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      provider: "groq",
      features: ["summarization", "email_generation", "chat", "financial_analysis"],
    };
  }),
});
