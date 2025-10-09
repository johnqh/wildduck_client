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

interface UseWildduckSubmitDraftReturn {
  submitDraft: (
    userAuth: WildduckUserAuth,
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
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const submitMutation = useMutation({
    mutationKey: [
      "wildduck-submit-draft",
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
        return await wildduckClient.submitDraft(userAuth, mailboxId, messageId);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] submitDraft failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate drafts and sent messages
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userAuth.userId],
      });
    },
  });

  const submitDraft = useCallback(
    async (
      userAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: number,
    ) => {
      return submitMutation.mutateAsync({ userAuth, mailboxId, messageId });
    },
    [submitMutation],
  );

  return {
    submitDraft,
    isLoading: submitMutation.isPending,
    error: submitMutation.error,
    clearError: () => submitMutation.reset(),
  };
};
