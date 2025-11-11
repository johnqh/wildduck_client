import type { Optional } from "@sudobility/types";
import { useCallback, useMemo } from "react";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckUpdateMessageRequest,
  WildduckUpdateMessageResponse,
  WildduckUserAuth,
} from "@sudobility/types";

interface UseWildduckUpdateMessageReturn {
  updateMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
    params: WildduckUpdateMessageRequest,
  ) => Promise<WildduckUpdateMessageResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for updating message flags or moving to different mailbox
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with updateMessage function and state
 */
export const useWildduckUpdateMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckUpdateMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      mailboxId,
      messageId,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      mailboxId: string;
      messageId: number;
      params: WildduckUpdateMessageRequest;
    }): Promise<WildduckUpdateMessageResponse> => {
      try {
        return await wildduckClient.updateMessage(
          wildduckUserAuth,
          mailboxId,
          messageId,
          params,
        );
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] updateMessage failed, returning mock data:",
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
          variables.wildduckUserAuth.userId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.wildduckUserAuth.userId],
      });
    },
  });

  const updateMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: number,
      params: WildduckUpdateMessageRequest,
    ) => {
      return updateMutation.mutateAsync({
        wildduckUserAuth,
        mailboxId,
        messageId,
        params,
      });
    },
    [updateMutation],
  );

  const clearError = useCallback(
    () => updateMutation.reset(),
    [updateMutation],
  );

  return useMemo(
    () => ({
      updateMessage,
      isLoading: updateMutation.isPending,
      error: updateMutation.error,
      clearError,
    }),
    [updateMessage, updateMutation.isPending, updateMutation.error, clearError],
  );
};
