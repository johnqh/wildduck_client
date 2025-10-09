import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ForwardMessageRequest,
  SuccessResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckForwardMessageReturn {
  forwardMessage: (
    userAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
    params: ForwardMessageRequest,
  ) => Promise<SuccessResponse>;
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
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with forwardMessage function and state
 */
export const useWildduckForwardMessage = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckForwardMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
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
      params: ForwardMessageRequest;
    }): Promise<SuccessResponse> => {
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
      params: ForwardMessageRequest,
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

  return {
    forwardMessage,
    isLoading: forwardMutation.isPending,
    error: forwardMutation.error,
    clearError: () => forwardMutation.reset(),
  };
};
