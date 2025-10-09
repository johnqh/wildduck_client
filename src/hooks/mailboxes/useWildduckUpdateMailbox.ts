import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type Optional, type WildDuckConfig } from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  WildduckSuccessResponse,
  WildduckUpdateMailboxRequest,
  WildduckUserAuth,
} from "../../types/wildduck-types";

interface UseWildduckUpdateMailboxReturn {
  updateMailbox: (
    userAuth: WildduckUserAuth,
    mailboxId: string,
    params: WildduckUpdateMailboxRequest,
  ) => Promise<WildduckSuccessResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for updating mailbox settings
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with updateMailbox function and state
 */
export const useWildduckUpdateMailbox = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckUpdateMailboxReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      mailboxId,
      params,
    }: {
      userAuth: WildduckUserAuth;
      mailboxId: string;
      params: WildduckUpdateMailboxRequest;
    }): Promise<WildduckSuccessResponse> => {
      try {
        return await wildduckClient.updateMailbox(userAuth, mailboxId, params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] updateMailbox failed, returning mock data:",
            err,
          );
          return { success: true };
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both mailbox detail and mailboxes list
      queryClient.invalidateQueries({
        queryKey: [
          "wildduck-mailbox",
          variables.userAuth.userId,
          variables.mailboxId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userAuth.userId],
      });
    },
  });

  const updateMailbox = useCallback(
    async (
      userAuth: WildduckUserAuth,
      mailboxId: string,
      params: WildduckUpdateMailboxRequest,
    ) => {
      return updateMutation.mutateAsync({ userAuth, mailboxId, params });
    },
    [updateMutation],
  );

  return {
    updateMailbox,
    isLoading: updateMutation.isPending,
    error: updateMutation.error,
    clearError: () => updateMutation.reset(),
  };
};
