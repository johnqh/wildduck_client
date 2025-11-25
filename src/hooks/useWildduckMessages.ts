import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GetMessagesRequest,
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckMessage,
  WildduckMessageResponse,
  WildduckSubmitMessageRequest,
  WildduckSuccessResponse,
  WildduckUpdateMessageRequest,
  WildduckUpdateMessageResponse,
  WildduckUploadMessageRequest,
  WildduckUserAuth,
} from "@sudobility/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WildduckClient } from "../network/wildduck-client";
import { useWebSocket } from "../websocket/useWebSocket";
import type { ChannelName, ServerResponseData } from "../websocket/types";

type GetMessagesOptions = Omit<GetMessagesRequest, "sess" | "ip">;

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
    content: string;
    contentType?: string;
    cid?: string;
  }>;
  files?: string[];
  headers?: Array<{ key: string; value: string }>;
  inReplyTo?: string;
  references?: string[];
  sess?: string;
  ip?: string;
}

interface UseWildduckMessagesReturn {
  // Query state
  messages: WildduckMessage[];
  totalMessages: number;
  currentPage: number;
  isLoading: boolean;
  error: Optional<string>;

  // Pagination state
  nextCursor: string | false;
  previousCursor: string | false;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

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
  refresh: () => Promise<void>;

  // Pagination functions
  next: () => Promise<WildduckMessage[]>;
  previous: () => Promise<WildduckMessage[]>;
  resetMessages: () => void;

  // Send mutation
  sendMessage: (
    wildduckUserAuth: WildduckUserAuth,
    params: SendMessageParams,
  ) => Promise<{
    success: boolean;
    id: number;
    mailbox: string;
    queueId: string;
  }>;
  isSending: boolean;
  sendError: Optional<Error>;

  // Upload mutation
  uploadMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    params: WildduckUploadMessageRequest,
  ) => Promise<{ success: boolean; id: number; mailbox: string }>;
  isUploading: boolean;
  uploadError: Optional<Error>;

  // Update mutation
  updateMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
    params: WildduckUpdateMessageRequest,
  ) => Promise<WildduckUpdateMessageResponse>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  // Delete mutation
  deleteMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
  ) => Promise<WildduckSuccessResponse>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Move mutation
  moveMessage: (
    wildduckUserAuth: WildduckUserAuth,
    mailboxId: string,
    messageId: string,
    targetMailbox: string,
  ) => Promise<WildduckSuccessResponse>;
  isMoving: boolean;
  moveError: Optional<Error>;

  // Legacy compatibility
  clearError: () => void;
}

/**
 * Hook options for Wildduck messages
 */
interface UseWildduckMessagesOptions {
  /** Enable WebSocket real-time updates (default: false) */
  enableWebSocket?: boolean;
}

/**
 * Hook for Wildduck message operations using React Query
 * Mutations automatically invalidate related message queries
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param _devMode - Development mode flag (unused)
 * @param pageSize - Default page size for message queries (optional)
 * @param options - Hook options (including WebSocket enablement)
 */
