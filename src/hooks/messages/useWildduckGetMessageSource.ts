import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetMessageSourceParams {
  wildduckUserAuth?: WildduckUserAuth;
  mailboxId?: string;
  messageId?: number;
  devMode?: boolean;
}

/**
 * React hook for fetching raw message source (RFC822 format)
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including wildduckUserAuth, mailboxId, and messageId
 * @returns React Query result with message source
 */
export const useWildduckGetMessageSource = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMessageSourceParams = {},
) => {
  const { wildduckUserAuth, mailboxId, messageId, devMode = false } = params;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: [
      "wildduck-message-source",
      wildduckUserAuth?.userId,
      mailboxId,
      messageId,
    ],
    queryFn: async () => {
      if (!wildduckUserAuth) {
        console.error("wildduckUserAuth is required");
        return undefined;
      }
      if (!mailboxId) {
        console.error("mailboxId is required");
        return undefined;
      }
      if (!messageId) {
        console.error("messageId is required");
        return undefined;
      }

      try {
        return await api.getMessageSource(
          wildduckUserAuth,
          mailboxId,
          messageId,
        );
      } catch (err) {
        if (devMode) {
          return `From: mock@example.com\nTo: user@example.com\nSubject: Mock Message\nDate: ${new Date().toISOString()}\n\nMock message body`;
        }
        console.error("Failed to get message source:", err);
        return undefined;
      }
    },
    enabled: !!wildduckUserAuth && !!mailboxId && messageId !== undefined,
  });
};

export type UseWildduckGetMessageSourceReturn = ReturnType<
  typeof useWildduckGetMessageSource
>;
