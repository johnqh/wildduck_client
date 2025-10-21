import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Optional } from "@sudobility/types";
import type {
  WildduckConfig,
  WildduckMessage,
  WildduckMessageResponse,
  WildduckMessagesResponse,
} from "@sudobility/types";
import { useCallback, useMemo, useState } from "react";

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

interface UpdateMessageParams {
  seen?: boolean;
  flagged?: boolean;
  deleted?: boolean;
  mailbox?: string;
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
    userId: string,
    mailboxId: string,
    options?: GetMessagesOptions,
  ) => Promise<WildduckMessage[]>;
  getMessage: (
    userId: string,
    mailboxId: string,
    messageId: string,
  ) => Promise<WildduckMessageResponse>;
  searchMessages: (
    userId: string,
    query: string,
    options?: GetMessagesOptions,
  ) => Promise<WildduckMessage[]>;
  refresh: () => Promise<void>;

  // Send mutation
  sendMessage: (
    userId: string,
    params: SendMessageParams,
  ) => Promise<{ success: boolean; id: string }>;
  isSending: boolean;
  sendError: Optional<Error>;

  // Update mutation
  updateMessage: (
    userId: string,
    mailboxId: string,
    messageId: string,
    params: UpdateMessageParams,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  // Delete mutation
  deleteMessage: (
    userId: string,
    mailboxId: string,
    messageId: string,
  ) => Promise<{ success: boolean }>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Move mutation
  moveMessage: (
    userId: string,
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
 */
const useWildduckMessages = (
  config: WildduckConfig,
  _devMode: boolean = false,
): UseWildduckMessagesReturn => {
  const queryClient = useQueryClient();

  // Local state for messages and pagination
  const [messages, setMessages] = useState<WildduckMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastFetchParams, setLastFetchParams] = useState<{
    userId: string;
    mailboxId: string;
    options?: GetMessagesOptions;
  } | null>(null);

  // Helper to build headers - memoized to prevent unnecessary re-renders
  const buildHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = config.apiToken;
    }

    return headers;
  }, [config]);

  // Get messages function (imperative)
  const getMessages = useCallback(
    async (
      userId: string,
      mailboxId: string,
      options: GetMessagesOptions = {},
    ): Promise<WildduckMessage[]> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const queryParams = new URLSearchParams();
        if (options.limit)
          queryParams.append("limit", options.limit.toString());
        if (options.page) queryParams.append("page", options.page.toString());
        if (options.order) queryParams.append("order", options.order);

        const query = queryParams.toString();
        const endpoint = `/users/${userId}/mailboxes/${mailboxId}/messages${query ? `?${query}` : ""}`;

        const response = await axios.get(`${apiUrl}${endpoint}`, { headers });
        const messageData = response.data as WildduckMessagesResponse;
        const messageList = messageData.results || [];

        setMessages(messageList);
        setTotalMessages(messageData.total || 0);
        setCurrentPage(messageData.page || 1);
        setLastFetchParams({ userId, mailboxId, options });

        // Update cache
        queryClient.setQueryData(
          ["wildduck-messages", userId, mailboxId],
          messageList,
        );

        return messageList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get messages";
        setMessages([]);
        setTotalMessages(0);
        throw new Error(errorMessage);
      }
    },
    [config, buildHeaders, queryClient],
  );

  // Get single message function (imperative)
  const getMessage = useCallback(
    async (
      userId: string,
      mailboxId: string,
      messageId: string,
    ): Promise<WildduckMessageResponse> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.get(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}/messages/${messageId}`,
          { headers },
        );

        const messageData = response.data as WildduckMessageResponse;

        // Update cache
        queryClient.setQueryData(
          ["wildduck-message", userId, mailboxId, messageId],
          messageData,
        );

        return messageData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get message";
        throw new Error(errorMessage);
      }
    },
    [config, buildHeaders, queryClient],
  );

  // Search messages function (imperative)
  const searchMessages = useCallback(
    async (
      userId: string,
      query: string,
      options: GetMessagesOptions = {},
    ): Promise<WildduckMessage[]> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.get(
          `${apiUrl}/users/${userId}/search?q=${encodeURIComponent(query)}&limit=${options.limit || 50}&page=${options.page || 1}`,
          { headers },
        );

        const searchResponse = response.data as {
          results?: WildduckMessage[];
          total?: number;
          page?: number;
        };
        const messageList = searchResponse.results || [];

        setMessages(messageList);
        setTotalMessages(searchResponse.total || 0);
        setCurrentPage(searchResponse.page || 1);

        return messageList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search messages";
        setMessages([]);
        setTotalMessages(0);
        throw new Error(errorMessage);
      }
    },
    [config, buildHeaders],
  );

  // Send message mutation
  const sendMutation = useMutation({
    mutationKey: [
      "wildduck-send-message",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userId,
      params,
    }: {
      userId: string;
      params: SendMessageParams;
    }): Promise<{ success: boolean; id: string }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.post(
          `${apiUrl}/users/${userId}/submit`,
          params,
          { headers },
        );

        return response.data as { success: boolean; id: string };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate messages queries to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userId],
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
      userId,
      mailboxId,
      messageId,
      params,
    }: {
      userId: string;
      mailboxId: string;
      messageId: string;
      params: UpdateMessageParams;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.put(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}/messages/${messageId}`,
          params,
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update message";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both message detail and messages list
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          variables.userId,
          variables.mailboxId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userId, variables.mailboxId],
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
      userId,
      mailboxId,
      messageId,
    }: {
      userId: string;
      mailboxId: string;
      messageId: string;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.delete(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}/messages/${messageId}`,
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete message";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both message detail and messages list
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          variables.userId,
          variables.mailboxId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userId, variables.mailboxId],
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
      userId,
      mailboxId,
      messageId,
      targetMailbox,
    }: {
      userId: string;
      mailboxId: string;
      messageId: string;
      targetMailbox: string;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.put(
          `${apiUrl}/users/${userId}/mailboxes/${mailboxId}/messages/${messageId}`,
          { mailbox: targetMailbox },
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to move message";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both message detail and messages list for all mailboxes
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-message",
          variables.userId,
          variables.mailboxId,
          variables.messageId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userId],
      });
    },
  });

  // Refresh function (refetch last messages query)
  const refresh = useCallback(async (): Promise<void> => {
    if (lastFetchParams) {
      await getMessages(
        lastFetchParams.userId,
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
    async (userId: string, params: SendMessageParams) =>
      sendMutation.mutateAsync({ userId, params }),
    [sendMutation],
  );

  const updateMessage = useCallback(
    async (
      userId: string,
      mailboxId: string,
      messageId: string,
      params: UpdateMessageParams,
    ) => updateMutation.mutateAsync({ userId, mailboxId, messageId, params }),
    [updateMutation],
  );

  const deleteMessage = useCallback(
    async (userId: string, mailboxId: string, messageId: string) =>
      deleteMutation.mutateAsync({ userId, mailboxId, messageId }),
    [deleteMutation],
  );

  const moveMessage = useCallback(
    async (
      userId: string,
      mailboxId: string,
      messageId: string,
      targetMailbox: string,
    ) =>
      moveMutation.mutateAsync({ userId, mailboxId, messageId, targetMailbox }),
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
  type UpdateMessageParams,
  type UseWildduckMessagesReturn,
};
