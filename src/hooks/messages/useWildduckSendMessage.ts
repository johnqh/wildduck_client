import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SubmitMessageRequest,
  SubmitMessageResponse,
  UserAuth,
} from "../../types/wildduck-types";

interface UseWildduckSendMessageReturn {
  sendMessage: (
    userAuth: UserAuth,
    params: SubmitMessageRequest,
  ) => Promise<SubmitMessageResponse>;
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
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with sendMessage function and state
 */
export const useWildduckSendMessage = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckSendMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
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
      userAuth: UserAuth;
      params: SubmitMessageRequest;
    }): Promise<SubmitMessageResponse> => {
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
          } as SubmitMessageResponse;
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
    async (userAuth: UserAuth, params: SubmitMessageRequest) => {
      return sendMutation.mutateAsync({ userAuth, params });
    },
    [sendMutation],
  );

  return {
    sendMessage,
    isLoading: sendMutation.isPending,
    error: sendMutation.error,
    clearError: () => sendMutation.reset(),
  };
};
