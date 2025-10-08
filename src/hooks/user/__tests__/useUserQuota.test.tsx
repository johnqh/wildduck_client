import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserQuota } from "../useUserQuota";
import type { WildDuckAPI } from "../../../network/wildduck-client";
import type { UserResponse } from "../../../types/wildduck-types";

describe("useUserQuota", () => {
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
    it("should fetch user quota successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        limits: {
          quota: { allowed: 1073741824, used: 536870912 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUserQuota(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.quota).toEqual({
        allowed: 1073741824,
        used: 536870912,
      });
      expect(mockApi.getUser).toHaveBeenCalledWith("user123");
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useUserQuota(mockApi, undefined), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.quota).toBeUndefined();
      expect(mockApi.getUser).not.toHaveBeenCalled();
    });

    it("should handle missing quota in user response", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        limits: {},
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUserQuota(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.quota).toBeUndefined();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useUserQuota(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.quota).toBeUndefined();
    });
  });

  describe("updateQuota mutation", () => {
    it("should update quota successfully", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        limits: {
          quota: { allowed: 1073741824, used: 536870912 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserQuota(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateQuota({
        userId: "user123",
        quota: 2147483648,
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith("user123", {
        quota: 2147483648,
      });
    });

    it("should invalidate queries after successful update", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        limits: {
          quota: { allowed: 1073741824, used: 536870912 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserQuota(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.updateQuotaAsync({
        userId: "user123",
        quota: 2147483648,
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "quota"],
      });
    });

    it("should handle update errors", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        limits: {
          quota: { allowed: 1073741824, used: 536870912 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi
        .fn()
        .mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUserQuota(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.updateQuotaAsync({
          userId: "user123",
          quota: 2147483648,
        }),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("recalculateQuota mutation", () => {
    it("should throw not implemented error", async () => {
      const mockUser: Partial<UserResponse> = {
        id: "user123",
        limits: {
          quota: { allowed: 1073741824, used: 536870912 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUserQuota(mockApi, "user123"), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.recalculateQuotaAsync("user123"),
      ).rejects.toThrow("Recalculate quota endpoint not yet implemented");
    });
  });
});
