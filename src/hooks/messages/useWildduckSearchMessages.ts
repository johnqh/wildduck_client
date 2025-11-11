import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../../network/wildduck-client";
import type {
  NetworkClient,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/types";

export interface UseWildduckSearchMessagesParams {
  wildduckUserAuth?: WildduckUserAuth;
  query?: string;
  limit?: number;
  page?: number;
}

/**
 * React hook for searching messages
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including wildduckUserAuth, query string, and pagination options
 * @returns React Query result with search results
 */
export const useWildduckSearchMessages = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckSearchMessagesParams = {},
) => {
  const { wildduckUserAuth, query, limit = 50, page = 1 } = params;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: [
      "wildduck-search-messages",
      wildduckUserAuth?.userId,
      query,
      limit,
      page,
    ],
    queryFn: async () => {
      if (!wildduckUserAuth) throw new Error("wildduckUserAuth is required");
      if (!query) throw new Error("query is required");

      const response = await api.searchMessages(wildduckUserAuth, query, {
        limit,
        page,
      });

      return response.results || [];
    },
    enabled: !!wildduckUserAuth && !!query,
  });
};

export type UseWildduckSearchMessagesReturn = ReturnType<
  typeof useWildduckSearchMessages
>;
