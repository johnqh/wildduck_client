import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Optional,
  WildduckAddress,
  WildduckConfig,
  WildduckCreateAddressRequest,
  WildduckUpdateAddressRequest,
} from "@sudobility/types";
import { WildduckMockData } from "./mocks";

interface ForwardedAddress {
  id: string;
  address: string;
  forwarded: boolean;
  target: string;
  user?: string;
}

interface UseWildduckAddressesReturn {
  // Query state
  addresses: WildduckAddress[];
  isLoading: boolean;
  error: Optional<string>;

  // Query functions
  getUserAddresses: (userId: string) => Promise<WildduckAddress[]>;
  getForwardedAddresses: () => Promise<ForwardedAddress[]>;
  resolveAddress: (
    address: string,
  ) => Promise<{ success: boolean; user?: string }>;
  refresh: (userId: string) => Promise<void>;

  // Create address mutation
  createAddress: (
    userId: string,
    params: WildduckCreateAddressRequest,
  ) => Promise<{ success: boolean; id: string }>;
  isCreating: boolean;
  createError: Optional<Error>;

  // Update address mutation
  updateAddress: (
    userId: string,
    addressId: string,
    params: WildduckUpdateAddressRequest,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  // Delete address mutation
  deleteAddress: (
    userId: string,
    addressId: string,
  ) => Promise<{ success: boolean }>;
  isDeleting: boolean;
  deleteError: Optional<Error>;

  // Forwarded address mutations
  createForwardedAddress: (
    address: string,
    target: string,
  ) => Promise<{ success: boolean; id: string }>;
  deleteForwardedAddress: (addressId: string) => Promise<{ success: boolean }>;

  // Legacy compatibility
  clearError: () => void;
}

/**
 * Hook for Wildduck address management operations using React Query
 * Mutations automatically invalidate related address queries
 */
const useWildduckAddresses = (
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckAddressesReturn => {
  const queryClient = useQueryClient();

  // Local state
  const [addresses, setAddresses] = useState<WildduckAddress[]>([]);

  // Helper to build headers
  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = config.apiToken;
    }

    return headers;
  };

  // Get user addresses function (imperative)
  const getUserAddresses = useCallback(
    async (userId: string): Promise<WildduckAddress[]> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.get(
          `${apiUrl}/users/${userId}/addresses`,
          {
            headers,
          },
        );

        const addressData = response.data as {
          success: boolean;
          results: Array<{ id: string; address: string; main: boolean }>;
        };
        const addressList =
          addressData.results?.map((addr) => ({
            id: addr.id,
            address: addr.address,
            name: addr.address,
            main: addr.main,
            created: new Date().toISOString(),
            tags: [],
          })) || [];

        setAddresses(addressList);

        // Update cache
        queryClient.setQueryData(["wildduck-addresses", userId], addressList);

        return addressList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get addresses";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Get user addresses failed, returning mock data:",
            errorMessage,
          );
          const mockData = WildduckMockData.getUserAddresses();
          const mockAddresses = mockData.data.addresses as WildduckAddress[];
          setAddresses(mockAddresses);

          // Update cache with mock data
          queryClient.setQueryData(
            ["wildduck-addresses", userId],
            mockAddresses,
          );

