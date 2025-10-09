import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateUserRequest,
  CreateUserResponse,
} from "../../types/wildduck-types";

interface UseCreateUserReturn {
  createUser: (params: CreateUserRequest) => Promise<CreateUserResponse>;
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
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with createUser function and state
 */
export const useCreateUser = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseCreateUserReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: CreateUserRequest,
    ): Promise<CreateUserResponse> => {
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
    async (params: CreateUserRequest) => {
      return createMutation.mutateAsync(params);
    },
    [createMutation],
  );

  return {
    createUser,
    isLoading: createMutation.isPending,
    error: createMutation.error,
    clearError: () => createMutation.reset(),
  };
};
