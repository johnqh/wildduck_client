import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { WildduckAPI } from "../../network/wildduck-client";
import type {
  WildduckLimits,
  WildduckUserAuth,
  WildduckUserResponse,
} from "@sudobility/types";

export interface UpdateWildduckLimitsParams {
  wildduckUserAuth: WildduckUserAuth;
  recipients?: number; // How many messages per 24 hour can be sent
  forwards?: number; // How many messages per 24 hour can be forwarded
  filters?: number; // How many filters are allowed
  imapMaxUpload?: number; // How many bytes can be uploaded via IMAP during 24 hour
  imapMaxDownload?: number; // How many bytes can be downloaded via IMAP during 24 hour
  pop3MaxDownload?: number; // How many bytes can be downloaded via POP3 during 24 hour
  pop3MaxMessages?: number; // How many latest messages to list in POP3 session
  imapMaxConnections?: number; // How many parallel IMAP connections are allowed
  receivedMax?: number; // How many messages can be received from MX during 60 seconds
}

/**
 * Hook for managing user rate limits
 * Handles various limits: sending, forwarding, IMAP/POP3 quotas, connection limits
 */
export const useWildduckUserLimits = (
  api: WildduckAPI,
  wildduckUserAuth?: WildduckUserAuth,
) => {
  const queryClient = useQueryClient();
  const userId = wildduckUserAuth?.userId;

  // Query to get user limits
  const limitsQuery = useQuery({
    queryKey: ["user", userId, "limits"],
    queryFn: async (): Promise<WildduckLimits | undefined> => {
      if (!wildduckUserAuth) throw new Error("User auth is required");
      const user = (await api.getUser(
        wildduckUserAuth,
      )) as unknown as WildduckUserResponse;
      return user.limits;
    },
    enabled: !!wildduckUserAuth,
  });

  // Mutation to update limits
  const updateLimits = useMutation({
    mutationFn: async (params: UpdateWildduckLimitsParams) => {
      const { wildduckUserAuth, ...limits } = params;
      return await api.updateUser(wildduckUserAuth, limits);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.wildduckUserAuth.userId, "limits"],
      });
    },
  });

  const handleUpdateLimits = useCallback(
    (params: UpdateWildduckLimitsParams) => updateLimits.mutate(params),
    [updateLimits],
  );

  const handleUpdateLimitsAsync = useCallback(
    async (params: UpdateWildduckLimitsParams) =>
      updateLimits.mutateAsync(params),
    [updateLimits],
  );

  return useMemo(
    () => ({
      // Query
      limits: limitsQuery.data,
      isLoading: limitsQuery.isLoading,
      isError: limitsQuery.isError,
      error: limitsQuery.error,

      // Individual limit accessors for convenience
      quota: limitsQuery.data?.quota,
      recipients: limitsQuery.data?.recipients,
      forwards: limitsQuery.data?.forwards,
      received: limitsQuery.data?.received,
      imapUpload: limitsQuery.data?.imapUpload,
      imapDownload: limitsQuery.data?.imapDownload,
      pop3Download: limitsQuery.data?.pop3Download,
      imapMaxConnections: limitsQuery.data?.imapMaxConnections,

      // Mutation
      updateLimits: handleUpdateLimits,
      updateLimitsAsync: handleUpdateLimitsAsync,
      isUpdating: updateLimits.isPending,
      updateError: updateLimits.error,
    }),
    [
      limitsQuery.data,
      limitsQuery.isLoading,
      limitsQuery.isError,
      limitsQuery.error,
      handleUpdateLimits,
      handleUpdateLimitsAsync,
      updateLimits.isPending,
      updateLimits.error,
    ],
  );
};
