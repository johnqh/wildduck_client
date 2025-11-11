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
 * Hook for Wildduck mailbox operations using React Query
 * Automatically fetches mailboxes when user is authenticated
 * Queries are cached and automatically refetched, mutations invalidate related queries
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - WildDuck user authentication data (single source of truth)
 * @param devMode - Development mode flag
 */
const useWildduckMailboxes = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: Optional<WildduckUserAuth>,
  _devMode: boolean = false,
): UseWildduckMailboxesReturn => {
  const queryClient = useQueryClient();
  const hasFetchedRef = useRef(false);

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Get userId from wildduckUserAuth (single source of truth)
  const userId = wildduckUserAuth?.userId || null;

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
        throw new Error(errorMessage);
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
          throw new Error("User not authenticated");
        }

        const mailboxData = await api.getMailbox(wildduckUserAuth, mailboxId);

        // The API returns a response with a single mailbox in results array
        if (!mailboxData.results || mailboxData.results.length === 0) {
          throw new Error("Mailbox not found");
        }

        const mailbox = mailboxData.results[0];
        if (!mailbox) {
          throw new Error("Mailbox not found");
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
        throw new Error(errorMessage);
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

  // Auto-fetch mailboxes when user is authenticated (only once per userId)
  useEffect(() => {
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
  }, [wildduckUserAuth, getMailboxes, queryClient]);

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
          throw new Error("User not authenticated");
        }

        await api.createMailbox(wildduckUserAuth, params);

        return { success: true, id: "" };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create mailbox";
        throw new Error(errorMessage);
      }
    },
    onSuccess: async () => {
      // Automatically refresh mailboxes after creation
      if (wildduckUserAuth) {
        await getMailboxes(wildduckUserAuth, { counters: true });
      }
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
          throw new Error("User not authenticated");
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
        throw new Error(errorMessage);
      }
    },
    onSuccess: async () => {
      // Automatically refresh mailboxes after update
      if (wildduckUserAuth) {
        await getMailboxes(wildduckUserAuth, { counters: true });
      }
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
          throw new Error("User not authenticated");
        }

        const response = await api.deleteMailbox(wildduckUserAuth, mailboxId);

        return { success: response.success };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete mailbox";
        throw new Error(errorMessage);
      }
    },
    onSuccess: async () => {
      // Automatically refresh mailboxes after deletion
      if (wildduckUserAuth) {
        await getMailboxes(wildduckUserAuth, { counters: true });
      }
    },
  });

  // Refresh function (refetch with counters)
  const refresh = useCallback(async (): Promise<void> => {
    if (!wildduckUserAuth) {
      throw new Error("Cannot refresh: user not authenticated");
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

export { useWildduckMailboxes, type UseWildduckMailboxesReturn };
