import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserSpam } from "../useUserSpam";
import type { WildDuckAPI } from "../../../network/wildduck-client";
import type { UserResponse } from "../../../types/wildduck-types";

describe("useUserSpam", () => {
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
    it("should fetch user spam settings successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 75,
        fromWhitelist: ["trusted@example.com", "*@trusted-domain.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.spam).toEqual({
        spamLevel: 75,
        fromWhitelist: ["trusted@example.com", "*@trusted-domain.com"],
      });
      expect(result.current.spamLevel).toBe(75);
      expect(result.current.fromWhitelist).toEqual([
        "trusted@example.com",
        "*@trusted-domain.com",
      ]);
      expect(mockApi.getUser).toHaveBeenCalledWith("user123");
    });

    it("should handle empty whitelist", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.fromWhitelist).toEqual([]);
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useUserSpam(mockApi, undefined), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.spam).toBeUndefined();
      expect(mockApi.getUser).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.spam).toBeUndefined();
    });
  });

  describe("updateSpam mutation", () => {
    it("should update spam settings successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateSpam({
        userId: "user123",
        spamLevel: 80,
        fromWhitelist: ["safe@example.com"],
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        spamLevel: 80,
        fromWhitelist: ["safe@example.com"],
      });
    });
  });

  describe("updateSpamLevel mutation", () => {
    it("should update spam level successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.updateSpamLevelAsync({
        userId: "user123",
        spamLevel: 90,
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        spamLevel: 90,
      });
    });

    it("should reject spam level below 0", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.updateSpamLevelAsync({
          userId: "user123",
          spamLevel: -1,
        }),
      ).rejects.toThrow("Spam level must be between 0 and 100");
    });

    it("should reject spam level above 100", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.updateSpamLevelAsync({
          userId: "user123",
          spamLevel: 101,
        }),
      ).rejects.toThrow("Spam level must be between 0 and 100");
    });

    it("should accept spam level at boundaries", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.updateSpamLevelAsync({
        userId: "user123",
        spamLevel: 0,
      });
      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        spamLevel: 0,
      });

      await result.current.updateSpamLevelAsync({
        userId: "user123",
        spamLevel: 100,
      });
      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        spamLevel: 100,
      });
    });
  });

  describe("addToWhitelist mutation", () => {
    it("should add address to whitelist successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: ["existing@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.addToWhitelistAsync({
        userId: "user123",
        address: "new@example.com",
      });

      expect(mockApi.getUser).toHaveBeenCalledWith("user123");
      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        fromWhitelist: ["existing@example.com", "new@example.com"],
      });
    });

    it("should add address to empty whitelist", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.addToWhitelistAsync({
        userId: "user123",
        address: "first@example.com",
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        fromWhitelist: ["first@example.com"],
      });
    });
  });

  describe("removeFromWhitelist mutation", () => {
    it("should remove address from whitelist successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: ["keep@example.com", "remove@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.removeFromWhitelistAsync({
        userId: "user123",
        address: "remove@example.com",
      });

      expect(mockApi.getUser).toHaveBeenCalledWith("user123");
      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        fromWhitelist: ["keep@example.com"],
      });
    });

    it("should handle removing non-existent address", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: ["existing@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.removeFromWhitelistAsync({
        userId: "user123",
        address: "nonexistent@example.com",
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        fromWhitelist: ["existing@example.com"],
      });
    });
  });

  describe("clearWhitelist mutation", () => {
    it("should clear all whitelist entries successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: ["addr1@example.com", "addr2@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.clearWhitelistAsync("user123");

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        fromWhitelist: [],
      });
    });

    it("should invalidate queries after clearing whitelist", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        spamLevel: 50,
        fromWhitelist: ["addr@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserSpam(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.clearWhitelistAsync("user123");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "spam"],
      });
    });
  });
});
