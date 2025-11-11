import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import {
  type GetMessagesRequest,
  type WildduckConfig,
} from "@sudobility/types";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetMessagesParams {
  wildduckUserAuth?: WildduckUserAuth;
  mailboxId?: string;
  options?: Omit<GetMessagesRequest, "sess" | "ip">;
}

/**
 * React Query hook for fetching messages from a mailbox
 * Automatically fetches when wildduckUserAuth and mailboxId are provided
 * Includes caching and automatic refetching
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters (wildduckUserAuth, mailboxId, options)
 * @returns React Query result with messages data and state
 */
export const useWildduckGetMessages = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMessagesParams = {},
) => {
  const { wildduckUserAuth, mailboxId, options } = params;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: ["messages", wildduckUserAuth?.userId, mailboxId, options],
    queryFn: async () => {
      if (!wildduckUserAuth || !mailboxId) {
        throw new Error("wildduckUserAuth and mailboxId are required");
      }
      return await api.getMessages(wildduckUserAuth, mailboxId, options);
    },
    enabled: !!wildduckUserAuth && !!mailboxId,
  });
};

// Export type for hook return value
export type UseWildduckGetMessagesReturn = ReturnType<
  typeof useWildduckGetMessages
>;
