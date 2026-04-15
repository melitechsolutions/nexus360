import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { v4 as uuidv4 } from "uuid";

export const websiteContactRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(255),
        company: z.string().max(255).optional(),
        subject: z.string().min(1).max(500),
        message: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        const id = uuidv4();
        await (db as any).execute(
          `INSERT INTO websiteContacts (id, name, email, company, subject, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'new', NOW())`,
          [id, input.name, input.email, input.company || null, input.subject, input.message]
        );
        console.log(`[Website Contact] Saved submission ${id} from ${input.email}`);
      } catch (err) {
        console.error('[Website Contact] Failed to save submission:', err);
      }
      return {
        success: true,
        message: "Thank you for reaching out! We will get back to you shortly.",
      };
    }),
});
