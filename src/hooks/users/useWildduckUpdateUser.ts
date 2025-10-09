import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SuccessResponse,
  UpdateUserRequest,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseUpdateUserReturn {
  updateUser: (
    userAuth: WildduckUserAuth,
    params: UpdateUserRequest,
  ) => Promise<SuccessResponse>;
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
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with updateUser function and state
 */
export const useWildduckUpdateUser = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseUpdateUserReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
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
      params: UpdateUserRequest;
    }): Promise<SuccessResponse> => {
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
    async (userAuth: WildduckUserAuth, params: UpdateUserRequest) => {
      return updateMutation.mutateAsync({ userAuth, params });
    },
    [updateMutation],
  );

  return {
    updateUser,
    isLoading: updateMutation.isPending,
    error: updateMutation.error,
    clearError: () => updateMutation.reset(),
  };
};
