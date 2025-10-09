import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type {
  MailboxResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckGetMailboxReturn {
  getMailbox: (
    userAuth: WildduckUserAuth,
    mailboxId: string,
  ) => Promise<Optional<MailboxResponse>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for fetching specific mailbox information
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getMailbox function and state
 */
export const useWildduckGetMailbox = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckGetMailboxReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetMailbox",
  });

  const getMailbox = useCallback(
    execute(async (userAuth: WildduckUserAuth, mailboxId: string) => {
      try {
        return await wildduckClient.getMailbox(userAuth, mailboxId);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] getMailbox failed, returning mock data:",
            err,
          );
          return {
            success: true,
            id: mailboxId,
            name: "Mock Mailbox",
            path: "Mock/Mailbox",
            specialUse: false,
            modifyIndex: 0,
            subscribed: true,
            hidden: false,
            total: 0,
            unseen: 0,
          } as MailboxResponse;
        }
        throw err;
      }
    }),
    [execute, wildduckClient, devMode],
  );

  return { getMailbox, isLoading, error, clearError };
};
