import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import axios from "axios";
import type { Optional } from "@johnqh/types";
import type {
  CreateMailboxRequest,
  GetMailboxesRequest,
  UpdateMailboxRequest,
  WildduckAuthResponse,
  WildduckConfig,
  WildduckMailbox,
  WildduckMailboxResponse,
} from "../types/wildduck-types";

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
  refresh: (userId: string) => Promise<void>;

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
 * @param config - Wildduck configuration
 * @param authData - Authentication data from useWildduckAuth (single source of truth)
 * @param devMode - Development mode flag
 */
const useWildduckMailboxes = (
  config: WildduckConfig,
  authData: Optional<WildduckAuthResponse>,
  _devMode: boolean = false,
): UseWildduckMailboxesReturn => {
  const queryClient = useQueryClient();

  // Get userId from authData (single source of truth)
  const userId = authData?.id || null;

  // Helper to build headers
  const buildHeaders = (): Record<string, string> => {
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

    return headers;
  };

  // Get mailboxes query (not auto-fetched, only when explicitly called)
  const getMailboxes = async (
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

      const response = await axios.get(`${apiUrl}${endpoint}`, { headers });
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
  };

  // Get cached mailboxes from query cache (used for reading state)
  // Use userId parameter to get the correct cached mailboxes
  const cachedMailboxes = userId
    ? queryClient.getQueryData<WildduckMailbox[]>([
        "wildduck-mailboxes",
        userId,
      ]) || []
    : [];

  // Auto-fetch mailboxes when user is authenticated
  useEffect(() => {
    if (userId && cachedMailboxes.length === 0) {
      getMailboxes(userId, {
        counters: true,
        specialUse: false,
        showHidden: false,
        sizes: false,
      }).catch((error) => {
        console.error("[useWildduckMailboxes] Auto-fetch failed:", error);
      });
    }
  }, [userId]);

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

        const response = await axios.post(
          `${apiUrl}/users/${userId}/mailboxes`,
          {
            path: params.path,
            hidden: params.hidden,
            retention: params.retention,
          },
          { headers },
        );

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
    onSuccess: (_, variables) => {
      // Invalidate mailboxes query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userId],
      });
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

        const response = await axios.put(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}`,
          params,
          { headers },
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
    onSuccess: (_, variables) => {
      // Invalidate mailboxes query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userId],
      });
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

        const response = await axios.delete(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}`,
          { headers },
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
    onSuccess: (_, variables) => {
      // Invalidate mailboxes query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userId],
      });
    },
  });

  // Refresh function (refetch with counters)
  const refresh = async (userId: string): Promise<void> => {
    await getMailboxes(userId, { counters: true });
  };

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

  return {
    // Query state
    mailboxes: cachedMailboxes,
    isLoading,
    error,

    // Query functions
    getMailboxes,
    refresh,

    // Create mutation
    createMailbox: async (
      userId: string,
      params: Omit<CreateMailboxRequest, "sess" | "ip">,
    ) => createMutation.mutateAsync({ userId, params }),
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    // Update mutation
    updateMailbox: async (
      userId: string,
      mailboxId: string,
      params: Omit<UpdateMailboxRequest, "sess" | "ip">,
    ) => updateMutation.mutateAsync({ userId, mailboxId, params }),
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    // Delete mutation
    deleteMailbox: async (userId: string, mailboxId: string) =>
      deleteMutation.mutateAsync({ userId, mailboxId }),
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    // Legacy compatibility
    clearError: () => {
      createMutation.reset();
      updateMutation.reset();
      deleteMutation.reset();
    },
  };
};

export { useWildduckMailboxes, type UseWildduckMailboxesReturn };
