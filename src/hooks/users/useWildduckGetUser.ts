import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/di";
import { type WildduckConfig } from "@sudobility/types";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetUserParams {
  userAuth?: WildduckUserAuth;
  devMode?: boolean;
}

/**
 * React hook for fetching user information
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including userAuth
 * @returns React Query result with user data
 */
export const useWildduckGetUser = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetUserParams = {},
) => {
  const { userAuth, devMode = false } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!userAuth) throw new Error("userAuth is required");

    try {
      return await api.getUser(userAuth);
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
        };
      }
      throw err;
    }
  }, [userAuth, api, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-user", userAuth?.userId],
    queryFn,
    enabled: !!userAuth,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

export type UseWildduckGetUserReturn = ReturnType<typeof useWildduckGetUser>;
