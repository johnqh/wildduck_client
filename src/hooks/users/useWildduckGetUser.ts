import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type Optional,
  type WildDuckConfig,
  type WildDuckUserResponse,
} from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type { UserAuth } from "../../types/wildduck-types";

interface UseGetUserReturn {
  getUser: (userAuth: UserAuth) => Promise<Optional<WildDuckUserResponse>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching user information
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getUser function and state
 */
export const useWildduckGetUser = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseGetUserReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetUser",
  });

  const getUser = useCallback(
    execute(async (userAuth: UserAuth) => {
      try {
        return await wildduckClient.getUser(userAuth);
      } catch (err) {
        if (devMode) {
          console.warn("[DevMode] getUser failed, returning mock data:", err);
          return {
            success: true,
            id: userAuth.userId,
            username: `${userAuth.userId}@example.com`,
            name: `Mock User ${userAuth.userId}`,
            address: `${userAuth.userId}@example.com`,
            quota: {
              allowed: 1073741824,
              used: 134217728,
            },
            hasPasswordSet: false,
            activated: true,
            disabled: false,
            suspended: false,
            error: null,
          } as unknown as WildDuckUserResponse;
        }
        throw err;
      }
    }),
    [execute, wildduckClient, devMode],
  );

  return { getUser, isLoading, error, clearError };
};
