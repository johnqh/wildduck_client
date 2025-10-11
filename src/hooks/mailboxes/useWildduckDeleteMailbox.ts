import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WildduckSuccessResponse, WildduckUserAuth } from "@johnqh/types";

interface UseWildduckDeleteMailboxReturn {
  deleteMailbox: (
    userAuth: WildduckUserAuth,
    mailboxId: string,
  ) => Promise<WildduckSuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for deleting a mailbox
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with deleteMailbox function and state
 */
export const useWildduckDeleteMailbox = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckDeleteMailboxReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      mailboxId,
    }: {
      userAuth: WildduckUserAuth;
      mailboxId: string;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.deleteMailbox(userAuth, mailboxId);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] deleteMailbox failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate mailboxes list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userAuth.userId],
      });
      // Remove the specific mailbox from cache
      queryClient.removeQueries({
        queryKey: [
          "wildduck-mailbox",
          variables.userAuth.userId,
          variables.mailboxId,
        ],
      });
    },
  });

  const deleteMailbox = useCallback(
    async (userAuth: WildduckUserAuth, mailboxId: string) => {
      return deleteMutation.mutateAsync({ userAuth, mailboxId });
    },
    [deleteMutation],
  );

  const clearError = useCallback(
    () => deleteMutation.reset(),
    [deleteMutation],
  );

  return useMemo(
    () => ({
      deleteMailbox,
      isLoading: deleteMutation.isPending,
      error: deleteMutation.error,
      clearError,
    }),
    [deleteMailbox, deleteMutation.isPending, deleteMutation.error, clearError],
  );
};
