import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type { AutoreplyResponse, UserAuth } from "../../types/wildduck-types";

interface UseWildduckGetAutoreplyReturn {
  getAutoreply: (userAuth: UserAuth) => Promise<Optional<AutoreplyResponse>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching autoreply/vacation responder settings
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getAutoreply function and state
 */
export const useWildduckGetAutoreply = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckGetAutoreplyReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetAutoreply",
  });

  const getAutoreply = useCallback(
    execute(async (userAuth: UserAuth) => {
      try {
        return await wildduckClient.getAutoreply(userAuth);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] getAutoreply failed, returning mock data:",
            err,
          );
          return {
            success: true,
            status: false,
            name: "",
            subject: "",
            text: "",
            html: "",
            start: false,
            end: false,
          } as AutoreplyResponse;
        }
        throw err;
      }
    }),
    [execute, wildduckClient, devMode],
  );

  return { getAutoreply, isLoading, error, clearError };
};
