import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetAddressesParams {
  userAuth?: WildduckUserAuth;
  devMode?: boolean;
}

/**
 * React hook for fetching user's email addresses
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including userAuth
 * @returns React Query result with addresses list
 */
export const useWildduckGetAddresses = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetAddressesParams = {},
) => {
  const { userAuth, devMode = false } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!userAuth) throw new Error("userAuth is required");

    try {
      return await api.getAddresses(userAuth);
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] getAddresses failed, returning mock data:",
          err,
        );
        return {
          success: true,
          results: [],
          error: null,
        };
      }
      throw err;
    }
  }, [userAuth, api, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-addresses", userAuth?.userId],
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

export type UseWildduckGetAddressesReturn = ReturnType<
  typeof useWildduckGetAddresses
>;
