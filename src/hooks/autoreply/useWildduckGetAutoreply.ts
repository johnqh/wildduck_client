import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { WildduckAPI } from "../../network/wildduck-client";
import { type NetworkClient } from "@johnqh/di";
import { type WildduckConfig } from "@johnqh/types";
import type {
  WildduckAutoreplyResponse,
  WildduckUserAuth,
} from "@johnqh/types";

export interface UseWildduckGetAutoreplyParams {
  userAuth?: WildduckUserAuth;
  devMode?: boolean;
}

/**
 * React hook for fetching autoreply/vacation responder settings
 * Requires user authentication
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Query parameters including userAuth
 * @returns React Query result with autoreply settings
 */
export const useWildduckGetAutoreply = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckGetAutoreplyParams = {},
) => {
  const { userAuth, devMode = false } = params;

  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async () => {
    if (!userAuth) throw new Error("userAuth is required");

    try {
      return await api.getAutoreply(userAuth);
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] getAutoreply failed, returning mock data:",
          err,
        );
        return {
          success: true,
          status: false,
          name: "",
          subject: "",
          text: "",
          html: "",
          start: false,
          end: false,
        } as WildduckAutoreplyResponse;
      }
      throw err;
    }
  }, [userAuth, api, devMode]);

  const query = useQuery({
    queryKey: ["wildduck-autoreply", userAuth?.userId],
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

export type UseWildduckGetAutoreplyReturn = ReturnType<
  typeof useWildduckGetAutoreply
>;
