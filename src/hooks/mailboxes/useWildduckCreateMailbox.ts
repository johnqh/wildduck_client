import { useCallback, useMemo } from "react";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type CreateMailboxRequest,
  type Optional,
  type WildDuckConfig,
  type WildDuckMailboxResponse,
} from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WildDuckMockData } from "../mocks";
import type { UserAuth } from "../../types/wildduck-types";

interface UseWildduckCreateMailboxReturn {
  createMailbox: (
    userAuth: UserAuth,
    params: CreateMailboxRequest,
  ) => Promise<WildDuckMailboxResponse>;
  isLoading: boolean;
  error: Optional<Error>;
  clearError: () => void;
}

/**
 * React hook for creating a new mailbox
 * Uses TanStack Query mutation for automatic cache invalidation
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with createMailbox function and state
 */
export const useWildduckCreateMailbox = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckCreateMailboxReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-mailbox",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userAuth,
      params,
    }: {
      userAuth: UserAuth;
      params: CreateMailboxRequest;
    }): Promise<WildDuckMailboxResponse> => {
      try {
        return await wildduckClient.createMailbox(userAuth, params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] createMailbox failed, returning mock data:",
            err,
          );
          const mockResponse = WildDuckMockData.getCreateMailbox();
          return mockResponse as unknown as WildDuckMailboxResponse;
        }
        throw err;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate mailboxes list to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-mailboxes", variables.userAuth.userId],
      });
    },
  });

  const createMailbox = useCallback(
    async (userAuth: UserAuth, params: CreateMailboxRequest) => {
      return createMutation.mutateAsync({ userAuth, params });
    },
    [createMutation],
  );

  return {
    createMailbox,
    isLoading: createMutation.isPending,
    error: createMutation.error,
    clearError: () => createMutation.reset(),
  };
};
