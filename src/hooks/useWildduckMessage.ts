import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WildduckClient } from "../network/wildduck-client";
import { WildduckMockData } from "./mocks";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckForwardMessageRequest,
  WildduckMessageResponse,
  WildduckSuccessResponse,
  WildduckUpdateMessageRequest,
  WildduckUpdateMessageResponse,
  WildduckUserAuth,
} from "@sudobility/types";

export interface UseWildduckMessageParams {
  wildduckUserAuth?: WildduckUserAuth;
  mailboxId?: string;
  messageId?: string;
  devMode?: boolean;
}

export interface UseWildduckMessageReturn {
  // Query data
  message: WildduckMessageResponse | undefined;
  messageSource: string | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Optional<Error>;

  // Query functions
  getMessage: () => Promise<WildduckMessageResponse | undefined>;
  getMessageSource: () => Promise<string | undefined>;
  getAttachment: (attachmentId: string) => Promise<any>;

  // Mutations (all auto-refresh on success)
  updateMessage: (
    params: WildduckUpdateMessageRequest,
  ) => Promise<WildduckUpdateMessageResponse>;
  deleteMessage: () => Promise<WildduckSuccessResponse>;
  forwardMessage: (
    params: WildduckForwardMessageRequest,
  ) => Promise<WildduckSuccessResponse>;
  submitDraft: () => Promise<WildduckSuccessResponse>;

  // Mutation states
  isUpdating: boolean;
  isDeleting: boolean;
  isForwarding: boolean;
  isSubmitting: boolean;
  updateError: Optional<Error>;
  deleteError: Optional<Error>;
  forwardError: Optional<Error>;
  submitError: Optional<Error>;

  // Refresh function
  refresh: () => Promise<void>;

  // Utility
  clearError: () => void;
}

/**
 * Monolithic hook for single message operations
 * Handles get, update, delete, forward, and submit draft operations
 * All mutations automatically refresh message data on success
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Hook parameters including wildduckUserAuth, mailboxId, messageId
 * @returns Object with message data, mutation functions, and state
 */
