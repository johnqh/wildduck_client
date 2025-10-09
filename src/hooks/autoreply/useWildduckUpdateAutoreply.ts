import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "../../types/wildduck-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckAutoreplyRequest,
  WildduckSuccessResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckUpdateAutoreplyReturn {
  updateAutoreply: (
    userAuth: WildduckUserAuth,
    params: WildduckAutoreplyRequest,
  ) => Promise<WildduckSuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for updating autoreply/vacation responder settings
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with updateAutoreply function and state
 */
export const useWildduckUpdateAutoreply = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckUpdateAutoreplyReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-autoreply",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      params,
    }: {
      userAuth: WildduckUserAuth;
      params: WildduckAutoreplyRequest;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.updateAutoreply(userAuth, params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] updateAutoreply failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate autoreply settings
      queryClient.invalidateQueries({
        queryKey: ["wildduck-autoreply", variables.userAuth.userId],
      });
    },
  });

  const updateAutoreply = useCallback(
    async (userAuth: WildduckUserAuth, params: WildduckAutoreplyRequest) => {
      return updateMutation.mutateAsync({ userAuth, params });
    },
    [updateMutation],
  );

  return {
    updateAutoreply,
    isLoading: updateMutation.isPending,
    error: updateMutation.error,
    clearError: () => updateMutation.reset(),
  };
};
