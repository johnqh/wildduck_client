import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWildduckUserLimits } from "../useWildduckUserLimits";
import type { WildduckClient } from "../../../network/wildduck-client";
import type { WildduckUserResponse } from "@sudobility/types";

const TEST_USER_AUTH = { username: "testuser", userId: "user123", accessToken: "test-token" };

describe("useUserLimits", () => {
  let queryClient: QueryClient;
  let mockApi: WildduckClient;

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
    } as unknown as WildduckClient;

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("query", () => {
    it("should fetch user limits successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        limits: {
          recipients: { allowed: 100, used: 25, ttl: 86400 },
          forwards: { allowed: 50, used: 10, ttl: 86400 },
          imapUpload: { allowed: 10485760, used: 1048576, ttl: 86400 },
          imapDownload: { allowed: 10485760, used: 2097152, ttl: 86400 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUserLimits(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.limits).toEqual(mockUser.limits);
      expect(result.current.recipients).toEqual({
        allowed: 100,
        used: 25,
        ttl: 86400,
      });
      expect(result.current.forwards).toEqual({
        allowed: 50,
        used: 10,
        ttl: 86400,
      });
      expect(mockApi.getUser).toHaveBeenCalledWith(TEST_USER_AUTH);
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useWildduckUserLimits(mockApi, undefined), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.limits).toBeUndefined();
      expect(mockApi.getUser).not.toHaveBeenCalled();
    });

    it("should handle missing limits in user response", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        limits: {},
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUserLimits(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.limits).toEqual({});
      expect(result.current.recipients).toBeUndefined();
      expect(result.current.forwards).toBeUndefined();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useWildduckUserLimits(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.limits).toBeUndefined();
    });
  });

  describe("updateLimits mutation", () => {
    it("should update multiple limits successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        limits: {
          recipients: { allowed: 100, used: 25, ttl: 86400 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserLimits(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateLimits({
        wildduckUserAuth: TEST_USER_AUTH,
        recipients: 200,
        forwards: 100,
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        recipients: 200,
        forwards: 100,
      });
    });

    it("should update single limit", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        limits: {
          recipients: { allowed: 100, used: 25, ttl: 86400 },
        },
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserLimits(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.updateLimitsAsync({
        wildduckUserAuth: TEST_USER_AUTH,
        imapMaxConnections: 10,
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        imapMaxConnections: 10,
      });
    });

    it("should invalidate queries after successful update", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        limits: {},
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserLimits(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.updateLimitsAsync({
        wildduckUserAuth: TEST_USER_AUTH,
        recipients: 150,
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "limits"],
      });
    });

    it("should handle update errors", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        limits: {},
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi
        .fn()
        .mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useWildduckUserLimits(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.updateLimitsAsync({
          wildduckUserAuth: TEST_USER_AUTH,
          recipients: 200,
        }),
      ).rejects.toThrow("Update failed");
    });
  });
});