export const useWildduckMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckMessageParams = {},
): UseWildduckMessageReturn => {
  const { wildduckUserAuth, mailboxId, messageId, devMode = false } = params;

  const queryClient = useQueryClient();

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // ============================================================================
  // Query: Get Message Details
  // ============================================================================

  const messageQuery = useQuery({
    queryKey: [
      "wildduck-message",
      wildduckUserAuth?.userId,
      mailboxId,
      messageId,
    ],
    queryFn: async () => {
      if (!wildduckUserAuth) {
        console.error("wildduckUserAuth is required");
        return undefined;
      }
      if (!mailboxId) {
        console.error("mailboxId is required");
        return undefined;
      }
      if (!messageId) {
        console.error("messageId is required");
        return undefined;
      }

      try {
        return await api.getMessage(wildduckUserAuth, mailboxId, messageId);
      } catch (err) {
        if (devMode) {
          const mock = WildduckMockData.getMessageQuery(
            messageId,
            wildduckUserAuth.userId,
          );
          return {
            success: true,
            id: Number(messageId) || Date.now(),
            mailbox: mock.mailbox,
            user: wildduckUserAuth.userId,
            thread: mock.thread || "mock-thread",
            subject: mock.envelope?.subject || "Mock Subject",
            messageId: mock.envelope?.messageId || messageId,
            date: mock.date || new Date().toISOString(),
            size: mock.size || 0,
            seen: mock.seen || false,
            deleted: mock.deleted || false,
            flagged: mock.flagged || false,
            draft: mock.draft || false,
            answered: mock.answered || false,
            forwarded: mock.forwarded || false,
            to:
              mock.envelope?.to?.map((addr: any) => ({
                address: addr.address,
                ...(addr.name && { name: addr.name }),
              })) || [],
            cc: [],
            bcc: [],
            attachments: [],
            references: [],
            contentType: { value: "text/plain", params: {} },
            intro: mock.intro,
            text: mock.intro,
            html: [mock.intro],
            envelope: {
              from: mock.envelope?.from?.[0]?.address || "mock@example.com",
              rcpt:
                mock.envelope?.to?.map((addr: any) => ({
                  value: addr.address,
                  formatted: `${addr.name || ""} <${addr.address}>`,
                })) || [],
            },
          } as WildduckMessageResponse;
        }
        console.error("Failed to get message:", err);
        return undefined;
      }
    },
    enabled: !!wildduckUserAuth && !!mailboxId && !!messageId,
  });

  // ============================================================================
  // Query: Get Message Source
  // ============================================================================

  const messageSourceQuery = useQuery({
    queryKey: [
      "wildduck-message-source",
      wildduckUserAuth?.userId,
      mailboxId,
      messageId,
    ],
    queryFn: async () => {
      if (!wildduckUserAuth || !mailboxId || !messageId) {
        return undefined;
      }

      try {
        return await api.getMessageSource(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
        );
      } catch (err) {
        if (devMode) {
          return `From: mock@example.com\nTo: user@example.com\nSubject: Mock Message\nDate: ${new Date().toISOString()}\n\nMock message body`;
        }
        console.error("Failed to get message source:", err);
        return undefined;
      }
    },
    enabled: false, // Only fetch when explicitly called
  });

  // ============================================================================
  // Mutation: Update Message
  // ============================================================================

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: WildduckUpdateMessageRequest,
    ): Promise<WildduckUpdateMessageResponse> => {
      if (!wildduckUserAuth || !mailboxId || !messageId) {
        throw new Error(
          "wildduckUserAuth, mailboxId, and messageId are required",
        );
      }

      try {
        return await api.updateMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
          params,
        );
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to update message:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Auto-refresh message data
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          wildduckUserAuth?.userId,
          mailboxId,
          messageId,
        ],
      });
      messageQuery.refetch();

      // Also invalidate messages list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", wildduckUserAuth?.userId],
      });
    },
  });

  // ============================================================================
  // Mutation: Delete Message
  // ============================================================================

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (): Promise<WildduckSuccessResponse> => {
      if (!wildduckUserAuth || !mailboxId || !messageId) {
        throw new Error(
          "wildduckUserAuth, mailboxId, and messageId are required",
        );
      }

      try {
        return await api.deleteMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
        );
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to delete message:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Auto-refresh message data (will be empty after delete)
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          wildduckUserAuth?.userId,
          mailboxId,
          messageId,
        ],
      });

      // Also invalidate messages list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", wildduckUserAuth?.userId],
      });
    },
  });

  // ============================================================================
  // Mutation: Forward Message
  // ============================================================================

  const forwardMutation = useMutation({
    mutationKey: [
      "wildduck-forward-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: WildduckForwardMessageRequest,
    ): Promise<WildduckSuccessResponse> => {
      if (!wildduckUserAuth || !mailboxId || !messageId) {
        throw new Error(
          "wildduckUserAuth, mailboxId, and messageId are required",
        );
      }

      try {
        return await api.forwardMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
          params,
        );
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to forward message:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Auto-refresh message data
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          wildduckUserAuth?.userId,
          mailboxId,
          messageId,
        ],
      });
      messageQuery.refetch();

      // Also invalidate messages list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", wildduckUserAuth?.userId],
      });
    },
  });

  // ============================================================================
  // Mutation: Submit Draft
  // ============================================================================

  const submitMutation = useMutation({
    mutationKey: [
      "wildduck-submit-draft",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (): Promise<WildduckSuccessResponse> => {
      if (!wildduckUserAuth || !mailboxId || !messageId) {
        throw new Error(
          "wildduckUserAuth, mailboxId, and messageId are required",
        );
      }

      try {
        return await api.submitDraft(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
        );
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to submit draft:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Auto-refresh message data
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          wildduckUserAuth?.userId,
          mailboxId,
          messageId,
        ],
      });
      messageQuery.refetch();

      // Also invalidate messages list and mailboxes
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", wildduckUserAuth?.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", wildduckUserAuth?.userId],
      });
    },
  });

  // ============================================================================
  // Callback Functions
  // ============================================================================

  const getMessage = useCallback(async () => {
    return messageQuery.refetch().then((result) => result.data);
  }, [messageQuery]);

  const getMessageSource = useCallback(async () => {
    return messageSourceQuery.refetch().then((result) => result.data);
  }, [messageSourceQuery]);

  const getAttachment = useCallback(
    async (attachmentId: string) => {
      if (!wildduckUserAuth || !mailboxId || !messageId) {
        throw new Error(
          "wildduckUserAuth, mailboxId, and messageId are required",
        );
      }

      try {
        return await api.getMessageAttachment(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
          attachmentId,
        );
      } catch (err) {
        console.error("Failed to get attachment:", err);
        throw err;
      }
    },
    [api, wildduckUserAuth, mailboxId, messageId],
  );

  const updateMessage = useCallback(
    async (params: WildduckUpdateMessageRequest) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const deleteMessage = useCallback(async () => {
    return deleteMutation.mutateAsync();
  }, [deleteMutation]);

  const forwardMessage = useCallback(
    async (params: WildduckForwardMessageRequest) => {
      return forwardMutation.mutateAsync(params);
    },
    [forwardMutation],
  );

  const submitDraft = useCallback(async () => {
    return submitMutation.mutateAsync();
  }, [submitMutation]);

  const refresh = useCallback(async () => {
    await messageQuery.refetch();
  }, [messageQuery]);

  const clearError = useCallback(() => {
    updateMutation.reset();
    deleteMutation.reset();
    forwardMutation.reset();
    submitMutation.reset();
  }, [updateMutation, deleteMutation, forwardMutation, submitMutation]);

  // ============================================================================
  // Return
  // ============================================================================

  return useMemo(
    () => ({
      // Query data
      message: messageQuery.data,
      messageSource: messageSourceQuery.data,
      isLoading: messageQuery.isLoading,
      isError: messageQuery.isError,
      error: messageQuery.error,

      // Query functions
      getMessage,
      getMessageSource,
      getAttachment,

      // Mutations
      updateMessage,
      deleteMessage,
      forwardMessage,
      submitDraft,

      // Mutation states
      isUpdating: updateMutation.isPending,
      isDeleting: deleteMutation.isPending,
      isForwarding: forwardMutation.isPending,
      isSubmitting: submitMutation.isPending,
      updateError: updateMutation.error,
      deleteError: deleteMutation.error,
      forwardError: forwardMutation.error,
      submitError: submitMutation.error,

      // Refresh
      refresh,

      // Utility
      clearError,
    }),
    [
      messageQuery.data,
      messageQuery.isLoading,
      messageQuery.isError,
      messageQuery.error,
      messageSourceQuery.data,
      getMessage,
      getMessageSource,
      getAttachment,
      updateMessage,
      deleteMessage,
      forwardMessage,
      submitDraft,
      updateMutation.isPending,
      updateMutation.error,
      deleteMutation.isPending,
      deleteMutation.error,
      forwardMutation.isPending,
      forwardMutation.error,
      submitMutation.isPending,
      submitMutation.error,
      refresh,
      clearError,
    ],
  );
};
