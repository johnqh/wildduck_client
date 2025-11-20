import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useWebSocket } from "../websocket/useWebSocket";
import type { ChannelName, ServerResponseData } from "../websocket/types";
import { useQueryClient } from "@tanstack/react-query";

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
  ) => Promise<WildduckFilterListItem | undefined>;
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
 * Hook options for Wildduck filters
 */
interface UseWildduckFiltersOptions {
  /** Enable WebSocket real-time updates (default: false) */
  enableWebSocket?: boolean;
}

/**
 * Hook for Wildduck filter management operations
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - WildDuck user authentication data (single source of truth)
 * @param devMode - Development mode flag
 * @param options - Hook options (including WebSocket enablement)
 */
const useWildduckFilters = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: Optional<WildduckUserAuth>,
  devMode: boolean = false,
  options?: UseWildduckFiltersOptions,
): UseWildduckFiltersReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [filters, setFilters] = useState<WildduckFilterListItem[]>([]);

  const queryClient = useQueryClient();
  const wsSubscribedRef = useRef(false);

  // Get WebSocket context (if provider is available)
  let wsContext;
  try {
    wsContext = useWebSocket();
  } catch {
    // WebSocketProvider not available, that's fine
    wsContext = null;
  }

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Determine if WebSocket should be used
  const shouldUseWebSocket =
    options?.enableWebSocket &&
    wsContext?.isEnabled &&
    wildduckUserAuth !== null;

  // WebSocket subscription and real-time updates
  useEffect(() => {
    if (!shouldUseWebSocket || !wildduckUserAuth || !wsContext) {
      return;
    }

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) {
      return;
    }

    // Handle data messages (initial subscription response)
    const handleData = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "filters" || !data.success) {
        return;
      }

      const filtersData = data as any;
      const filterList =
        (filtersData.filters as WildduckFilterListItem[]) || [];

      // Update local state
      setFilters(filterList);

      // Update cache
      queryClient.setQueryData(
        ["wildduck-filters", wildduckUserAuth.userId],
        filterList,
      );
    };

    // Handle update messages (real-time updates)
    const handleUpdate = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "filters" || !data.success) {
        return;
      }

      const updateData = data as any;
      const event = updateData.event as "created" | "updated" | "deleted";
      const filter = updateData.filter as WildduckFilterListItem;

      if (!event || !filter) {
        // If no specific event, invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: ["wildduck-filters", wildduckUserAuth.userId],
        });
        return;
      }

      // Get current filters from local state
      setFilters((currentFilters) => {
        let updatedFilters: WildduckFilterListItem[];

        switch (event) {
          case "created":
            // Add new filter to list (avoid duplicates)
            if (!currentFilters.find((f) => f.id === filter.id)) {
              updatedFilters = [...currentFilters, filter];
            } else {
              updatedFilters = currentFilters;
            }
            break;

          case "updated":
            // Update existing filter
            updatedFilters = currentFilters.map((f) =>
              f.id === filter.id ? { ...f, ...filter } : f,
            );
            break;

          case "deleted":
            // Remove filter from list
            updatedFilters = currentFilters.filter((f) => f.id !== filter.id);
            break;

          default:
            updatedFilters = currentFilters;
        }

        // Update cache
        queryClient.setQueryData(
          ["wildduck-filters", wildduckUserAuth.userId],
          updatedFilters,
        );

        return updatedFilters;
      });
    };

    // Register event handlers
    client.on("data", handleData);
    client.on("update", handleUpdate);

    // Subscribe to filters channel
    if (!wsSubscribedRef.current) {
      wsSubscribedRef.current = true;
      // Connect first, then subscribe
      wsContext
        .connect(wildduckUserAuth)
        .then(() => {
          return client.subscribe("filters", {
            userId: wildduckUserAuth.userId,
            token: wildduckUserAuth.accessToken,
          });
        })
        .catch((error) => {
          console.error(
            "Failed to connect/subscribe to filters channel:",
            error,
          );
          wsSubscribedRef.current = false;
        });
    }

    // Cleanup
    return () => {
      client.off("data", handleData);
      client.off("update", handleUpdate);

      if (wsSubscribedRef.current) {
        client.unsubscribe("filters").catch((error) => {
          console.error("Failed to unsubscribe from filters:", error);
        });
        wsSubscribedRef.current = false;
      }

      wsContext.disconnect(wildduckUserAuth.userId);
    };
  }, [shouldUseWebSocket, wildduckUserAuth, wsContext, queryClient]);

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
        console.error(errorMessage);
        return [];
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
    ): Promise<WildduckFilterListItem | undefined> => {
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
        console.error(errorMessage);
        return undefined;
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
        console.error(errorMessage);
        return { success: false, id: "" };
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
        console.error(errorMessage);
        return { success: false };
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
        console.error(errorMessage);
        return { success: false };
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

export {
  useWildduckFilters,
  type UseWildduckFiltersReturn,
  type UseWildduckFiltersOptions,
};
