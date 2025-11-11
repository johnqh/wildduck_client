import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  WildduckAutoreplyRequest,
  WildduckAutoreplyResponse,
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/types";
import { WildduckClient } from "../network/wildduck-client";

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
 * Hook for Wildduck autoreply operations using React Query
 * Automatically fetches autoreply when user is authenticated
 * Queries are cached and automatically refetched, mutations invalidate related queries
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - WildDuck user authentication data (single source of truth)
 * @param _devMode - Development mode flag (unused, kept for compatibility)
 */
const useWildduckAutoReply = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: Optional<WildduckUserAuth>,
  _devMode: boolean = false,
): UseWildduckAutoReplyReturn => {
  const queryClient = useQueryClient();

  // Get userId from wildduckUserAuth (single source of truth)
  const userId = wildduckUserAuth?.userId || null;

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Get autoreply
  const getAutoreply = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
    ): Promise<WildduckAutoreplyResponse> => {
      try {
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
          "[useWildduckAutoReply] Failed to get autoreply:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    [api, queryClient],
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
          "[useWildduckAutoReply] Failed to update autoreply:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (_, variables) => {
      // Automatically refresh autoreply after update
      await getAutoreply(variables.wildduckUserAuth);
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
          "[useWildduckAutoReply] Failed to delete autoreply:",
          errorMessage,
        );
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (_, wildduckUserAuth) => {
      // Automatically refresh autoreply after deletion
      await getAutoreply(wildduckUserAuth);
    },
  });

  // Refresh function (refetch autoreply)
  const refresh = useCallback(async (): Promise<void> => {
    if (!wildduckUserAuth) {
      throw new Error("Cannot refresh: user not authenticated");
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

export { useWildduckAutoReply, type UseWildduckAutoReplyReturn };
