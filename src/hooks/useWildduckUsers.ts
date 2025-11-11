import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckUser,
} from "@sudobility/types";
import { WildduckMockData } from "./mocks";

interface UseWildduckUsersReturn {
  isLoading: boolean;
  error: Optional<string>;
  getUser: (userId: string) => Promise<WildduckUser>;
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

  // Helper to build headers
  const buildHeaders = useCallback((): Record<string, string> => {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }, []);

  // Get user function (imperative)
  const getUser = useCallback(
    async (userId: string): Promise<WildduckUser> => {
      setIsLoading(true);
      setError(null);

      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<WildduckUser>(
          `${apiUrl}/users/${userId}`,
          {
            method: "GET",
            headers,
          },
        );
        const userData = response.data as WildduckUser;

        // Update cache
        queryClient.setQueryData(["wildduck-user", userId], userData);

        return userData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get user";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Get user failed, returning mock data:",
            errorMessage,
          );
          const mockData = WildduckMockData.getUser(userId);
          const mockUser = mockData.data.user as unknown as WildduckUser;

          // Update cache with mock data
          queryClient.setQueryData(["wildduck-user", userId], mockUser);

          return mockUser;
        }

        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      config.cloudflareWorkerUrl,
      config.backendUrl,
      buildHeaders,
      queryClient,
      devMode,
    ],
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
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        params.set("limit", limit.toString());

        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{
          results?: WildduckUser[];
          total?: number;
        }>(`${apiUrl}/users?${params}`, {
          method: "GET",
          headers,
        });

        const usersData = response.data as {
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
    [
      config.cloudflareWorkerUrl,
      config.backendUrl,
      buildHeaders,
      queryClient,
      devMode,
    ],
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
