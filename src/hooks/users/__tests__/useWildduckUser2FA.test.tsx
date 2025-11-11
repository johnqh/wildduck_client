import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWildduckUser2FA } from "../useWildduckUser2FA";
import type { WildduckClient } from "../../../network/wildduck-client";
import type { WildduckUserResponse } from "@sudobility/types";

const TEST_USER_AUTH = { username: "testuser", userId: "user123", accessToken: "test-token" };

describe("useUser2FA", () => {
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
    it("should fetch user 2FA settings successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["totp", "u2f"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.twoFA).toEqual({
        enabled2fa: ["totp", "u2f"],
      });
      expect(result.current.enabled2fa).toEqual(["totp", "u2f"]);
      expect(result.current.isEnabled).toBe(true);
      expect(mockApi.getUser).toHaveBeenCalledWith(TEST_USER_AUTH);
    });

    it("should handle no 2FA enabled", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.enabled2fa).toEqual([]);
      expect(result.current.isEnabled).toBe(false);
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useWildduckUser2FA(mockApi, undefined), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.twoFA).toBeUndefined();
      expect(mockApi.getUser).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.twoFA).toBeUndefined();
    });
  });

  describe("helper methods", () => {
    it("should correctly identify TOTP method", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["totp"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasTOTP).toBe(true);
      expect(result.current.hasU2F).toBe(false);
      expect(result.current.hasWebAuthn).toBe(false);
      expect(result.current.hasMethod("totp")).toBe(true);
      expect(result.current.hasMethod("u2f")).toBe(false);
    });

    it("should correctly identify U2F method", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["u2f"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasTOTP).toBe(false);
      expect(result.current.hasU2F).toBe(true);
      expect(result.current.hasWebAuthn).toBe(false);
    });

    it("should correctly identify WebAuthn method", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["webauthn"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasTOTP).toBe(false);
      expect(result.current.hasU2F).toBe(false);
      expect(result.current.hasWebAuthn).toBe(true);
    });

    it("should handle multiple 2FA methods", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["totp", "u2f", "webauthn"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasTOTP).toBe(true);
      expect(result.current.hasU2F).toBe(true);
      expect(result.current.hasWebAuthn).toBe(true);
      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe("disable2FA mutation", () => {
    it("should disable all 2FA methods successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["totp", "u2f"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.disable2FA({ wildduckUserAuth: TEST_USER_AUTH });

      await waitFor(() => expect(result.current.isDisabling).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        disable2fa: true,
      });
    });

    it("should invalidate queries after disabling 2FA", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["totp"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.disable2FAAsync({ wildduckUserAuth: TEST_USER_AUTH });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "2fa"],
      });
    });

    it("should handle disable errors", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: ["totp"],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi
        .fn()
        .mockRejectedValue(new Error("Failed to disable 2FA"));

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.disable2FAAsync({ wildduckUserAuth: TEST_USER_AUTH }),
      ).rejects.toThrow("Failed to disable 2FA");

      expect(result.current.disableError).toBeDefined();
    });

    it("should work when 2FA is already disabled", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        enabled2fa: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUser2FA(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isEnabled).toBe(false);

      await result.current.disable2FAAsync({ wildduckUserAuth: TEST_USER_AUTH });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        disable2fa: true,
      });
    });
  });
});
