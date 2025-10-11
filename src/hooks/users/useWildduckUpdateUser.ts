import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "../../types/wildduck-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSuccessResponse,
  WildduckUpdateUserRequest,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseUpdateUserReturn {
  updateUser: (
    userAuth: WildduckUserAuth,
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
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      params,
    }: {
      userAuth: WildduckUserAuth;
      params: WildduckUpdateUserRequest;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.updateUser(userAuth, params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] updateUser failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate user detail and users list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
    },
  });

  const updateUser = useCallback(
    async (userAuth: WildduckUserAuth, params: WildduckUpdateUserRequest) => {
      return updateMutation.mutateAsync({ userAuth, params });
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
