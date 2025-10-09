import { useQuery } from "@tanstack/react-query";
import { type WildDuckConfig } from "@johnqh/types";
import axios from "axios";
import type { WildduckUserAuth } from "../../types/wildduck-types";

export interface UseWildduckSearchMessagesParams {
  userAuth?: WildduckUserAuth;
  query?: string;
  limit?: number;
  page?: number;
  devMode?: boolean;
}

/**
 * React hook for searching messages
 * Requires user authentication
 *
 * @param config - WildDuck API configuration
 * @param params - Query parameters including userAuth, query string, and pagination options
 * @returns React Query result with search results
 */
export const useWildduckSearchMessages = (
  config: WildDuckConfig,
  params: UseWildduckSearchMessagesParams = {},
) => {
  const { userAuth, query, limit = 50, page = 1, devMode = false } = params;

  return useQuery({
    queryKey: [
      "wildduck-search-messages",
      userAuth?.userId,
      query,
      limit,
      page,
    ],
    queryFn: async () => {
      if (!userAuth) throw new Error("userAuth is required");
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

        const response = await axios.get(
          `${apiUrl}/users/${userAuth.userId}/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
          { headers },
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
    enabled: !!userAuth && !!query,
  });
};

export type UseWildduckSearchMessagesReturn = ReturnType<
  typeof useWildduckSearchMessages
>;
