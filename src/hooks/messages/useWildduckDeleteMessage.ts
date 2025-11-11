import type { Optional } from "@sudobility/types";
import { useCallback, useMemo } from "react";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSuccessResponse,
  WildduckUserAuth,
} from "@sudobility/types";

interface UseWildduckDeleteMessageReturn {
  deleteMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
  ) => Promise<WildduckSuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for deleting a message from mailbox
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with deleteMessage function and state
 */
export const useWildduckDeleteMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckDeleteMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      mailboxId,
      messageId,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      mailboxId: string;
      messageId: number;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.deleteMessage(
          wildduckUserAuth,
          mailboxId,
          messageId,
        );
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both message detail and messages list
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          variables.wildduckUserAuth.userId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.wildduckUserAuth.userId],
      });
    },
  });

  const deleteMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: number,
    ) => {
      return deleteMutation.mutateAsync({
        wildduckUserAuth,
        mailboxId,
        messageId,
      });
    },
    [deleteMutation],
  );

  const clearError = useCallback(
    () => deleteMutation.reset(),
    [deleteMutation],
  );

  return useMemo(
    () => ({
      deleteMessage,
      isLoading: deleteMutation.isPending,
      error: deleteMutation.error,
      clearError,
    }),
    [deleteMessage, deleteMutation.isPending, deleteMutation.error, clearError],
  );
};
