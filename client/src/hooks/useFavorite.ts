import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Hook to manage star/favorite toggle on detail pages.
 * Returns { isStarred, toggleStar, isLoading }
 */
export function useFavorite(entityType: string, entityId: string, entityName?: string) {
  const utils = trpc.useUtils();

  const { data, isLoading: checking } = trpc.favorites.isStarred.useQuery(
    { entityType, entityId },
    { enabled: !!entityId, staleTime: 30_000 }
  );

  const toggleMutation = trpc.favorites.toggle.useMutation({
    onSuccess: (result) => {
      utils.favorites.isStarred.invalidate({ entityType, entityId });
      utils.favorites.list.invalidate();
      toast.success(result.starred ? "Added to favorites" : "Removed from favorites");
    },
    onError: () => {
      toast.error("Failed to update favorite");
    },
  });

  const toggleStar = () => {
    toggleMutation.mutate({ entityType, entityId, entityName });
  };

  return {
    isStarred: data?.starred ?? false,
    toggleStar,
    isLoading: checking || toggleMutation.isPending,
  };
}
