import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildDuckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type GetMailboxesRequest, type WildDuckConfig } from "@johnqh/types";
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
 * @param config - WildDuck API configuration
 * @param params - Query parameters including userAuth and optional filters
 * @returns React Query result with mailboxes list
 */
export const useWildduckGetMailboxes = (
  networkClient: NetworkClient,
  config: WildDuckConfig,
  params: UseWildduckGetMailboxesParams = {},
) => {
  const { userAuth, options, devMode = false } = params;

  const api = useMemo(
    () => new WildDuckAPI(networkClient, config),
    [networkClient, config],
  );

  return useQuery({
    queryKey: ["wildduck-mailboxes", userAuth?.userId, options],
    queryFn: async () => {
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
    },
    enabled: !!userAuth,
  });
};

export type UseWildduckGetMailboxesReturn = ReturnType<
  typeof useWildduckGetMailboxes
>;
