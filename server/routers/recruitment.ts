import { router, createFeatureRestrictedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getPool, logActivity } from "../db";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

function pool() {
  const p = getPool();
  if (!p) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return p;
}

const readProc = createFeatureRestrictedProcedure("hr:view");
const writeProc = createFeatureRestrictedProcedure("hr:edit");

export const recruitmentRouter = router({
  // ── Job Postings ──
  listPostings: readProc
    .input(z.object({
      status: z.string().optional(),
      departmentId: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const conds: string[] = [];
        const params: any[] = [];
        if (input?.status) { conds.push("jp.status = ?"); params.push(input.status); }
        if (input?.departmentId) { conds.push("jp.departmentId = ?"); params.push(input.departmentId); }
        const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
        const [rows] = await pool().query(
          `SELECT jp.*, d.name as departmentName,
            (SELECT COUNT(*) FROM jobApplicants ja WHERE ja.jobPostingId = jp.id) as applicantCount
           FROM jobPostings jp
           LEFT JOIN departments d ON jp.departmentId = d.id
           ${where} ORDER BY jp.createdAt DESC`, params
        );
        return rows as any[];
      } catch (err) { console.error("recruitment.listPostings error", err); return []; }
    }),

  getPosting: readProc.input(z.string()).query(async ({ input }) => {
    const [rows] = await pool().query(
      `SELECT jp.*, d.name as departmentName
       FROM jobPostings jp LEFT JOIN departments d ON jp.departmentId = d.id
       WHERE jp.id = ? LIMIT 1`, [input]
    );
    return (rows as any[])[0] || null;
  }),

  createPosting: writeProc
    .input(z.object({
      title: z.string(),
      departmentId: z.string().optional(),
      description: z.string().optional(),
      requirements: z.string().optional(),
      responsibilities: z.string().optional(),
      qualifications: z.string().optional(),
      experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
      employmentType: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]).optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      location: z.string().optional(),
      isRemote: z.boolean().optional(),
      openings: z.number().optional(),
      applicationDeadline: z.string().optional(),
      status: z.enum(["draft", "open", "closed", "on_hold", "filled"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = uuidv4();
      await pool().query(
        `INSERT INTO jobPostings (id, title, departmentId, description, requirements, responsibilities, qualifications, experienceLevel, employmentType, salaryMin, salaryMax, location, isRemote, openings, applicationDeadline, status, postedBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.title, input.departmentId || null, input.description || null, input.requirements || null, input.responsibilities || null, input.qualifications || null, input.experienceLevel || 'mid', input.employmentType || 'full_time', input.salaryMin || null, input.salaryMax || null, input.location || null, input.isRemote ? 1 : 0, input.openings || 1, input.applicationDeadline || null, input.status || 'draft', ctx.user.id]
      );
      await logActivity({ userId: ctx.user.id, action: 'job_posting_created', entityType: 'jobPosting', entityId: id, description: `Created job posting: ${input.title}` });
      return { id };
    }),

  updatePosting: writeProc
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      departmentId: z.string().optional(),
      description: z.string().optional(),
      requirements: z.string().optional(),
      responsibilities: z.string().optional(),
      qualifications: z.string().optional(),
      experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
      employmentType: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]).optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      location: z.string().optional(),
      isRemote: z.boolean().optional(),
      openings: z.number().optional(),
      applicationDeadline: z.string().optional(),
      status: z.enum(["draft", "open", "closed", "on_hold", "filled"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...fields } = input;
      const sets: string[] = [];
      const params: any[] = [];
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          sets.push(`${key} = ?`);
          params.push(key === 'isRemote' ? (val ? 1 : 0) : val);
        }
      }
      if (!sets.length) return { success: true };
      params.push(id);
      await pool().query(`UPDATE jobPostings SET ${sets.join(", ")} WHERE id = ?`, params);
      await logActivity({ userId: ctx.user.id, action: 'job_posting_updated', entityType: 'jobPosting', entityId: id, description: `Updated job posting ${id}` });
      return { success: true };
    }),

  deletePosting: writeProc.input(z.string()).mutation(async ({ input, ctx }) => {
    await pool().query(`DELETE FROM jobApplicants WHERE jobPostingId = ?`, [input]);
    await pool().query(`DELETE FROM jobPostings WHERE id = ?`, [input]);
    await logActivity({ userId: ctx.user.id, action: 'job_posting_deleted', entityType: 'jobPosting', entityId: input, description: `Deleted job posting ${input}` });
    return { success: true };
  }),

  // ── Applicants ──
  listApplicants: readProc
    .input(z.object({
      jobPostingId: z.string().optional(),
      stage: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const conds: string[] = [];
        const params: any[] = [];
        if (input?.jobPostingId) { conds.push("ja.jobPostingId = ?"); params.push(input.jobPostingId); }
        if (input?.stage) { conds.push("ja.stage = ?"); params.push(input.stage); }
        const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
        const [rows] = await pool().query(
          `SELECT ja.*, jp.title as jobTitle
           FROM jobApplicants ja
           LEFT JOIN jobPostings jp ON ja.jobPostingId = jp.id
           ${where} ORDER BY ja.createdAt DESC`, params
        );
        return rows as any[];
      } catch (err) { console.error("recruitment.listApplicants error", err); return []; }
    }),

  getApplicant: readProc.input(z.string()).query(async ({ input }) => {
    const [rows] = await pool().query(
      `SELECT ja.*, jp.title as jobTitle FROM jobApplicants ja
       LEFT JOIN jobPostings jp ON ja.jobPostingId = jp.id
       WHERE ja.id = ? LIMIT 1`, [input]
    );
    return (rows as any[])[0] || null;
  }),

  createApplicant: writeProc
    .input(z.object({
      jobPostingId: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      currentEmployer: z.string().optional(),
      currentTitle: z.string().optional(),
      experienceYears: z.number().optional(),
      expectedSalary: z.number().optional(),
      noticePeriod: z.number().optional(),
      source: z.enum(["website", "referral", "linkedin", "agency", "job_board", "other"]).optional(),
      referredBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = uuidv4();
      await pool().query(
        `INSERT INTO jobApplicants (id, jobPostingId, firstName, lastName, email, phone, currentEmployer, currentTitle, experienceYears, expectedSalary, noticePeriod, source, referredBy, notes, stage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied')`,
        [id, input.jobPostingId, input.firstName, input.lastName, input.email, input.phone || null, input.currentEmployer || null, input.currentTitle || null, input.experienceYears || null, input.expectedSalary || null, input.noticePeriod || null, input.source || 'website', input.referredBy || null, input.notes || null]
      );
      await logActivity({ userId: ctx.user.id, action: 'applicant_created', entityType: 'applicant', entityId: id, description: `Added applicant ${input.firstName} ${input.lastName}` });
      return { id };
    }),

  updateApplicant: writeProc
    .input(z.object({
      id: z.string(),
      stage: z.enum(["applied", "screening", "shortlisted", "interview", "assessment", "offer", "hired", "rejected", "withdrawn"]).optional(),
      rating: z.number().optional(),
      notes: z.string().optional(),
      interviewDate: z.string().optional(),
      interviewNotes: z.string().optional(),
      offerAmount: z.number().optional(),
      offerDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sets: string[] = [];
      const params: any[] = [];
      if (input.stage) { sets.push("stage = ?"); params.push(input.stage); }
      if (input.rating !== undefined) { sets.push("rating = ?"); params.push(input.rating); }
      if (input.notes !== undefined) { sets.push("notes = ?"); params.push(input.notes); }
      if (input.interviewDate !== undefined) { sets.push("interviewDate = ?"); params.push(input.interviewDate); }
      if (input.interviewNotes !== undefined) { sets.push("interviewNotes = ?"); params.push(input.interviewNotes); }
      if (input.offerAmount !== undefined) { sets.push("offerAmount = ?"); params.push(input.offerAmount); }
      if (input.offerDate !== undefined) { sets.push("offerDate = ?"); params.push(input.offerDate); }
      if (!sets.length) return { success: true };
      params.push(input.id);
      await pool().query(`UPDATE jobApplicants SET ${sets.join(", ")} WHERE id = ?`, params);
      await logActivity({ userId: ctx.user.id, action: 'applicant_updated', entityType: 'applicant', entityId: input.id, description: `Updated applicant ${input.id}` });
      return { success: true };
    }),

  deleteApplicant: writeProc.input(z.string()).mutation(async ({ input, ctx }) => {
    await pool().query(`DELETE FROM jobApplicants WHERE id = ?`, [input]);
    await logActivity({ userId: ctx.user.id, action: 'applicant_deleted', entityType: 'applicant', entityId: input, description: `Deleted applicant ${input}` });
    return { success: true };
  }),

  // ── Stats ──
  stats: readProc.query(async () => {
    try {
      const [postingRows] = await pool().query(`
        SELECT 
          COUNT(*) as totalPostings,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openPostings,
          SUM(openings) as totalOpenings
        FROM jobPostings
      `);
      const [applicantRows] = await pool().query(`
        SELECT 
          COUNT(*) as totalApplicants,
          SUM(CASE WHEN stage = 'applied' THEN 1 ELSE 0 END) as newApplicants,
          SUM(CASE WHEN stage = 'interview' THEN 1 ELSE 0 END) as inInterview,
          SUM(CASE WHEN stage = 'hired' THEN 1 ELSE 0 END) as hired
        FROM jobApplicants
      `);
      const p = (postingRows as any[])[0];
      const a = (applicantRows as any[])[0];
      return {
        totalPostings: Number(p.totalPostings || 0), openPostings: Number(p.openPostings || 0), totalOpenings: Number(p.totalOpenings || 0),
        totalApplicants: Number(a.totalApplicants || 0), newApplicants: Number(a.newApplicants || 0), inInterview: Number(a.inInterview || 0), hired: Number(a.hired || 0),
      };
    } catch { return { totalPostings: 0, openPostings: 0, totalOpenings: 0, totalApplicants: 0, newApplicants: 0, inInterview: 0, hired: 0 }; }
  }),
});
