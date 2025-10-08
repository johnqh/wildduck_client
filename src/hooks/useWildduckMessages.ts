import { Optional } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  WildDuckConfig,
  WildDuckMessage,
  WildDuckMessageResponse,
  WildDuckMessagesResponse,
} from "@johnqh/types";
import { useState } from "react";

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
  messages: WildDuckMessage[];
  totalMessages: number;
  currentPage: number;
  isLoading: boolean;
  error: Optional<string>;

  // Query functions
  getMessages: (
    userId: string,
    mailboxId: string,
    options?: GetMessagesOptions,
  ) => Promise<WildDuckMessage[]>;
  getMessage: (
    userId: string,
    messageId: string,
  ) => Promise<WildDuckMessageResponse>;
  searchMessages: (
    userId: string,
    query: string,
    options?: GetMessagesOptions,
  ) => Promise<WildDuckMessage[]>;
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
    messageId: string,
    params: UpdateMessageParams,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  // Delete mutation
  deleteMessage: (
    userId: string,
    messageId: string,
  ) => Promise<{ success: boolean }>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Move mutation
  moveMessage: (
    userId: string,
    messageId: string,
    targetMailbox: string,
  ) => Promise<{ success: boolean }>;
  isMoving: boolean;
  moveError: Optional<Error>;

  // Legacy compatibility
  clearError: () => void;
}

/**
 * Hook for WildDuck message operations using React Query
 * Mutations automatically invalidate related message queries
 */
const useWildduckMessages = (
  config: WildDuckConfig,
  _devMode: boolean = false,
): UseWildduckMessagesReturn => {
  const queryClient = useQueryClient();

  // Local state for messages and pagination
  const [messages, setMessages] = useState<WildDuckMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastFetchParams, setLastFetchParams] = useState<{
    userId: string;
    mailboxId: string;
    options?: GetMessagesOptions;
  } | null>(null);

  // Helper to build headers
  const buildHeaders = (): Record<string, string> => {
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
  };

  // Get messages function (imperative)
  const getMessages = async (
    userId: string,
    mailboxId: string,
    options: GetMessagesOptions = {},
  ): Promise<WildDuckMessage[]> => {
    try {
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
      const headers = buildHeaders();

      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append("limit", options.limit.toString());
      if (options.page) queryParams.append("page", options.page.toString());
      if (options.order) queryParams.append("order", options.order);

      const query = queryParams.toString();
      const endpoint = `/users/${userId}/mailboxes/${mailboxId}/messages${query ? `?${query}` : ""}`;

      const response = await axios.get(`${apiUrl}${endpoint}`, { headers });
      const messageData = response.data as WildDuckMessagesResponse;
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
  };

  // Get single message function (imperative)
  const getMessage = async (
    userId: string,
    messageId: string,
  ): Promise<WildDuckMessageResponse> => {
    try {
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
      const headers = buildHeaders();

      const response = await axios.get(
        `${apiUrl}/users/${userId}/messages/${messageId}`,
        { headers },
      );

      const messageData = response.data as WildDuckMessageResponse;

      // Update cache
      queryClient.setQueryData(
        ["wildduck-message", userId, messageId],
        messageData,
      );

      return messageData;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get message";
      throw new Error(errorMessage);
    }
  };

  // Search messages function (imperative)
  const searchMessages = async (
    userId: string,
    query: string,
    options: GetMessagesOptions = {},
  ): Promise<WildDuckMessage[]> => {
    try {
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
      const headers = buildHeaders();

      const response = await axios.get(
        `${apiUrl}/users/${userId}/search?q=${encodeURIComponent(query)}&limit=${options.limit || 50}&page=${options.page || 1}`,
        { headers },
      );

      const searchResponse = response.data as {
        results?: WildDuckMessage[];
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
  };

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
      messageId,
      params,
    }: {
      userId: string;
      messageId: string;
      params: UpdateMessageParams;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.put(
          `${apiUrl}/users/${userId}/messages/${messageId}`,
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
        queryKey: ["wildduck-message", variables.userId, variables.messageId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userId],
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
      messageId,
    }: {
      userId: string;
      messageId: string;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.delete(
          `${apiUrl}/users/${userId}/messages/${messageId}`,
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
        queryKey: ["wildduck-message", variables.userId, variables.messageId],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.userId],
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
      messageId,
      targetMailbox,
    }: {
      userId: string;
      messageId: string;
      targetMailbox: string;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.put(
          `${apiUrl}/users/${userId}/messages/${messageId}/move`,
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
        queryKey: ["wildduck-message", variables.userId, variables.messageId],
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
  const refresh = async (): Promise<void> => {
    if (lastFetchParams) {
      await getMessages(
        lastFetchParams.userId,
        lastFetchParams.mailboxId,
        lastFetchParams.options,
      );
    }
  };

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

  return {
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
    sendMessage: async (userId: string, params: SendMessageParams) =>
      sendMutation.mutateAsync({ userId, params }),
    isSending: sendMutation.isPending,
    sendError: sendMutation.error,

    // Update mutation
    updateMessage: async (
      userId: string,
      messageId: string,
      params: UpdateMessageParams,
    ) => updateMutation.mutateAsync({ userId, messageId, params }),
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    // Delete mutation
    deleteMessage: async (userId: string, messageId: string) =>
      deleteMutation.mutateAsync({ userId, messageId }),
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    // Move mutation
    moveMessage: async (
      userId: string,
      messageId: string,
      targetMailbox: string,
    ) => moveMutation.mutateAsync({ userId, messageId, targetMailbox }),
    isMoving: moveMutation.isPending,
    moveError: moveMutation.error,

    // Legacy compatibility
    clearError: () => {
      sendMutation.reset();
      updateMutation.reset();
      deleteMutation.reset();
      moveMutation.reset();
    },
  };
};

export {
  useWildduckMessages,
  type GetMessagesOptions,
  type SendMessageParams,
  type UpdateMessageParams,
  type UseWildduckMessagesReturn,
};
