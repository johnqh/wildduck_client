import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildDuckConfig } from "@johnqh/types";
import { WildDuckMockData } from "../mocks";
import type { WildduckUserAuth } from "../../types/wildduck-types";

export interface UseWildduckGetMessageParams {
  userAuth?: WildduckUserAuth;
  messageId?: string;
  devMode?: boolean;
}

/**
 * React hook for fetching a single message by ID
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param params - Query parameters including userAuth and messageId
 * @returns React Query result with message data
 */
export const useWildduckGetMessage = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  params: UseWildduckGetMessageParams = {},
) => {
  const { userAuth, messageId, devMode = false } = params;

  const api = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: ["wildduck-message", userAuth?.userId, messageId],
    queryFn: async () => {
      if (!userAuth) throw new Error("userAuth is required");
      if (!messageId) throw new Error("messageId is required");

      try {
        return await api.getMessage(userAuth, messageId);
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
          };
        }
        throw err;
      }
    },
    enabled: !!userAuth && !!messageId,
  });
};

export type UseWildduckGetMessageReturn = ReturnType<
  typeof useWildduckGetMessage
>;
