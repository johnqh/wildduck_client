import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import {
  type GetMailboxesRequest,
  type WildduckConfig,
} from "../../types/wildduck-types";
import type { WildduckUserAuth } from "../../types/wildduck-types";

export interface UseWildduckGetMailboxesParams {
  userAuth?: WildduckUserAuth;
  options?: Omit<GetMailboxesRequest, "sess" | "ip">;
  devMode?: boolean;
}

/**
 * React hook for fetching user's mailboxes
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including userAuth and optional filters
 * @returns React Query result with mailboxes list
 */
export const useWildduckGetMailboxes = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetMailboxesParams = {},
) => {
  const { userAuth, options, devMode = false } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!userAuth) throw new Error("userAuth is required");

    try {
      return await api.getMailboxes(userAuth, options);
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] getMailboxes failed, returning mock data:",
          err,
        );
        return {
          success: true,
          results: [],
          error: null,
        };
      }
      throw err;
    }
  }, [userAuth, api, options, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-mailboxes", userAuth?.userId, options],
    queryFn,
    enabled: !!userAuth,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

export type UseWildduckGetMailboxesReturn = ReturnType<
  typeof useWildduckGetMailboxes
>;
