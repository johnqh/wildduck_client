import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "../../types/wildduck-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSuccessResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckDeleteAutoreplyReturn {
  deleteAutoreply: (
    userAuth: WildduckUserAuth,
  ) => Promise<WildduckSuccessResponse>;
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
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with deleteAutoreply function and state
 */
export const useWildduckDeleteAutoreply = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckDeleteAutoreplyReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-autoreply",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      userAuth: WildduckUserAuth,
    ): Promise<WildduckSuccessResponse> => {
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
    async (userAuth: WildduckUserAuth) => {
      return deleteMutation.mutateAsync(userAuth);
    },
    [deleteMutation],
  );

  const clearError = useCallback(
    () => deleteMutation.reset(),
    [deleteMutation],
  );

  return useMemo(
    () => ({
      deleteAutoreply,
      isLoading: deleteMutation.isPending,
      error: deleteMutation.error,
      clearError,
    }),
    [
      deleteAutoreply,
      deleteMutation.isPending,
      deleteMutation.error,
      clearError,
    ],
  );
};