const useWildduckMessages = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  _devMode: boolean = false,
  pageSize?: number,
  options?: UseWildduckMessagesOptions,
): UseWildduckMessagesReturn => {
  const queryClient = useQueryClient();
  const wsSubscribedRef = useRef(false);
  const currentMailboxIdRef = useRef<string | null>(null);

  // Get WebSocket context (if provider is available)
  let wsContext;
  try {
    wsContext = useWebSocket();
  } catch {
    // WebSocketProvider not available, that's fine
    wsContext = null;
  }

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Local state for messages and pagination
  const [messages, setMessages] = useState<WildduckMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | false>(false);
  const [previousCursor, setPreviousCursor] = useState<string | false>(false);
  const [lastFetchParams, setLastFetchParams] = useState<{
    wildduckUserAuth: WildduckUserAuth;
    mailboxId: string;
    options?: GetMessagesOptions;
  } | null>(null);

  // Determine if WebSocket should be used
  const shouldUseWebSocket =
    options?.enableWebSocket &&
    wsContext?.isEnabled &&
    lastFetchParams !== null;

  // WebSocket subscription and real-time updates
  useEffect(() => {
    if (!shouldUseWebSocket || !lastFetchParams || !wsContext) {
      return;
    }

    const { wildduckUserAuth, mailboxId } = lastFetchParams;
    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) {
      return;
    }

    // Handle data messages (initial subscription response)
    const handleData = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "messages" || !data.success) {
        return;
      }

      const messagesData = data as any;
      const messageList = (messagesData.messages as WildduckMessage[]) || [];

      // Update local state with initial messages
      setMessages(messageList);
      setTotalMessages(messagesData.total || 0);
      setNextCursor(messagesData.nextCursor || false);
      setPreviousCursor(messagesData.previousCursor || false);

      // Update cache
      queryClient.setQueryData(
        ["wildduck-messages", wildduckUserAuth.userId, mailboxId],
        messageList,
      );
    };

    // Handle update messages (real-time updates)
    const handleUpdate = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "messages" || !data.success) {
        return;
      }

      const updateData = data as any;
      const event = updateData.event as "created" | "updated" | "deleted";
      const message = updateData.message as WildduckMessage;

      if (!event || !message) {
        // If no specific event, invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: ["wildduck-messages", wildduckUserAuth.userId, mailboxId],
        });
        return;
      }

      // Get current messages from local state
      setMessages((currentMessages) => {
        let updatedMessages: WildduckMessage[];

        switch (event) {
          case "created":
            // Prepend new message to list (newest first)
            // Avoid duplicates
            if (!currentMessages.find((m) => m.id === message.id)) {
              updatedMessages = [message, ...currentMessages];
              setTotalMessages((prev) => prev + 1);
            } else {
              updatedMessages = currentMessages;
            }
            break;

          case "updated":
            // Update existing message (flags, seen status, etc.)
            updatedMessages = currentMessages.map((m) =>
              m.id === message.id ? { ...m, ...message } : m,
            );
            break;

          case "deleted":
            // Remove message from list
            updatedMessages = currentMessages.filter(
              (m) => m.id !== message.id,
            );
            setTotalMessages((prev) => Math.max(0, prev - 1));
            break;

          default:
            updatedMessages = currentMessages;
        }

        // Update cache
        queryClient.setQueryData(
          ["wildduck-messages", wildduckUserAuth.userId, mailboxId],
          updatedMessages,
        );

        return updatedMessages;
      });
    };

    // Register event handlers
    client.on("data", handleData);
    client.on("update", handleUpdate);

    // Subscribe to messages channel for this mailbox
    // Check if we need to resubscribe (mailbox changed)
    const needsSubscription =
      !wsSubscribedRef.current || currentMailboxIdRef.current !== mailboxId;

    if (needsSubscription) {
      // Unsubscribe from previous mailbox if needed
      if (
        wsSubscribedRef.current &&
        currentMailboxIdRef.current !== mailboxId
      ) {
        client.unsubscribe("messages").catch((error) => {
          console.error("Failed to unsubscribe from messages:", error);
        });
      }

      wsSubscribedRef.current = true;
      currentMailboxIdRef.current = mailboxId;

      // Connect first, then subscribe
      wsContext
        .connect(wildduckUserAuth)
        .then(() => {
          return client.subscribe("messages", {
            userId: wildduckUserAuth.userId,
            token: wildduckUserAuth.accessToken,
            mailboxId,
          });
        })
        .catch((error) => {
          console.error(
            "Failed to connect/subscribe to messages channel:",
            error,
          );
          wsSubscribedRef.current = false;
        });
    }

    // Cleanup
    return () => {
      client.off("data", handleData);
      client.off("update", handleUpdate);

      if (wsSubscribedRef.current) {
        client.unsubscribe("messages").catch((error) => {
          console.error("Failed to unsubscribe from messages:", error);
        });
        wsSubscribedRef.current = false;
        currentMailboxIdRef.current = null;
      }

      wsContext.disconnect(wildduckUserAuth.userId);
    };
  }, [shouldUseWebSocket, lastFetchParams, wsContext, queryClient]);

  // Get messages function (imperative)
  const getMessages = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      requestOptions: GetMessagesOptions = {},
    ): Promise<WildduckMessage[]> => {
      const mergedOptions = {
        ...(pageSize !== undefined && { limit: pageSize }),
        ...requestOptions,
      };
      const isWebSocketConnected =
        options?.enableWebSocket &&
        wsContext?.isEnabled &&
        !!wsContext?.isConnected(wildduckUserAuth.userId);

      setLastFetchParams({
        wildduckUserAuth,
        mailboxId,
        options: requestOptions,
      });

      if (isWebSocketConnected) {
        return (
          queryClient.getQueryData<WildduckMessage[]>([
            "wildduck-messages",
            wildduckUserAuth.userId,
            mailboxId,
          ]) || messages
        );
      }

      try {
        const response = await api.getMessages(
          wildduckUserAuth,
          mailboxId,
          mergedOptions,
        );
        const messageList = response.results ?? [];

        setMessages(messageList);
        setTotalMessages(response.total ?? 0);
        setCurrentPage(response.page ?? 1);
        setNextCursor(response.nextCursor ?? false);
        setPreviousCursor(response.previousCursor ?? false);

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
    [api, messages, pageSize, queryClient, wsContext, options],
  );

  // Get single message function (imperative)
  const getMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      messageId: string,
    ): Promise<WildduckMessageResponse> => {
      try {
        const isWebSocketConnected =
          options?.enableWebSocket &&
          wsContext?.isEnabled &&
          !!wsContext?.isConnected(wildduckUserAuth.userId);

        if (isWebSocketConnected) {
          const cachedMessages = queryClient.getQueryData<WildduckMessage[]>([
            "wildduck-messages",
            wildduckUserAuth.userId,
            mailboxId,
          ]);

          const cachedMessage =
            queryClient.getQueryData<WildduckMessageResponse>([
              "wildduck-message",
              wildduckUserAuth.userId,
              mailboxId,
              messageId,
            ]) ||
            (cachedMessages?.find((m) => String(m.id) === messageId) as
              | WildduckMessageResponse
              | undefined);

          if (cachedMessage) {
            return cachedMessage;
          }
        }

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
    [api, options, queryClient, wsContext],
  );

  // Upload message mutation
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
    }): Promise<{
      success: boolean;
      id: number;
      mailbox: string;
      size?: number;
    }> => {
      try {
        const response = await api.uploadMessage(
          wildduckUserAuth,
          mailboxId,
          params,
        );

        const uploadResult: {
          success: boolean;
          id: number;
          mailbox: string;
          size?: number;
        } = {
          success: response.success,
          id: response.message.id,
          mailbox: response.message.mailbox,
        };

        if (typeof response.message.size === "number") {
          uploadResult.size = response.message.size;
        }

        return uploadResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to upload message";
        console.error(errorMessage);
        return { success: false, id: 0, mailbox: "" };
      }
    },
    onSuccess: async (_, variables) => {
      // Invalidate messages queries
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.wildduckUserAuth.userId],
      });
      // Auto-refresh messages list
      await refresh();
    },
  });

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
    }): Promise<{
      success: boolean;
      id: number;
      mailbox: string;
      queueId: string;
    }> => {
      try {
        const normalizedAttachments = params.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType ?? "application/octet-stream",
          ...(attachment.cid && { cid: attachment.cid }),
        }));

        const submitRequest = {
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject,
          text: params.text,
          html: params.html,
          attachments: normalizedAttachments,
          files: params.files,
          headers: params.headers,
          sess: params.sess,
          ip: params.ip,
          from: params.from ? { address: params.from } : undefined,
        } as WildduckSubmitMessageRequest;

        const response = await api.submitMessage(
          wildduckUserAuth,
          submitRequest,
        );

        return {
          success: response.success,
          id: response.message.id,
          mailbox: response.message.mailbox,
          queueId: response.message.queueId,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        console.error(errorMessage);
        return { success: false, id: 0, mailbox: "", queueId: "" };
      }
    },
    onSuccess: async (_, variables) => {
      // Invalidate messages queries
      queryClient.invalidateQueries({
        queryKey: ["wildduck-messages", variables.wildduckUserAuth.userId],
      });
      // Auto-refresh messages list
      await refresh();
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
    }): Promise<WildduckUpdateMessageResponse> => {
      try {
        const response = await api.updateMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
          params,
        );

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update message";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: async (_, variables) => {
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
      // Auto-refresh messages list
      if (lastFetchParams) {
        await getMessages(
          lastFetchParams.wildduckUserAuth,
          lastFetchParams.mailboxId,
          lastFetchParams.options,
        );
      }
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
    }): Promise<WildduckSuccessResponse> => {
      try {
        const response = await api.deleteMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
        );

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete message";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: async (_, variables) => {
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
      // Optimized: Remove deleted message from local state instead of refetching
      const updatedMessages = messages.filter(
        (msg) => msg.id.toString() !== variables.messageId,
      );
      setMessages(updatedMessages);
      setTotalMessages((prev) => Math.max(0, prev - 1));

      // Update cache
      if (lastFetchParams) {
        queryClient.setQueryData(
          [
            "wildduck-messages",
            lastFetchParams.wildduckUserAuth.userId,
            lastFetchParams.mailboxId,
          ],
          updatedMessages,
        );
      }
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
    }): Promise<WildduckSuccessResponse> => {
      try {
        const response = await api.updateMessage(
          wildduckUserAuth,
          mailboxId,
          Number(messageId),
          { moveTo: targetMailbox },
        );

        return { success: response.success };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to move message";
        console.error(errorMessage);
        return { success: false };
      }
    },
    onSuccess: async (_, variables) => {
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
      // Optimized: Remove moved message from local state instead of refetching
      const updatedMessages = messages.filter(
        (msg) => msg.id.toString() !== variables.messageId,
      );
      setMessages(updatedMessages);
      setTotalMessages((prev) => Math.max(0, prev - 1));

      // Update cache for current mailbox
      if (lastFetchParams) {
        queryClient.setQueryData(
          [
            "wildduck-messages",
            lastFetchParams.wildduckUserAuth.userId,
            lastFetchParams.mailboxId,
          ],
          updatedMessages,
        );
      }
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

  // Next page function - appends new messages to the end
  const next = useCallback(async (): Promise<WildduckMessage[]> => {
    if (!lastFetchParams) {
      console.error("No previous fetch params available");
      return [];
    }
    if (!nextCursor) {
      console.error("No next page available");
      return messages;
    }

    try {
      // Use WebSocket fetch if enabled, otherwise use REST API
      if (shouldUseWebSocket && wsContext) {
        const client = wsContext.getClient(lastFetchParams.wildduckUserAuth);
        if (client) {
          const response = await client.fetch("messages", {
            mailboxId: lastFetchParams.mailboxId,
            cursor: nextCursor as string,
          });

          if (response.success) {
            const fetchData = response as any;
            const newMessages = (fetchData.messages as WildduckMessage[]) || [];

            // Append new messages to existing list
            const updatedMessages = [...messages, ...newMessages];
            setMessages(updatedMessages);
            setTotalMessages(fetchData.total ?? 0);
            setNextCursor(fetchData.nextCursor ?? false);
            setPreviousCursor(fetchData.previousCursor ?? false);

            // Update cache
            queryClient.setQueryData(
              [
                "wildduck-messages",
                lastFetchParams.wildduckUserAuth.userId,
                lastFetchParams.mailboxId,
              ],
              updatedMessages,
            );

            return updatedMessages;
          }
        }
      }

      // Fallback to REST API
      const mergedOptions = {
        ...(pageSize !== undefined && { limit: pageSize }),
        ...lastFetchParams.options,
        next: nextCursor as string,
      };

      const response = await api.getMessages(
        lastFetchParams.wildduckUserAuth,
        lastFetchParams.mailboxId,
        mergedOptions,
      );

      const newMessages = response.results ?? [];

      // Append new messages to existing list
      const updatedMessages = [...messages, ...newMessages];
      setMessages(updatedMessages);
      setTotalMessages(response.total ?? 0);
      setCurrentPage(response.page ?? 1);
      setNextCursor(response.nextCursor ?? false);
      setPreviousCursor(response.previousCursor ?? false);

      // Update cache
      queryClient.setQueryData(
        [
          "wildduck-messages",
          lastFetchParams.wildduckUserAuth.userId,
          lastFetchParams.mailboxId,
        ],
        updatedMessages,
      );

      return updatedMessages;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get next messages";
      console.error(errorMessage);
      return messages;
    }
  }, [
    lastFetchParams,
    nextCursor,
    messages,
    pageSize,
    api,
    queryClient,
    shouldUseWebSocket,
    wsContext,
  ]);

  // Previous page function - prepends new messages to the beginning
  const previous = useCallback(async (): Promise<WildduckMessage[]> => {
    if (!lastFetchParams) {
      console.error("No previous fetch params available");
      return [];
    }
    if (!previousCursor) {
      console.error("No previous page available");
      return messages;
    }

    try {
      const mergedOptions = {
        ...(pageSize !== undefined && { limit: pageSize }),
        ...lastFetchParams.options,
        previous: previousCursor as string,
      };

      const response = await api.getMessages(
        lastFetchParams.wildduckUserAuth,
        lastFetchParams.mailboxId,
        mergedOptions,
      );

      const newMessages = response.results ?? [];

      // Prepend new messages to existing list
      const updatedMessages = [...newMessages, ...messages];
      setMessages(updatedMessages);
      setTotalMessages(response.total ?? 0);
      setCurrentPage(response.page ?? 1);
      setNextCursor(response.nextCursor ?? false);
      setPreviousCursor(response.previousCursor ?? false);

      // Update cache
      queryClient.setQueryData(
        [
          "wildduck-messages",
          lastFetchParams.wildduckUserAuth.userId,
          lastFetchParams.mailboxId,
        ],
        updatedMessages,
      );

      return updatedMessages;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get previous messages";
      console.error(errorMessage);
      return messages;
    }
  }, [lastFetchParams, previousCursor, messages, pageSize, api, queryClient]);

  // Reset messages function - clears the accumulated list
  const resetMessages = useCallback(() => {
    setMessages([]);
    setTotalMessages(0);
    setCurrentPage(1);
    setNextCursor(false);
    setPreviousCursor(false);
  }, []);

  // Aggregate loading and error states for legacy compatibility
  const isLoading =
    sendMutation.isPending ||
    uploadMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    moveMutation.isPending;
  const error: Optional<string> =
    sendMutation.error?.message ||
    uploadMutation.error?.message ||
    updateMutation.error?.message ||
    deleteMutation.error?.message ||
    moveMutation.error?.message ||
    null;

  const sendMessage = useCallback(
    async (wildduckUserAuth: WildduckUserAuth, params: SendMessageParams) =>
      sendMutation.mutateAsync({ wildduckUserAuth, params }),
    [sendMutation],
  );

  const uploadMessage = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      mailboxId: string,
      params: WildduckUploadMessageRequest,
    ) => uploadMutation.mutateAsync({ wildduckUserAuth, mailboxId, params }),
    [uploadMutation],
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
    uploadMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
    moveMutation.reset();
  }, [
    sendMutation,
    uploadMutation,
    updateMutation,
    deleteMutation,
    moveMutation,
  ]);

  return useMemo(
    () => ({
      // Query state
      messages,
      totalMessages,
      currentPage,
      isLoading,
      error,

      // Pagination state
      nextCursor,
      previousCursor,
      hasNextPage: !!nextCursor,
      hasPreviousPage: !!previousCursor,

      // Query functions
      getMessages,
      getMessage,
      refresh,

      // Pagination functions
      next,
      previous,
      resetMessages,

      // Send mutation
      sendMessage,
      isSending: sendMutation.isPending,
      sendError: sendMutation.error,

      // Upload mutation
      uploadMessage,
      isUploading: uploadMutation.isPending,
      uploadError: uploadMutation.error,

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
      nextCursor,
      previousCursor,
      getMessages,
      getMessage,
      refresh,
      next,
      previous,
      resetMessages,
      sendMessage,
      sendMutation.isPending,
      sendMutation.error,
      uploadMessage,
      uploadMutation.isPending,
      uploadMutation.error,
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
