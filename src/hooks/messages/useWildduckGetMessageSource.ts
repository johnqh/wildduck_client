import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildDuckConfig } from "@johnqh/types";
import type { WildduckUserAuth } from "../../types/wildduck-types";

export interface UseWildduckGetMessageSourceParams {
  userAuth?: WildduckUserAuth;
  mailboxId?: string;
  messageId?: number;
  devMode?: boolean;
}

/**
 * React hook for fetching raw message source (RFC822 format)
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param params - Query parameters including userAuth, mailboxId, and messageId
 * @returns React Query result with message source
 */
export const useWildduckGetMessageSource = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  params: UseWildduckGetMessageSourceParams = {},
) => {
  const { userAuth, mailboxId, messageId, devMode = false } = params;

  const api = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: [
      "wildduck-message-source",
      userAuth?.userId,
      mailboxId,
      messageId,
    ],
    queryFn: async () => {
      if (!userAuth) throw new Error("userAuth is required");
      if (!mailboxId) throw new Error("mailboxId is required");
      if (!messageId) throw new Error("messageId is required");

      try {
        return await api.getMessageSource(userAuth, mailboxId, messageId);
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
    enabled: !!userAuth && !!mailboxId && messageId !== undefined,
  });
};

export type UseWildduckGetMessageSourceReturn = ReturnType<
  typeof useWildduckGetMessageSource
>;
