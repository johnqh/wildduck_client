import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "../../types/wildduck-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckCreateUserRequest,
  WildduckCreateUserResponse,
} from "../../types/wildduck-types";

interface UseCreateUserReturn {
  createUser: (
    params: WildduckCreateUserRequest,
  ) => Promise<WildduckCreateUserResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for creating a new user
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires admin authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with createUser function and state
 */
export const useWildduckCreateUser = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseCreateUserReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: WildduckCreateUserRequest,
    ): Promise<WildduckCreateUserResponse> => {
      try {
        return await wildduckClient.createUser(params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] createUser failed, returning mock data:",
            err,
          );
          return {
            success: true,
            id: `mock-user-${Date.now()}`,
          };
        }
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
    },
  });

  const createUser = useCallback(
    async (params: WildduckCreateUserRequest) => {
      return createMutation.mutateAsync(params);
    },
    [createMutation],
  );

  const clearError = useCallback(
    () => createMutation.reset(),
    [createMutation],
  );

  return useMemo(
    () => ({
      createUser,
      isLoading: createMutation.isPending,
      error: createMutation.error,
      clearError,
    }),
    [createUser, createMutation.isPending, createMutation.error, clearError],
  );
};
