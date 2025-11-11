import { useCallback, useMemo, useState } from "react";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckCreateFilterRequest,
  WildduckFilterListItem,
  WildduckUpdateFilterRequest,
  WildduckUserAuth,
} from "@sudobility/types";
import { WildduckMockData } from "./mocks";
import { WildduckClient } from "../network/wildduck-client";

interface UseWildduckFiltersReturn {
  isLoading: boolean;
  error: Optional<string>;
  filters: WildduckFilterListItem[];
  getFilters: (
    wildduckUserAuth: WildduckUserAuth,
  ) => Promise<WildduckFilterListItem[]>;
  getFilter: (
    wildduckUserAuth: WildduckUserAuth,
    filterId: string,
  ) => Promise<WildduckFilterListItem>;
  createFilter: (
    wildduckUserAuth: WildduckUserAuth,
    params: WildduckCreateFilterRequest,
  ) => Promise<{ success: boolean; id: string }>;
  updateFilter: (
    wildduckUserAuth: WildduckUserAuth,
    filterId: string,
    params: WildduckUpdateFilterRequest,
  ) => Promise<{ success: boolean }>;
  deleteFilter: (
    wildduckUserAuth: WildduckUserAuth,
    filterId: string,
  ) => Promise<{ success: boolean }>;
  clearError: () => void;
  refresh: (wildduckUserAuth: WildduckUserAuth) => Promise<void>;
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

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getFilters = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
    ): Promise<WildduckFilterListItem[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.getFilters(wildduckUserAuth);

        const filterList =
          (response as { results?: WildduckFilterListItem[] }).results || [];
        setFilters(filterList);
        return filterList;
      } catch (err) {
        if (devMode) {
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
    [api, devMode],
  );

  const getFilter = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      filterId: string,
    ): Promise<WildduckFilterListItem> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.getFilter(wildduckUserAuth, filterId);

        return response as WildduckFilterListItem;
      } catch (err) {
        if (devMode) {
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
    [api, devMode],
  );

  const createFilter = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      params: WildduckCreateFilterRequest,
    ): Promise<{ success: boolean; id: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.createFilter(wildduckUserAuth, params);

        return response as { success: boolean; id: string };
      } catch (err) {
        if (devMode) {
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
    [api, devMode],
  );

  const updateFilter = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      filterId: string,
      params: WildduckUpdateFilterRequest,
    ): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.updateFilter(
          wildduckUserAuth,
          filterId,
          params,
        );

        return response as { success: boolean };
      } catch (err) {
        if (devMode) {
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
    [api, devMode],
  );

  const deleteFilter = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      filterId: string,
    ): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.deleteFilter(wildduckUserAuth, filterId);

        return response as { success: boolean };
      } catch (err) {
        if (devMode) {
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
    [api, devMode],
  );

  const refresh = useCallback(
    async (wildduckUserAuth: WildduckUserAuth): Promise<void> => {
      await getFilters(wildduckUserAuth);
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
