import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type { UserAuth } from "../../types/wildduck-types";

interface UseWildduckGetMessageSourceReturn {
  getMessageSource: (
    userAuth: UserAuth,
    mailboxId: string,
    messageId: number,
  ) => Promise<Optional<string>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching raw message source (RFC822 format)
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getMessageSource function and state
 */
export const useWildduckGetMessageSource = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckGetMessageSourceReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetMessageSource",
  });

  const getMessageSource = useCallback(
    execute(
      async (userAuth: UserAuth, mailboxId: string, messageId: number) => {
        try {
          return await wildduckClient.getMessageSource(
            userAuth,
            mailboxId,
            messageId,
          );
        } catch (err) {
          if (devMode) {
            console.warn(
              "[DevMode] getMessageSource failed, returning mock data:",
              err,
            );
            return `From: mock@example.com\nTo: user@example.com\nSubject: Mock Message\nDate: ${new Date().toISOString()}\n\nMock message body`;
          }
          throw err;
        }
      },
    ),
    [execute, wildduckClient, devMode],
  );

  return { getMessageSource, isLoading, error, clearError };
};
