import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildduckAPI } from "../../network/wildduck-client";
import type { WildduckUserAuth, WildduckUserResponse } from "@sudobility/types";

interface SpamSettingsInternal {
  spamLevel: number; // 0-100, where 0 = everything is spam, 100 = nothing is spam
  fromWhitelist: string[]; // Email addresses/patterns that bypass spam check
}

export interface UpdateSpamParams {
  wildduckUserAuth: WildduckUserAuth;
  spamLevel?: number; // 0-100
  fromWhitelist?: string[]; // Array of email addresses or patterns (wildcards allowed)
}

/**
 * Hook for managing user spam filtering settings
 * Controls spam detection sensitivity and whitelisted senders
 */
export const useWildduckUserSpam = (
  api: WildduckAPI,
  wildduckUserAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = wildduckUserAuth?.userId;

  // Query to get user spam settings
  const spamQueryFn = useCallback(async (): Promise<
    SpamSettingsInternal | undefined
  > => {
    if (!wildduckUserAuth) throw new Error("User auth is required");
    const user = (await api.getUser(
      wildduckUserAuth,
    )) as unknown as WildduckUserResponse;
    return {
      spamLevel: user.spamLevel,
      fromWhitelist: user.fromWhitelist || [],
    };
  }, [wildduckUserAuth, api]);

  const spamQuery = useQuery({
    queryKey: ["user", userId, "spam"],
    queryFn: spamQueryFn,
    enabled: !!wildduckUserAuth,
  });

  // Mutation to update spam settings
  const updateSpam = useMutation({
    mutationFn: async (params: UpdateSpamParams) => {
      const { wildduckUserAuth, ...settings } = params;
      return await api.updateUser(wildduckUserAuth, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "spam"],
      });
    },
  });

  // Mutation to update spam level only
  const updateSpamLevel = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      spamLevel,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      spamLevel: number;
    }) => {
      if (spamLevel < 0 || spamLevel > 100) {
        throw new Error("Spam level must be between 0 and 100");
      }
      return await api.updateUser(wildduckUserAuth, { spamLevel });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "spam"],
      });
    },
  });

  // Mutation to add address to whitelist
  const addToWhitelist = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      address,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      address: string;
    }) => {
      const user = (await api.getUser(
        wildduckUserAuth,
      )) as unknown as WildduckUserResponse;
      const currentWhitelist = user.fromWhitelist || [];
      const newWhitelist = [...currentWhitelist, address];
      return await api.updateUser(wildduckUserAuth, {
        fromWhitelist: newWhitelist,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "spam"],
      });
    },
  });

  // Mutation to remove address from whitelist
  const removeFromWhitelist = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      address,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      address: string;
    }) => {
      const user = (await api.getUser(
        wildduckUserAuth,
      )) as unknown as WildduckUserResponse;
      const currentWhitelist = user.fromWhitelist || [];
      const newWhitelist = currentWhitelist.filter(
        (a: string) => a !== address,
      );
      return await api.updateUser(wildduckUserAuth, {
        fromWhitelist: newWhitelist,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "spam"],
      });
    },
  });

  // Mutation to clear whitelist
  const clearWhitelist = useMutation({
    mutationFn: async (wildduckUserAuth: WildduckUserAuth) => {
      return await api.updateUser(wildduckUserAuth, { fromWhitelist: [] });
    },
    onSuccess: (_, wildduckUserAuth) => {
      queryClient.invalidateQueries({
        queryKey: ["user", wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", wildduckUserAuth.userId, "spam"],
      });
    },
  });

  return useMemo(
    () => ({
      // Query
      spam: spamQuery.data,
      spamLevel: spamQuery.data?.spamLevel,
      fromWhitelist: spamQuery.data?.fromWhitelist || [],
      isLoading: spamQuery.isLoading,
      isError: spamQuery.isError,
      error: spamQuery.error,

      // Mutations
      updateSpam: updateSpam.mutate,
      updateSpamAsync: updateSpam.mutateAsync,
      isUpdating: updateSpam.isPending,

      updateSpamLevel: updateSpamLevel.mutate,
      updateSpamLevelAsync: updateSpamLevel.mutateAsync,
      isUpdatingLevel: updateSpamLevel.isPending,

      addToWhitelist: addToWhitelist.mutate,
      addToWhitelistAsync: addToWhitelist.mutateAsync,
      isAddingToWhitelist: addToWhitelist.isPending,

      removeFromWhitelist: removeFromWhitelist.mutate,
      removeFromWhitelistAsync: removeFromWhitelist.mutateAsync,
      isRemovingFromWhitelist: removeFromWhitelist.isPending,

      clearWhitelist: clearWhitelist.mutate,
      clearWhitelistAsync: clearWhitelist.mutateAsync,
      isClearingWhitelist: clearWhitelist.isPending,
    }),
    [
      spamQuery.data,
      spamQuery.isLoading,
      spamQuery.isError,
      spamQuery.error,
      updateSpam.mutate,
      updateSpam.mutateAsync,
      updateSpam.isPending,
      updateSpamLevel.mutate,
      updateSpamLevel.mutateAsync,
      updateSpamLevel.isPending,
      addToWhitelist.mutate,
      addToWhitelist.mutateAsync,
      addToWhitelist.isPending,
      removeFromWhitelist.mutate,
      removeFromWhitelist.mutateAsync,
      removeFromWhitelist.isPending,
      clearWhitelist.mutate,
      clearWhitelist.mutateAsync,
      clearWhitelist.isPending,
    ],
  );
};
