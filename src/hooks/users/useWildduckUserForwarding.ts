import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { WildduckClient } from "../../network/wildduck-client";
import type { WildduckUserAuth, WildduckUserResponse } from "@sudobility/types";

export interface ForwardingSettings {
  targets: string[]; // List of forwarding email addresses or URLs
  mtaRelay?: string | undefined; // SMTP relay URL for outbound messages
}

export interface UpdateForwardingParams {
  wildduckUserAuth: WildduckUserAuth;
  targets?: string[]; // Array of email addresses or relay URLs
  mtaRelay?: string; // SMTP relay URL (e.g., "smtp://mx2.zone.eu:25")
}

/**
 * Hook for managing user message forwarding settings
 * Handles forwarding targets and MTA relay configuration
 */
export const useWildduckUserForwarding = (
  api: WildduckClient,
  wildduckUserAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = wildduckUserAuth?.userId;

  // Query to get user forwarding settings
  const forwardingQuery = useQuery({
    queryKey: ["user", userId, "forwarding"],
    queryFn: async (): Promise<ForwardingSettings | undefined> => {
      if (!wildduckUserAuth) throw new Error("User auth is required");
      const user = (await api.getUser(
        wildduckUserAuth,
      )) as unknown as WildduckUserResponse;
      return {
        targets: user.targets || [],
        mtaRelay: user.mtaRelay,
      };
    },
    enabled: !!wildduckUserAuth,
  });

  // Mutation to update forwarding settings
  const updateForwarding = useMutation({
    mutationFn: async (params: UpdateForwardingParams) => {
      const { wildduckUserAuth, ...settings } = params;
      return await api.updateUser(wildduckUserAuth, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "forwarding"],
      });
    },
  });

  // Mutation to add forwarding target
  const addTarget = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      target,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      target: string;
    }) => {
      // Get current targets and add new one
      const user = (await api.getUser(
        wildduckUserAuth,
      )) as unknown as WildduckUserResponse;
      const currentTargets = user.targets || [];
      const newTargets = [...currentTargets, target];
      return await api.updateUser(wildduckUserAuth, { targets: newTargets });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "forwarding"],
      });
    },
  });

  // Mutation to remove forwarding target
  const removeTarget = useMutation({
    mutationFn: async ({
      wildduckUserAuth,
      target,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      target: string;
    }) => {
      // Get current targets and remove specified one
      const user = (await api.getUser(
        wildduckUserAuth,
      )) as unknown as WildduckUserResponse;
      const currentTargets = user.targets || [];
      const newTargets = currentTargets.filter((t: string) => t !== target);
      return await api.updateUser(wildduckUserAuth, { targets: newTargets });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "forwarding"],
      });
    },
  });

  // Mutation to clear all forwarding targets
  const clearTargets = useMutation({
    mutationFn: async (wildduckUserAuth: WildduckUserAuth) => {
      return await api.updateUser(wildduckUserAuth, { targets: [] });
    },
    onSuccess: (_, wildduckUserAuth) => {
      queryClient.invalidateQueries({
        queryKey: ["user", wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", wildduckUserAuth.userId, "forwarding"],
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
    (params: { wildduckUserAuth: WildduckUserAuth; target: string }) =>
      addTarget.mutate(params),
    [addTarget],
  );

  const handleAddTargetAsync = useCallback(
    async (params: { wildduckUserAuth: WildduckUserAuth; target: string }) =>
      addTarget.mutateAsync(params),
    [addTarget],
  );

  const handleRemoveTarget = useCallback(
    (params: { wildduckUserAuth: WildduckUserAuth; target: string }) =>
      removeTarget.mutate(params),
    [removeTarget],
  );

  const handleRemoveTargetAsync = useCallback(
    async (params: { wildduckUserAuth: WildduckUserAuth; target: string }) =>
      removeTarget.mutateAsync(params),
    [removeTarget],
  );

  const handleClearTargets = useCallback(
    (wildduckUserAuth: WildduckUserAuth) =>
      clearTargets.mutate(wildduckUserAuth),
    [clearTargets],
  );

  const handleClearTargetsAsync = useCallback(
    async (wildduckUserAuth: WildduckUserAuth) =>
      clearTargets.mutateAsync(wildduckUserAuth),
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
