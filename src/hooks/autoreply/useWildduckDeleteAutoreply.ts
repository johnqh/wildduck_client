import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SuccessResponse, UserAuth } from "../../types/wildduck-types";

interface UseWildduckDeleteAutoreplyReturn {
  deleteAutoreply: (userAuth: UserAuth) => Promise<SuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for disabling autoreply/vacation responder
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with deleteAutoreply function and state
 */
export const useWildduckDeleteAutoreply = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckDeleteAutoreplyReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-autoreply",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (userAuth: UserAuth): Promise<SuccessResponse> => {
      try {
        return await wildduckClient.deleteAutoreply(userAuth);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] deleteAutoreply failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, userAuth) => {
      // Invalidate autoreply settings
      queryClient.invalidateQueries({
        queryKey: ["wildduck-autoreply", userAuth.userId],
      });
    },
  });

  const deleteAutoreply = useCallback(
    async (userAuth: UserAuth) => {
      return deleteMutation.mutateAsync(userAuth);
    },
    [deleteMutation],
  );

  return {
    deleteAutoreply,
    isLoading: deleteMutation.isPending,
    error: deleteMutation.error,
    clearError: () => deleteMutation.reset(),
  };
};
