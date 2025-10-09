import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SuccessResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseDeleteUserReturn {
  deleteUser: (userAuth: WildduckUserAuth) => Promise<SuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for deleting a user
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires admin authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with deleteUser function and state
 */
export const useWildduckDeleteUser = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseDeleteUserReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      userAuth: WildduckUserAuth,
    ): Promise<SuccessResponse> => {
      try {
        return await wildduckClient.deleteUser(userAuth);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] deleteUser failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, userAuth) => {
      // Invalidate users list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
      // Remove the specific user from cache
      queryClient.removeQueries({
        queryKey: ["wildduck-user", userAuth.userId],
      });
    },
  });

  const deleteUser = useCallback(
    async (userAuth: WildduckUserAuth) => {
      return deleteMutation.mutateAsync(userAuth);
    },
    [deleteMutation],
  );

  return {
    deleteUser,
    isLoading: deleteMutation.isPending,
    error: deleteMutation.error,
    clearError: () => deleteMutation.reset(),
  };
};
