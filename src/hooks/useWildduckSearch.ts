import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../network/wildduck-client";
import type {
  NetworkClient,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/types";

export interface UseWildduckSearchParams {
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
export const useWildduckSearch = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckSearchParams = {},
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
      if (!wildduckUserAuth) {
        console.error("wildduckUserAuth is required");
        return [];
      }
      if (!query) {
        console.error("query is required");
        return [];
      }

      const response = await api.searchMessages(wildduckUserAuth, query, {
        limit,
        page,
      });

      return response.results || [];
    },
    enabled: !!wildduckUserAuth && !!query,
  });
};

export type UseWildduckSearchReturn = ReturnType<typeof useWildduckSearch>;
