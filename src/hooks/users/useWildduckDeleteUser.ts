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

interface UseDeleteUserReturn {
  deleteUser: (userAuth: WildduckUserAuth) => Promise<WildduckSuccessResponse>;
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
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with deleteUser function and state
 */
export const useWildduckDeleteUser = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseDeleteUserReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      userAuth: WildduckUserAuth,
    ): Promise<WildduckSuccessResponse> => {
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
