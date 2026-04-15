import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

/**
 * Hook to resolve user IDs to display names.
 * Fetches the user list once and provides a lookup function.
 */
export function useUserLookup() {
  const { data: users } = trpc.users.listNames.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    if (users && Array.isArray(users)) {
      for (const user of users) {
        if (user.id && user.name) {
          map.set(user.id, user.name);
        }
      }
    }
    return map;
  }, [users]);

  const getUserName = (userId?: string | null): string => {
    if (!userId) return "-";
    return userMap.get(userId) || userId.slice(0, 8) + "...";
  };

  return { getUserName, userMap, users };
}
