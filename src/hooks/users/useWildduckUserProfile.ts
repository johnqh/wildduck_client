import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { WildduckAPI } from "../../network/wildduck-client";
import type {
  WildduckUserAuth,
  WildduckUserResponse,
} from "../../types/wildduck-types";

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
  userAuth: WildduckUserAuth;
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
  userAuth: WildduckUserAuth;
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
  api: WildduckAPI,
  userAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = userAuth?.userId;

  // Query to get user profile
  const profileQuery = useQuery({
    queryKey: ["user", userId, "profile"],
    queryFn: async (): Promise<UserProfile | undefined> => {
      if (!userAuth) throw new Error("User auth is required");
      const user = (await api.getUser(
        userAuth,
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
    enabled: !!userAuth,
  });

  // Mutation to update profile
  const updateProfile = useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
      const { userAuth, ...updates } = params;
      return await api.updateUser(userAuth, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "profile"],
      });
    },
  });

  // Mutation to update password
  const updatePassword = useMutation({
    mutationFn: async (params: UpdatePasswordParams) => {
      const { userAuth, ...passwordData } = params;
      return await api.updateUser(userAuth, passwordData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
    },
  });

  // Mutation to update tags
  const updateTags = useMutation({
    mutationFn: async ({
      userAuth,
      tags,
    }: {
      userAuth: WildduckUserAuth;
      tags: string[];
    }) => {
      return await api.updateUser(userAuth, { tags });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "profile"],
      });
    },
  });

  // Mutation to disable/enable account
  const setAccountStatus = useMutation({
    mutationFn: async ({
      userAuth,
      disabled,
      suspended,
    }: {
      userAuth: WildduckUserAuth;
      disabled?: boolean;
      suspended?: boolean;
    }) => {
      const updates: { disabled?: boolean; suspended?: boolean } = {};
      if (disabled !== undefined) updates.disabled = disabled;
      if (suspended !== undefined) updates.suspended = suspended;
      return await api.updateUser(userAuth, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "profile"],
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
    (params: { userAuth: WildduckUserAuth; tags: string[] }) =>
      updateTags.mutate(params),
    [updateTags],
  );

  const handleUpdateTagsAsync = useCallback(
    async (params: { userAuth: WildduckUserAuth; tags: string[] }) =>
      updateTags.mutateAsync(params),
    [updateTags],
  );

  const handleSetAccountStatus = useCallback(
    (params: {
      userAuth: WildduckUserAuth;
      disabled?: boolean;
      suspended?: boolean;
    }) => setAccountStatus.mutate(params),
    [setAccountStatus],
  );

  const handleSetAccountStatusAsync = useCallback(
    async (params: {
      userAuth: WildduckUserAuth;
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
