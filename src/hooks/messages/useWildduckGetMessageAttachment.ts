import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "../../types/wildduck-types";
import type { WildduckUserAuth } from "../../types/wildduck-types";

export interface UseWildduckGetMessageAttachmentParams {
  userAuth?: WildduckUserAuth;
  mailboxId?: string;
  messageId?: number;
  attachmentId?: string;
  devMode?: boolean;
}

/**
 * React hook for downloading message attachment
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including userAuth, mailboxId, messageId, and attachmentId
 * @returns React Query result with attachment blob
 */
export const useWildduckGetMessageAttachment = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMessageAttachmentParams = {},
) => {
  const {
    userAuth,
    mailboxId,
    messageId,
    attachmentId,
    devMode = false,
  } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: [
      "wildduck-message-attachment",
      userAuth?.userId,
      mailboxId,
      messageId,
      attachmentId,
    ],
    queryFn: async () => {
      if (!userAuth) throw new Error("userAuth is required");
      if (!mailboxId) throw new Error("mailboxId is required");
      if (!messageId) throw new Error("messageId is required");
      if (!attachmentId) throw new Error("attachmentId is required");

      try {
        return await api.getMessageAttachment(
          userAuth,
          mailboxId,
          messageId,
          attachmentId,
        );
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] getMessageAttachment failed, returning mock data:",
            err,
          );
          return new Blob(["Mock attachment content"], {
            type: "text/plain",
          });
        }
        throw err;
      }
    },
    enabled:
      !!userAuth && !!mailboxId && messageId !== undefined && !!attachmentId,
  });
};

export type UseWildduckGetMessageAttachmentReturn = ReturnType<
  typeof useWildduckGetMessageAttachment
>;
