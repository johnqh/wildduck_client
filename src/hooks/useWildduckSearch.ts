import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../network/wildduck-client";
import type {
  NetworkClient,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/types";
import type {
  WildduckSearchMessagesResponse,
  WildduckSearchQueryParams,
} from "../types/wildduck-search";

export interface UseWildduckSearchParams extends WildduckSearchQueryParams {
  wildduckUserAuth?: WildduckUserAuth;
  query?: string;
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
  const { wildduckUserAuth, query, ...filters } = params;
  const searchFilters = filters as WildduckSearchQueryParams;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  return useQuery<WildduckSearchMessagesResponse | undefined>({
    queryKey: [
      "wildduck-search-messages",
      wildduckUserAuth?.userId,
      query,
      searchFilters,
    ],
    queryFn: async () => {
      if (!wildduckUserAuth) {
        console.error("wildduckUserAuth is required");
        return undefined;
      }
      if (!query) {
        console.error("query is required");
        return undefined;
      }

      return api.searchMessages(wildduckUserAuth, {
        ...searchFilters,
        q: query,
      });
    },
    enabled: !!wildduckUserAuth && !!query,
  });
};

export type UseWildduckSearchReturn = ReturnType<typeof useWildduckSearch>;
