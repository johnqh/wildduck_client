import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type GetMessagesRequest,
  type WildduckConfig,
} from "../../types/wildduck-types";
import type { WildduckUserAuth } from "../../types/wildduck-types";

export interface UseWildduckGetMessagesParams {
  userAuth?: WildduckUserAuth;
  mailboxId?: string;
  options?: Omit<GetMessagesRequest, "sess" | "ip">;
}

/**
 * React Query hook for fetching messages from a mailbox
 * Automatically fetches when userAuth and mailboxId are provided
 * Includes caching and automatic refetching
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters (userAuth, mailboxId, options)
 * @returns React Query result with messages data and state
 */
export const useWildduckGetMessages = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMessagesParams = {},
) => {
  const { userAuth, mailboxId, options } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: ["messages", userAuth?.userId, mailboxId, options],
    queryFn: async () => {
      if (!userAuth || !mailboxId) {
        throw new Error("userAuth and mailboxId are required");
      }
      return await api.getMessages(userAuth, mailboxId, options);
    },
    enabled: !!userAuth && !!mailboxId,
  });
};

// Export type for hook return value
export type UseWildduckGetMessagesReturn = ReturnType<
  typeof useWildduckGetMessages
>;
