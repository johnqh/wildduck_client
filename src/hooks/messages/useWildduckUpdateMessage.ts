import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckUpdateMessageRequest,
  WildduckUpdateMessageResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckUpdateMessageReturn {
  updateMessage: (
    userAuth: WildduckUserAuth,
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
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with updateMessage function and state
 */
export const useWildduckUpdateMessage = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckUpdateMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      mailboxId,
      messageId,
      params,
    }: {
      userAuth: WildduckUserAuth;
      mailboxId: string;
      messageId: number;
      params: WildduckUpdateMessageRequest;
    }): Promise<WildduckUpdateMessageResponse> => {
      try {
        return await wildduckClient.updateMessage(
          userAuth,
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
          variables.userAuth.userId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userAuth.userId],
      });
    },
  });

  const updateMessage = useCallback(
    async (
      userAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: number,
      params: WildduckUpdateMessageRequest,
    ) => {
      return updateMutation.mutateAsync({
        userAuth,
        mailboxId,
        messageId,
        params,
      });
    },
    [updateMutation],
  );

  return {
    updateMessage,
    isLoading: updateMutation.isPending,
    error: updateMutation.error,
    clearError: () => updateMutation.reset(),
  };
};
