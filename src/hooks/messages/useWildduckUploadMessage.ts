import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UploadMessageRequest,
  UploadMessageResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckUploadMessageReturn {
  uploadMessage: (
    userAuth: WildduckUserAuth,
    mailboxId: string,
    params: UploadMessageRequest,
  ) => Promise<UploadMessageResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for uploading/creating a message in a mailbox
 * Used for drafts, imports, etc.
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with uploadMessage function and state
 */
export const useWildduckUploadMessage = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckUploadMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const uploadMutation = useMutation({
    mutationKey: [
      "wildduck-upload-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      mailboxId,
      params,
    }: {
      userAuth: WildduckUserAuth;
      mailboxId: string;
      params: UploadMessageRequest;
    }): Promise<UploadMessageResponse> => {
      try {
        return await wildduckClient.uploadMessage(userAuth, mailboxId, params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] uploadMessage failed, returning mock data:",
            err,
          );
          return {
            success: true,
            message: { id: Date.now(), mailbox: mailboxId },
          } as UploadMessageResponse;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate messages queries to refetch
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-messages",
          variables.userAuth.userId,
          variables.mailboxId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userAuth.userId],
      });
    },
  });

  const uploadMessage = useCallback(
    async (
      userAuth: WildduckUserAuth,
      mailboxId: string,
      params: UploadMessageRequest,
    ) => {
      return uploadMutation.mutateAsync({ userAuth, mailboxId, params });
    },
    [uploadMutation],
  );

  return {
    uploadMessage,
    isLoading: uploadMutation.isPending,
    error: uploadMutation.error,
    clearError: () => uploadMutation.reset(),
  };
};
