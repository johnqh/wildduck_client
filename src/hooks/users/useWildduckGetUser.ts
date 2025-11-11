import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetUserParams {
  wildduckUserAuth?: WildduckUserAuth;
  devMode?: boolean;
}

/**
 * React hook for fetching user information
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including wildduckUserAuth
 * @returns React Query result with user data
 */
export const useWildduckGetUser = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetUserParams = {},
) => {
  const { wildduckUserAuth, devMode = false } = params;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!wildduckUserAuth) throw new Error("wildduckUserAuth is required");

    try {
      return await api.getUser(wildduckUserAuth);
    } catch (err) {
      if (devMode) {
        return {
          success: true,
          id: wildduckUserAuth.userId,
          username: `${wildduckUserAuth.userId}@example.com`,
          name: `Mock User ${wildduckUserAuth.userId}`,
          address: `${wildduckUserAuth.userId}@example.com`,
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
  }, [wildduckUserAuth, api, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-user", wildduckUserAuth?.userId],
    queryFn,
    enabled: !!wildduckUserAuth,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

export type UseWildduckGetUserReturn = ReturnType<typeof useWildduckGetUser>;
