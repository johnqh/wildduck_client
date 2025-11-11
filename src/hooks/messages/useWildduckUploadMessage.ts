import type { Optional } from "@sudobility/types";
import { useCallback, useMemo } from "react";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckUploadMessageRequest,
  WildduckUploadMessageResponse,
  WildduckUserAuth,
} from "@sudobility/types";

interface UseWildduckUploadMessageReturn {
  uploadMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    params: WildduckUploadMessageRequest,
  ) => Promise<WildduckUploadMessageResponse>;
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
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with uploadMessage function and state
 */
export const useWildduckUploadMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckUploadMessageReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const uploadMutation = useMutation({
    mutationKey: [
      "wildduck-upload-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      mailboxId,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      mailboxId: string;
      params: WildduckUploadMessageRequest;
    }): Promise<WildduckUploadMessageResponse> => {
      try {
        return await wildduckClient.uploadMessage(
          wildduckUserAuth,
          mailboxId,
          params,
        );
      } catch (err) {
        if (devMode) {
          return {
            success: true,
            message: { id: Date.now(), mailbox: mailboxId },
          } as WildduckUploadMessageResponse;
        }
        console.error("Failed to upload message:", err);
        return { success: false, message: { id: 0, mailbox: "" } };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate messages queries to refetch
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-messages",
          variables.wildduckUserAuth.userId,
          variables.mailboxId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.wildduckUserAuth.userId],
      });
    },
  });

  const uploadMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      params: WildduckUploadMessageRequest,
    ) => {
      return uploadMutation.mutateAsync({
        wildduckUserAuth,
        mailboxId,
        params,
      });
    },
    [uploadMutation],
  );

  const clearError = useCallback(
    () => uploadMutation.reset(),
    [uploadMutation],
  );

  return useMemo(
    () => ({
      uploadMessage,
      isLoading: uploadMutation.isPending,
      error: uploadMutation.error,
      clearError,
    }),
    [uploadMessage, uploadMutation.isPending, uploadMutation.error, clearError],
  );
};
