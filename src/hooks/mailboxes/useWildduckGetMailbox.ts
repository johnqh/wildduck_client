import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "@johnqh/types";
import type { WildduckMailboxResponse, WildduckUserAuth } from "@johnqh/types";

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
 * @param config - Wildduck API configuration
 * @param params - Query parameters including userAuth and mailboxId
 * @returns React Query result with mailbox data
 */
export const useWildduckGetMailbox = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMailboxParams = {},
) => {
  const { userAuth, mailboxId, devMode = false } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!userAuth) throw new Error("userAuth is required");
    if (!mailboxId) throw new Error("mailboxId is required");

    try {
      return await api.getMailbox(userAuth, mailboxId);
    } catch (err) {
      if (devMode) {
        console.warn("[DevMode] getMailbox failed, returning mock data:", err);
        return {
          success: true,
          results: [
            {
              id: mailboxId,
              name: "Mock Mailbox",
              path: "Mock/Mailbox",
              modifyIndex: 0,
              subscribed: true,
              hidden: false,
              total: 0,
              unseen: 0,
              size: 0,
            },
          ],
        } as WildduckMailboxResponse;
      }
      throw err;
    }
  }, [userAuth, mailboxId, api, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-mailbox", userAuth?.userId, mailboxId],
    queryFn,
    enabled: !!userAuth && !!mailboxId,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

export type UseWildduckGetMailboxReturn = ReturnType<
  typeof useWildduckGetMailbox
>;
