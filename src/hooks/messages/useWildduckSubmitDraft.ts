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

interface UseWildduckSubmitDraftReturn {
  submitDraft: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: number,
  ) => Promise<WildduckSuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for submitting a draft message for delivery
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with submitDraft function and state
 */
export const useWildduckSubmitDraft = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckSubmitDraftReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const submitMutation = useMutation({
    mutationKey: [
      "wildduck-submit-draft",
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
        return await wildduckClient.submitDraft(
          wildduckUserAuth,
          mailboxId,
          messageId,
        );
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to submit draft:", err);
        return { success: false, queueId: "" };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate drafts and sent messages
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.wildduckUserAuth.userId],
      });
    },
  });

  const submitDraft = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: number,
    ) => {
      return submitMutation.mutateAsync({
        wildduckUserAuth,
        mailboxId,
        messageId,
      });
    },
    [submitMutation],
  );

  const clearError = useCallback(
    () => submitMutation.reset(),
    [submitMutation],
  );

  return useMemo(
    () => ({
      submitDraft,
      isLoading: submitMutation.isPending,
      error: submitMutation.error,
      clearError,
    }),
    [submitDraft, submitMutation.isPending, submitMutation.error, clearError],
  );
};
