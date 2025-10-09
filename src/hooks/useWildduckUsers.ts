import { useState } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import type { Optional } from "@johnqh/types";
import type { WildduckConfig } from "../types/wildduck-types";
import { WildduckMockData } from "./mocks";

interface WildduckUser {
  success: boolean;
  id: string;
  username: string;
  address?: string;
  name?: string;
  language?: string;
  quota?: {
    allowed: number;
    used: number;
  };
  hasPasswordSet?: boolean;
  activated?: boolean;
  disabled?: boolean;
  suspended?: boolean;
}

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
 */
const useWildduckUsers = (
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckUsersReturn => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);

  // Helper to build headers
  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = config.apiToken;
    }

    return headers;
  };

  // Get user function (imperative)
  const getUser = async (userId: string): Promise<WildduckUser> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
      const headers = buildHeaders();

      const response = await axios.get(`${apiUrl}/users/${userId}`, {
        headers,
      });
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
  };

  // Get users function (imperative)
  const getUsers = async (
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

      const response = await axios.get(`${apiUrl}/users?${params}`, {
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
        queryClient.setQueryData(["wildduck-users", query, limit], mockResult);

        return mockResult;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    getUser,
    getUsers,
    clearError: () => setError(null),
  };
};

export { useWildduckUsers, type WildduckUser, type UseWildduckUsersReturn };
