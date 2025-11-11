import { useQuery } from "@tanstack/react-query";
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
  devMode?: boolean;
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
  const {
    wildduckUserAuth,
    query,
    limit = 50,
    page = 1,
    devMode = false,
  } = params;

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

      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;

        // Build headers
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (config.cloudflareWorkerUrl) {
          headers["Authorization"] = `Bearer ${config.apiToken}`;
          headers["X-App-Source"] = "0xmail-box";
        } else {
          headers["X-Access-Token"] = config.apiToken;
        }

        const response = await networkClient.request<{
          results?: unknown[];
          total?: number;
          page?: number;
        }>(
          `${apiUrl}/users/${wildduckUserAuth.userId}/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
          { method: "GET", headers },
        );

        const searchResponse = response.data as {
          results?: unknown[];
          total?: number;
          page?: number;
        };

        return searchResponse.results || [];
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] searchMessages failed, returning mock data:",
            err,
          );
          return [];
        }
        throw err;
      }
    },
    enabled: !!wildduckUserAuth && !!query,
  });
};

export type UseWildduckSearchMessagesReturn = ReturnType<
  typeof useWildduckSearchMessages
>;
