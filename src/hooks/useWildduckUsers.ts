import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
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
          console.warn(
            "[DevMode] Get user failed, returning mock data:",
            errorMessage,
          );
          const mockData = WildduckMockData.getUser(wildduckUserAuth.userId);
          const mockUser = mockData.data.user as unknown as WildduckUser;

          // Update cache with mock data
          queryClient.setQueryData(
            ["wildduck-user", wildduckUserAuth.userId],
            mockUser,
          );

          return mockUser;
        }

        setError(errorMessage);
        throw new Error(errorMessage);
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

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get users";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Get users failed, returning mock data:",
            errorMessage,
          );
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

        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [api, queryClient, devMode],
  );

  const clearError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({
      isLoading,
      error,
      getUser,
      getUsers,
      clearError,
    }),
    [isLoading, error, getUser, getUsers, clearError],
  );
};

export { useWildduckUsers, type UseWildduckUsersReturn };
