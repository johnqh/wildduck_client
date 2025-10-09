import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type Optional,
  type WildDuckConfig,
  type WildDuckMessage,
} from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import axios from "axios";
import type { WildduckUserAuth } from "../../types/wildduck-types";

interface SearchMessagesOptions {
  limit?: number;
  page?: number;
}

interface UseWildduckSearchMessagesReturn {
  searchMessages: (
    userAuth: WildduckUserAuth,
    query: string,
    options?: SearchMessagesOptions,
  ) => Promise<Optional<WildDuckMessage[]>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for searching messages
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with searchMessages function and state
 */
export const useWildduckSearchMessages = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckSearchMessagesReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "SearchMessages",
  });

  const searchMessages = useCallback(
    execute(
      async (
        userAuth: WildduckUserAuth,
        query: string,
        options: SearchMessagesOptions = {},
      ): Promise<WildDuckMessage[]> => {
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
            `${apiUrl}/users/${userAuth.userId}/search?q=${encodeURIComponent(query)}&limit=${options.limit || 50}&page=${options.page || 1}`,
            { headers },
          );

          const searchResponse = response.data as {
            results?: WildDuckMessage[];
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
    ),
    [execute, wildduckClient, config, devMode],
  );

  return { searchMessages, isLoading, error, clearError };
};
