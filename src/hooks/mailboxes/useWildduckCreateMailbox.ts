import type { Optional } from "@johnqh/types";
import { useCallback, useMemo } from "react";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type CreateMailboxRequest,
  type WildduckConfig,
  type WildduckMailboxResponse,
} from "@johnqh/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WildduckMockData } from "../mocks";
import type { WildduckUserAuth } from "@johnqh/types";

interface UseWildduckCreateMailboxReturn {
  createMailbox: (
    userAuth: WildduckUserAuth,
    params: CreateMailboxRequest,
  ) => Promise<WildduckMailboxResponse>;
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
 * @param config - Wildduck API configuration
 * @param devMode - Whether to use mock data on errors
 * @returns Object with createMailbox function and state
 */
export const useWildduckCreateMailbox = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckCreateMailboxReturn => {
  const queryClient = useQueryClient();

  const wildduckClient = useMemo(
    () => new WildduckAPI(networkClient, config),
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
      userAuth: WildduckUserAuth;
      params: CreateMailboxRequest;
    }): Promise<WildduckMailboxResponse> => {
      try {
        return await wildduckClient.createMailbox(userAuth, params);
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] createMailbox failed, returning mock data:",
            err,
          );
          const mockResponse = WildduckMockData.getCreateMailbox();
          return mockResponse as unknown as WildduckMailboxResponse;
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
    async (userAuth: WildduckUserAuth, params: CreateMailboxRequest) => {
      return createMutation.mutateAsync({ userAuth, params });
    },
    [createMutation],
  );

  const clearError = useCallback(
    () => createMutation.reset(),
    [createMutation],
  );

  return useMemo(
    () => ({
      createMailbox,
      isLoading: createMutation.isPending,
      error: createMutation.error,
      clearError,
    }),
    [createMailbox, createMutation.isPending, createMutation.error, clearError],
  );
};
