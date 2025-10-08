import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildDuckAPI } from "../../network/wildduck-client";
import type { UserResponse } from "../../types/wildduck-types";

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
  userId: string;
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
  userId: string;
  existingPassword?: string;
  password: string;
  hashedPassword?: boolean;
  allowUnsafe?: boolean;
}

/**
 * Hook for managing user profile and account settings
 * Handles basic user information, account status, and password management
 */
export const useUserProfile = (api: WildDuckAPI, userId?: string) => {
  const queryClient = useQueryClient();

  // Query to get user profile
  const profileQuery = useQuery({
    queryKey: ["user", userId, "profile"],
    queryFn: async (): Promise<UserProfile | undefined> => {
      if (!userId) throw new Error("User ID is required");
      const user = (await api.getUser(userId)) as unknown as UserResponse;
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
    enabled: !!userId,
  });

  // Mutation to update profile
  const updateProfile = useMutation({
    mutationFn: async (params: UpdateProfileParams) => {
      const { userId, ...updates } = params;
      return await api.updateUser(userId, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId, "profile"],
      });
    },
  });

  // Mutation to update password
  const updatePassword = useMutation({
    mutationFn: async (params: UpdatePasswordParams) => {
      const { userId, ...passwordData } = params;
      return await api.updateUser(userId, passwordData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
    },
  });

  // Mutation to update tags
  const updateTags = useMutation({
    mutationFn: async ({
      userId,
      tags,
    }: {
      userId: string;
      tags: string[];
    }) => {
      return await api.updateUser(userId, { tags });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId, "profile"],
      });
    },
  });

  // Mutation to disable/enable account
  const setAccountStatus = useMutation({
    mutationFn: async ({
      userId,
      disabled,
      suspended,
    }: {
      userId: string;
      disabled?: boolean;
      suspended?: boolean;
    }) => {
      const updates: { disabled?: boolean; suspended?: boolean } = {};
      if (disabled !== undefined) updates.disabled = disabled;
      if (suspended !== undefined) updates.suspended = suspended;
      return await api.updateUser(userId, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId, "profile"],
      });
    },
  });

  return {
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
    updateProfile: updateProfile.mutate,
    updateProfileAsync: updateProfile.mutateAsync,
    isUpdatingProfile: updateProfile.isPending,

    updatePassword: updatePassword.mutate,
    updatePasswordAsync: updatePassword.mutateAsync,
    isUpdatingPassword: updatePassword.isPending,

    updateTags: updateTags.mutate,
    updateTagsAsync: updateTags.mutateAsync,
    isUpdatingTags: updateTags.isPending,

    setAccountStatus: setAccountStatus.mutate,
    setAccountStatusAsync: setAccountStatus.mutateAsync,
    isUpdatingStatus: setAccountStatus.isPending,
  };
};
