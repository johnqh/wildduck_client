import type { Optional } from "@sudobility/types";
import { useCallback, useMemo } from "react";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSuccessResponse,
  WildduckUpdateUserRequest,
  WildduckUserAuth,
} from "@sudobility/types";

interface UseUpdateUserReturn {
  updateUser: (
    wildduckUserAuth: WildduckUserAuth,
    params: WildduckUpdateUserRequest,
  ) => Promise<WildduckSuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for updating user information
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with updateUser function and state
 */
export const useWildduckUpdateUser = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseUpdateUserReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      params: WildduckUpdateUserRequest;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.updateUser(wildduckUserAuth, params);
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to update user:", err);
        return { success: false };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate user detail and users list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
    },
  });

  const updateUser = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      params: WildduckUpdateUserRequest,
    ) => {
      return updateMutation.mutateAsync({ wildduckUserAuth, params });
    },
    [updateMutation],
  );

  const clearError = useCallback(
    () => updateMutation.reset(),
    [updateMutation],
  );

  return useMemo(
    () => ({
      updateUser,
      isLoading: updateMutation.isPending,
      error: updateMutation.error,
      clearError,
    }),
    [updateUser, updateMutation.isPending, updateMutation.error, clearError],
  );
};
