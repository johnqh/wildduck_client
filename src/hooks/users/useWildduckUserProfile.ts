import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
