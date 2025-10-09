import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useApiCall } from "@johnqh/di";
import type { UserAuth } from "../../types/wildduck-types";

interface UseGetMessageAttachmentReturn {
  getMessageAttachment: (
    userAuth: UserAuth,
    mailboxId: string,
    messageId: number,
    attachmentId: string,
  ) => Promise<Optional<Blob>>;
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * React hook for downloading message attachment
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with getMessageAttachment function and state
 */
export const useGetMessageAttachment = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseGetMessageAttachmentReturn => {
  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const { isLoading, error, clearError, execute } = useApiCall({
    context: "GetMessageAttachment",
  });

  const getMessageAttachment = useCallback(
    execute(
      async (
        userAuth: UserAuth,
        mailboxId: string,
        messageId: number,
        attachmentId: string,
      ) => {
        try {
          return await wildduckClient.getMessageAttachment(
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
            // Create a mock blob for development
            return new Blob(["Mock attachment content"], {
              type: "text/plain",
            });
          }
          throw err;
        }
      },
    ),
    [execute, wildduckClient, devMode],
  );

  return { getMessageAttachment, isLoading, error, clearError };
};
