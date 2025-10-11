import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckForwardMessageRequest,
  WildduckSuccessResponse,
  WildduckUserAuth,
} from "@johnqh/types";

interface UseWildduckForwardMessageReturn {
  forwardMessage: (
    userAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
    params: WildduckForwardMessageRequest,
  ) => Promise<WildduckSuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for forwarding a stored message
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with forwardMessage function and state
 */
export const useWildduckForwardMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckForwardMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const forwardMutation = useMutation({
    mutationKey: [
      "wildduck-forward-message",
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
      params: WildduckForwardMessageRequest;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.forwardMessage(
          userAuth,
          mailboxId,
          messageId,
          params,
        );
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] forwardMessage failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate sent messages to show the forwarded message
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userAuth.userId],
      });
    },
  });

  const forwardMessage = useCallback(
    async (
      userAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: number,
      params: WildduckForwardMessageRequest,
    ) => {
      return forwardMutation.mutateAsync({
        userAuth,
        mailboxId,
        messageId,
        params,
      });
    },
    [forwardMutation],
  );

  const clearError = useCallback(
    () => forwardMutation.reset(),
    [forwardMutation],
  );

  return useMemo(
    () => ({
      forwardMessage,
      isLoading: forwardMutation.isPending,
      error: forwardMutation.error,
      clearError,
    }),
    [
      forwardMessage,
      forwardMutation.isPending,
      forwardMutation.error,
      clearError,
    ],
  );
};
