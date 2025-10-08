import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import axios from "axios";
import { useStorageService } from "./useServices";
import type {
  AuthenticateRequest,
  WildDuckAuthResponse as AuthenticationResponse,
  Optional,
  PreAuthRequest,
  WildDuckPreAuthResponse as PreAuthResponse,
  WildDuckConfig,
} from "@johnqh/types";
import { createAuthenticateRequest, createPreAuthRequest } from "@johnqh/types";
import { WildDuckMockData } from "./mocks";

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
 * Hook for WildDuck authentication operations using React Query
 * All mutations are automatically deduplicated and cached by React Query
 */
const useWildduckAuth = (
  config: WildDuckConfig,
  devMode: boolean = false,
): UseWildduckAuthReturn => {
  const storageService = useStorageService();
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
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const requestBody = createAuthenticateRequest(
          params.username,
          params.signature,
          params.nonce,
          params.message,
          {
            ...(params.signer && { signer: params.signer }),
            ...(params.scope && { scope: params.scope }),
            ...(params.protocol && { protocol: params.protocol }),
            ...(params.token !== undefined && { token: params.token }),
            ...(params.appId && { appId: params.appId }),
            sess: "api-session",
            ip: "127.0.0.1",
          },
        );

        const response = await axios.post(
          `${apiUrl}/authenticate`,
          requestBody,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        const result = response.data as AuthenticationResponse;

        // Store token if authentication was successful
        if (result.success && result.token) {
          await storageService.setItem("wildduck_token", result.token);
        }

        return result;
      } catch (err: unknown) {
        const errorMessage =
          (err as any)?.response?.data?.error ||
          (err instanceof Error ? err.message : "Authentication failed");

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] authenticate failed, returning mock data:",
            errorMessage,
          );
          const mockResult = WildDuckMockData.getAuthentication(
            params.username,
          );

          // Store mock token
          if (mockResult.token) {
            await storageService.setItem("wildduck_token", mockResult.token);
          }
          return mockResult;
        }

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

        const response = await axios.post(`${apiUrl}/preauth`, requestBody, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        return response.data as PreAuthResponse;
      } catch (err: unknown) {
        const errorMessage =
          (err as any)?.response?.data?.error ||
          (err instanceof Error ? err.message : "Pre-authentication failed");

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] preAuth failed, returning mock data:",
            errorMessage,
          );
          return WildDuckMockData.getPreAuth();
        }

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
        const authToken =
          token || (await storageService.getItem("wildduck_token"));

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

        const response = await axios.delete(`${apiUrl}/authenticate`, {
          headers,
        });

        const result = response.data as { success: boolean };

        // Clear stored token on successful logout
        if (result.success) {
          await storageService.removeItem("wildduck_token");
        }

        return result;
      } catch (err: unknown) {
        const errorMessage =
          (err as any)?.response?.data?.error ||
          (err instanceof Error ? err.message : "Logout failed");

        // Return mock data in devMode when API fails
        if (devMode) {
          console.warn(
            "[DevMode] logout failed, returning mock data:",
            errorMessage,
          );
          await storageService.removeItem("wildduck_token");
          return WildDuckMockData.getLogout();
        }

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
  const getAuthStatus = async (): Promise<{
    authenticated: boolean;
    user?: any;
  }> => {
    try {
      // Check if user has valid token or authentication status
      const token = await storageService.getItem("wildduck_token");
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

        const response = await axios.get(`${apiUrl}/users/me`, { headers });

        return { authenticated: true, user: response.data };
      } catch {
        return { authenticated: false };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check auth status";

      // Return mock data in devMode when API fails
      if (devMode) {
        console.warn(
          "[DevMode] getAuthStatus failed, returning mock data:",
          errorMessage,
        );
        return WildDuckMockData.getAuthStatus();
      }

      return { authenticated: false };
    }
  };

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

  return {
    // Authenticate
    authenticate: authenticateMutation.mutateAsync,
    isAuthenticating: authenticateMutation.isPending,
    authError: authenticateMutation.error,
    authData, // Expose auth result from singleton (userId, token, etc.)

    // PreAuth
    preAuth: preAuthMutation.mutateAsync,
    isPreAuthing: preAuthMutation.isPending,
    preAuthError: preAuthMutation.error,

    // Logout
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    logoutError: logoutMutation.error,

    // Auth status check
    getAuthStatus,

    // Legacy compatibility
    isLoading,
    error,
    clearError: () => {
      authenticateMutation.reset();
      preAuthMutation.reset();
      logoutMutation.reset();
    },
  };
};

export { useWildduckAuth, type UseWildduckAuthReturn };
