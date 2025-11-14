import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WildduckClient } from "../network/wildduck-client";
import type {
  NetworkClient,
  Optional,
  WildduckConfig,
  WildduckSuccessResponse,
  WildduckUpdateUserRequest,
  WildduckUserAuth,
  WildduckUserResponse,
} from "@sudobility/types";

export interface UseWildduckUserParams {
  wildduckUserAuth?: WildduckUserAuth;
  devMode?: boolean;
}

export interface UseWildduckUserReturn {
  // Core user data
  user: WildduckUserResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Optional<Error>;

  // Core user mutations
  updateUser: (
    params: WildduckUpdateUserRequest,
  ) => Promise<WildduckSuccessResponse>;
  deleteUser: () => Promise<WildduckSuccessResponse>;

  // Profile fields (extracted from user)
  profile:
    | {
        username: string;
        name: string;
        address: string;
        language?: string | undefined;
        retention?: number | undefined;
        uploadSentMessages?: boolean | undefined;
        tags: string[];
        metaData?: Record<string, unknown> | undefined;
        disabled: boolean;
        suspended: boolean;
        activated: boolean;
        hasPasswordSet: boolean;
        disabledScopes: string[];
      }
    | undefined;
  username: string | undefined;
  name: string | undefined;
  address: string | undefined;
  language: string | undefined;
  tags: string[];
  disabled: boolean | undefined;
  suspended: boolean | undefined;
  activated: boolean | undefined;
  hasPasswordSet: boolean | undefined;

  // Profile mutations
  updateProfile: (params: {
    name?: string;
    language?: string;
    retention?: number;
    uploadSentMessages?: boolean;
    tags?: string[];
    metaData?: Record<string, unknown> | string;
    disabled?: boolean;
    suspended?: boolean;
    disabledScopes?: string[];
  }) => Promise<WildduckSuccessResponse>;
  updatePassword: (params: {
    existingPassword?: string;
    password: string;
    hashedPassword?: boolean;
    allowUnsafe?: boolean;
  }) => Promise<WildduckSuccessResponse>;
  updateTags: (tags: string[]) => Promise<WildduckSuccessResponse>;
  setAccountStatus: (params: {
    disabled?: boolean;
    suspended?: boolean;
  }) => Promise<WildduckSuccessResponse>;

  // Quota fields
  quota: { allowed: number; used: number } | undefined;
  updateQuota: (bytes: number) => Promise<WildduckSuccessResponse>;
  recalculateQuota: () => Promise<{
    success: boolean;
    storageUsed: number;
    previousStorageUsed: number;
  }>;

  // Limits fields
  limits: any;
  recipients: any;
  forwards: any;
  imapUpload: any;
  imapDownload: any;
  updateLimits: (params: {
    recipients?: number;
    forwards?: number;
    filters?: number;
    imapMaxUpload?: number;
    imapMaxDownload?: number;
    pop3MaxDownload?: number;
    pop3MaxMessages?: number;
    imapMaxConnections?: number;
    receivedMax?: number;
  }) => Promise<WildduckSuccessResponse>;

  // Spam fields
  spam: { spamLevel: number; fromWhitelist: string[] } | undefined;
  spamLevel: number | undefined;
  fromWhitelist: string[];
  updateSpam: (params: {
    spamLevel?: number;
    fromWhitelist?: string[];
  }) => Promise<WildduckSuccessResponse>;
  updateSpamLevel: (level: number) => Promise<WildduckSuccessResponse>;
  addToWhitelist: (address: string) => Promise<WildduckSuccessResponse>;
  removeFromWhitelist: (address: string) => Promise<WildduckSuccessResponse>;
  clearWhitelist: () => Promise<WildduckSuccessResponse>;

  // Forwarding fields
  forwarding: { targets: string[]; mtaRelay?: string | undefined } | undefined;
  targets: string[];
  mtaRelay: string | undefined;
  updateForwarding: (params: {
    targets?: string[];
    mtaRelay?: string;
  }) => Promise<WildduckSuccessResponse>;
  addTarget: (target: string) => Promise<WildduckSuccessResponse>;
  removeTarget: (target: string) => Promise<WildduckSuccessResponse>;
  clearTargets: () => Promise<WildduckSuccessResponse>;

