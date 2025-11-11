import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import { WildduckMockData } from "../mocks";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetMessageParams {
  wildduckUserAuth?: WildduckUserAuth;
  mailboxId?: string;
  messageId?: string;
  devMode?: boolean;
}

/**
 * React hook for fetching a single message by ID
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including wildduckUserAuth, mailboxId and messageId
 * @returns React Query result with message data
 */
export const useWildduckGetMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMessageParams = {},
) => {
  const { wildduckUserAuth, mailboxId, messageId, devMode = false } = params;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!wildduckUserAuth) throw new Error("wildduckUserAuth is required");
    if (!mailboxId) throw new Error("mailboxId is required");
    if (!messageId) throw new Error("messageId is required");

    try {
      return await api.getMessage(wildduckUserAuth, mailboxId, messageId);
    } catch (err) {
      if (devMode) {
        console.warn("[DevMode] getMessage failed, returning mock data:", err);
        return {
          success: true,
          data: WildduckMockData.getMessageQuery(
            messageId,
            wildduckUserAuth.userId,
          ),
          error: null,
        };
      }
      throw err;
    }
  }, [wildduckUserAuth, mailboxId, messageId, api, devMode]);

  const query = useQuery({
    queryKey: [
      "wildduck-message",
      wildduckUserAuth?.userId,
      mailboxId,
      messageId,
    ],
    queryFn,
    enabled: !!wildduckUserAuth && !!mailboxId && !!messageId,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

export type UseWildduckGetMessageReturn = ReturnType<
  typeof useWildduckGetMessage
>;
