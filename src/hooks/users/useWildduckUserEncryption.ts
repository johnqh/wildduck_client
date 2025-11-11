import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildduckClient } from "../../network/wildduck-client";
import type {
  WildduckKeyInfo,
  WildduckUserAuth,
  WildduckUserResponse,
} from "@sudobility/types";

export interface EncryptionSettings {
  encryptMessages: boolean; // If true then received messages are encrypted
  encryptForwarded: boolean; // If true then forwarded messages are encrypted
  pubKey: string; // Public PGP key for encryption
  keyInfo?: WildduckKeyInfo; // Information about the public key
}

export interface UpdateEncryptionParams {
  wildduckUserAuth: WildduckUserAuth;
  encryptMessages?: boolean;
  encryptForwarded?: boolean;
  pubKey?: string; // Use empty string to remove the key
}

/**
 * Hook for managing user encryption settings
 * Handles PGP encryption for received and forwarded messages
 */
export const useWildduckUserEncryption = (
  api: WildduckClient,
  wildduckUserAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = wildduckUserAuth?.userId;

  // Query to get user encryption settings
  const encryptionQueryFn = useCallback(async (): Promise<
    EncryptionSettings | undefined
  > => {
    if (!wildduckUserAuth) throw new Error("User auth is required");
    const user = (await api.getUser(
      wildduckUserAuth,
    )) as unknown as WildduckUserResponse;
    return {
      encryptMessages: user.encryptMessages,
      encryptForwarded: user.encryptForwarded,
      pubKey: user.pubKey,
      keyInfo: user.keyInfo,
    };
  }, [wildduckUserAuth, api]);

  const encryptionQuery = useQuery({
    queryKey: ["user", userId, "encryption"],
    queryFn: encryptionQueryFn,
    enabled: !!wildduckUserAuth,
  });

  // Mutation to update encryption settings
  const updateEncryption = useMutation({
    mutationFn: async (params: UpdateEncryptionParams) => {
      const { wildduckUserAuth, ...settings } = params;
      return await api.updateUser(wildduckUserAuth, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "encryption"],
      });
    },
  });

  // Mutation to upload/update PGP public key
  const updatePubKey = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      pubKey,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      pubKey: string;
    }) => {
      return await api.updateUser(wildduckUserAuth, { pubKey });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "encryption"],
      });
    },
  });

  // Mutation to remove PGP public key
  const removePubKey = useMutation({
    mutationFn: async (wildduckUserAuth: WildduckUserAuth) => {
      return await api.updateUser(wildduckUserAuth, { pubKey: "" });
    },
    onSuccess: (_, wildduckUserAuth) => {
      queryClient.invalidateQueries({
        queryKey: ["user", wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", userId, "encryption"],
      });
    },
  });

  return useMemo(
    () => ({
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
    }),
    [
      encryptionQuery.data,
      encryptionQuery.isLoading,
      encryptionQuery.isError,
      encryptionQuery.error,
      updateEncryption.mutate,
      updateEncryption.mutateAsync,
      updateEncryption.isPending,
      updatePubKey.mutate,
      updatePubKey.mutateAsync,
      updatePubKey.isPending,
      removePubKey.mutate,
      removePubKey.mutateAsync,
      removePubKey.isPending,
    ],
  );
};