          return mockAddresses;
        }

        setAddresses([]);
        throw new Error(errorMessage);
      }
    },
    [
      config.cloudflareWorkerUrl,
      config.backendUrl,
      buildHeaders,
      devMode,
      queryClient,
    ],
  );

  // Get forwarded addresses function (imperative)
  const getForwardedAddresses = async (): Promise<ForwardedAddress[]> => {
    try {
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
      const headers = buildHeaders();

      const response = await axios.get(`${apiUrl}/addresses/forwarded`, {
        headers,
      });

      return (response.data as { results?: ForwardedAddress[] }).results || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to get forwarded addresses";

      // Return mock data in devMode when API fails
      if (devMode) {
        console.warn(
          "[DevMode] Get forwarded addresses failed, returning mock data:",
          errorMessage,
        );
        const mockData = WildduckMockData.getForwardedAddresses();
        return mockData.data.addresses as ForwardedAddress[];
      }

      throw new Error(errorMessage);
    }
  };

  // Resolve address function (imperative)
  const resolveAddress = async (
    address: string,
  ): Promise<{ success: boolean; user?: string }> => {
    try {
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
      const headers = buildHeaders();

      const response = await axios.get(
        `${apiUrl}/addresses/resolve/${encodeURIComponent(address)}`,
        { headers },
      );

      return response.data as { success: boolean; user?: string };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resolve address";

      // Return mock data in devMode when API fails
      if (devMode) {
        console.warn(
          "[DevMode] Resolve address failed, returning mock success:",
          errorMessage,
        );
        return WildduckMockData.getResolveAddress(address);
      }

      throw new Error(errorMessage);
    }
  };

  // Create address mutation
  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-address",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userId,
      params,
    }: {
      userId: string;
      params: WildduckCreateAddressRequest;
    }): Promise<{ success: boolean; id: string }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.post(
          `${apiUrl}/users/${userId}/addresses`,
          params,
          { headers },
        );

        return response.data as { success: boolean; id: string };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create address";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Create address failed, returning mock success:",
            errorMessage,
          );
          return WildduckMockData.getCreateAddress();
        }

        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate addresses query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-addresses", variables.userId],
      });
    },
  });

  // Update address mutation
  const updateMutation = useMutation({
    mutationKey: [
      "wildduck-update-address",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userId,
      addressId,
      params,
    }: {
      userId: string;
      addressId: string;
      params: WildduckUpdateAddressRequest;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.put(
          `${apiUrl}/users/${userId}/addresses/${addressId}`,
          params,
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update address";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Update address failed, returning mock success:",
            errorMessage,
          );
          return WildduckMockData.getUpdateAddress();
        }

        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate addresses query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-addresses", variables.userId],
      });
    },
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationKey: [
      "wildduck-delete-address",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      userId,
      addressId,
    }: {
      userId: string;
      addressId: string;
    }): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.delete(
          `${apiUrl}/users/${userId}/addresses/${addressId}`,
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete address";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Delete address failed, returning mock success:",
            errorMessage,
          );
          return WildduckMockData.getDeleteAddress();
        }

        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate addresses query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-addresses", variables.userId],
      });
    },
  });

  // Create forwarded address mutation
  const createForwardedMutation = useMutation({
    mutationKey: [
      "wildduck-create-forwarded-address",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      address,
      target,
    }: {
      address: string;
      target: string;
    }): Promise<{ success: boolean; id: string }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.post(
          `${apiUrl}/addresses/forwarded`,
          { address, target },
          { headers },
        );

        return response.data as { success: boolean; id: string };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to create forwarded address";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Create forwarded address failed, returning mock success:",
            errorMessage,
          );
          return WildduckMockData.getCreateForwardedAddress();
        }

        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      // Invalidate forwarded addresses query
      queryClient.invalidateQueries({
        queryKey: ["wildduck-forwarded-addresses"],
      });
    },
  });

  // Delete forwarded address mutation
  const deleteForwardedMutation = useMutation({
    mutationKey: [
      "wildduck-delete-forwarded-address",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (addressId: string): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers = buildHeaders();

        const response = await axios.delete(
          `${apiUrl}/addresses/forwarded/${addressId}`,
          { headers },
        );

        return response.data as { success: boolean };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to delete forwarded address";

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] Delete forwarded address failed, returning mock success:",
            errorMessage,
          );
          return WildduckMockData.getDeleteForwardedAddress();
        }

        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      // Invalidate forwarded addresses query
      queryClient.invalidateQueries({
        queryKey: ["wildduck-forwarded-addresses"],
      });
    },
  });

  // Refresh function (refetch user addresses)
  const refresh = useCallback(
    async (userId: string): Promise<void> => {
      await getUserAddresses(userId);
    },
    [getUserAddresses],
  );

  // Aggregate loading and error states for legacy compatibility
  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    createForwardedMutation.isPending ||
    deleteForwardedMutation.isPending;

  const error: Optional<string> =
    createMutation.error?.message ||
    updateMutation.error?.message ||
    deleteMutation.error?.message ||
    createForwardedMutation.error?.message ||
    deleteForwardedMutation.error?.message ||
    null;

  const createAddress = useCallback(
    async (userId: string, params: WildduckCreateAddressRequest) =>
      createMutation.mutateAsync({ userId, params }),
    [createMutation],
  );

  const updateAddress = useCallback(
    async (
      userId: string,
      addressId: string,
      params: WildduckUpdateAddressRequest,
    ) => updateMutation.mutateAsync({ userId, addressId, params }),
    [updateMutation],
  );

  const deleteAddress = useCallback(
    async (userId: string, addressId: string) =>
      deleteMutation.mutateAsync({ userId, addressId }),
    [deleteMutation],
  );

  const createForwardedAddress = useCallback(
    async (address: string, target: string) =>
      createForwardedMutation.mutateAsync({ address, target }),
    [createForwardedMutation],
  );

  const deleteForwardedAddress = useCallback(
    async (addressId: string) => deleteForwardedMutation.mutateAsync(addressId),
    [deleteForwardedMutation],
  );

  const clearError = useCallback(() => {
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
    createForwardedMutation.reset();
    deleteForwardedMutation.reset();
  }, [
    createMutation,
    updateMutation,
    deleteMutation,
    createForwardedMutation,
    deleteForwardedMutation,
  ]);

  return useMemo(
    () => ({
      // Query state
      addresses,
      isLoading,
      error,

      // Query functions
      getUserAddresses,
      getForwardedAddresses,
      resolveAddress,
      refresh,

      // Create address mutation
      createAddress,
      isCreating: createMutation.isPending,
      createError: createMutation.error,

      // Update address mutation
      updateAddress,
      isUpdating: updateMutation.isPending,
      updateError: updateMutation.error,

      // Delete address mutation
      deleteAddress,
      isDeleting: deleteMutation.isPending,
      deleteError: deleteMutation.error,

      // Forwarded address mutations
      createForwardedAddress,
      deleteForwardedAddress,

      // Legacy compatibility
      clearError,
    }),
    [
      addresses,
      isLoading,
      error,
      getUserAddresses,
      getForwardedAddresses,
      resolveAddress,
      refresh,
      createAddress,
      createMutation.isPending,
      createMutation.error,
      updateAddress,
      updateMutation.isPending,
      updateMutation.error,
      deleteAddress,
      deleteMutation.isPending,
      deleteMutation.error,
      createForwardedAddress,
      deleteForwardedAddress,
      clearError,
    ],
  );
};

export {
  useWildduckAddresses,
  type ForwardedAddress,
  type UseWildduckAddressesReturn,
};
