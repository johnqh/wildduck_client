import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type GetMessagesRequest,
  type Optional,
  type WildDuckConfig,
  type WildDuckMessagesResponse,
} from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type { WildduckUserAuth } from "../../types/wildduck-types";

interface UseWildduckGetMessagesReturn {
  getMessages: (
    userAuth: WildduckUserAuth,
    mailboxId: string,
    options?: Omit<GetMessagesRequest, "sess" | "ip">,
  ) => Promise<Optional<WildDuckMessagesResponse>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching messages from a mailbox
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getMessages function and state
 */
export const useWildduckGetMessages = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckGetMessagesReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetMessages",
  });

  const getMessages = useCallback(
    execute(
      async (
        userAuth: WildduckUserAuth,
        mailboxId: string,
        options?: Omit<GetMessagesRequest, "sess" | "ip">,
      ) => {
        try {
          return await wildduckClient.getMessages(userAuth, mailboxId, options);
        } catch (err) {
          if (devMode) {
            console.warn(
              "[DevMode] getMessages failed, returning mock data:",
              err,
            );
            return {
              success: true,
              results: [],
              total: 0,
              page: 1,
              previousCursor: null,
              nextCursor: null,
            } as unknown as WildDuckMessagesResponse;
          }
          throw err;
        }
      },
    ),
    [execute, wildduckClient, devMode],
  );

  return { getMessages, isLoading, error, clearError };
};
