import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "../../types/wildduck-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSuccessResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckDeleteMessageReturn {
  deleteMessage: (
    userAuth: WildduckUserAuth,
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
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      mailboxId,
      messageId,
    }: {
      userAuth: WildduckUserAuth;
      mailboxId: string;
      messageId: number;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.deleteMessage(
          userAuth,
          mailboxId,
          messageId,
        );
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] deleteMessage failed, returning mock data:",
            err,
          );
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
          variables.userAuth.userId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userAuth.userId],
      });
    },
  });

  const deleteMessage = useCallback(
    async (
      userAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: number,
    ) => {
      return deleteMutation.mutateAsync({ userAuth, mailboxId, messageId });
    },
    [deleteMutation],
  );

  return {
    deleteMessage,
    isLoading: deleteMutation.isPending,
    error: deleteMutation.error,
    clearError: () => deleteMutation.reset(),
  };
};
