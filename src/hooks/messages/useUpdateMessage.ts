import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateMessageRequest,
  UpdateMessageResponse,
  UserAuth,
} from "../../types/wildduck-types";

interface UseUpdateMessageReturn {
  updateMessage: (
    userAuth: UserAuth,
    mailboxId: string,
    messageId: number,
    params: UpdateMessageRequest,
  ) => Promise<UpdateMessageResponse>;
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
export const useUpdateMessage = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseUpdateMessageReturn => {
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
      userAuth: UserAuth;
      mailboxId: string;
      messageId: number;
      params: UpdateMessageRequest;
    }): Promise<UpdateMessageResponse> => {
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
      userAuth: UserAuth,
      mailboxId: string,
      messageId: number,
      params: UpdateMessageRequest,
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
