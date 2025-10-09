import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type GetMessagesRequest, type WildDuckConfig } from "@johnqh/types";
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
 * @param config - WildDuck API configuration
 * @param params - Query parameters (userAuth, mailboxId, options)
 * @returns React Query result with messages data and state
 */
export const useWildduckGetMessages = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  params: UseWildduckGetMessagesParams = {},
) => {
  const { userAuth, mailboxId, options } = params;

  const api = useMemo(
    () => new WildDuckAPI(networkClient, config),
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
