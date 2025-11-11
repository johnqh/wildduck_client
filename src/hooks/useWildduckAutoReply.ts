import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  WildduckAuthResponse,
  WildduckAutoreplyRequest,
  WildduckAutoreplyResponse,
  WildduckConfig,
} from "@sudobility/types";

interface UseWildduckAutoReplyReturn {
  // Query state
  autoreply: Optional<WildduckAutoreplyResponse>;
  isLoading: boolean;
  error: Optional<string>;

  // Query functions
  getAutoreply: (userId: string) => Promise<WildduckAutoreplyResponse>;
  refresh: () => Promise<void>;

  // Mutations
  updateAutoreply: (
    userId: string,
    params: WildduckAutoreplyRequest,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  deleteAutoreply: (userId: string) => Promise<{ success: boolean }>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Legacy compatibility
  clearError: () => void;
}

/**
 * Hook for Wildduck autoreply operations using React Query
 * Automatically fetches autoreply when user is authenticated
 * Queries are cached and automatically refetched, mutations invalidate related queries
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param authData - Authentication data from useWildduckAuth (single source of truth)
 * @param _devMode - Development mode flag (unused, kept for compatibility)
 */
const useWildduckAutoReply = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  authData: Optional<WildduckAuthResponse>,
  _devMode: boolean = false,
): UseWildduckAutoReplyReturn => {
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

  // Get autoreply
  const getAutoreply = useCallback(
    async (userId: string): Promise<WildduckAutoreplyResponse> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const endpoint = `/users/${userId}/autoreply`;

        const response = await networkClient.request<WildduckAutoreplyResponse>(
          `${apiUrl}${endpoint}`,
          {
            method: "GET",
            headers,
          },
        );
        const autoreplyData = response.data as WildduckAutoreplyResponse;

        // Update cache
        queryClient.setQueryData(["wildduck-autoreply", userId], autoreplyData);

        return autoreplyData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get autoreply";
        console.error(
          "[useWildduckAutoReply] Failed to get autoreply:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    [config.cloudflareWorkerUrl, config.backendUrl, buildHeaders, queryClient],
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
      userId,
      params,
    }: {
      userId: string;
      params: WildduckAutoreplyRequest;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{ success: boolean }>(
          `${apiUrl}/users/${userId}/autoreply`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(params),
          },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update autoreply";
        console.error(
          "[useWildduckAutoReply] Failed to update autoreply:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (_, variables) => {
      // Automatically refresh autoreply after update
      await getAutoreply(variables.userId);
    },
  });

  // Delete autoreply mutation
  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-autoreply",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (userId: string): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await networkClient.request<{ success: boolean }>(
          `${apiUrl}/users/${userId}/autoreply`,
          {
            method: "DELETE",
            headers,
          },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete autoreply";
        console.error(
          "[useWildduckAutoReply] Failed to delete autoreply:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (_, userId) => {
      // Automatically refresh autoreply after deletion
      await getAutoreply(userId);
    },
  });

  // Refresh function (refetch autoreply)
  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      throw new Error("Cannot refresh: user not authenticated");
    }
    await getAutoreply(userId);
  }, [userId, getAutoreply]);

  // Aggregate loading and error states for legacy compatibility
  const isLoading = updateMutation.isPending || deleteMutation.isPending;
  const error: Optional<string> =
    updateMutation.error?.message || deleteMutation.error?.message || null;

  const updateAutoreply = useCallback(
    async (userId: string, params: WildduckAutoreplyRequest) =>
      updateMutation.mutateAsync({ userId, params }),
    [updateMutation],
  );

  const deleteAutoreply = useCallback(
    async (userId: string) => deleteMutation.mutateAsync(userId),
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

export { useWildduckAutoReply, type UseWildduckAutoReplyReturn };
