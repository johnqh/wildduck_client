import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type GetMailboxesRequest,
  type Optional,
  type WildDuckConfig,
  type WildDuckMailboxResponse,
} from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type { WildduckUserAuth } from "../../types/wildduck-types";

interface UseWildduckGetMailboxesReturn {
  getMailboxes: (
    userAuth: WildduckUserAuth,
    options?: Omit<GetMailboxesRequest, "sess" | "ip">,
  ) => Promise<Optional<WildDuckMailboxResponse>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching user's mailboxes
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getMailboxes function and state
 */
export const useWildduckGetMailboxes = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckGetMailboxesReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetMailboxes",
  });

  const getMailboxes = useCallback(
    execute(
      async (
        userAuth: WildduckUserAuth,
        options?: Omit<GetMailboxesRequest, "sess" | "ip">,
      ) => {
        try {
          return await wildduckClient.getMailboxes(userAuth, options);
        } catch (err) {
          if (devMode) {
            console.warn(
              "[DevMode] getMailboxes failed, returning mock data:",
              err,
            );
            return {
              success: true,
              results: [],
              error: null,
            } as unknown as WildDuckMailboxResponse;
          }
          throw err;
        }
      },
    ),
    [execute, wildduckClient, devMode],
  );

  return { getMailboxes, isLoading, error, clearError };
};
