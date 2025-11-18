import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  CreateMailboxRequest,
  GetMailboxesRequest,
  UpdateMailboxRequest,
  WildduckConfig,
  WildduckMailbox,
  WildduckUserAuth,
} from "@sudobility/types";
import { WildduckClient } from "../network/wildduck-client";
import { useWebSocket } from "../websocket/useWebSocket";
import type { ChannelName, ServerResponseData } from "../websocket/types";

interface UseWildduckMailboxesReturn {
  // Query state
  mailboxes: WildduckMailbox[];
  isLoading: boolean;
  error: Optional<string>;

  // Query functions
  getMailboxes: (
    wildduckUserAuth: WildduckUserAuth,
    options?: Omit<GetMailboxesRequest, "sess" | "ip">,
  ) => Promise<WildduckMailbox[]>;
  getMailbox: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
  ) => Promise<WildduckMailbox>;
  refresh: () => Promise<void>;

  // Mutations
  createMailbox: (
    wildduckUserAuth: WildduckUserAuth,
    params: Omit<CreateMailboxRequest, "sess" | "ip">,
  ) => Promise<{ success: boolean; id: string }>;
  isCreating: boolean;
  createError: Optional<Error>;

  updateMailbox: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    params: Omit<UpdateMailboxRequest, "sess" | "ip">,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  deleteMailbox: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
  ) => Promise<{ success: boolean }>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Legacy compatibility
  clearError: () => void;
}

/**
 * Hook options for Wildduck mailboxes
 */
interface UseWildduckMailboxesOptions {
  /** Enable WebSocket real-time updates (default: false) */
  enableWebSocket?: boolean;
}

/**
 * Hook for Wildduck mailbox operations using React Query
 * Automatically fetches mailboxes when user is authenticated
 * Queries are cached and automatically refetched, mutations invalidate related queries
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - WildDuck user authentication data (single source of truth)
 * @param devMode - Development mode flag
 * @param options - Hook options (including WebSocket enablement)
 */
