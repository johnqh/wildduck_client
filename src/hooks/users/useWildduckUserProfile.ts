import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { WildduckClient } from "../../network/wildduck-client";
import type { WildduckUserAuth, WildduckUserResponse } from "@sudobility/types";

export interface UserProfile {
  username: string;
  name: string;
  address: string; // Main email address
  language?: string | undefined;
  retention?: number | undefined; // Default retention time in ms
  uploadSentMessages?: boolean | undefined;
  tags: string[];
  metaData?: Record<string, unknown> | undefined;
  disabled: boolean;
  suspended: boolean;
  activated: boolean;
  hasPasswordSet: boolean;
  disabledScopes: string[]; // Disabled scopes like 'imap', 'pop3', 'smtp'
}

export interface UpdateProfileParams {
  wildduckUserAuth: WildduckUserAuth;
  name?: string;
  language?: string;
  retention?: number;
  uploadSentMessages?: boolean;
  tags?: string[];
  metaData?: Record<string, unknown> | string;
  disabled?: boolean;
  suspended?: boolean;
  disabledScopes?: string[];
}

export interface UpdatePasswordParams {
  wildduckUserAuth: WildduckUserAuth;
  existingPassword?: string;
  password: string;
  hashedPassword?: boolean;
  allowUnsafe?: boolean;
}

/**
 * Hook for managing user profile and account settings
 * Handles basic user information, account status, and password management
 */
export const useWildduckUserProfile = (
  api: WildduckClient,
  wildduckUserAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = wildduckUserAuth?.userId;

  // Query to get user profile
  const profileQuery = useQuery({
    queryKey: ["user", userId, "profile"],
    queryFn: async (): Promise<UserProfile | undefined> => {
      if (!wildduckUserAuth) throw new Error("User auth is required");
      const user = (await api.getUser(
        wildduckUserAuth,
      )) as unknown as WildduckUserResponse;
      return {
        username: user.username,
        name: user.name,
        address: user.address,
        language: user.language,
        retention: user.retention,
        uploadSentMessages: user.uploadSentMessages,
        tags: user.tags || [],
        metaData: user.metaData,
        disabled: user.disabled,
        suspended: user.suspended,
        activated: user.activated,
        hasPasswordSet: user.hasPasswordSet,
        disabledScopes: user.disabledScopes || [],
      };
    },
    enabled: !!wildduckUserAuth,
  });

  // Mutation to update profile
  const updateProfile = useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
      const { wildduckUserAuth, ...updates } = params;
      return await api.updateUser(wildduckUserAuth, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "profile"],
      });
    },
  });

  // Mutation to update password
  const updatePassword = useMutation({
    mutationFn: async (params: UpdatePasswordParams) => {
      const { wildduckUserAuth, ...passwordData } = params;
      return await api.updateUser(wildduckUserAuth, passwordData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
    },
  });

  // Mutation to update tags
  const updateTags = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      tags,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      tags: string[];
    }) => {
      return await api.updateUser(wildduckUserAuth, { tags });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "profile"],
      });
    },
  });

  // Mutation to disable/enable account
  const setAccountStatus = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      disabled,
      suspended,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      disabled?: boolean;
      suspended?: boolean;
    }) => {
      const updates: { disabled?: boolean; suspended?: boolean } = {};
      if (disabled !== undefined) updates.disabled = disabled;
      if (suspended !== undefined) updates.suspended = suspended;
      return await api.updateUser(wildduckUserAuth, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "profile"],
      });
    },
  });

  const handleUpdateProfile = useCallback(
    (params: UpdateProfileParams) => updateProfile.mutate(params),
    [updateProfile],
  );

  const handleUpdateProfileAsync = useCallback(
    async (params: UpdateProfileParams) => updateProfile.mutateAsync(params),
    [updateProfile],
  );

  const handleUpdatePassword = useCallback(
    (params: UpdatePasswordParams) => updatePassword.mutate(params),
    [updatePassword],
  );

  const handleUpdatePasswordAsync = useCallback(
    async (params: UpdatePasswordParams) => updatePassword.mutateAsync(params),
    [updatePassword],
  );

  const handleUpdateTags = useCallback(
    (params: { wildduckUserAuth: WildduckUserAuth; tags: string[] }) =>
      updateTags.mutate(params),
    [updateTags],
  );

  const handleUpdateTagsAsync = useCallback(
    async (params: { wildduckUserAuth: WildduckUserAuth; tags: string[] }) =>
      updateTags.mutateAsync(params),
    [updateTags],
  );

  const handleSetAccountStatus = useCallback(
    (params: {
      wildduckUserAuth: WildduckUserAuth;
      disabled?: boolean;
      suspended?: boolean;
    }) => setAccountStatus.mutate(params),
    [setAccountStatus],
  );

  const handleSetAccountStatusAsync = useCallback(
    async (params: {
      wildduckUserAuth: WildduckUserAuth;
      disabled?: boolean;
      suspended?: boolean;
    }) => setAccountStatus.mutateAsync(params),
    [setAccountStatus],
  );

  return useMemo(
    () => ({
      // Query
      profile: profileQuery.data,
      isLoading: profileQuery.isLoading,
      isError: profileQuery.isError,
      error: profileQuery.error,

      // Individual field accessors
      username: profileQuery.data?.username,
      name: profileQuery.data?.name,
      address: profileQuery.data?.address,
      language: profileQuery.data?.language,
      tags: profileQuery.data?.tags || [],
      disabled: profileQuery.data?.disabled,
      suspended: profileQuery.data?.suspended,
      activated: profileQuery.data?.activated,
      hasPasswordSet: profileQuery.data?.hasPasswordSet,

      // Mutations
      updateProfile: handleUpdateProfile,
      updateProfileAsync: handleUpdateProfileAsync,
      isUpdatingProfile: updateProfile.isPending,

      updatePassword: handleUpdatePassword,
      updatePasswordAsync: handleUpdatePasswordAsync,
      isUpdatingPassword: updatePassword.isPending,

      updateTags: handleUpdateTags,
      updateTagsAsync: handleUpdateTagsAsync,
      isUpdatingTags: updateTags.isPending,

      setAccountStatus: handleSetAccountStatus,
      setAccountStatusAsync: handleSetAccountStatusAsync,
      isUpdatingStatus: setAccountStatus.isPending,
    }),
    [
      profileQuery.data,
      profileQuery.isLoading,
      profileQuery.isError,
      profileQuery.error,
      handleUpdateProfile,
      handleUpdateProfileAsync,
      updateProfile.isPending,
      handleUpdatePassword,
      handleUpdatePasswordAsync,
      updatePassword.isPending,
      handleUpdateTags,
      handleUpdateTagsAsync,
      updateTags.isPending,
      handleSetAccountStatus,
      handleSetAccountStatusAsync,
      setAccountStatus.isPending,
    ],
  );
};
