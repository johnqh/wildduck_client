import { useCallback, useMemo, useState } from "react";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckCreateFilterRequest,
  WildduckFilterListItem,
  WildduckUpdateFilterRequest,
} from "@sudobility/types";
import { WildduckMockData } from "./mocks";

interface UseWildduckFiltersReturn {
  isLoading: boolean;
  error: Optional<string>;
  filters: WildduckFilterListItem[];
  getFilters: (userId: string) => Promise<WildduckFilterListItem[]>;
  getFilter: (
    userId: string,
    filterId: string,
  ) => Promise<WildduckFilterListItem>;
  createFilter: (
    userId: string,
    params: WildduckCreateFilterRequest,
  ) => Promise<{ success: boolean; id: string }>;
  updateFilter: (
    userId: string,
    filterId: string,
    params: WildduckUpdateFilterRequest,
  ) => Promise<{ success: boolean }>;
  deleteFilter: (
    userId: string,
    filterId: string,
  ) => Promise<{ success: boolean }>;
  clearError: () => void;
  refresh: (userId: string) => Promise<void>;
}

/**
 * Hook for Wildduck filter management operations
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param devMode - Development mode flag
 */
const useWildduckFilters = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckFiltersReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [filters, setFilters] = useState<WildduckFilterListItem[]>([]);

  // Helper to build headers
  const buildHeaders = useCallback((): Record<string, string> => {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getFilters = useCallback(
    async (userId: string): Promise<WildduckFilterListItem[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{
          results?: WildduckFilterListItem[];
        }>(`${apiUrl}/users/${userId}/filters`, { method: "GET", headers });

        const filterList =
          (response.data as { results?: WildduckFilterListItem[] }).results ||
          [];
        setFilters(filterList);
        return filterList;
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Get filters failed, returning mock data:",
            err,
          );
          const mockData = WildduckMockData.getFilters();
          const mockFilters = mockData.data
            .filters as unknown as WildduckFilterListItem[];
          setFilters(mockFilters);
          return mockFilters;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to get filters";
        setError(errorMessage);
        setFilters([]);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      networkClient,
      buildHeaders,
      config.cloudflareWorkerUrl,
      config.backendUrl,
      devMode,
    ],
  );

  const getFilter = useCallback(
    async (
      userId: string,
      filterId: string,
    ): Promise<WildduckFilterListItem> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<WildduckFilterListItem>(
          `${apiUrl}/users/${userId}/filters/${filterId}`,
          { method: "GET", headers },
        );

        return response.data as WildduckFilterListItem;
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Get filter failed, returning mock data:",
            err,
          );
          const mockData = WildduckMockData.getFilter(filterId);
          return mockData.data.filter as unknown as WildduckFilterListItem;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to get filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      networkClient,
      buildHeaders,
      config.cloudflareWorkerUrl,
      config.backendUrl,
      devMode,
    ],
  );

  const createFilter = useCallback(
    async (
      userId: string,
      params: WildduckCreateFilterRequest,
    ): Promise<{ success: boolean; id: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{
          success: boolean;
          id: string;
        }>(`${apiUrl}/users/${userId}/filters`, {
          method: "POST",
          headers,
          body: JSON.stringify(params),
        });

        return response.data as { success: boolean; id: string };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Create filter failed, returning mock success:",
            err,
          );
          return WildduckMockData.getCreateFilter();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to create filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      networkClient,
      buildHeaders,
      config.cloudflareWorkerUrl,
      config.backendUrl,
      devMode,
    ],
  );

  const updateFilter = useCallback(
    async (
      userId: string,
      filterId: string,
      params: WildduckUpdateFilterRequest,
    ): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{ success: boolean }>(
          `${apiUrl}/users/${userId}/filters/${filterId}`,
          { method: "PUT", headers, body: JSON.stringify(params) },
        );

        return response.data as { success: boolean };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Update filter failed, returning mock success:",
            err,
          );
          return WildduckMockData.getUpdateFilter();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to update filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      networkClient,
      buildHeaders,
      config.cloudflareWorkerUrl,
      config.backendUrl,
      devMode,
    ],
  );

  const deleteFilter = useCallback(
    async (userId: string, filterId: string): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{ success: boolean }>(
          `${apiUrl}/users/${userId}/filters/${filterId}`,
          { method: "DELETE", headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Delete filter failed, returning mock success:",
            err,
          );
          return WildduckMockData.getDeleteFilter();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      networkClient,
      buildHeaders,
      config.cloudflareWorkerUrl,
      config.backendUrl,
      devMode,
    ],
  );

  const refresh = useCallback(
    async (userId: string): Promise<void> => {
      await getFilters(userId);
    },
    [getFilters],
  );

  return useMemo(
    () => ({
      isLoading,
      error,
      filters,
      getFilters,
      getFilter,
      createFilter,
      updateFilter,
      deleteFilter,
      clearError,
      refresh,
    }),
    [
      isLoading,
      error,
      filters,
      getFilters,
      getFilter,
      createFilter,
      updateFilter,
      deleteFilter,
      clearError,
      refresh,
    ],
  );
};

export { useWildduckFilters, type UseWildduckFiltersReturn };
