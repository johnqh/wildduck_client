import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckMessage,
  WildduckMessageResponse,
  WildduckUpdateMessageRequest,
  WildduckUserAuth,
} from "@sudobility/types";
import { useCallback, useMemo, useState } from "react";
import { WildduckClient } from "../network/wildduck-client";

interface GetMessagesOptions {
  limit?: number;
  page?: number;
  order?: "asc" | "desc";
  search?: string;
  thread?: string;
}

interface SendMessageParams {
  from?: string;
  to: Array<{ name?: string; address: string }>;
  cc?: Array<{ name?: string; address: string }>;
  bcc?: Array<{ name?: string; address: string }>;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  inReplyTo?: string;
  references?: string[];
}

interface UseWildduckMessagesReturn {
  // Query state
  messages: WildduckMessage[];
  totalMessages: number;
  currentPage: number;
  isLoading: boolean;
  error: Optional<string>;

  // Query functions
  getMessages: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    options?: GetMessagesOptions,
  ) => Promise<WildduckMessage[]>;
  getMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
  ) => Promise<WildduckMessageResponse>;
  searchMessages: (
    wildduckUserAuth: WildduckUserAuth,
    query: string,
    options?: GetMessagesOptions,
  ) => Promise<WildduckMessage[]>;
  refresh: () => Promise<void>;

  // Send mutation
  sendMessage: (
    wildduckUserAuth: WildduckUserAuth,
    params: SendMessageParams,
  ) => Promise<{ success: boolean; id: string }>;
  isSending: boolean;
  sendError: Optional<Error>;

  // Update mutation
  updateMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
    params: WildduckUpdateMessageRequest,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  // Delete mutation
  deleteMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
  ) => Promise<{ success: boolean }>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Move mutation
  moveMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
    targetMailbox: string,
  ) => Promise<{ success: boolean }>;
  isMoving: boolean;
  moveError: Optional<Error>;

  // Legacy compatibility
  clearError: () => void;
}

/**
 * Hook for Wildduck message operations using React Query
 * Mutations automatically invalidate related message queries
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param _devMode - Development mode flag (unused)
 */
