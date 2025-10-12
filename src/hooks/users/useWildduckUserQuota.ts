import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildduckAPI } from "../../network/wildduck-client";
import type { WildduckUserAuth, WildduckUserResponse } from "@sudobility/types";

export interface UserQuotaInfo {
  allowed: number;
  used: number;
}

export interface UpdateQuotaParams {
  userAuth: WildduckUserAuth;
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
  api: WildduckAPI,
  userAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = userAuth?.userId;

  // Query to get user info (includes quota)
  const quotaQueryFn = useCallback(async () => {
    if (!userAuth) throw new Error("User auth is required");
    const user = (await api.getUser(
      userAuth,
    )) as unknown as WildduckUserResponse;
    return user.limits?.quota;
  }, [userAuth, api]);

  const quotaQuery = useQuery({
    queryKey: ["user", userId, "quota"],
    queryFn: quotaQueryFn,
    enabled: !!userAuth,
  });

  // Mutation to update quota limit
  const updateQuota = useMutation({
    mutationFn: async ({ userAuth, quota }: UpdateQuotaParams) => {
      return await api.updateUser(userAuth, { quota });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "quota"],
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
      throw new Error("Recalculate quota endpoint not yet implemented");
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
