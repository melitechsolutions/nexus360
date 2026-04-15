/**
 * Shared utility to fetch company info from settings DB.
 * Used by all PDF generators, email templates, and report exporters
 * so that no file needs to hardcode company details.
 */
import { getDb } from '../db';
import { settings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  tagline: string;
  kraPin: string;
}

/** Fetch company info from the `company` settings category. */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  const defaults: CompanyInfo = {
    name: process.env.COMPANY_NAME || 'Your Company',
    email: process.env.COMPANY_EMAIL || '',
    phone: '',
    address: '',
    website: '',
    tagline: '',
    kraPin: '',
  };

  try {
    const db = await getDb();
    if (!db) return defaults;

    const rows = await db.select().from(settings).where(eq(settings.category, 'company'));
    const map: Record<string, string> = {};
    rows.forEach(r => { if (r.key) map[r.key] = r.value ?? ''; });

    return {
      name: map.companyName || map.name || defaults.name,
      email: map.email || map.companyEmail || defaults.email,
      phone: map.phone || defaults.phone,
      address: map.address || defaults.address,
      website: map.website || defaults.website,
      tagline: map.tagline || defaults.tagline,
      kraPin: map.kraPin || map.taxId || defaults.kraPin,
    };
  } catch {
    return defaults;
  }
}
