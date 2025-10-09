import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SuccessResponse, UserAuth } from "../../types/wildduck-types";

interface UseDeleteMailboxReturn {
  deleteMailbox: (
    userAuth: UserAuth,
    mailboxId: string,
  ) => Promise<SuccessResponse>;
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
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with deleteMailbox function and state
 */
export const useDeleteMailbox = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseDeleteMailboxReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
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
      userAuth: UserAuth;
      mailboxId: string;
    }): Promise<SuccessResponse> => {
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
    async (userAuth: UserAuth, mailboxId: string) => {
      return deleteMutation.mutateAsync({ userAuth, mailboxId });
    },
    [deleteMutation],
  );

  return {
    deleteMailbox,
    isLoading: deleteMutation.isPending,
    error: deleteMutation.error,
    clearError: () => deleteMutation.reset(),
  };
};
