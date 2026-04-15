/**
 * Hook to fetch company information from settings.
 * Use this instead of hardcoding company name, email, phone, address, etc.
 */
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  tagline: string;
  poBox: string;
}

export function useCompanyInfo(): CompanyInfo {
  const { data } = trpc.settings.getByCategory.useQuery({ category: "company" });

  return useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(data)) {
      data.forEach((r: any) => { if (r.key) map[r.key] = r.value ?? ""; });
    } else if (data && typeof data === "object") {
      Object.assign(map, data);
    }
    return {
      name: map.companyName || map.name || import.meta.env.VITE_APP_TITLE || "Your Company",
      email: map.email || map.companyEmail || "",
      phone: map.phone || "",
      address: map.address || "",
      website: map.website || "",
      tagline: map.tagline || "",
      poBox: map.poBox || "",
    };
  }, [data]);
}
