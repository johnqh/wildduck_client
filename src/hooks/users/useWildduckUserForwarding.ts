import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { WildduckAPI } from "../../network/wildduck-client";
import type { WildduckUserAuth, WildduckUserResponse } from "@johnqh/types";

export interface ForwardingSettings {
  targets: string[]; // List of forwarding email addresses or URLs
  mtaRelay?: string | undefined; // SMTP relay URL for outbound messages
}

export interface UpdateForwardingParams {
  userAuth: WildduckUserAuth;
  targets?: string[]; // Array of email addresses or relay URLs
  mtaRelay?: string; // SMTP relay URL (e.g., "smtp://mx2.zone.eu:25")
}

/**
 * Hook for managing user message forwarding settings
 * Handles forwarding targets and MTA relay configuration
 */
export const useWildduckUserForwarding = (
  api: WildduckAPI,
  userAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = userAuth?.userId;

  // Query to get user forwarding settings
  const forwardingQuery = useQuery({
    queryKey: ["user", userId, "forwarding"],
    queryFn: async (): Promise<ForwardingSettings | undefined> => {
      if (!userAuth) throw new Error("User auth is required");
      const user = (await api.getUser(
        userAuth,
      )) as unknown as WildduckUserResponse;
      return {
        targets: user.targets || [],
        mtaRelay: user.mtaRelay,
      };
    },
    enabled: !!userAuth,
  });

  // Mutation to update forwarding settings
  const updateForwarding = useMutation({
    mutationFn: async (params: UpdateForwardingParams) => {
      const { userAuth, ...settings } = params;
      return await api.updateUser(userAuth, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "forwarding"],
      });
    },
  });

  // Mutation to add forwarding target
  const addTarget = useMutation({
    mutationFn: async ({
      userAuth,
      target,
    }: {
      userAuth: WildduckUserAuth;
      target: string;
    }) => {
      // Get current targets and add new one
      const user = (await api.getUser(
        userAuth,
      )) as unknown as WildduckUserResponse;
      const currentTargets = user.targets || [];
      const newTargets = [...currentTargets, target];
      return await api.updateUser(userAuth, { targets: newTargets });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "forwarding"],
      });
    },
  });

  // Mutation to remove forwarding target
  const removeTarget = useMutation({
    mutationFn: async ({
      userAuth,
      target,
    }: {
      userAuth: WildduckUserAuth;
      target: string;
    }) => {
      // Get current targets and remove specified one
      const user = (await api.getUser(
        userAuth,
      )) as unknown as WildduckUserResponse;
      const currentTargets = user.targets || [];
      const newTargets = currentTargets.filter((t: string) => t !== target);
      return await api.updateUser(userAuth, { targets: newTargets });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userAuth.userId, "forwarding"],
      });
    },
  });

  // Mutation to clear all forwarding targets
  const clearTargets = useMutation({
    mutationFn: async (userAuth: WildduckUserAuth) => {
      return await api.updateUser(userAuth, { targets: [] });
    },
    onSuccess: (_, userAuth) => {
      queryClient.invalidateQueries({ queryKey: ["user", userAuth.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", userAuth.userId, "forwarding"],
      });
    },
  });

  const handleUpdateForwarding = useCallback(
    (params: UpdateForwardingParams) => updateForwarding.mutate(params),
    [updateForwarding],
  );

  const handleUpdateForwardingAsync = useCallback(
    async (params: UpdateForwardingParams) =>
      updateForwarding.mutateAsync(params),
    [updateForwarding],
  );

  const handleAddTarget = useCallback(
    (params: { userAuth: WildduckUserAuth; target: string }) =>
      addTarget.mutate(params),
    [addTarget],
  );

  const handleAddTargetAsync = useCallback(
    async (params: { userAuth: WildduckUserAuth; target: string }) =>
      addTarget.mutateAsync(params),
    [addTarget],
  );

  const handleRemoveTarget = useCallback(
    (params: { userAuth: WildduckUserAuth; target: string }) =>
      removeTarget.mutate(params),
    [removeTarget],
  );

  const handleRemoveTargetAsync = useCallback(
    async (params: { userAuth: WildduckUserAuth; target: string }) =>
      removeTarget.mutateAsync(params),
    [removeTarget],
  );

  const handleClearTargets = useCallback(
    (userAuth: WildduckUserAuth) => clearTargets.mutate(userAuth),
    [clearTargets],
  );

  const handleClearTargetsAsync = useCallback(
    async (userAuth: WildduckUserAuth) => clearTargets.mutateAsync(userAuth),
    [clearTargets],
  );

  return useMemo(
    () => ({
      // Query
      forwarding: forwardingQuery.data,
      targets: forwardingQuery.data?.targets || [],
      mtaRelay: forwardingQuery.data?.mtaRelay,
      isLoading: forwardingQuery.isLoading,
      isError: forwardingQuery.isError,
      error: forwardingQuery.error,

      // Mutations
      updateForwarding: handleUpdateForwarding,
      updateForwardingAsync: handleUpdateForwardingAsync,
      isUpdating: updateForwarding.isPending,

      addTarget: handleAddTarget,
      addTargetAsync: handleAddTargetAsync,
      isAddingTarget: addTarget.isPending,

      removeTarget: handleRemoveTarget,
      removeTargetAsync: handleRemoveTargetAsync,
      isRemovingTarget: removeTarget.isPending,

      clearTargets: handleClearTargets,
      clearTargetsAsync: handleClearTargetsAsync,
      isClearingTargets: clearTargets.isPending,
    }),
    [
      forwardingQuery.data,
      forwardingQuery.isLoading,
      forwardingQuery.isError,
      forwardingQuery.error,
      handleUpdateForwarding,
      handleUpdateForwardingAsync,
      updateForwarding.isPending,
      handleAddTarget,
      handleAddTargetAsync,
      addTarget.isPending,
      handleRemoveTarget,
      handleRemoveTargetAsync,
      removeTarget.isPending,
      handleClearTargets,
      handleClearTargetsAsync,
      clearTargets.isPending,
    ],
  );
};
