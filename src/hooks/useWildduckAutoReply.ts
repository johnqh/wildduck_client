import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  WildduckAutoreplyRequest,
  WildduckAutoreplyResponse,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/mail_box_types";
import { WildduckClient } from "../network/wildduck-client";
import { useWebSocket } from "../websocket/useWebSocket";
import type { ChannelName, ServerResponseData } from "../websocket/types";

interface UseWildduckAutoReplyReturn {
  // Query state
  autoreply: Optional<WildduckAutoreplyResponse>;
  isLoading: boolean;
  error: Optional<string>;

  // Query functions
  getAutoreply: (
    wildduckUserAuth: WildduckUserAuth,
  ) => Promise<WildduckAutoreplyResponse>;
  refresh: () => Promise<void>;

  // Mutations
  updateAutoreply: (
    wildduckUserAuth: WildduckUserAuth,
    params: WildduckAutoreplyRequest,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  deleteAutoreply: (
    wildduckUserAuth: WildduckUserAuth,
  ) => Promise<{ success: boolean }>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Legacy compatibility
  clearError: () => void;
}

/**
 * Hook options for Wildduck autoreply
 */
interface UseWildduckAutoReplyOptions {
  /** Enable WebSocket real-time updates (default: false) */
  enableWebSocket?: boolean;
}

/**
 * Hook for Wildduck autoreply operations using React Query.
 * Automatically fetches autoreply when user is authenticated.
 * Queries are cached and automatically refetched, mutations invalidate related queries.
 *
 * @deprecated Prefer using monolithic hooks or direct `WildduckClient` methods
 * for autoreply operations. This individual domain hook will be removed in v3.
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - WildDuck user authentication data (single source of truth)
 * @param _devMode - Development mode flag (unused, kept for compatibility)
 * @param options - Hook options (including WebSocket enablement)
 */
const useWildduckAutoReply = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: Optional<WildduckUserAuth>,
  _devMode: boolean = false,
  options?: UseWildduckAutoReplyOptions,
): UseWildduckAutoReplyReturn => {
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

  // Get userId from wildduckUserAuth (single source of truth)
  const userId = wildduckUserAuth?.userId || null;

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
      if (channel !== "autoreply" || !data.success) {
        return;
      }

      const autoreplyData = data as any;
      const autoreply = autoreplyData.autoreply as WildduckAutoreplyResponse;

      // Update cache
      queryClient.setQueryData(
        ["wildduck-autoreply", wildduckUserAuth.userId],
        autoreply,
      );
    };

    // Handle update messages (real-time updates)
    const handleUpdate = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "autoreply" || !data.success) {
        return;
      }

      const updateData = data as any;
      const event = updateData.event as "updated" | "deleted";
      const autoreply = updateData.autoreply as WildduckAutoreplyResponse;

      if (!event) {
        // If no specific event, invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: ["wildduck-autoreply", wildduckUserAuth.userId],
        });
        return;
      }

      switch (event) {
        case "updated":
          // Update autoreply in cache
          if (autoreply) {
            queryClient.setQueryData(
              ["wildduck-autoreply", wildduckUserAuth.userId],
              autoreply,
            );
          }
          break;

        case "deleted":
          // Clear autoreply from cache
          queryClient.setQueryData(
            ["wildduck-autoreply", wildduckUserAuth.userId],
            null,
          );
          break;
      }
    };

    // Register event handlers
    client.on("data", handleData);
    client.on("update", handleUpdate);

    // Subscribe to autoreply channel
    if (!wsSubscribedRef.current) {
      wsSubscribedRef.current = true;
      // Connect first, then subscribe
      wsContext
        .connect(wildduckUserAuth)
        .then(() => {
          return client.subscribe("autoreply", {
            userId: wildduckUserAuth.userId,
            token: wildduckUserAuth.accessToken,
          });
        })
        .catch((error) => {
          console.error(
            "Failed to connect/subscribe to autoreply channel:",
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
        client.unsubscribe("autoreply").catch((error) => {
          console.error("Failed to unsubscribe from autoreply:", error);
        });
        wsSubscribedRef.current = false;
      }

      wsContext.disconnect(wildduckUserAuth.userId);
    };
  }, [shouldUseWebSocket, wildduckUserAuth, wsContext, queryClient]);

  // Get autoreply
  const getAutoreply = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
    ): Promise<WildduckAutoreplyResponse> => {
      try {
        const isWebSocketConnected =
          shouldUseWebSocket &&
          !!wsContext?.isConnected(wildduckUserAuth.userId);

        if (isWebSocketConnected) {
          const cachedAutoreply =
            queryClient.getQueryData<WildduckAutoreplyResponse>([
              "wildduck-autoreply",
              wildduckUserAuth.userId,
            ]);

          if (cachedAutoreply !== undefined) {
            return cachedAutoreply;
          }

          return undefined as any;
        }

        const autoreplyData = await api.getAutoreply(wildduckUserAuth);

        // Update cache
        queryClient.setQueryData(
          ["wildduck-autoreply", wildduckUserAuth.userId],
          autoreplyData,
        );

        return autoreplyData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get autoreply";
        console.error(
          "[useWildduckAutoReply] getAutoreply error:",
          errorMessage,
        );
        return undefined as any;
      }
    },
    [api, queryClient, shouldUseWebSocket, wsContext],
  );

  // Get cached autoreply from query cache (used for reading state)
  const cachedAutoreply = userId
    ? queryClient.getQueryData<WildduckAutoreplyResponse>([
        "wildduck-autoreply",
        userId,
      ]) || null
    : null;

  // Update autoreply mutation
  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-autoreply",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      params: WildduckAutoreplyRequest;
    }): Promise<{ success: boolean }> => {
      try {
        const response = await api.updateAutoreply(wildduckUserAuth, params);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update autoreply";
        console.error(
          "[useWildduckAutoReply] updateAutoreply error:",
          errorMessage,
        );
        return { success: false };
      }
    },
    onSuccess: async () => {
      // Automatically refresh autoreply after update
      await refresh();
    },
  });

  // Delete autoreply mutation
  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-autoreply",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      wildduckUserAuth: WildduckUserAuth,
    ): Promise<{ success: boolean }> => {
      try {
        const response = await api.deleteAutoreply(wildduckUserAuth);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete autoreply";
        console.error(
          "[useWildduckAutoReply] deleteAutoreply error:",
          errorMessage,
        );
        return { success: false };
      }
    },
    onSuccess: async () => {
      // Automatically refresh autoreply after deletion
      await refresh();
    },
  });

  // Refresh function (refetch autoreply)
  const refresh = useCallback(async (): Promise<void> => {
    if (!wildduckUserAuth) {
      console.error(
        "[useWildduckAutoReply] Cannot refresh: user not authenticated",
      );
      return;
    }
    await getAutoreply(wildduckUserAuth);
  }, [wildduckUserAuth, getAutoreply]);

  // Aggregate loading and error states for legacy compatibility
  const isLoading = updateMutation.isPending || deleteMutation.isPending;
  const error: Optional<string> =
    updateMutation.error?.message || deleteMutation.error?.message || null;

  const updateAutoreply = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      params: WildduckAutoreplyRequest,
    ) => updateMutation.mutateAsync({ wildduckUserAuth, params }),
    [updateMutation],
  );

  const deleteAutoreply = useCallback(
    async (wildduckUserAuth: WildduckUserAuth) =>
      deleteMutation.mutateAsync(wildduckUserAuth),
    [deleteMutation],
  );

  const clearError = useCallback(() => {
    updateMutation.reset();
    deleteMutation.reset();
  }, [updateMutation, deleteMutation]);

  return useMemo(
    () => ({
      // Query state
      autoreply: cachedAutoreply,
      isLoading,
      error,

      // Query functions
      getAutoreply,
      refresh,

      // Update mutation
      updateAutoreply,
      isUpdating: updateMutation.isPending,
      updateError: updateMutation.error,

      // Delete mutation
      deleteAutoreply,
      isDeleting: deleteMutation.isPending,
      deleteError: deleteMutation.error,

      // Legacy compatibility
      clearError,
    }),
    [
      cachedAutoreply,
      isLoading,
      error,
      getAutoreply,
      refresh,
      updateAutoreply,
      updateMutation.isPending,
      updateMutation.error,
      deleteAutoreply,
      deleteMutation.isPending,
      deleteMutation.error,
      clearError,
    ],
  );
};

export {
  useWildduckAutoReply,
  type UseWildduckAutoReplyReturn,
  type UseWildduckAutoReplyOptions,
};
