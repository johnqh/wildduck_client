import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WildDuckAPI } from "../../network/wildduck-client";
import type { UserResponse } from "../../types/wildduck-types";

export interface ForwardingSettings {
  targets: string[]; // List of forwarding email addresses or URLs
  mtaRelay?: string | undefined; // SMTP relay URL for outbound messages
}

export interface UpdateForwardingParams {
  userId: string;
  targets?: string[]; // Array of email addresses or relay URLs
  mtaRelay?: string; // SMTP relay URL (e.g., "smtp://mx2.zone.eu:25")
}

/**
 * Hook for managing user message forwarding settings
 * Handles forwarding targets and MTA relay configuration
 */
export const useUserForwarding = (api: WildDuckAPI, userId?: string) => {
  const queryClient = useQueryClient();

  // Query to get user forwarding settings
  const forwardingQuery = useQuery({
    queryKey: ["user", userId, "forwarding"],
    queryFn: async (): Promise<ForwardingSettings | undefined> => {
      if (!userId) throw new Error("User ID is required");
      const user = (await api.getUser(userId)) as unknown as UserResponse;
      return {
        targets: user.targets || [],
        mtaRelay: user.mtaRelay,
      };
    },
    enabled: !!userId,
  });

  // Mutation to update forwarding settings
  const updateForwarding = useMutation({
    mutationFn: async (params: UpdateForwardingParams) => {
      const { userId, ...settings } = params;
      return await api.updateUser(userId, settings);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId, "forwarding"],
      });
    },
  });

  // Mutation to add forwarding target
  const addTarget = useMutation({
    mutationFn: async ({
      userId,
      target,
    }: {
      userId: string;
      target: string;
    }) => {
      // Get current targets and add new one
      const user = (await api.getUser(userId)) as unknown as UserResponse;
      const currentTargets = user.targets || [];
      const newTargets = [...currentTargets, target];
      return await api.updateUser(userId, { targets: newTargets });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId, "forwarding"],
      });
    },
  });

  // Mutation to remove forwarding target
  const removeTarget = useMutation({
    mutationFn: async ({
      userId,
      target,
    }: {
      userId: string;
      target: string;
    }) => {
      // Get current targets and remove specified one
      const user = (await api.getUser(userId)) as unknown as UserResponse;
      const currentTargets = user.targets || [];
      const newTargets = currentTargets.filter((t: string) => t !== target);
      return await api.updateUser(userId, { targets: newTargets });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId, "forwarding"],
      });
    },
  });

  // Mutation to clear all forwarding targets
  const clearTargets = useMutation({
    mutationFn: async (userId: string) => {
      return await api.updateUser(userId, { targets: [] });
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({
        queryKey: ["user", userId, "forwarding"],
      });
    },
  });

  return {
    // Query
    forwarding: forwardingQuery.data,
    targets: forwardingQuery.data?.targets || [],
    mtaRelay: forwardingQuery.data?.mtaRelay,
    isLoading: forwardingQuery.isLoading,
    isError: forwardingQuery.isError,
    error: forwardingQuery.error,

    // Mutations
    updateForwarding: updateForwarding.mutate,
    updateForwardingAsync: updateForwarding.mutateAsync,
    isUpdating: updateForwarding.isPending,

    addTarget: addTarget.mutate,
    addTargetAsync: addTarget.mutateAsync,
    isAddingTarget: addTarget.isPending,

    removeTarget: removeTarget.mutate,
    removeTargetAsync: removeTarget.mutateAsync,
    isRemovingTarget: removeTarget.isPending,

    clearTargets: clearTargets.mutate,
    clearTargetsAsync: clearTargets.mutateAsync,
    isClearingTargets: clearTargets.isPending,
  };
};
