import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  CreateMailboxRequest,
  GetMailboxesRequest,
  UpdateMailboxRequest,
  WildduckConfig,
  WildduckMailbox,
  WildduckMailboxResponse,
  WildduckUserAuth,
} from "@sudobility/types";

interface UseWildduckMailboxesReturn {
  // Query state
  mailboxes: WildduckMailbox[];
  isLoading: boolean;
  error: Optional<string>;

  // Query functions
  getMailboxes: (
    userId: string,
    options?: Omit<GetMailboxesRequest, "sess" | "ip">,
  ) => Promise<WildduckMailbox[]>;
  getMailbox: (userId: string, mailboxId: string) => Promise<WildduckMailbox>;
  refresh: () => Promise<void>;

  // Mutations
  createMailbox: (
    userId: string,
    params: Omit<CreateMailboxRequest, "sess" | "ip">,
  ) => Promise<{ success: boolean; id: string }>;
  isCreating: boolean;
  createError: Optional<Error>;

  updateMailbox: (
    userId: string,
    mailboxId: string,
    params: Omit<UpdateMailboxRequest, "sess" | "ip">,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  deleteMailbox: (
    userId: string,
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

  // Get userId from wildduckUserAuth (single source of truth)
  const userId = wildduckUserAuth?.userId || null;

  // Helper to build headers
  const buildHeaders = useCallback((): Record<string, string> => {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }, []);

  // Get mailboxes query (not auto-fetched, only when explicitly called)
  const getMailboxes = useCallback(
    async (
      userId: string,
      options: {
        specialUse?: Optional<boolean>;
        showHidden?: Optional<boolean>;
        counters?: Optional<boolean>;
        sizes?: Optional<boolean>;
      } = {},
    ): Promise<WildduckMailbox[]> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const queryParams = new URLSearchParams();
        if (options.specialUse) queryParams.append("specialUse", "true");
        if (options.showHidden) queryParams.append("showHidden", "true");
        if (options.counters) queryParams.append("counters", "true");
        if (options.sizes) queryParams.append("sizes", "true");

        const query = queryParams.toString();
        const endpoint = `/users/${userId}/mailboxes${query ? `?${query}` : ""}`;

        const response = await networkClient.request<WildduckMailboxResponse>(
          `${apiUrl}${endpoint}`,
          {
            method: "GET",
            headers,
          },
        );
        const mailboxData = response.data as WildduckMailboxResponse;
        const mailboxList = mailboxData.results || [];

        // Update cache
        queryClient.setQueryData(["wildduck-mailboxes", userId], mailboxList);

        return mailboxList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get mailboxes";
        console.error(
          "[useWildduckMailboxes] Failed to get mailboxes:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    [config.cloudflareWorkerUrl, config.backendUrl, buildHeaders, queryClient],
  );

  // Get single mailbox
  const getMailbox = useCallback(
    async (userId: string, mailboxId: string): Promise<WildduckMailbox> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const endpoint = `/users/${userId}/mailboxes/${mailboxId}`;

        const response = await networkClient.request<WildduckMailboxResponse>(
          `${apiUrl}${endpoint}`,
          {
            method: "GET",
            headers,
          },
        );
        const mailboxData = response.data as WildduckMailboxResponse;

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
        console.error(
          "[useWildduckMailboxes] Failed to get mailbox:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    [config.cloudflareWorkerUrl, config.backendUrl, buildHeaders, queryClient],
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
    if (userId && !hasFetchedRef.current) {
      const cached = queryClient.getQueryData<WildduckMailbox[]>([
        "wildduck-mailboxes",
        userId,
      ]);

      if (!cached || cached.length === 0) {
        hasFetchedRef.current = true;
        getMailboxes(userId, {
          counters: true,
          specialUse: false,
          showHidden: false,
          sizes: false,
        }).catch((error) => {
          console.error("[useWildduckMailboxes] Auto-fetch failed:", error);
          // Reset flag on error so it can be retried
          hasFetchedRef.current = false;
        });
      }
    }
  }, [userId, getMailboxes, queryClient]);

  // Create mailbox mutation
  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userId,
      params,
    }: {
      userId: string;
      params: Omit<CreateMailboxRequest, "sess" | "ip">;
    }): Promise<{ success: boolean; id: string }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{
          success: boolean;
          id: string;
        }>(`${apiUrl}/users/${userId}/mailboxes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            path: params.path,
            hidden: params.hidden,
            retention: params.retention,
          }),
        });

        return response.data as { success: boolean; id: string };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create mailbox";
        console.error(
          "[useWildduckMailboxes] Failed to create mailbox:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (_, variables) => {
      // Automatically refresh mailboxes after creation
      await getMailboxes(variables.userId, { counters: true });
    },
  });

  // Update mailbox mutation
  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userId,
      mailboxId,
      params,
    }: {
      userId: string;
      mailboxId: string;
      params: Omit<UpdateMailboxRequest, "sess" | "ip">;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{ success: boolean }>(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(params),
          },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update mailbox";
        console.error(
          "[useWildduckMailboxes] Failed to update mailbox:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (_, variables) => {
      // Automatically refresh mailboxes after update
      await getMailboxes(variables.userId, { counters: true });
    },
  });

  // Delete mailbox mutation
  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userId,
      mailboxId,
    }: {
      userId: string;
      mailboxId: string;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{ success: boolean }>(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}`,
          {
            method: "DELETE",
            headers,
          },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete mailbox";
        console.error(
          "[useWildduckMailboxes] Failed to delete mailbox:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (_, variables) => {
      // Automatically refresh mailboxes after deletion
      await getMailboxes(variables.userId, { counters: true });
    },
  });

  // Refresh function (refetch with counters)
  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      throw new Error("Cannot refresh: user not authenticated");
    }
    await getMailboxes(userId, { counters: true });
  }, [userId, getMailboxes]);

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
    async (userId: string, params: Omit<CreateMailboxRequest, "sess" | "ip">) =>
      createMutation.mutateAsync({ userId, params }),
    [createMutation],
  );

  const updateMailbox = useCallback(
    async (
      userId: string,
      mailboxId: string,
      params: Omit<UpdateMailboxRequest, "sess" | "ip">,
    ) => updateMutation.mutateAsync({ userId, mailboxId, params }),
    [updateMutation],
  );

  const deleteMailbox = useCallback(
    async (userId: string, mailboxId: string) =>
      deleteMutation.mutateAsync({ userId, mailboxId }),
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
