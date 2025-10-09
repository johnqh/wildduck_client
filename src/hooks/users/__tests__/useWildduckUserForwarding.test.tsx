import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWildduckUserForwarding } from "../useWildduckUserForwarding";
import type { WildDuckAPI } from "../../../network/wildduck-client";
import type { WildduckUserResponse } from "../../../types/wildduck-types";

const TEST_USER_AUTH = { userId: "user123", accessToken: "test-token" };

describe("useUserForwarding", () => {
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
    it("should fetch user forwarding settings successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: ["forward@example.com", "backup@example.org"],
        mtaRelay: "smtp://mx.example.com:25",
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.forwarding).toEqual({
        targets: ["forward@example.com", "backup@example.org"],
        mtaRelay: "smtp://mx.example.com:25",
      });
      expect(result.current.targets).toEqual([
        "forward@example.com",
        "backup@example.org",
      ]);
      expect(result.current.mtaRelay).toBe("smtp://mx.example.com:25");
      expect(mockApi.getUser).toHaveBeenCalledWith(TEST_USER_AUTH);
    });

    it("should handle empty targets array", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.targets).toEqual([]);
      expect(result.current.mtaRelay).toBeUndefined();
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, undefined),
        { wrapper },
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.forwarding).toBeUndefined();
      expect(mockApi.getUser).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.forwarding).toBeUndefined();
    });
  });

  describe("updateForwarding mutation", () => {
    it("should update forwarding settings successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateForwarding({
        userAuth: TEST_USER_AUTH,
        targets: ["new@example.com"],
        mtaRelay: "smtp://relay.example.com:587",
      });

      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        targets: ["new@example.com"],
        mtaRelay: "smtp://relay.example.com:587",
      });
    });
  });

  describe("addTarget mutation", () => {
    it("should add forwarding target successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: ["existing@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.addTargetAsync({
        userAuth: TEST_USER_AUTH,
        target: "new@example.com",
      });

      expect(mockApi.getUser).toHaveBeenCalledWith(TEST_USER_AUTH);
      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        targets: ["existing@example.com", "new@example.com"],
      });
    });

    it("should add target to empty list", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.addTargetAsync({
        userAuth: TEST_USER_AUTH,
        target: "first@example.com",
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        targets: ["first@example.com"],
      });
    });
  });

  describe("removeTarget mutation", () => {
    it("should remove forwarding target successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: ["keep@example.com", "remove@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.removeTargetAsync({
        userAuth: TEST_USER_AUTH,
        target: "remove@example.com",
      });

      expect(mockApi.getUser).toHaveBeenCalledWith(TEST_USER_AUTH);
      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        targets: ["keep@example.com"],
      });
    });

    it("should handle removing non-existent target", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: ["existing@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.removeTargetAsync({
        userAuth: TEST_USER_AUTH,
        target: "nonexistent@example.com",
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        targets: ["existing@example.com"],
      });
    });
  });

  describe("clearTargets mutation", () => {
    it("should clear all forwarding targets successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: ["target1@example.com", "target2@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.clearTargetsAsync(TEST_USER_AUTH);

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        targets: [],
      });
    });

    it("should invalidate queries after clearing targets", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        targets: ["target@example.com"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useWildduckUserForwarding(mockApi, TEST_USER_AUTH),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.clearTargetsAsync(TEST_USER_AUTH);

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "forwarding"],
      });
    });
  });
});