  // Encryption fields
  encryption:
    | {
        pubKey: string;
        encryptMessages: boolean;
        encryptForwarded: boolean;
      }
    | undefined;
  pubKey: string | undefined;
  encryptMessages: boolean | undefined;
  encryptForwarded: boolean | undefined;
  updateEncryption: (params: {
    encryptMessages?: boolean;
    encryptForwarded?: boolean;
    pubKey?: string;
  }) => Promise<WildduckSuccessResponse>;
  updatePubKey: (key: string) => Promise<WildduckSuccessResponse>;
  removePubKey: () => Promise<WildduckSuccessResponse>;

  // 2FA fields
  enabled2fa: string[];
  disable2FA: () => Promise<WildduckSuccessResponse>;

  // Mutation states
  isUpdating: boolean;
  isDeleting: boolean;
  isUpdatingProfile: boolean;
  isUpdatingQuota: boolean;
  isUpdatingLimits: boolean;
  isUpdatingSpam: boolean;
  isUpdatingForwarding: boolean;
  isUpdatingEncryption: boolean;
  updateError: Optional<Error>;
  deleteError: Optional<Error>;

  // Refresh function
  refresh: () => Promise<void>;

  // Utility
  clearError: () => void;
}

/**
 * Monolithic hook for single user operations
 * Consolidates all user settings (profile, quota, limits, spam, forwarding, encryption, 2FA)
 * All mutations automatically refresh user data on success
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck API configuration
 * @param params - Hook parameters including wildduckUserAuth
 * @returns Object with user data, all settings, mutation functions, and state
 */
