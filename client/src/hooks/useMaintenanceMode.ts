import { trpc } from "@/lib/trpc";

export function useMaintenanceMode() {
  const { data } = trpc.settings.getMaintenanceStatus.useQuery(
    undefined,
    { retry: false, refetchInterval: 30000 }
  );

  const maintenanceMode = data?.enabled ?? false;

  return { maintenanceMode, maintenanceData: data };
}