const useWildduckMailboxes = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: Optional<WildduckUserAuth>,
  _devMode: boolean = false,
  options?: UseWildduckMailboxesOptions,
): UseWildduckMailboxesReturn => {
  const queryClient = useQueryClient();
  const hasFetchedRef = useRef(false);
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

  // Get userId from wildduckUserAuth (single source of truth)
  const userId = wildduckUserAuth?.userId || null;

  // Determine if WebSocket should be used
  const shouldUseWebSocket =
    options?.enableWebSocket &&
    wsContext?.isEnabled &&
    wildduckUserAuth !== null;

  // Get mailboxes query (not auto-fetched, only when explicitly called)
  const getMailboxes = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      options: {
        specialUse?: Optional<boolean>;
        showHidden?: Optional<boolean>;
        counters?: Optional<boolean>;
        sizes?: Optional<boolean>;
      } = {},
    ): Promise<WildduckMailbox[]> => {
      try {
        const getMailboxesOptions: any = {};
        if (options.specialUse !== undefined)
          getMailboxesOptions.specialUse = options.specialUse;
        if (options.showHidden !== undefined)
          getMailboxesOptions.showHidden = options.showHidden;
        if (options.counters !== undefined)
          getMailboxesOptions.counters = options.counters;
        if (options.sizes !== undefined)
          getMailboxesOptions.sizes = options.sizes;

        const mailboxData = await api.getMailboxes(
          wildduckUserAuth,
          getMailboxesOptions,
        );
        const mailboxList = mailboxData.results || [];

        // Update cache
        queryClient.setQueryData(
          ["wildduck-mailboxes", wildduckUserAuth.userId],
          mailboxList,
        );

        return mailboxList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get mailboxes";
        console.error(errorMessage);
        return [];
      }
    },
    [api, wildduckUserAuth, queryClient],
  );

  // Get single mailbox
  const getMailbox = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
    ): Promise<WildduckMailbox> => {
      try {
        if (!wildduckUserAuth) {
          console.error("User not authenticated");
          return undefined as any;
        }

        const mailboxData = await api.getMailbox(wildduckUserAuth, mailboxId);

        // The API returns a response with a single mailbox in results array
        if (!mailboxData.results || mailboxData.results.length === 0) {
          console.error("Mailbox not found");
          return undefined as any;
        }

        const mailbox = mailboxData.results[0];
        if (!mailbox) {
          console.error("Mailbox not found");
          return undefined as any;
        }

        // Update cache for this specific mailbox
        queryClient.setQueryData(
          ["wildduck-mailbox", userId, mailboxId],
          mailbox,
        );

        return mailbox;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get mailbox";
        console.error(errorMessage);
        return undefined as any;
      }
    },
    [api, wildduckUserAuth, queryClient],
  );

  // Get cached mailboxes from query cache (used for reading state)
  // Use userId parameter to get the correct cached mailboxes
  const cachedMailboxes = userId
    ? queryClient.getQueryData<WildduckMailbox[]>([
        "wildduck-mailboxes",
        userId,
      ]) || []
    : [];

  // WebSocket subscription and real-time updates
  useEffect(() => {
    if (!shouldUseWebSocket || !wildduckUserAuth || !wsContext) {
      return;
    }

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) {
      return;
    }

    // Connect if not already connected
    wsContext.connect(wildduckUserAuth).catch((error) => {
      console.error("Failed to connect WebSocket:", error);
    });

    // Handle data messages (initial subscription response)
    const handleData = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "mailboxes" || !data.success) {
        return;
      }

      const mailboxes = (data as any).mailboxes as WildduckMailbox[];
      if (mailboxes) {
        // Update cache with initial data
        queryClient.setQueryData(
          ["wildduck-mailboxes", wildduckUserAuth.userId],
          mailboxes,
        );
      }
    };

    // Handle update messages (real-time updates)
    const handleUpdate = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "mailboxes" || !data.success) {
        return;
      }

      // Get current mailboxes from cache
      const currentMailboxes =
        queryClient.getQueryData<WildduckMailbox[]>([
          "wildduck-mailboxes",
          wildduckUserAuth.userId,
        ]) || [];

      const updateData = data as any;
      const event = updateData.event as "created" | "updated" | "deleted";
      const mailbox = updateData.mailbox as WildduckMailbox;

      if (!event || !mailbox) {
        // If no specific event, refresh entire list
        queryClient.invalidateQueries({
          queryKey: ["wildduck-mailboxes", wildduckUserAuth.userId],
        });
        return;
      }

      let updatedMailboxes: WildduckMailbox[];

      switch (event) {
        case "created":
          // Add new mailbox to list (avoid duplicates)
          if (!currentMailboxes.find((m) => m.id === mailbox.id)) {
            updatedMailboxes = [...currentMailboxes, mailbox];
          } else {
            updatedMailboxes = currentMailboxes;
          }
          break;

        case "updated":
          // Update existing mailbox
          updatedMailboxes = currentMailboxes.map((m) =>
            m.id === mailbox.id ? { ...m, ...mailbox } : m,
          );
          break;

        case "deleted":
          // Remove mailbox from list
          updatedMailboxes = currentMailboxes.filter(
            (m) => m.id !== mailbox.id,
          );
          break;

        default:
          updatedMailboxes = currentMailboxes;
      }

      // Update cache
      queryClient.setQueryData(
        ["wildduck-mailboxes", wildduckUserAuth.userId],
        updatedMailboxes,
      );
    };

    // Register event handlers
    client.on("data", handleData);
    client.on("update", handleUpdate);

    // Subscribe to mailboxes channel
    if (!wsSubscribedRef.current) {
      wsSubscribedRef.current = true;
      client
        .subscribe("mailboxes", {
          userId: wildduckUserAuth.userId,
          token: wildduckUserAuth.accessToken,
        })
        .catch((error) => {
          console.error("Failed to subscribe to mailboxes channel:", error);
          wsSubscribedRef.current = false;
        });
    }

    // Cleanup
    return () => {
      client.off("data", handleData);
      client.off("update", handleUpdate);

      if (wsSubscribedRef.current) {
        client.unsubscribe("mailboxes").catch((error) => {
          console.error("Failed to unsubscribe from mailboxes:", error);
        });
        wsSubscribedRef.current = false;
      }

      wsContext.disconnect(wildduckUserAuth.userId);
    };
  }, [shouldUseWebSocket, wildduckUserAuth, wsContext, queryClient]);

  // Auto-fetch mailboxes when user is authenticated (only if WebSocket is disabled)
  useEffect(() => {
    if (shouldUseWebSocket) {
      // WebSocket will provide initial data
      return;
    }

    if (wildduckUserAuth && !hasFetchedRef.current) {
      const cached = queryClient.getQueryData<WildduckMailbox[]>([
        "wildduck-mailboxes",
        wildduckUserAuth.userId,
      ]);

      if (!cached || cached.length === 0) {
        hasFetchedRef.current = true;
        getMailboxes(wildduckUserAuth, {
          counters: true,
          specialUse: false,
          showHidden: false,
          sizes: false,
        }).catch(() => {
          // Reset flag on error so it can be retried
          hasFetchedRef.current = false;
        });
      }
    }
  }, [shouldUseWebSocket, wildduckUserAuth, getMailboxes, queryClient]);

  // Create mailbox mutation
  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      params,
    }: {
      params: Omit<CreateMailboxRequest, "sess" | "ip">;
    }): Promise<{ success: boolean; id: string }> => {
      try {
        if (!wildduckUserAuth) {
          console.error("User not authenticated");
          return { success: false, id: "" };
        }

        await api.createMailbox(wildduckUserAuth, params);

        return { success: true, id: "" };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create mailbox";
        console.error(errorMessage);
        return { success: false, id: "" };
      }
    },
    onSuccess: async () => {
      // Automatically refresh mailboxes after creation
      await refresh();
    },
  });

  // Update mailbox mutation
  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      mailboxId,
      params,
    }: {
      mailboxId: string;
      params: Omit<UpdateMailboxRequest, "sess" | "ip">;
    }): Promise<{ success: boolean }> => {
      try {
        if (!wildduckUserAuth) {
          console.error("User not authenticated");
          return { success: false };
        }

        const response = await api.updateMailbox(
          wildduckUserAuth,
          mailboxId,
          params,
        );

        return { success: response.success };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update mailbox";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: async () => {
      // Automatically refresh mailboxes after update
      await refresh();
    },
  });

  // Delete mailbox mutation
  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      mailboxId,
    }: {
      mailboxId: string;
    }): Promise<{ success: boolean }> => {
      try {
        if (!wildduckUserAuth) {
          console.error("User not authenticated");
          return { success: false };
        }

        const response = await api.deleteMailbox(wildduckUserAuth, mailboxId);

        return { success: response.success };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete mailbox";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: async () => {
      // Automatically refresh mailboxes after deletion
      await refresh();
    },
  });

  // Refresh function (refetch with counters)
  const refresh = useCallback(async (): Promise<void> => {
    if (!wildduckUserAuth) {
      console.error("Cannot refresh: user not authenticated");
      return;
    }
    await getMailboxes(wildduckUserAuth, { counters: true });
  }, [wildduckUserAuth, getMailboxes]);

  // Aggregate loading and error states for legacy compatibility
  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;
  const error: Optional<string> =
    createMutation.error?.message ||
    updateMutation.error?.message ||
    deleteMutation.error?.message ||
    null;

  const createMailbox = useCallback(
    async (
      _wildduckUserAuth: WildduckUserAuth,
      params: Omit<CreateMailboxRequest, "sess" | "ip">,
    ) => createMutation.mutateAsync({ params }),
    [createMutation],
  );

  const updateMailbox = useCallback(
    async (
      _wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      params: Omit<UpdateMailboxRequest, "sess" | "ip">,
    ) => updateMutation.mutateAsync({ mailboxId, params }),
    [updateMutation],
  );

  const deleteMailbox = useCallback(
    async (_wildduckUserAuth: WildduckUserAuth, mailboxId: string) =>
      deleteMutation.mutateAsync({ mailboxId }),
    [deleteMutation],
  );

  const clearError = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  }, [createMutation, updateMutation, deleteMutation]);

  return useMemo(
    () => ({
      // Query state
      mailboxes: cachedMailboxes,
      isLoading,
      error,

      // Query functions
      getMailboxes,
      getMailbox,
      refresh,

      // Create mutation
      createMailbox,
      isCreating: createMutation.isPending,
      createError: createMutation.error,

      // Update mutation
      updateMailbox,
      isUpdating: updateMutation.isPending,
      updateError: updateMutation.error,

      // Delete mutation
      deleteMailbox,
      isDeleting: deleteMutation.isPending,
      deleteError: deleteMutation.error,

      // Legacy compatibility
      clearError,
    }),
    [
      cachedMailboxes,
      isLoading,
      error,
      getMailboxes,
      getMailbox,
      refresh,
      createMailbox,
      createMutation.isPending,
      createMutation.error,
      updateMailbox,
      updateMutation.isPending,
      updateMutation.error,
      deleteMailbox,
      deleteMutation.isPending,
      deleteMutation.error,
      clearError,
    ],
  );
};

export {
  useWildduckMailboxes,
  type UseWildduckMailboxesReturn,
  type UseWildduckMailboxesOptions,
};