export const useWildduckUser = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  params: UseWildduckUserParams = {},
): UseWildduckUserReturn => {
  const { wildduckUserAuth, devMode = false } = params;

  const queryClient = useQueryClient();

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // ============================================================================
  // Query: Get User (includes ALL user data)
  // ============================================================================

  const userQuery = useQuery({
    queryKey: ["wildduck-user", wildduckUserAuth?.userId],
    queryFn: async (): Promise<WildduckUserResponse | undefined> => {
      if (!wildduckUserAuth) {
        console.error("wildduckUserAuth is required");
        return undefined;
      }

      try {
        return (await api.getUser(
          wildduckUserAuth,
        )) as unknown as WildduckUserResponse;
      } catch (err) {
        if (devMode) {
          return {
            success: true,
            id: wildduckUserAuth.userId,
            username: `${wildduckUserAuth.userId}@example.com`,
            name: `Mock User ${wildduckUserAuth.userId}`,
            address: `${wildduckUserAuth.userId}@example.com`,
            hasPasswordSet: false,
            activated: true,
            disabled: false,
            suspended: false,
            tags: [],
            disabledScopes: [],
            limits: {
              quota: { allowed: 1073741824, used: 134217728 },
              recipients: { allowed: 1000, used: 0 },
              forwards: { allowed: 100, used: 0 },
            },
            spamLevel: 50,
            fromWhitelist: [],
            targets: [],
            enabled2fa: [],
            encryptMessages: false,
            encryptForwarded: false,
            pubKey: "",
          } as unknown as WildduckUserResponse;
        }
        console.error("Failed to get user:", err);
        return undefined;
      }
    },
    enabled: !!wildduckUserAuth,
  });

  // ============================================================================
  // Mutation: Update User (generic)
  // ============================================================================

  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: WildduckUpdateUserRequest,
    ): Promise<WildduckSuccessResponse> => {
      if (!wildduckUserAuth) {
        throw new Error("wildduckUserAuth is required");
      }

      try {
        return await api.updateUser(wildduckUserAuth, params);
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to update user:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Auto-refresh user data
      queryClient.invalidateQueries({
        queryKey: ["wildduck-user", wildduckUserAuth?.userId],
      });
      userQuery.refetch();

      // Also invalidate users list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
    },
  });

  // ============================================================================
  // Mutation: Delete User
  // ============================================================================

  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-user",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (): Promise<WildduckSuccessResponse> => {
      if (!wildduckUserAuth) {
        throw new Error("wildduckUserAuth is required");
      }

      try {
        return await api.deleteUser(wildduckUserAuth);
      } catch (err) {
        if (devMode) {
          return { success: true };
        }
        console.error("Failed to delete user:", err);
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({
        queryKey: ["wildduck-users"],
      });
      // Remove the specific user from cache
      queryClient.removeQueries({
        queryKey: ["wildduck-user", wildduckUserAuth?.userId],
      });
    },
  });

  // ============================================================================
  // Derived Data (extracted from user query)
  // ============================================================================

  const user = userQuery.data;

  const profile = useMemo(() => {
    if (!user) return undefined;
    return {
      username: user.username,
      name: user.name,
      address: user.address,
      language: user.language || undefined,
      retention: user.retention || undefined,
      uploadSentMessages: user.uploadSentMessages || undefined,
      tags: user.tags || [],
      metaData: user.metaData || undefined,
      disabled: user.disabled,
      suspended: user.suspended,
      activated: user.activated,
      hasPasswordSet: user.hasPasswordSet,
      disabledScopes: user.disabledScopes || [],
    };
  }, [user]);

  const spam = useMemo(() => {
    if (!user) return undefined;
    return {
      spamLevel: user.spamLevel,
      fromWhitelist: user.fromWhitelist || [],
    };
  }, [user]);

  const forwarding = useMemo(() => {
    if (!user) return undefined;
    return {
      targets: user.targets || [],
      mtaRelay: user.mtaRelay || undefined,
    };
  }, [user]);

  const encryption = useMemo(() => {
    if (!user) return undefined;
    return {
      pubKey: user.pubKey || "",
      encryptMessages: user.encryptMessages || false,
      encryptForwarded: user.encryptForwarded || false,
    };
  }, [user]);

  // ============================================================================
  // Callback Functions
  // ============================================================================

  const updateUser = useCallback(
    async (params: WildduckUpdateUserRequest) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const deleteUser = useCallback(async () => {
    return deleteMutation.mutateAsync();
  }, [deleteMutation]);

  // Profile mutations
  const updateProfile = useCallback(
    async (params: any) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const updatePassword = useCallback(
    async (params: any) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const updateTags = useCallback(
    async (tags: string[]) => {
      return updateMutation.mutateAsync({ tags });
    },
    [updateMutation],
  );

  const setAccountStatus = useCallback(
    async (params: { disabled?: boolean; suspended?: boolean }) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  // Quota mutations
  const updateQuota = useCallback(
    async (bytes: number) => {
      return updateMutation.mutateAsync({ quota: bytes });
    },
    [updateMutation],
  );

  const recalculateQuota = useCallback(async () => {
    if (!wildduckUserAuth) {
      throw new Error("wildduckUserAuth is required");
    }
    // This would call a different endpoint, but for now return not implemented
    console.error("Recalculate quota endpoint not yet implemented");
    return { success: false, storageUsed: 0, previousStorageUsed: 0 };
  }, [wildduckUserAuth]);

  // Limits mutations
  const updateLimits = useCallback(
    async (params: any) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  // Spam mutations
  const updateSpam = useCallback(
    async (params: { spamLevel?: number; fromWhitelist?: string[] }) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const updateSpamLevel = useCallback(
    async (level: number) => {
      if (level < 0 || level > 100) {
        throw new Error("Spam level must be between 0 and 100");
      }
      return updateMutation.mutateAsync({ spamLevel: level });
    },
    [updateMutation],
  );

  const addToWhitelist = useCallback(
    async (address: string) => {
      const currentWhitelist = user?.fromWhitelist || [];
      return updateMutation.mutateAsync({
        fromWhitelist: [...currentWhitelist, address],
      });
    },
    [updateMutation, user],
  );

  const removeFromWhitelist = useCallback(
    async (address: string) => {
      const currentWhitelist = user?.fromWhitelist || [];
      return updateMutation.mutateAsync({
        fromWhitelist: currentWhitelist.filter((a) => a !== address),
      });
    },
    [updateMutation, user],
  );

  const clearWhitelist = useCallback(async () => {
    return updateMutation.mutateAsync({ fromWhitelist: [] });
  }, [updateMutation]);

  // Forwarding mutations
  const updateForwarding = useCallback(
    async (params: { targets?: string[]; mtaRelay?: string }) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const addTarget = useCallback(
    async (target: string) => {
      const currentTargets = user?.targets || [];
      return updateMutation.mutateAsync({
        targets: [...currentTargets, target],
      });
    },
    [updateMutation, user],
  );

  const removeTarget = useCallback(
    async (target: string) => {
      const currentTargets = user?.targets || [];
      return updateMutation.mutateAsync({
        targets: currentTargets.filter((t) => t !== target),
      });
    },
    [updateMutation, user],
  );

  const clearTargets = useCallback(async () => {
    return updateMutation.mutateAsync({ targets: [] });
  }, [updateMutation]);

  // Encryption mutations
  const updateEncryption = useCallback(
    async (params: {
      encryptMessages?: boolean;
      encryptForwarded?: boolean;
      pubKey?: string;
    }) => {
      return updateMutation.mutateAsync(params);
    },
    [updateMutation],
  );

  const updatePubKey = useCallback(
    async (key: string) => {
      return updateMutation.mutateAsync({ pubKey: key });
    },
    [updateMutation],
  );

  const removePubKey = useCallback(async () => {
    return updateMutation.mutateAsync({ pubKey: "" });
  }, [updateMutation]);

  // 2FA mutations
  const disable2FA = useCallback(async () => {
    return updateMutation.mutateAsync({ disable2fa: true });
  }, [updateMutation]);

  const refresh = useCallback(async () => {
    await userQuery.refetch();
  }, [userQuery]);

  const clearError = useCallback(() => {
    updateMutation.reset();
    deleteMutation.reset();
  }, [updateMutation, deleteMutation]);

  // ============================================================================
  // Return
  // ============================================================================

  return useMemo(
    () => ({
      // Core user data
      user,
      isLoading: userQuery.isLoading,
      isError: userQuery.isError,
      error: userQuery.error,

      // Core mutations
      updateUser,
      deleteUser,

      // Profile
      profile,
      username: user?.username,
      name: user?.name,
      address: user?.address,
      language: user?.language,
      tags: user?.tags || [],
      disabled: user?.disabled,
      suspended: user?.suspended,
      activated: user?.activated,
      hasPasswordSet: user?.hasPasswordSet,
      updateProfile,
      updatePassword,
      updateTags,
      setAccountStatus,

      // Quota
      quota: user?.limits?.quota,
      updateQuota,
      recalculateQuota,

      // Limits
      limits: user?.limits,
      recipients: user?.limits?.recipients,
      forwards: user?.limits?.forwards,
      imapUpload: user?.limits?.imapUpload,
      imapDownload: user?.limits?.imapDownload,
      updateLimits,

      // Spam
      spam,
      spamLevel: user?.spamLevel,
      fromWhitelist: user?.fromWhitelist || [],
      updateSpam,
      updateSpamLevel,
      addToWhitelist,
      removeFromWhitelist,
      clearWhitelist,

      // Forwarding
      forwarding,
      targets: user?.targets || [],
      mtaRelay: user?.mtaRelay,
      updateForwarding,
      addTarget,
      removeTarget,
      clearTargets,

      // Encryption
      encryption,
      pubKey: user?.pubKey,
      encryptMessages: user?.encryptMessages,
      encryptForwarded: user?.encryptForwarded,
      updateEncryption,
      updatePubKey,
      removePubKey,

      // 2FA
      enabled2fa: user?.enabled2fa || [],
      disable2FA,

      // Mutation states
      isUpdating: updateMutation.isPending,
      isDeleting: deleteMutation.isPending,
      isUpdatingProfile: updateMutation.isPending,
      isUpdatingQuota: updateMutation.isPending,
      isUpdatingLimits: updateMutation.isPending,
      isUpdatingSpam: updateMutation.isPending,
      isUpdatingForwarding: updateMutation.isPending,
      isUpdatingEncryption: updateMutation.isPending,
      updateError: updateMutation.error,
      deleteError: deleteMutation.error,

      // Refresh
      refresh,

      // Utility
      clearError,
    }),
    [
      user,
      userQuery.isLoading,
      userQuery.isError,
      userQuery.error,
      updateUser,
      deleteUser,
      profile,
      updateProfile,
      updatePassword,
      updateTags,
      setAccountStatus,
      updateQuota,
      recalculateQuota,
      updateLimits,
      spam,
      updateSpam,
      updateSpamLevel,
      addToWhitelist,
      removeFromWhitelist,
      clearWhitelist,
      forwarding,
      updateForwarding,
      addTarget,
      removeTarget,
      clearTargets,
      encryption,
      updateEncryption,
      updatePubKey,
      removePubKey,
      disable2FA,
      updateMutation.isPending,
      updateMutation.error,
      deleteMutation.isPending,
      deleteMutation.error,
      refresh,
      clearError,
    ],
  );
};
