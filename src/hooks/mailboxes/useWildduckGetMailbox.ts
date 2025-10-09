import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildDuckConfig } from "@johnqh/types";
import type {
  MailboxResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

export interface UseWildduckGetMailboxParams {
  userAuth?: WildduckUserAuth;
  mailboxId?: string;
  devMode?: boolean;
}

/**
 * React hook for fetching specific mailbox information
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param params - Query parameters including userAuth and mailboxId
 * @returns React Query result with mailbox data
 */
export const useWildduckGetMailbox = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  params: UseWildduckGetMailboxParams = {},
) => {
  const { userAuth, mailboxId, devMode = false } = params;

  const api = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: ["wildduck-mailbox", userAuth?.userId, mailboxId],
    queryFn: async () => {
      if (!userAuth) throw new Error("userAuth is required");
      if (!mailboxId) throw new Error("mailboxId is required");

      try {
        return await api.getMailbox(userAuth, mailboxId);
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
    },
    enabled: !!userAuth && !!mailboxId,
  });
};

export type UseWildduckGetMailboxReturn = ReturnType<
  typeof useWildduckGetMailbox
>;
