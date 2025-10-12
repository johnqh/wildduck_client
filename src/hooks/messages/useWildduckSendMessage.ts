import type { Optional } from "@sudobility/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/di";
import { type WildduckConfig } from "@sudobility/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSubmitMessageRequest,
  WildduckSubmitMessageResponse,
  WildduckUserAuth,
} from "@sudobility/types";

interface UseWildduckSendMessageReturn {
  sendMessage: (
    userAuth: WildduckUserAuth,
    params: WildduckSubmitMessageRequest,
  ) => Promise<WildduckSubmitMessageResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for sending/submitting a new message
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with sendMessage function and state
 */
export const useWildduckSendMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckSendMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const sendMutation = useMutation({
    mutationKey: [
      "wildduck-send-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      params,
    }: {
      userAuth: WildduckUserAuth;
      params: WildduckSubmitMessageRequest;
    }): Promise<WildduckSubmitMessageResponse> => {
      try {
        return await wildduckClient.submitMessage(userAuth, params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] sendMessage failed, returning mock data:",
            err,
          );
          return {
            success: true,
            message: {
              id: `mock-message-${Date.now()}`,
              from: "mock@example.com",
              to: ["recipient@example.com"],
            },
          } as WildduckSubmitMessageResponse;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate messages queries to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userAuth.userId],
      });
    },
  });

  const sendMessage = useCallback(
    async (
      userAuth: WildduckUserAuth,
      params: WildduckSubmitMessageRequest,
    ) => {
      return sendMutation.mutateAsync({ userAuth, params });
    },
    [sendMutation],
  );

  const clearError = useCallback(() => sendMutation.reset(), [sendMutation]);

  return useMemo(
    () => ({
      sendMessage,
      isLoading: sendMutation.isPending,
      error: sendMutation.error,
      clearError,
    }),
    [sendMessage, sendMutation.isPending, sendMutation.error, clearError],
  );
};
