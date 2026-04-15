/**
 * Email Calendar Router - DB-backed
 */
import { router } from '../_core/trpc';
import { createFeatureRestrictedProcedure } from '../middleware/enhancedRbac';
import { z } from 'zod';
import { getDb } from '../db';
import { emailCalendarSync } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const emailViewProcedure = createFeatureRestrictedProcedure('email:view');
const emailEditProcedure = createFeatureRestrictedProcedure('email:edit');

export const emailCalendarRouter = router({
  getEmailIntegration: emailViewProcedure
    .input(z.object({ provider: z.enum(['gmail', 'outlook', 'exchange', 'imap']).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(emailCalendarSync).where(input.provider ? eq(emailCalendarSync.provider, input.provider) : undefined).orderBy(desc(emailCalendarSync.createdAt));
      return { integrations: rows, total: rows.length };
    }),

  syncCalendar: emailEditProcedure
    .input(z.object({ provider: z.enum(['gmail', 'outlook', 'exchange']), accountEmail: z.string().email(), syncDirection: z.enum(['one-way', 'two-way']).default('two-way') }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(emailCalendarSync).values({ id, provider: input.provider, accountEmail: input.accountEmail, syncType: 'calendar', syncDirection: input.syncDirection, status: 'syncing', lastSyncAt: new Date().toISOString().replace('T', ' ').substring(0, 19), createdBy: ctx.user?.id || 'system' });
      return { success: true, syncId: id, provider: input.provider, status: 'syncing', syncedEvents: 0, startedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  scheduleEvent: emailEditProcedure
    .input(z.object({ title: z.string(), startTime: z.string(), endTime: z.string(), attendees: z.array(z.string().email()).optional(), location: z.string().optional(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(emailCalendarSync).values({ id, provider: 'internal', accountEmail: ctx.user?.email || 'system@local', syncType: 'event', syncDirection: 'one-way', status: 'scheduled', metadata: JSON.stringify({ title: input.title, startTime: input.startTime, endTime: input.endTime, attendees: input.attendees, location: input.location, description: input.description }), createdBy: ctx.user?.id || 'system' });
      return { success: true, eventId: id, title: input.title, startTime: input.startTime, endTime: input.endTime, attendees: input.attendees?.length || 0 };
    }),

  getAvailability: emailViewProcedure
    .input(z.object({ userIds: z.array(z.string()), date: z.string(), timezone: z.string().default('UTC') }))
    .query(async ({ input }) => {
      return { date: input.date, timezone: input.timezone, availability: input.userIds.map(userId => ({ userId, slots: [{ start: '09:00', end: '12:00', status: 'available' }, { start: '13:00', end: '17:00', status: 'available' }] })) };
    }),

  listSyncJobs: emailViewProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(emailCalendarSync).orderBy(desc(emailCalendarSync.createdAt)).limit(input.limit);
      return { jobs: rows.map(r => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null })), total: rows.length };
    }),
});
