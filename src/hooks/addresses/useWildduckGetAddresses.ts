import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type Optional,
  type WildDuckAddressResponse,
  type WildDuckConfig,
} from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type { WildduckUserAuth } from "../../types/wildduck-types";

interface UseWildduckGetAddressesReturn {
  getAddresses: (
    userAuth: WildduckUserAuth,
  ) => Promise<Optional<WildDuckAddressResponse>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching user's email addresses
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getAddresses function and state
 */
export const useWildduckGetAddresses = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckGetAddressesReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetAddresses",
  });

  const getAddresses = useCallback(
    execute(async (userAuth: WildduckUserAuth) => {
      try {
        return await wildduckClient.getAddresses(userAuth);
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
          } as unknown as WildDuckAddressResponse;
        }
        throw err;
      }
    }),
    [execute, wildduckClient, devMode],
  );

  return { getAddresses, isLoading, error, clearError };
};
