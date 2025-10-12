import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildduckAPI } from "../../network/wildduck-client";
import type { WildduckUserAuth, WildduckUserResponse } from "@sudobility/types";

export interface TwoFASettings {
  enabled2fa: string[]; // List of enabled 2FA methods (e.g., ['totp', 'u2f'])
}

export interface DisableTwoFAParams {
  userAuth: WildduckUserAuth;
}

/**
 * Hook for managing user Two-Factor Authentication (2FA) settings
 * Handles TOTP, U2F, and other 2FA methods
 *
 * Note: Enabling specific 2FA methods requires separate API endpoints
 * that are not yet implemented in this client. This hook currently
 * supports querying 2FA status and disabling all 2FA methods.
 */
export const useWildduckUser2FA = (
  api: WildduckAPI,
  userAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = userAuth?.userId;

  // Query to get 2FA status
  const twoFAQueryFn = useCallback(async (): Promise<
    TwoFASettings | undefined
  > => {
    if (!userAuth) throw new Error("User auth is required");
    const user = (await api.getUser(
      userAuth,
    )) as unknown as WildduckUserResponse;
    return {
      enabled2fa: user.enabled2fa || [],
    };
  }, [userAuth, api]);

  const twoFAQuery = useQuery({
    queryKey: ["user", userId, "2fa"],
    queryFn: twoFAQueryFn,
    enabled: !!userAuth,
  });

  // Mutation to disable all 2FA methods
  const disable2FA = useMutation({
    mutationFn: async ({ userAuth }: DisableTwoFAParams) => {
      return await api.updateUser(userAuth, { disable2fa: true });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "2fa"],
      });
    },
  });

  // Helper to check if any 2FA method is enabled
  const isEnabled = (twoFAQuery.data?.enabled2fa?.length ?? 0) > 0;

  // Helper to check if specific 2FA method is enabled
  const hasMethod = useCallback(
    (method: string): boolean => {
      return twoFAQuery.data?.enabled2fa?.includes(method) ?? false;
    },
    [twoFAQuery.data?.enabled2fa],
  );

  const hasTOTP = hasMethod("totp");
  const hasU2F = hasMethod("u2f");
  const hasWebAuthn = hasMethod("webauthn");

  return useMemo(
    () => ({
      // Query
      twoFA: twoFAQuery.data,
      enabled2fa: twoFAQuery.data?.enabled2fa || [],
      isEnabled,
      isLoading: twoFAQuery.isLoading,
      isError: twoFAQuery.isError,
      error: twoFAQuery.error,

      // Helpers
      hasMethod,
      hasTOTP,
      hasU2F,
      hasWebAuthn,

      // Mutations
      disable2FA: disable2FA.mutate,
      disable2FAAsync: disable2FA.mutateAsync,
      isDisabling: disable2FA.isPending,
      disableError: disable2FA.error,

      // Note: Enable methods (enableTOTP, enableU2F, etc.) require additional
      // API endpoints that should be added to WildduckAPI class:
      // - POST /users/:user/2fa/totp
      // - POST /users/:user/2fa/u2f
      // - POST /users/:user/2fa/webauthn
    }),
    [
      twoFAQuery.data,
      isEnabled,
      twoFAQuery.isLoading,
      twoFAQuery.isError,
      twoFAQuery.error,
      hasMethod,
      hasTOTP,
      hasU2F,
      hasWebAuthn,
      disable2FA.mutate,
      disable2FA.mutateAsync,
      disable2FA.isPending,
      disable2FA.error,
    ],
  );
};
