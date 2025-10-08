import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildDuckAPI } from "../../network/wildduck-client";
import type { UserResponse } from "../../types/wildduck-types";

export interface UserQuotaInfo {
  allowed: number;
  used: number;
}

export interface UpdateQuotaParams {
  userId: string;
  quota: number; // Allowed quota in bytes
}

export interface RecalculateQuotaResult {
  success: boolean;
  storageUsed: number;
  previousStorageUsed: number;
}

/**
 * Hook for managing user storage quota
 * Provides query for current quota usage and mutations for updating/recalculating quota
 */
export const useUserQuota = (api: WildDuckAPI, userId?: string) => {
  const queryClient = useQueryClient();

  // Query to get user info (includes quota)
  const quotaQuery = useQuery({
    queryKey: ["user", userId, "quota"],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const user = (await api.getUser(userId)) as unknown as UserResponse;
      return user.limits?.quota;
    },
    enabled: !!userId,
  });

  // Mutation to update quota limit
  const updateQuota = useMutation({
    mutationFn: async ({ userId, quota }: UpdateQuotaParams) => {
      return await api.updateUser(userId, { quota });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId, "quota"],
      });
    },
  });

  // Mutation to recalculate quota (forces a recount of actual storage used)
  const recalculateQuota = useMutation({
    mutationFn: async (
      recalcUserId: string,
    ): Promise<RecalculateQuotaResult> => {
      // Note: This endpoint needs to be added to WildDuckAPI
      // For now, return a placeholder
      void recalcUserId; // Suppress unused variable warning until endpoint is implemented
      throw new Error("Recalculate quota endpoint not yet implemented");
    },
    onSuccess: (_, recalcUserId) => {
      queryClient.invalidateQueries({ queryKey: ["user", recalcUserId] });
      queryClient.invalidateQueries({
        queryKey: ["user", recalcUserId, "quota"],
      });
    },
  });

  return {
    // Query
    quota: quotaQuery.data,
    isLoading: quotaQuery.isLoading,
    isError: quotaQuery.isError,
    error: quotaQuery.error,

    // Mutations
    updateQuota: updateQuota.mutate,
    updateQuotaAsync: updateQuota.mutateAsync,
    isUpdating: updateQuota.isPending,

    recalculateQuota: recalculateQuota.mutate,
    recalculateQuotaAsync: recalculateQuota.mutateAsync,
    isRecalculating: recalculateQuota.isPending,
  };
};
