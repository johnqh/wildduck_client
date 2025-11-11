import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  NetworkClient,
  Optional,
  WildduckAddress,
  WildduckConfig,
  WildduckCreateAddressRequest,
  WildduckUpdateAddressRequest,
  WildduckUserAuth,
} from "@sudobility/types";
import { WildduckMockData } from "./mocks";
import { WildduckClient } from "../network/wildduck-client";

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
  getUserAddresses: (
    wildduckUserAuth: WildduckUserAuth,
  ) => Promise<WildduckAddress[]>;
  getForwardedAddresses: () => Promise<ForwardedAddress[]>;
  resolveAddress: (
    address: string,
  ) => Promise<{ success: boolean; user?: string }>;
  refresh: (wildduckUserAuth: WildduckUserAuth) => Promise<void>;

  // Create address mutation
  createAddress: (
    wildduckUserAuth: WildduckUserAuth,
    params: WildduckCreateAddressRequest,
  ) => Promise<{ success: boolean; id: string }>;
  isCreating: boolean;
  createError: Optional<Error>;

  // Update address mutation
  updateAddress: (
    wildduckUserAuth: WildduckUserAuth,
    addressId: string,
    params: WildduckUpdateAddressRequest,
  ) => Promise<{ success: boolean }>;
  isUpdating: boolean;
  updateError: Optional<Error>;

  // Delete address mutation
  deleteAddress: (
    wildduckUserAuth: WildduckUserAuth,
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
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param devMode - Development mode flag
 */
const useWildduckAddresses = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckAddressesReturn => {
  const queryClient = useQueryClient();

  // Local state
  const [addresses, setAddresses] = useState<WildduckAddress[]>([]);

  // Create API instance
  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Get user addresses function (imperative)
  const getUserAddresses = useCallback(
    async (wildduckUserAuth: WildduckUserAuth): Promise<WildduckAddress[]> => {
      try {
        const response = await api.getAddresses(wildduckUserAuth);

        const addressList =
          response.results?.map((addr) => ({
            id: addr.id,
            address: addr.address,
            name: addr.address,
            main: addr.main,
            created: new Date().toISOString(),
            tags: [],
          })) || [];

        setAddresses(addressList);

        // Update cache
        queryClient.setQueryData(
          ["wildduck-addresses", wildduckUserAuth.userId],
          addressList,
        );

        return addressList;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get addresses";

        // Return mock data in devMode when API fails
        if (devMode) {
          const mockData = WildduckMockData.getUserAddresses();
          const mockAddresses = mockData.data.addresses as WildduckAddress[];
          setAddresses(mockAddresses);

          // Update cache with mock data
          queryClient.setQueryData(
            ["wildduck-addresses", wildduckUserAuth.userId],
            mockAddresses,
          );

          return mockAddresses;
        }

        console.error("[useWildduckAddresses] getUserAddresses error:", errorMessage);
        setAddresses([]);
        return [];
      }
    },
    [api, devMode, queryClient],
  );

  // Get forwarded addresses function (imperative)
  const getForwardedAddresses = async (): Promise<ForwardedAddress[]> => {
    try {
      const response = await api.getForwardedAddresses();

      return (response as { results?: ForwardedAddress[] }).results || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to get forwarded addresses";

      // Return mock data in devMode when API fails
      if (devMode) {
        const mockData = WildduckMockData.getForwardedAddresses();
        return mockData.data.addresses as ForwardedAddress[];
      }

      console.error("[useWildduckAddresses] getForwardedAddresses error:", errorMessage);
      return [];
    }
  };

  // Resolve address function (imperative)
  const resolveAddress = async (
    address: string,
  ): Promise<{ success: boolean; user?: string }> => {
    try {
      const response = await api.resolveAddress(address);

      return response as { success: boolean; user?: string };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resolve address";

      // Return mock data in devMode when API fails
      if (devMode) {
        return WildduckMockData.getResolveAddress(address);
      }

      console.error("[useWildduckAddresses] resolveAddress error:", errorMessage);
      return { success: false };
    }
  };

  // Create address mutation
  const createMutation = useMutation({
    mutationKey: [
      "wildduck-create-address",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async ({
      wildduckUserAuth,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      params: WildduckCreateAddressRequest;
    }): Promise<{ success: boolean; id: string }> => {
      try {
        const response = await api.createAddress(wildduckUserAuth, params);

        return response as { success: boolean; id: string };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create address";

        // Return mock data in devMode when API fails
        if (devMode) {
          return WildduckMockData.getCreateAddress();
        }

        console.error("[useWildduckAddresses] createAddress error:", errorMessage);
        return { success: false, id: '' };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate addresses query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-addresses", variables.wildduckUserAuth.userId],
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
      wildduckUserAuth,
      addressId,
      params,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      addressId: string;
      params: WildduckUpdateAddressRequest;
    }): Promise<{ success: boolean }> => {
      try {
        const response = await api.updateAddress(
          wildduckUserAuth,
          addressId,
          params,
        );

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update address";

        // Return mock data in devMode when API fails
        if (devMode) {
          return WildduckMockData.getUpdateAddress();
        }

        console.error("[useWildduckAddresses] updateAddress error:", errorMessage);
        return { success: false };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate addresses query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-addresses", variables.wildduckUserAuth.userId],
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
      wildduckUserAuth,
      addressId,
    }: {
      wildduckUserAuth: WildduckUserAuth;
      addressId: string;
    }): Promise<{ success: boolean }> => {
      try {
        const response = await api.deleteAddress(wildduckUserAuth, addressId);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete address";

        // Return mock data in devMode when API fails
        if (devMode) {
          return WildduckMockData.getDeleteAddress();
        }

        console.error("[useWildduckAddresses] deleteAddress error:", errorMessage);
        return { success: false };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate addresses query to refetch
      queryClient.invalidateQueries({
        queryKey: ["wildduck-addresses", variables.wildduckUserAuth.userId],
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
        const response = await api.createForwardedAddressSystem({
          address,
          target,
        });

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to create forwarded address";

        // Return mock data in devMode when API fails
        if (devMode) {
          return WildduckMockData.getCreateForwardedAddress();
        }

        console.error("[useWildduckAddresses] createForwardedAddress error:", errorMessage);
        return { success: false, id: '' };
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
        const response = await api.deleteForwardedAddressSystem(addressId);

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to delete forwarded address";

        // Return mock data in devMode when API fails
        if (devMode) {
          return WildduckMockData.getDeleteForwardedAddress();
        }

        console.error("[useWildduckAddresses] deleteForwardedAddress error:", errorMessage);
        return { success: false };
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
    async (wildduckUserAuth: WildduckUserAuth): Promise<void> => {
      await getUserAddresses(wildduckUserAuth);
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
    async (
      wildduckUserAuth: WildduckUserAuth,
      params: WildduckCreateAddressRequest,
    ) =>
      createMutation.mutateAsync({
        wildduckUserAuth,
        params,
      }),
    [createMutation],
  );

  const updateAddress = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      addressId: string,
      params: WildduckUpdateAddressRequest,
    ) =>
      updateMutation.mutateAsync({
        wildduckUserAuth,
        addressId,
        params,
      }),
    [updateMutation],
  );

  const deleteAddress = useCallback(
    async (wildduckUserAuth: WildduckUserAuth, addressId: string) =>
      deleteMutation.mutateAsync({
        wildduckUserAuth,
        addressId,
      }),
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
