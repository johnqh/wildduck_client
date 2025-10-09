import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildDuckAPI } from "../../network/wildduck-client";
import type {
  KeyInfo,
  UserResponse,
  WildduckUserAuth,
} from "../../types/wildduck-types";

export interface EncryptionSettings {
  encryptMessages: boolean; // If true then received messages are encrypted
  encryptForwarded: boolean; // If true then forwarded messages are encrypted
  pubKey: string; // Public PGP key for encryption
  keyInfo?: KeyInfo; // Information about the public key
}

export interface UpdateEncryptionParams {
  userAuth: WildduckUserAuth;
  encryptMessages?: boolean;
  encryptForwarded?: boolean;
  pubKey?: string; // Use empty string to remove the key
}

/**
 * Hook for managing user encryption settings
 * Handles PGP encryption for received and forwarded messages
 */
export const useWildduckUserEncryption = (
  api: WildDuckAPI,
  userAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = userAuth?.userId;

  // Query to get user encryption settings
  const encryptionQuery = useQuery({
    queryKey: ["user", userId, "encryption"],
    queryFn: async (): Promise<EncryptionSettings | undefined> => {
      if (!userAuth) throw new Error("User auth is required");
      const user = (await api.getUser(userAuth)) as unknown as UserResponse;
      return {
        encryptMessages: user.encryptMessages,
        encryptForwarded: user.encryptForwarded,
        pubKey: user.pubKey,
        keyInfo: user.keyInfo,
      };
    },
    enabled: !!userAuth,
  });

  // Mutation to update encryption settings
  const updateEncryption = useMutation({
    mutationFn: async (params: UpdateEncryptionParams) => {
      const { userAuth, ...settings } = params;
      return await api.updateUser(userAuth, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "encryption"],
      });
    },
  });

  // Mutation to upload/update PGP public key
  const updatePubKey = useMutation({
    mutationFn: async ({
      userAuth,
      pubKey,
    }: {
      userAuth: WildduckUserAuth;
      pubKey: string;
    }) => {
      return await api.updateUser(userAuth, { pubKey });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "encryption"],
      });
    },
  });

  // Mutation to remove PGP public key
  const removePubKey = useMutation({
    mutationFn: async (userAuth: WildduckUserAuth) => {
      return await api.updateUser(userAuth, { pubKey: "" });
    },
    onSuccess: (_, userAuth) => {
      queryClient.invalidateQueries({ queryKey: ["user", userAuth.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", userId, "encryption"],
      });
    },
  });

  return {
    // Query
    encryption: encryptionQuery.data,
    isLoading: encryptionQuery.isLoading,
    isError: encryptionQuery.isError,
    error: encryptionQuery.error,

    // Individual field accessors
    encryptMessages: encryptionQuery.data?.encryptMessages,
    encryptForwarded: encryptionQuery.data?.encryptForwarded,
    pubKey: encryptionQuery.data?.pubKey,
    keyInfo: encryptionQuery.data?.keyInfo,

    // Mutations
    updateEncryption: updateEncryption.mutate,
    updateEncryptionAsync: updateEncryption.mutateAsync,
    isUpdating: updateEncryption.isPending,

    updatePubKey: updatePubKey.mutate,
    updatePubKeyAsync: updatePubKey.mutateAsync,
    isUpdatingKey: updatePubKey.isPending,

    removePubKey: removePubKey.mutate,
    removePubKeyAsync: removePubKey.mutateAsync,
    isRemovingKey: removePubKey.isPending,
  };
};
