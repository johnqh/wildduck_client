import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StorageService } from "@sudobility/di";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  WildduckAuthResponse as AuthenticationResponse,
  WildduckPreAuthResponse as PreAuthResponse,
  WildduckAuthenticateRequest,
  WildduckConfig,
  WildduckPreAuthRequest,
} from "@sudobility/types";
import {
  createAuthenticateRequest,
  createPreAuthRequest,
} from "@sudobility/types";

// Type aliases for legacy compatibility
type AuthenticateRequest = WildduckAuthenticateRequest;
type PreAuthRequest = WildduckPreAuthRequest;

// Singleton to persist authData across all hook instances
class AuthDataStore {
  private authData: Optional<AuthenticationResponse> = null;
  private listeners: Set<(data: Optional<AuthenticationResponse>) => void> =
    new Set();

  setAuthData(data: Optional<AuthenticationResponse>) {
    this.authData = data;
    this.notifyListeners();
  }

  getAuthData(): Optional<AuthenticationResponse> {
    return this.authData;
  }

  subscribe(listener: (data: Optional<AuthenticationResponse>) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.authData));
  }

  clear() {
    this.authData = null;
    this.notifyListeners();
  }
}

const authDataStore = new AuthDataStore();

interface UseWildduckAuthReturn {
  // Authenticate mutation
  authenticate: (
    params: Omit<AuthenticateRequest, "sess" | "ip">,
  ) => Promise<AuthenticationResponse>;
  isAuthenticating: boolean;
  authError: Optional<Error>;
  authData: Optional<AuthenticationResponse>; // Current auth result with userId, token

  // PreAuth mutation
  preAuth: (
    params: Omit<PreAuthRequest, "sess" | "ip">,
  ) => Promise<PreAuthResponse>;
  isPreAuthing: boolean;
  preAuthError: Optional<Error>;

  // Logout mutation
  logout: (token?: string) => Promise<{ success: boolean }>;
  isLoggingOut: boolean;
  logoutError: Optional<Error>;

  // Auth status check
  getAuthStatus: () => Promise<{ authenticated: boolean; user?: any }>;

  // Legacy compatibility
  isLoading: boolean;
  error: Optional<string>;
  clearError: () => void;
}

/**
 * Hook for Wildduck authentication operations using React Query
 * All mutations are automatically deduplicated and cached by React Query
 *
 * @param networkClient - Network client for API calls
 * @param config - WildDuck configuration
 * @param storage - Storage service for persisting auth tokens
 * @param devMode - Enable development mode (passed as isDev parameter to authenticate)
 */
