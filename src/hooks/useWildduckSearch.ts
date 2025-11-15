import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../network/wildduck-client";
import type {
  NetworkClient,
  WildduckConfig,
  WildduckMessageListItem,
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

export interface UseWildduckSearchReturn {
  data: WildduckSearchMessagesResponse | undefined;
  results: WildduckMessageListItem[]; // Accumulated results
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;

  // Pagination state
  nextCursor: string | false;
  previousCursor: string | false;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // Pagination functions
  next: () => Promise<void>;
  previous: () => Promise<void>;
  resetResults: () => void;
}

/**
 * React hook for searching messages
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including wildduckUserAuth, query string, and pagination options
 * @param pageSize - Default page size for search queries (optional)
 * @returns Search results with pagination functions
 */
export const useWildduckSearch = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckSearchParams = {},
  pageSize?: number,
): UseWildduckSearchReturn => {
  const { wildduckUserAuth, query, ...filters } = params;
  const [currentFilters, setCurrentFilters] =
    useState<WildduckSearchQueryParams>(filters as WildduckSearchQueryParams);
  const [accumulatedResults, setAccumulatedResults] = useState<
    WildduckMessageListItem[]
  >([]);

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const queryResult = useQuery<WildduckSearchMessagesResponse | undefined>({
    queryKey: [
      "wildduck-search-messages",
      wildduckUserAuth?.userId,
      query,
      currentFilters,
      pageSize,
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

      const mergedFilters = {
        ...(pageSize !== undefined && { limit: pageSize }),
        ...currentFilters,
      };

      const response = await api.searchMessages(wildduckUserAuth, {
        ...mergedFilters,
        q: query,
      });

      // On initial fetch (no cursors in filters), reset accumulated results
      if (!currentFilters.next && !currentFilters.previous) {
        setAccumulatedResults(response?.results || []);
      }

      return response;
    },
    enabled: !!wildduckUserAuth && !!query,
  });

  const nextCursor = queryResult.data?.nextCursor ?? false;
  const previousCursor = queryResult.data?.previousCursor ?? false;

  const next = useCallback(async () => {
    if (!nextCursor) {
      console.error("No next page available");
      return;
    }
    // Append current results before fetching next page
    if (queryResult.data?.results) {
      setAccumulatedResults((prev) => [
        ...prev,
        ...(queryResult.data?.results || []),
      ]);
    }
    setCurrentFilters((prev) => {
      const { previous: _, ...rest } = prev;
      return {
        ...rest,
        next: nextCursor as string,
      };
    });
  }, [nextCursor, queryResult.data?.results]);

  const previous = useCallback(async () => {
    if (!previousCursor) {
      console.error("No previous page available");
      return;
    }
    // Prepend current results before fetching previous page
    if (queryResult.data?.results) {
      setAccumulatedResults((prev) => [
        ...(queryResult.data?.results || []),
        ...prev,
      ]);
    }
    setCurrentFilters((prev) => {
      const { next: _, ...rest } = prev;
      return {
        ...rest,
        previous: previousCursor as string,
      };
    });
  }, [previousCursor, queryResult.data?.results]);

  const resetResults = useCallback(() => {
    setAccumulatedResults([]);
    setCurrentFilters(filters as WildduckSearchQueryParams);
  }, [filters]);

  return useMemo(
    () => ({
      data: queryResult.data,
      results: accumulatedResults,
      isLoading: queryResult.isLoading,
      isError: queryResult.isError,
      error: queryResult.error,
      refetch: queryResult.refetch,

      nextCursor,
      previousCursor,
      hasNextPage: !!nextCursor,
      hasPreviousPage: !!previousCursor,

      next,
      previous,
      resetResults,
    }),
    [
      queryResult.data,
      accumulatedResults,
      queryResult.isLoading,
      queryResult.isError,
      queryResult.error,
      queryResult.refetch,
      nextCursor,
      previousCursor,
      next,
      previous,
      resetResults,
    ],
  );
};
