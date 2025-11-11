import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetAddressesParams {
  wildduckUserAuth?: WildduckUserAuth;
  devMode?: boolean;
}

/**
 * React hook for fetching user's email addresses
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including wildduckUserAuth
 * @returns React Query result with addresses list
 */
export const useWildduckGetAddresses = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetAddressesParams = {},
) => {
  const { wildduckUserAuth, devMode = false } = params;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!wildduckUserAuth) {
      console.error("wildduckUserAuth is required");
      return undefined;
    }

    try {
      return await api.getAddresses(wildduckUserAuth);
    } catch (err) {
      if (devMode) {
        return {
          success: true,
          results: [],
          error: null,
        };
      }
      console.error("Failed to get addresses:", err);
      return undefined;
    }
  }, [wildduckUserAuth, api, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-addresses", wildduckUserAuth?.userId],
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

export type UseWildduckGetAddressesReturn = ReturnType<
  typeof useWildduckGetAddresses
>;
