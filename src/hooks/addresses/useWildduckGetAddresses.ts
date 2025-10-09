import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildDuckConfig } from "@johnqh/types";
import type { WildduckUserAuth } from "../../types/wildduck-types";

export interface UseWildduckGetAddressesParams {
  userAuth?: WildduckUserAuth;
  devMode?: boolean;
}

/**
 * React hook for fetching user's email addresses
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param params - Query parameters including userAuth
 * @returns React Query result with addresses list
 */
export const useWildduckGetAddresses = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  params: UseWildduckGetAddressesParams = {},
) => {
  const { userAuth, devMode = false } = params;

  const api = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: ["wildduck-addresses", userAuth?.userId],
    queryFn: async () => {
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
    },
    enabled: !!userAuth,
  });
};

export type UseWildduckGetAddressesReturn = ReturnType<
  typeof useWildduckGetAddresses
>;
