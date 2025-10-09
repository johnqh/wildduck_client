import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildDuckAPI } from "../../network/wildduck-client";
import type { UserAuth, UserResponse } from "../../types/wildduck-types";

interface SpamSettingsInternal {
  spamLevel: number; // 0-100, where 0 = everything is spam, 100 = nothing is spam
  fromWhitelist: string[]; // Email addresses/patterns that bypass spam check
}

export interface UpdateSpamParams {
  userAuth: UserAuth;
  spamLevel?: number; // 0-100
  fromWhitelist?: string[]; // Array of email addresses or patterns (wildcards allowed)
}

/**
 * Hook for managing user spam filtering settings
 * Controls spam detection sensitivity and whitelisted senders
 */
export const useWildduckUserSpam = (api: WildDuckAPI, userAuth?: UserAuth) => {
  const queryClient = useQueryClient();
  const userId = userAuth?.userId;

  // Query to get user spam settings
  const spamQuery = useQuery({
    queryKey: ["user", userId, "spam"],
    queryFn: async (): Promise<SpamSettingsInternal | undefined> => {
      if (!userAuth) throw new Error("User auth is required");
      const user = (await api.getUser(userAuth)) as unknown as UserResponse;
      return {
        spamLevel: user.spamLevel,
        fromWhitelist: user.fromWhitelist || [],
      };
    },
    enabled: !!userAuth,
  });

  // Mutation to update spam settings
  const updateSpam = useMutation({
    mutationFn: async (params: UpdateSpamParams) => {
      const { userAuth, ...settings } = params;
      return await api.updateUser(userAuth, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "spam"],
      });
    },
  });

  // Mutation to update spam level only
  const updateSpamLevel = useMutation({
    mutationFn: async ({
      userAuth,
      spamLevel,
    }: {
      userAuth: UserAuth;
      spamLevel: number;
    }) => {
      if (spamLevel < 0 || spamLevel > 100) {
        throw new Error("Spam level must be between 0 and 100");
      }
      return await api.updateUser(userAuth, { spamLevel });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "spam"],
      });
    },
  });

  // Mutation to add address to whitelist
  const addToWhitelist = useMutation({
    mutationFn: async ({
      userAuth,
      address,
    }: {
      userAuth: UserAuth;
      address: string;
    }) => {
      const user = (await api.getUser(userAuth)) as unknown as UserResponse;
      const currentWhitelist = user.fromWhitelist || [];
      const newWhitelist = [...currentWhitelist, address];
      return await api.updateUser(userAuth, { fromWhitelist: newWhitelist });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "spam"],
      });
    },
  });

  // Mutation to remove address from whitelist
  const removeFromWhitelist = useMutation({
    mutationFn: async ({
      userAuth,
      address,
    }: {
      userAuth: UserAuth;
      address: string;
    }) => {
      const user = (await api.getUser(userAuth)) as unknown as UserResponse;
      const currentWhitelist = user.fromWhitelist || [];
      const newWhitelist = currentWhitelist.filter(
        (a: string) => a !== address,
      );
      return await api.updateUser(userAuth, { fromWhitelist: newWhitelist });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "spam"],
      });
    },
  });

  // Mutation to clear whitelist
  const clearWhitelist = useMutation({
    mutationFn: async (userAuth: UserAuth) => {
      return await api.updateUser(userAuth, { fromWhitelist: [] });
    },
    onSuccess: (_, userAuth) => {
      queryClient.invalidateQueries({ queryKey: ["user", userAuth.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", userAuth.userId, "spam"],
      });
    },
  });

  return {
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
  };
};