const useWildduckMessages = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  _devMode: boolean = false,
): UseWildduckMessagesReturn => {
  const queryClient = useQueryClient();

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Local state for messages and pagination
  const [messages, setMessages] = useState<WildduckMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastFetchParams, setLastFetchParams] = useState<{
    wildduckUserAuth: WildduckUserAuth;
    mailboxId: string;
    options?: GetMessagesOptions;
  } | null>(null);

  // Get messages function (imperative)
  const getMessages = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      options: GetMessagesOptions = {},
    ): Promise<WildduckMessage[]> => {
      try {
        const getMessagesOptions: any = {};
        if (options.limit !== undefined)
          getMessagesOptions.limit = options.limit;
        if (options.page !== undefined) getMessagesOptions.page = options.page;
        if (options.order !== undefined)
          getMessagesOptions.order = options.order;

        const response = await api.getMessages(
          wildduckUserAuth,
          mailboxId,
          getMessagesOptions,
        );
        const messageList = response.results || [];

        setMessages(messageList);
        setTotalMessages(response.total || 0);
        setCurrentPage(response.page || 1);
        setLastFetchParams({ wildduckUserAuth, mailboxId, options });

        // Update cache
        queryClient.setQueryData(
          ["wildduck-messages", wildduckUserAuth.userId, mailboxId],
          messageList,
        );

        return messageList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get messages";
        console.error(errorMessage);
        setMessages([]);
        setTotalMessages(0);
        return [];
      }
    },
    [api, queryClient],
  );

  // Get single message function (imperative)
  const getMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: string,
    ): Promise<WildduckMessageResponse> => {
      try {
        const messageData = await api.getMessage(
          wildduckUserAuth,
          mailboxId,
          messageId,
        );

        // Update cache
        queryClient.setQueryData(
          ["wildduck-message", wildduckUserAuth.userId, mailboxId, messageId],
          messageData,
        );

        return messageData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get message";
        console.error(errorMessage);
        return undefined as any;
      }
    },
    [api, queryClient],
  );

  // Search messages function (imperative)
  const searchMessages = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      query: string,
      options: GetMessagesOptions = {},
    ): Promise<WildduckMessage[]> => {
      try {
        const response = await api.searchMessages(wildduckUserAuth, query, {
          limit: options.limit || 50,
          page: options.page || 1,
        });

        const messageList = (response.results as WildduckMessage[]) || [];

        setMessages(messageList);
        setTotalMessages(response.total || 0);
        setCurrentPage(response.page || 1);

        return messageList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search messages";
        console.error(errorMessage);
        setMessages([]);
        setTotalMessages(0);
        return [];
      }
    },
    [api],
  );

  // Send message mutation
  const sendMutation = useMutation({
    mutationKey: [
      "wildduck-send-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      params: SendMessageParams;
    }): Promise<{ success: boolean; id: string }> => {
      try {
        // Convert SendMessageParams to WildduckSubmitMessageRequest
        const submitRequest: any = {
          from: params.from ? { address: params.from } : undefined,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject,
          text: params.text,
          html: params.html,
          attachments: params.attachments,
        };

        const response = await api.submitMessage(
          wildduckUserAuth,
          submitRequest,
        );

        return { success: response.success, id: response.message.id };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        console.error(errorMessage);
        return { success: false, id: "" };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate messages queries to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.wildduckUserAuth.userId],
      });
    },
  });

  // Update message mutation
  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      mailboxId,
      messageId,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      mailboxId: string;
      messageId: string;
      params: WildduckUpdateMessageRequest;
    }): Promise<{ success: boolean }> => {
      try {
        const response = await api.updateMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
          params,
        );

        return { success: response.success };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update message";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both message detail and messages list
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          variables.wildduckUserAuth.userId,
          variables.mailboxId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-messages",
          variables.wildduckUserAuth.userId,
          variables.mailboxId,
        ],
      });
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      mailboxId,
      messageId,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      mailboxId: string;
      messageId: string;
    }): Promise<{ success: boolean }> => {
      try {
        const response = await api.deleteMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
        );

        return { success: response.success };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete message";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both message detail and messages list
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          variables.wildduckUserAuth.userId,
          variables.mailboxId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-messages",
          variables.wildduckUserAuth.userId,
          variables.mailboxId,
        ],
      });
    },
  });

  // Move message mutation
  const moveMutation = useMutation({
    mutationKey: [
      "wildduck-move-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      mailboxId,
      messageId,
      targetMailbox,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      mailboxId: string;
      messageId: string;
      targetMailbox: string;
    }): Promise<{ success: boolean }> => {
      try {
        const response = await api.updateMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
          { mailbox: targetMailbox },
        );

        return { success: response.success };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to move message";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both message detail and messages list for all mailboxes
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          variables.wildduckUserAuth.userId,
          variables.mailboxId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.wildduckUserAuth.userId],
      });
    },
  });

  // Refresh function (refetch last messages query)
  const refresh = useCallback(async (): Promise<void> => {
    if (lastFetchParams) {
      await getMessages(
        lastFetchParams.wildduckUserAuth,
        lastFetchParams.mailboxId,
        lastFetchParams.options,
      );
    }
  }, [lastFetchParams, getMessages]);

  // Aggregate loading and error states for legacy compatibility
  const isLoading =
    sendMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    moveMutation.isPending;
  const error: Optional<string> =
    sendMutation.error?.message ||
    updateMutation.error?.message ||
    deleteMutation.error?.message ||
    moveMutation.error?.message ||
    null;

  const sendMessage = useCallback(
    async (wildduckUserAuth: WildduckUserAuth, params: SendMessageParams) =>
      sendMutation.mutateAsync({ wildduckUserAuth, params }),
    [sendMutation],
  );

  const updateMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: string,
      params: WildduckUpdateMessageRequest,
    ) =>
      updateMutation.mutateAsync({
        wildduckUserAuth,
        mailboxId,
        messageId,
        params,
      }),
    [updateMutation],
  );

  const deleteMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: string,
    ) => deleteMutation.mutateAsync({ wildduckUserAuth, mailboxId, messageId }),
    [deleteMutation],
  );

  const moveMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: string,
      targetMailbox: string,
    ) =>
      moveMutation.mutateAsync({
        wildduckUserAuth,
        mailboxId,
        messageId,
        targetMailbox,
      }),
    [moveMutation],
  );

  const clearError = useCallback(() => {
    sendMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
    moveMutation.reset();
  }, [sendMutation, updateMutation, deleteMutation, moveMutation]);

  return useMemo(
    () => ({
      // Query state
      messages,
      totalMessages,
      currentPage,
      isLoading,
      error,

      // Query functions
      getMessages,
      getMessage,
      searchMessages,
      refresh,

      // Send mutation
      sendMessage,
      isSending: sendMutation.isPending,
      sendError: sendMutation.error,

      // Update mutation
      updateMessage,
      isUpdating: updateMutation.isPending,
      updateError: updateMutation.error,

      // Delete mutation
      deleteMessage,
      isDeleting: deleteMutation.isPending,
      deleteError: deleteMutation.error,

      // Move mutation
      moveMessage,
      isMoving: moveMutation.isPending,
      moveError: moveMutation.error,

      // Legacy compatibility
      clearError,
    }),
    [
      messages,
      totalMessages,
      currentPage,
      isLoading,
      error,
      getMessages,
      getMessage,
      searchMessages,
      refresh,
      sendMessage,
      sendMutation.isPending,
      sendMutation.error,
      updateMessage,
      updateMutation.isPending,
      updateMutation.error,
      deleteMessage,
      deleteMutation.isPending,
      deleteMutation.error,
      moveMessage,
      moveMutation.isPending,
      moveMutation.error,
      clearError,
    ],
  );
};

export {
  useWildduckMessages,
  type GetMessagesOptions,
  type SendMessageParams,
  type UseWildduckMessagesReturn,
};
