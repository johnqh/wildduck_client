import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckClient } from "../../network/wildduck-client";
import { type NetworkClient } from "@sudobility/types";
import { type WildduckConfig } from "@sudobility/types";
import type { WildduckUserAuth } from "@sudobility/types";

export interface UseWildduckGetMessageAttachmentParams {
  wildduckUserAuth?: WildduckUserAuth;
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
 * @param params - Query parameters including wildduckUserAuth, mailboxId, messageId, and attachmentId
 * @returns React Query result with attachment blob
 */
export const useWildduckGetMessageAttachment = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMessageAttachmentParams = {},
) => {
  const {
    wildduckUserAuth,
    mailboxId,
    messageId,
    attachmentId,
    devMode = false,
  } = params;

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: [
      "wildduck-message-attachment",
      wildduckUserAuth?.userId,
      mailboxId,
      messageId,
      attachmentId,
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
      if (!attachmentId) {
        console.error("attachmentId is required");
        return undefined;
      }

      try {
        return await api.getMessageAttachment(
          wildduckUserAuth,
          mailboxId,
          messageId,
          attachmentId,
        );
      } catch (err) {
        if (devMode) {
          return new Blob(["Mock attachment content"], {
            type: "text/plain",
          });
        }
        console.error("Failed to get message attachment:", err);
        return undefined;
      }
    },
    enabled:
      !!wildduckUserAuth &&
      !!mailboxId &&
      messageId !== undefined &&
      !!attachmentId,
  });
};

export type UseWildduckGetMessageAttachmentReturn = ReturnType<
  typeof useWildduckGetMessageAttachment
>;
