import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWildduckUserQuota } from "../useWildduckUserQuota";
import type { WildDuckAPI } from "../../../network/wildduck-client";
import type { UserResponse } from "../../../types/wildduck-types";

const TEST_USER_AUTH = { userId: "user123", accessToken: "test-token" };

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

      const { result } = renderHook(() => useWildduckUserQuota(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.quota).toEqual({
        allowed: 1073741824,
        used: 536870912,
      });
      expect(mockApi.getUser).toHaveBeenCalledWith(TEST_USER_AUTH);
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useWildduckUserQuota(mockApi, undefined), {
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

      const { result } = renderHook(() => useWildduckUserQuota(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.quota).toBeUndefined();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useWildduckUserQuota(mockApi, TEST_USER_AUTH), {
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

      const { result } = renderHook(() => useWildduckUserQuota(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateQuota({
        userAuth: TEST_USER_AUTH,
        quota: 2147483648,
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
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

      const { result } = renderHook(() => useWildduckUserQuota(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.updateQuotaAsync({
        userAuth: TEST_USER_AUTH,
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

      const { result } = renderHook(() => useWildduckUserQuota(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.updateQuotaAsync({
          userAuth: TEST_USER_AUTH,
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

      const { result } = renderHook(() => useWildduckUserQuota(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.recalculateQuotaAsync("user123"),
      ).rejects.toThrow("Recalculate quota endpoint not yet implemented");
    });
  });
});
