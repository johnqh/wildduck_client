import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserEncryption } from "../useUserEncryption";
import type { WildDuckAPI } from "../../../network/wildduck-client";
import type { UserResponse } from "../../../types/wildduck-types";

describe("useUserEncryption", () => {
  let queryClient: QueryClient;
  let mockApi: WildDuckAPI;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockApi = {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    } as unknown as WildDuckAPI;

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("query", () => {
    it("should fetch user encryption settings successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        encryptMessages: true,
        encryptForwarded: false,
        pubKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
        keyInfo: {
          name: "John Doe",
          address: "john@example.com",
          fingerprint: "ABCD1234",
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.encryption).toEqual({
        encryptMessages: true,
        encryptForwarded: false,
        pubKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
        keyInfo: {
          name: "John Doe",
          address: "john@example.com",
          fingerprint: "ABCD1234",
        },
      });
      expect(result.current.encryptMessages).toBe(true);
      expect(result.current.encryptForwarded).toBe(false);
      expect(result.current.pubKey).toBe(
        "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
      );
      expect(mockApi.getUser).toHaveBeenCalledWith("user123");
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(
        () => useUserEncryption(mockApi, undefined),
        { wrapper },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.encryption).toBeUndefined();
      expect(mockApi.getUser).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.encryption).toBeUndefined();
    });
  });

  describe("updateEncryption mutation", () => {
    it("should update encryption settings successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        encryptMessages: false,
        encryptForwarded: false,
        pubKey: "",
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateEncryption({
        userId: "user123",
        encryptMessages: true,
        encryptForwarded: true,
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        encryptMessages: true,
        encryptForwarded: true,
      });
    });

    it("should invalidate queries after successful update", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        encryptMessages: false,
        encryptForwarded: false,
        pubKey: "",
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.updateEncryptionAsync({
        userId: "user123",
        encryptMessages: true,
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "encryption"],
      });
    });
  });

  describe("updatePubKey mutation", () => {
    it("should update PGP public key successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        encryptMessages: false,
        encryptForwarded: false,
        pubKey: "",
      };

      const newPubKey = "-----BEGIN PGP PUBLIC KEY BLOCK-----\ntest key\n...";

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.updatePubKeyAsync({
        userId: "user123",
        pubKey: newPubKey,
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        pubKey: newPubKey,
      });
    });

    it("should handle update errors", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        encryptMessages: false,
        encryptForwarded: false,
        pubKey: "",
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi
        .fn()
        .mockRejectedValue(new Error("Invalid key format"));

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.updatePubKeyAsync({
          userId: "user123",
          pubKey: "invalid key",
        }),
      ).rejects.toThrow("Invalid key format");
    });
  });

  describe("removePubKey mutation", () => {
    it("should remove PGP public key successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        encryptMessages: true,
        encryptForwarded: false,
        pubKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.removePubKeyAsync("user123");

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        pubKey: "",
      });
    });

    it("should invalidate queries after removing key", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        encryptMessages: true,
        encryptForwarded: false,
        pubKey: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n...",
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useUserEncryption(mockApi, "user123"),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.removePubKeyAsync("user123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "encryption"],
      });
    });
  });
});
