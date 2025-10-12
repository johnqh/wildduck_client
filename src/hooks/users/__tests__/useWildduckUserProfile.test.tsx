import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useWildduckUserProfile } from "../useWildduckUserProfile";
import type { WildduckAPI } from "../../../network/wildduck-client";
import type { WildduckUserResponse } from "@sudobility/types";

const TEST_USER_AUTH = { userId: "user123", accessToken: "test-token" };

describe("useUserProfile", () => {
  let queryClient: QueryClient;
  let mockApi: WildduckAPI;

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
    } as unknown as WildduckAPI;

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("query", () => {
    it("should fetch user profile successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        language: "en",
        retention: 2592000000,
        uploadSentMessages: true,
        tags: ["premium", "verified"],
        metaData: { department: "Engineering" },
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toEqual({
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        language: "en",
        retention: 2592000000,
        uploadSentMessages: true,
        tags: ["premium", "verified"],
        metaData: { department: "Engineering" },
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
      });
      expect(result.current.username).toBe("testuser");
      expect(result.current.name).toBe("Test User");
      expect(result.current.address).toBe("test@example.com");
      expect(result.current.disabled).toBe(false);
      expect(mockApi.getUser).toHaveBeenCalledWith(TEST_USER_AUTH);
    });

    it("should handle minimal user profile", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "minimal",
        name: "Minimal User",
        address: "minimal@example.com",
        retention: 0,
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.profile).toBeDefined();
      expect(result.current.tags).toEqual([]);
      expect(result.current.language).toBeUndefined();
    });

    it("should not fetch when userId is undefined", () => {
      const { result } = renderHook(() => useWildduckUserProfile(mockApi, undefined), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.profile).toBeUndefined();
      expect(mockApi.getUser).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      mockApi.getUser = vi.fn().mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.profile).toBeUndefined();
    });
  });

  describe("updateProfile mutation", () => {
    it("should update profile successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      result.current.updateProfile({
        userAuth: TEST_USER_AUTH,
        name: "Updated Name",
        language: "es",
      });

      await waitFor(() => expect(result.current.isUpdatingProfile).toBe(false));

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        name: "Updated Name",
        language: "es",
      });
    });

    it("should invalidate queries after successful update", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.updateProfileAsync({
        userAuth: TEST_USER_AUTH,
        name: "New Name",
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "profile"],
      });
    });
  });

  describe("updatePassword mutation", () => {
    it("should update password successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.updatePasswordAsync({
        userAuth: TEST_USER_AUTH,
        password: "newpassword123",
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        password: "newpassword123",
      });
    });

    it("should update password with existing password verification", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.updatePasswordAsync({
        userAuth: TEST_USER_AUTH,
        existingPassword: "oldpassword",
        password: "newpassword123",
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        existingPassword: "oldpassword",
        password: "newpassword123",
      });
    });
  });

  describe("updateTags mutation", () => {
    it("should update tags successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: ["tag1"],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.updateTagsAsync({
        userAuth: TEST_USER_AUTH,
        tags: ["tag1", "tag2", "tag3"],
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        tags: ["tag1", "tag2", "tag3"],
      });
    });
  });

  describe("setAccountStatus mutation", () => {
    it("should disable account successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.setAccountStatusAsync({
        userAuth: TEST_USER_AUTH,
        disabled: true,
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        disabled: true,
      });
    });

    it("should suspend account successfully", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.setAccountStatusAsync({
        userAuth: TEST_USER_AUTH,
        suspended: true,
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        suspended: true,
      });
    });

    it("should update both disabled and suspended status", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.setAccountStatusAsync({
        userAuth: TEST_USER_AUTH,
        disabled: true,
        suspended: true,
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {
        disabled: true,
        suspended: true,
      });
    });

    it("should handle only undefined values correctly", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.setAccountStatusAsync({
        userAuth: TEST_USER_AUTH,
      });

      expect(mockApi.updateUser).toHaveBeenCalledWith(TEST_USER_AUTH, {});
    });

    it("should invalidate queries after status update", async () => {
      const mockUser: Partial<WildduckUserResponse> = {
        id: "user123",
        username: "testuser",
        name: "Test User",
        address: "test@example.com",
        tags: [],
        disabled: false,
        suspended: false,
        activated: true,
        hasPasswordSet: true,
        disabledScopes: [],
        retention: 0,
      };

      mockApi.getUser = vi.fn().mockResolvedValue(mockUser);
      mockApi.updateUser = vi.fn().mockResolvedValue({ success: true });

      const { result } = renderHook(() => useWildduckUserProfile(mockApi, TEST_USER_AUTH), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.setAccountStatusAsync({
        userAuth: TEST_USER_AUTH,
        disabled: true,
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["user", "user123", "profile"],
      });
    });
  });
});
