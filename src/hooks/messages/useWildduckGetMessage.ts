import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import { WildduckMockData } from "../mocks";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetMessageParams {
  userAuth?: WildduckUserAuth;
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
 * @param params - Query parameters including userAuth, mailboxId and messageId
 * @returns React Query result with message data
 */
export const useWildduckGetMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMessageParams = {},
) => {
  const { userAuth, mailboxId, messageId, devMode = false } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!userAuth) throw new Error("userAuth is required");
    if (!mailboxId) throw new Error("mailboxId is required");
    if (!messageId) throw new Error("messageId is required");

    try {
      return await api.getMessage(userAuth, mailboxId, messageId);
    } catch (err) {
      if (devMode) {
        console.warn("[DevMode] getMessage failed, returning mock data:", err);
        return {
          success: true,
          data: WildduckMockData.getMessageQuery(messageId, userAuth.userId),
          error: null,
        };
      }
      throw err;
    }
  }, [userAuth, mailboxId, messageId, api, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-message", userAuth?.userId, mailboxId, messageId],
    queryFn,
    enabled: !!userAuth && !!mailboxId && !!messageId,
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
