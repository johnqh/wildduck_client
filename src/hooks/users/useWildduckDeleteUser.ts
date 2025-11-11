import type { Optional } from "@sudobility/types";
import { useCallback, useMemo } from "react";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSuccessResponse,
  WildduckUserAuth,
} from "@sudobility/types";

interface UseDeleteUserReturn {
  deleteUser: (
    wildduckUserAuth: WildduckUserAuth,
  ) => Promise<WildduckSuccessResponse>;
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
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      wildduckUserAuth: WildduckUserAuth,
    ): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.deleteUser(wildduckUserAuth);
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, wildduckUserAuth) => {
      // Invalidate users list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
      // Remove the specific user from cache
      queryClient.removeQueries({
        queryKey: ["wildduck-user", wildduckUserAuth.userId],
      });
    },
  });

  const deleteUser = useCallback(
    async (wildduckUserAuth: WildduckUserAuth) => {
      return deleteMutation.mutateAsync(wildduckUserAuth);
    },
    [deleteMutation],
  );

  const clearError = useCallback(
    () => deleteMutation.reset(),
    [deleteMutation],
  );

  return useMemo(
    () => ({
      deleteUser,
      isLoading: deleteMutation.isPending,
      error: deleteMutation.error,
      clearError,
    }),
    [deleteUser, deleteMutation.isPending, deleteMutation.error, clearError],
  );
};