const useWildduckAuth = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  storage: StorageService,
  devMode: boolean = false,
): UseWildduckAuthReturn => {
  const queryClient = useQueryClient();

  // Subscribe to singleton authData changes
  const [authData, setAuthData] = useState<Optional<AuthenticationResponse>>(
    () => authDataStore.getAuthData(),
  );

  useEffect(() => {
    const unsubscribe = authDataStore.subscribe(setAuthData);
    return unsubscribe;
  }, []);

  // Authenticate mutation
  const authenticateMutation = useMutation({
    mutationKey: [
      "wildduck-authenticate",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: Omit<AuthenticateRequest, "sess" | "ip">,
    ): Promise<AuthenticationResponse> => {
      try {
        const mutationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        console.log(
          `🔵 [${mutationId}] authenticateMutation.mutationFn called with username: ${params.username}`,
        );

        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const requestBody = {
          ...createAuthenticateRequest(
            params.username,
            params.signature,
            params.message,
            {
              ...(params.signer && { signer: params.signer }),
              ...(params.scope && { scope: params.scope }),
              ...(params.protocol && { protocol: params.protocol }),
              ...(params.token !== undefined && { token: params.token }),
              ...(params.appId && { appId: params.appId }),
              ...(params.referralCode && { referralCode: params.referralCode }),
              sess: "api-session",
              ip: "127.0.0.1",
            },
          ),
          isDev: devMode,
        };

        console.log(`🌐 [${mutationId}] Making POST to ${apiUrl}/authenticate`);
        console.log(
          `📦 [${mutationId}] Request body:`,
          JSON.stringify(requestBody, null, 2),
        );
        const response = await networkClient.request<AuthenticationResponse>(
          `${apiUrl}/authenticate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        console.log(`✅ [${mutationId}] POST completed successfully`);
        const result = response.data as AuthenticationResponse;

        // Store token if authentication was successful
        if (result.success && result.token) {
          await storage.setItem("wildduck_token", result.token);
        }

        return result;
      } catch (err: unknown) {
        const errorMessage =
          (err as any)?.response?.data?.error ||
          (err instanceof Error ? err.message : "Authentication failed");

        throw new Error(errorMessage);
      }
    },
    onSuccess: (data) => {
      // Store authData in singleton
      authDataStore.setAuthData(data);
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: ["wildduck-auth-status"] });
    },
  });

  // PreAuth mutation
  const preAuthMutation = useMutation({
    mutationKey: [
      "wildduck-preauth",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (
      params: Omit<PreAuthRequest, "sess" | "ip">,
    ): Promise<PreAuthResponse> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const requestBody = createPreAuthRequest(params.username, {
          ...(params.scope && { scope: params.scope }),
          sess: "api-session",
          ip: "127.0.0.1",
        });

        const response = await networkClient.request<PreAuthResponse>(
          `${apiUrl}/preauth`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          },
        );

        return response.data as PreAuthResponse;
      } catch (err: unknown) {
        const errorMessage =
          (err as any)?.response?.data?.error ||
          (err instanceof Error ? err.message : "Pre-authentication failed");

        throw new Error(errorMessage);
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationKey: [
      "wildduck-logout",
      config.cloudflareWorkerUrl || config.backendUrl,
    ],
    mutationFn: async (token?: string): Promise<{ success: boolean }> => {
      try {
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const authToken = token || (await storage.getItem("wildduck_token"));

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (authToken) {
          if (config.cloudflareWorkerUrl) {
            headers["Authorization"] = `Bearer ${authToken}`;
            headers["X-App-Source"] = "0xmail-box";
          } else {
            headers["X-Access-Token"] = authToken;
          }
        }

        const response = await networkClient.request<{ success: boolean }>(
          `${apiUrl}/authenticate`,
          {
            method: "DELETE",
            headers,
          },
        );

        const result = response.data as { success: boolean };

        // Clear stored token on successful logout
        if (result.success) {
          await storage.removeItem("wildduck_token");
        }

        return result;
      } catch (err: unknown) {
        const errorMessage =
          (err as any)?.response?.data?.error ||
          (err instanceof Error ? err.message : "Logout failed");

        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      // Clear authData from singleton
      authDataStore.clear();
      // Clear all cached data on logout
      queryClient.clear();
    },
  });

  // Auth status check function (imperative, not a React Query hook)
  const getAuthStatus = useCallback(async (): Promise<{
    authenticated: boolean;
    user?: any;
  }> => {
    try {
      // Check if user has valid token or authentication status
      const token = await storage.getItem("wildduck_token");
      if (!token) {
        return { authenticated: false };
      }

      // Use cloudflare worker URL if available, otherwise use backend URL
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;

      // Validate token by making a test request
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        // Set authentication headers based on configuration
        if (config.cloudflareWorkerUrl) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["X-App-Source"] = "0xmail-box";
        } else {
          headers["X-Access-Token"] = token;
        }

        const response = await networkClient.request<any>(
          `${apiUrl}/users/me`,
          {
            method: "GET",
            headers,
          },
        );

        return { authenticated: true, user: response.data };
      } catch {
        return { authenticated: false };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check auth status";
      console.error("[useWildduckAuth] getAuthStatus error:", errorMessage);

      return { authenticated: false };
    }
  }, [storage, config.cloudflareWorkerUrl, config.backendUrl]);

  // Aggregate loading and error states for legacy compatibility
  const isLoading =
    authenticateMutation.isPending ||
    preAuthMutation.isPending ||
    logoutMutation.isPending;
  const error: Optional<string> =
    authenticateMutation.error?.message ||
    preAuthMutation.error?.message ||
    logoutMutation.error?.message ||
    null;

  const authenticate = useCallback(
    async (params: Omit<AuthenticateRequest, "sess" | "ip">) =>
      authenticateMutation.mutateAsync(params),
    [authenticateMutation],
  );

  const preAuth = useCallback(
    async (params: Omit<PreAuthRequest, "sess" | "ip">) =>
      preAuthMutation.mutateAsync(params),
    [preAuthMutation],
  );

  const logout = useCallback(
    async (token?: string) => logoutMutation.mutateAsync(token),
    [logoutMutation],
  );

  const clearError = useCallback(() => {
    authenticateMutation.reset();
    preAuthMutation.reset();
    logoutMutation.reset();
  }, [authenticateMutation, preAuthMutation, logoutMutation]);

  return useMemo(
    () => ({
      // Authenticate
      authenticate,
      isAuthenticating: authenticateMutation.isPending,
      authError: authenticateMutation.error,
      authData, // Expose auth result from singleton (userId, token, etc.)

      // PreAuth
      preAuth,
      isPreAuthing: preAuthMutation.isPending,
      preAuthError: preAuthMutation.error,

      // Logout
      logout,
      isLoggingOut: logoutMutation.isPending,
      logoutError: logoutMutation.error,

      // Auth status check
      getAuthStatus,

      // Legacy compatibility
      isLoading,
      error,
      clearError,
    }),
    [
      authenticate,
      authenticateMutation.isPending,
      authenticateMutation.error,
      authData,
      preAuth,
      preAuthMutation.isPending,
      preAuthMutation.error,
      logout,
      logoutMutation.isPending,
      logoutMutation.error,
      getAuthStatus,
      isLoading,
      error,
      clearError,
    ],
  );
};

export { useWildduckAuth, type UseWildduckAuthReturn };
