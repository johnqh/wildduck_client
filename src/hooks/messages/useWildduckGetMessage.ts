import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type Optional,
  type WildDuckConfig,
  type WildDuckMessageResponse,
} from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import { WildDuckMockData } from "../mocks";
import type { UserAuth } from "../../types/wildduck-types";

interface UseWildduckGetMessageReturn {
  getMessage: (
    userAuth: UserAuth,
    messageId: string,
  ) => Promise<Optional<WildDuckMessageResponse>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching a single message by ID
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getMessage function and state
 */
export const useWildduckGetMessage = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckGetMessageReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetMessage",
  });

  const getMessage = useCallback(
    execute(async (userAuth: UserAuth, messageId: string) => {
      try {
        return await wildduckClient.getMessage(userAuth, messageId);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] getMessage failed, returning mock data:",
            err,
          );
          return {
            success: true,
            data: WildDuckMockData.getMessageQuery(messageId, userAuth.userId),
            error: null,
          } as unknown as WildDuckMessageResponse;
        }
        throw err;
      }
    }),
    [execute, wildduckClient, devMode],
  );

  return { getMessage, isLoading, error, clearError };
};
