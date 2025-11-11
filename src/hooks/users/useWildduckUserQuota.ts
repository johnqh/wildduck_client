import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildduckClient } from "../../network/wildduck-client";
import type { WildduckUserAuth, WildduckUserResponse } from "@sudobility/types";

export interface UserQuotaInfo {
  allowed: number;
  used: number;
}

export interface UpdateQuotaParams {
  wildduckUserAuth: WildduckUserAuth;
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
export const useWildduckUserQuota = (
  api: WildduckClient,
  wildduckUserAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = wildduckUserAuth?.userId;

  // Query to get user info (includes quota)
  const quotaQueryFn = useCallback(async () => {
    if (!wildduckUserAuth) {
      console.error("User auth is required");
      return undefined;
    }
    const user = (await api.getUser(
      wildduckUserAuth,
    )) as unknown as WildduckUserResponse;
    return user.limits?.quota;
  }, [wildduckUserAuth, api]);

  const quotaQuery = useQuery({
    queryKey: ["user", userId, "quota"],
    queryFn: quotaQueryFn,
    enabled: !!wildduckUserAuth,
  });

  // Mutation to update quota limit
  const updateQuota = useMutation({
    mutationFn: async ({ wildduckUserAuth, quota }: UpdateQuotaParams) => {
      return await api.updateUser(wildduckUserAuth, { quota });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "quota"],
      });
    },
  });

  // Mutation to recalculate quota (forces a recount of actual storage used)
  const recalculateQuota = useMutation({
    mutationFn: async (
      recalcUserId: string,
    ): Promise<RecalculateQuotaResult> => {
      // Note: This endpoint needs to be added to WildduckAPI
      // For now, return a placeholder
      void recalcUserId; // Suppress unused variable warning until endpoint is implemented
      console.error("Recalculate quota endpoint not yet implemented");
      return { success: false, storageUsed: 0, previousStorageUsed: 0 };
    },
    onSuccess: (_, recalcUserId) => {
      queryClient.invalidateQueries({ queryKey: ["user", recalcUserId] });
      queryClient.invalidateQueries({
        queryKey: ["user", recalcUserId, "quota"],
      });
    },
  });

  return useMemo(
    () => ({
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
    }),
    [
      quotaQuery.data,
      quotaQuery.isLoading,
      quotaQuery.isError,
      quotaQuery.error,
      updateQuota.mutate,
      updateQuota.mutateAsync,
      updateQuota.isPending,
      recalculateQuota.mutate,
      recalculateQuota.mutateAsync,
      recalculateQuota.isPending,
    ],
  );
};
