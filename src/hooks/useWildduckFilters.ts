import { Optional } from "@johnqh/types";
import { useCallback, useState } from "react";
import axios from "axios";
import { WildDuckConfig } from "@johnqh/types";
import { WildDuckMockData } from "./mocks";

interface WildduckFilter {
  id: string;
  name?: string;
  query: {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    ha?: boolean; // has attachments
    size?: number;
  };
  action: {
    seen?: boolean;
    flag?: boolean;
    delete?: boolean;
    spam?: boolean;
    mailbox?: string;
    forward?: string;
    targetUrl?: string;
  };
  disabled?: boolean;
  created: string;
}

interface CreateFilterParams {
  name?: string;
  query: {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    ha?: boolean;
    size?: number;
  };
  action: {
    seen?: boolean;
    flag?: boolean;
    delete?: boolean;
    spam?: boolean;
    mailbox?: string;
    forward?: string;
    targetUrl?: string;
  };
  disabled?: boolean;
}

interface UpdateFilterParams {
  name?: string;
  query?: {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    ha?: boolean;
    size?: number;
  };
  action?: {
    seen?: boolean;
    flag?: boolean;
    delete?: boolean;
    spam?: boolean;
    mailbox?: string;
    forward?: string;
    targetUrl?: string;
  };
  disabled?: boolean;
}

interface UseWildduckFiltersReturn {
  isLoading: boolean;
  error: Optional<string>;
  filters: WildduckFilter[];
  getFilters: (userId: string) => Promise<WildduckFilter[]>;
  getFilter: (userId: string, filterId: string) => Promise<WildduckFilter>;
  createFilter: (
    userId: string,
    params: CreateFilterParams,
  ) => Promise<{ success: boolean; id: string }>;
  updateFilter: (
    userId: string,
    filterId: string,
    params: UpdateFilterParams,
  ) => Promise<{ success: boolean }>;
  deleteFilter: (
    userId: string,
    filterId: string,
  ) => Promise<{ success: boolean }>;
  clearError: () => void;
  refresh: (userId: string) => Promise<void>;
}

/**
 * Hook for WildDuck filter management operations
 */
const useWildduckFilters = (
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckFiltersReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [filters, setFilters] = useState<WildduckFilter[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getFilters = useCallback(
    async (userId: string): Promise<WildduckFilter[]> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
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

        const response = await axios.get(`${apiUrl}/users/${userId}/filters`, {
          headers,
        });

        const filterList =
          (response.data as { results?: WildduckFilter[] }).results || [];
        setFilters(filterList);
        return filterList;
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Get filters failed, returning mock data:",
            err,
          );
          const mockData = WildDuckMockData.getFilters();
          const mockFilters = mockData.data
            .filters as unknown as WildduckFilter[];
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
    [],
  );

  const getFilter = useCallback(
    async (userId: string, filterId: string): Promise<WildduckFilter> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
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
          `${apiUrl}/users/${userId}/filters/${filterId}`,
          { headers },
        );

        return response.data as WildduckFilter;
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Get filter failed, returning mock data:",
            err,
          );
          const mockData = WildDuckMockData.getFilter(filterId);
          return mockData.data.filter as unknown as WildduckFilter;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to get filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const createFilter = useCallback(
    async (
      userId: string,
      params: CreateFilterParams,
    ): Promise<{ success: boolean; id: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
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

        const response = await axios.post(
          `${apiUrl}/users/${userId}/filters`,
          params,
          { headers },
        );

        return response.data as { success: boolean; id: string };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Create filter failed, returning mock success:",
            err,
          );
          return WildDuckMockData.getCreateFilter();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to create filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateFilter = useCallback(
    async (
      userId: string,
      filterId: string,
      params: UpdateFilterParams,
    ): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
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

        const response = await axios.put(
          `${apiUrl}/users/${userId}/filters/${filterId}`,
          params,
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Update filter failed, returning mock success:",
            err,
          );
          return WildDuckMockData.getUpdateFilter();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to update filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const deleteFilter = useCallback(
    async (userId: string, filterId: string): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
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

        const response = await axios.delete(
          `${apiUrl}/users/${userId}/filters/${filterId}`,
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Delete filter failed, returning mock success:",
            err,
          );
          return WildDuckMockData.getDeleteFilter();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete filter";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const refresh = useCallback(
    async (userId: string): Promise<void> => {
      await getFilters(userId);
    },
    [getFilters],
  );

  return {
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
  };
};

export {
  useWildduckFilters,
  type WildduckFilter,
  type CreateFilterParams,
  type UpdateFilterParams,
  type UseWildduckFiltersReturn,
};
