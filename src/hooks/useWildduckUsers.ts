import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckCreateUserRequest,
  WildduckCreateUserResponse,
  WildduckUser,
  WildduckUserAuth,
} from "@sudobility/types";
import { WildduckMockData } from "./mocks";
import { WildduckClient } from "../network/wildduck-client";

interface UseWildduckUsersReturn {
  isLoading: boolean;
  error: Optional<string>;
  getUser: (wildduckUserAuth: WildduckUserAuth) => Promise<WildduckUser>;
  getUsers: (
    query?: string,
    limit?: number,
  ) => Promise<{ users: WildduckUser[]; total: number }>;
  createUser: (
    params: WildduckCreateUserRequest,
  ) => Promise<WildduckCreateUserResponse>;
  isCreating: boolean;
  createError: Optional<Error>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for Wildduck user management operations using React Query
 * Query results are cached for faster subsequent access
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param devMode - Development mode flag
 */
const useWildduckUsers = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckUsersReturn => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [lastFetchParams, setLastFetchParams] = useState<{
    query?: string | undefined;
    limit?: number | undefined;
  } | null>(null);

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Get user function (imperative)
  const getUser = useCallback(
    async (wildduckUserAuth: WildduckUserAuth): Promise<WildduckUser> => {
      setIsLoading(true);
      setError(null);

      try {
        const userData = await api.getUser(wildduckUserAuth);

        // Update cache
        queryClient.setQueryData(
          ["wildduck-user", wildduckUserAuth.userId],
          userData,
        );

        return userData as unknown as WildduckUser;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get user";

        // Return mock data in devMode when API fails
        if (devMode) {
          const mockData = WildduckMockData.getUser(wildduckUserAuth.userId);
          const mockUser = mockData.data.user as unknown as WildduckUser;

          // Update cache with mock data
          queryClient.setQueryData(
            ["wildduck-user", wildduckUserAuth.userId],
            mockUser,
          );

          return mockUser;
        }

        console.error("[useWildduckUsers] getUser error:", errorMessage);
        setError(errorMessage);
        return undefined as any;
      } finally {
        setIsLoading(false);
      }
    },
    [api, queryClient, devMode],
  );

  // Get users function (imperative)
  const getUsers = useCallback(
    async (
      query?: string,
      limit: number = 20,
    ): Promise<{ users: WildduckUser[]; total: number }> => {
      setIsLoading(true);
      setError(null);

      try {
        const filters: Record<string, unknown> = { limit };
        if (query) filters.query = query;

        const response = await api.getUsersList(filters);

        const usersData = response as {
          results?: WildduckUser[];
          total?: number;
        };
        const result = {
          users: usersData.results || [],
          total: usersData.total || 0,
        };

        // Update cache
        queryClient.setQueryData(["wildduck-users", query, limit], result);

        // Save fetch params for refresh
        setLastFetchParams({ query: query || undefined, limit });

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get users";

        // Return mock data in devMode when API fails
        if (devMode) {
          const mockData = WildduckMockData.getUsers();
          const mockResult = {
            users: mockData.data.users as unknown as WildduckUser[],
            total: mockData.data.total,
          };

          // Update cache with mock data
          queryClient.setQueryData(
            ["wildduck-users", query, limit],
            mockResult,
          );

          return mockResult;
        }

        console.error("[useWildduckUsers] getUsers error:", errorMessage);
        setError(errorMessage);
        return { users: [], total: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [api, queryClient, devMode],
  );

  // Create user mutation
  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: WildduckCreateUserRequest,
    ): Promise<WildduckCreateUserResponse> => {
      try {
        return await api.createUser(params);
      } catch (err) {
        if (devMode) {
          return {
            success: true,
            id: `mock-user-${Date.now()}`,
          };
        }
        console.error("Failed to create user:", err);
        throw err;
      }
    },
    onSuccess: async () => {
      // Invalidate users list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
      // Auto-refresh users list
      if (lastFetchParams) {
        await getUsers(lastFetchParams.query, lastFetchParams.limit);
      }
    },
  });

  const createUser = useCallback(
    async (params: WildduckCreateUserRequest) => {
      return createMutation.mutateAsync(params);
    },
    [createMutation],
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (lastFetchParams) {
      await getUsers(lastFetchParams.query, lastFetchParams.limit);
    }
  }, [lastFetchParams, getUsers]);

  const clearError = useCallback(() => {
    setError(null);
    createMutation.reset();
  }, [createMutation]);

  return useMemo(
    () => ({
      isLoading,
      error,
      getUser,
      getUsers,
      createUser,
      isCreating: createMutation.isPending,
      createError: createMutation.error,
      refresh,
      clearError,
    }),
    [
      isLoading,
      error,
      getUser,
      getUsers,
      createUser,
      createMutation.isPending,
      createMutation.error,
      refresh,
      clearError,
    ],
  );
};

export { useWildduckUsers, type UseWildduckUsersReturn };
