/**
 * UI/UX Excellence Router - DB-backed
 */
import { router, featureViewProcedure, featureEditProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { designConfigs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const uiuxExcellenceRouter = router({
  createDesignSystem: featureEditProcedure
    .input(z.object({ name: z.string(), theme: z.object({ primaryColor: z.string(), secondaryColor: z.string(), fontFamily: z.string().optional(), borderRadius: z.number().optional() }), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(designConfigs).values({ id, configType: 'design_system', configKey: input.name, configValue: JSON.stringify({ theme: input.theme, description: input.description }), isActive: 1, createdBy: ctx.user?.id || 'system' });
      return { success: true, designSystemId: id, name: input.name, createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  configureAccessibility: featureEditProcedure
    .input(z.object({ wcagLevel: z.enum(['A', 'AA', 'AAA']).default('AA'), highContrast: z.boolean().default(false), fontSize: z.enum(['small', 'medium', 'large', 'xlarge']).default('medium'), reduceMotion: z.boolean().default(false) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const id = uuidv4();
      await db.insert(designConfigs).values({ id, configType: 'accessibility', configKey: 'a11y_settings', configValue: JSON.stringify(input), isActive: 1, createdBy: ctx.user?.id || 'system' });
      return { success: true, configId: id, wcagLevel: input.wcagLevel, configuredAt: new Date().toISOString().replace('T', ' ').substring(0, 19)};
    }),

  getDesignTokens: featureViewProcedure
    .query(async () => {
      return { tokens: { colors: { primary: '#3B82F6', secondary: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#3B82F6' }, spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }, typography: { h1: '2.25rem', h2: '1.875rem', h3: '1.5rem', body: '1rem', small: '0.875rem' }, borderRadius: { sm: 4, md: 8, lg: 12, full: 9999 } } };
    }),

  listDesignConfigs: featureViewProcedure
    .input(z.object({ configType: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query;
      if (input.configType) {
        query = db.select().from(designConfigs).where(eq(designConfigs.configType, input.configType)).orderBy(desc(designConfigs.createdAt)).limit(input.limit);
      } else {
        query = db.select().from(designConfigs).orderBy(desc(designConfigs.createdAt)).limit(input.limit);
      }
      const rows = await query;
      return { configs: rows.map(r => ({ ...r, configValue: r.configValue ? JSON.parse(r.configValue) : null })), total: rows.length };
    }),

  deleteDesignConfig: featureEditProcedure
    .input(z.object({ configId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(designConfigs).where(eq(designConfigs.id, input.configId));
      return { success: true, deletedId: input.configId };
    }),
});
