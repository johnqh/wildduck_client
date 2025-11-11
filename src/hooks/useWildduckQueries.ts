/**
 * TanStack Query hooks for Wildduck API GET endpoints
 *
 * These hooks replace custom fetching logic with TanStack Query's optimized caching.
 */

import { useCallback, useMemo } from "react";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import { STALE_TIMES } from "./query-config";
import type {
  NetworkClient,
  WildduckAddress,
  WildduckConfig,
  WildduckFilterListItem,
  WildduckHealthResponse,
  WildduckMailboxResponse,
  WildduckMessage,
  WildduckMessagesResponse,
  WildduckUser,
  WildduckUserAuth,
  WildduckUserListResponse,
} from "@sudobility/types";
import { WildduckMockData } from "./mocks";
import { WildduckAPI } from "../network/wildduck-client";

interface WildduckUserSettings {
  // Define based on actual API response
  [key: string]: unknown;
}

interface WildduckAuthStatusResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    address?: string;
  };
  authenticated: boolean;
}

/**
 * Hook to get Wildduck server health status
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param devMode - Development mode flag
 * @param options - React Query options
 */
const useWildduckHealth = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
  options?: UseQueryOptions<WildduckHealthResponse>,
): UseQueryResult<WildduckHealthResponse> => {
  const queryFn = useCallback(async (): Promise<WildduckHealthResponse> => {
    const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = config.apiToken;
    }

    try {
      const response = await networkClient.request<WildduckHealthResponse>(
        `${apiUrl}/health`,
        { method: "GET", headers },
      );
      return response.data as WildduckHealthResponse;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Health check failed, returning mock data:",
          err,
        );
        return WildduckMockData.getHealthQuery();
      }
      throw err;
    }
  }, [
    networkClient,
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.health(),
    queryFn,
    staleTime: STALE_TIMES.HEALTH_STATUS,
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get users list with optional filters
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param devMode - Development mode flag
 * @param filters - Optional filters for the query
 * @param options - React Query options
 */
const useWildduckUsersList = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
  filters?: Record<string, unknown>,
  options?: UseQueryOptions<WildduckUserListResponse>,
): UseQueryResult<WildduckUserListResponse> => {
  const queryFn = useCallback(async (): Promise<WildduckUserListResponse> => {
    const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = config.apiToken;
    }

    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });
    }
    try {
      const response = await networkClient.request<WildduckUserListResponse>(
        `${apiUrl}/users?${params}`,
        { method: "GET", headers },
      );
      return response.data as WildduckUserListResponse;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get users list failed, returning mock data:",
          err,
        );
        return WildduckMockData.getUsersListQuery() as unknown as WildduckUserListResponse;
      }
      throw err;
    }
  }, [
    networkClient,
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    filters,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.usersList(filters),
    queryFn,
    staleTime: STALE_TIMES.USER_PROFILE,
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get a specific user by ID
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - User authentication info
 * @param options - React Query options
 */
const useWildduckUser = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  options?: UseQueryOptions<WildduckUser>,
): UseQueryResult<WildduckUser> => {
  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async (): Promise<WildduckUser> => {
    const response = await api.getUser(wildduckUserAuth);
    return {
      id: response.id,
      username: response.username,
      name: response.name || response.address || response.username,
      ...(response.address && { address: response.address }),
      tags: response.tags || [],
      quota: {
        allowed: 0,
        used: 0,
      },
      hasPasswordSet: response.hasPasswordSet || false,
      activated: response.activated || false,
      disabled: response.disabled || false,
      suspended: response.suspended || false,
      created: new Date().toISOString(),
    };
  }, [api, wildduckUserAuth]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.user(wildduckUserAuth.userId),
    queryFn,
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!wildduckUserAuth,
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get user addresses
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - User authentication info
 * @param options - React Query options
 */
const useWildduckUserAddresses = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  options?: UseQueryOptions<WildduckAddress[]>,
): UseQueryResult<WildduckAddress[]> => {
  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async (): Promise<WildduckAddress[]> => {
    const response = await api.getAddresses(wildduckUserAuth);
    return (
      response.results?.map((addr) => ({
        id: addr.id,
        address: addr.address,
        created: addr.created || new Date().toISOString(),
        main: addr.main,
      })) || []
    );
  }, [api, wildduckUserAuth]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userAddresses(wildduckUserAuth.userId),
    queryFn,
    staleTime: STALE_TIMES.EMAIL_ADDRESSES,
    enabled: !!wildduckUserAuth,
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get user messages with optional filters
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - User authentication info
 * @param mailboxId - Mailbox ID
 * @param filters - Optional filters
 * @param options - React Query options
 */
const useWildduckUserMessages = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  mailboxId: string,
  filters?: Record<string, unknown>,
  options?: UseQueryOptions<WildduckMessagesResponse>,
): UseQueryResult<WildduckMessagesResponse> => {
  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async (): Promise<WildduckMessagesResponse> => {
    const response = await api.getMessages(
      wildduckUserAuth,
      mailboxId,
      filters,
    );
    return response;
  }, [api, wildduckUserAuth, mailboxId, filters]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userMessages(
      wildduckUserAuth.userId,
      mailboxId,
      filters,
    ),
    queryFn,
    staleTime: STALE_TIMES.MESSAGES,
    enabled: !!(wildduckUserAuth && mailboxId),
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get a specific message
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - User authentication info
 * @param mailboxId - Mailbox ID
 * @param messageId - Message ID
 * @param options - React Query options
 */
const useWildduckMessage = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  mailboxId: string,
  messageId: string,
  options?: UseQueryOptions<WildduckMessage>,
): UseQueryResult<WildduckMessage> => {
  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async (): Promise<WildduckMessage> => {
    const response = await api.getMessage(
      wildduckUserAuth,
      mailboxId,
      messageId,
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch message");
    }
    const msg = response.data;
    const result: WildduckMessage = {
      id: msg.id,
      mailbox: msg.mailbox,
      thread: msg.thread || "",
      to:
        msg.to?.map((addr) => ({
          address: addr.address || "",
          ...(addr.name !== undefined && { name: addr.name }),
        })) || [],
      subject: msg.subject || "",
      date: msg.date || "",
      intro: msg.intro || "",
      seen: msg.seen || false,
      deleted: msg.deleted || false,
      flagged: msg.flagged || false,
      draft: msg.draft || false,
      answered: msg.answered || false,
      size: msg.size || 0,
      ha: Array.isArray(msg.attachments) ? msg.attachments.length > 0 : false,
      attachments: Array.isArray(msg.attachments)
        ? msg.attachments.length > 0
        : false,
    };

    if (msg.from) {
      result.from = {
        address: msg.from.address || "",
        ...(msg.from.name !== undefined && { name: msg.from.name }),
      };
    }

    if (msg.cc) {
      result.cc = msg.cc.map((addr) => ({
        address: addr.address || "",
        ...(addr.name !== undefined && { name: addr.name }),
      }));
    }

    if (msg.bcc) {
      result.bcc = msg.bcc.map((addr) => ({
        address: addr.address || "",
        ...(addr.name !== undefined && { name: addr.name }),
      }));
    }

    return result;
  }, [api, wildduckUserAuth, mailboxId, messageId]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.message(
      wildduckUserAuth.userId,
      mailboxId,
      messageId,
    ),
    queryFn,
    staleTime: STALE_TIMES.MESSAGE_CONTENT,
    enabled: !!(wildduckUserAuth && mailboxId && messageId),
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get user filters
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param userId - User ID
 * @param devMode - Development mode flag
 * @param options - React Query options
 */
// TODO: Add getFilters method to WildduckAPI
const useWildduckUserFilters = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  devMode: boolean = false,
  options?: UseQueryOptions<WildduckFilterListItem[]>,
): UseQueryResult<WildduckFilterListItem[]> => {
  const queryFn = useCallback(async (): Promise<WildduckFilterListItem[]> => {
    const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = config.apiToken;
    }

    try {
      const response = await networkClient.request<{ results?: any[] }>(
        `${apiUrl}/users/${userId}/filters`,
        { method: "GET", headers },
      );
      const data = response.data as { results?: any[] };
      return (
        data.results?.map((filter) => ({
          id: filter.id || "",
          name: filter.name || "",
          query: filter.query || {},
          action: filter.action || {},
          disabled: filter.disabled || false,
          created: filter.created || new Date().toISOString(),
        })) || []
      );
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get user filters failed, returning mock data:",
          err,
        );
        const mockData = WildduckMockData.getUserFiltersQuery();
        return mockData.filters as WildduckFilterListItem[];
      }
      throw err;
    }
  }, [
    networkClient,
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userFilters(userId),
    queryFn,
    staleTime: STALE_TIMES.USER_PROFILE, // Filters are part of user profile data
    enabled: !!userId,
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get user settings
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param userId - User ID
 * @param devMode - Development mode flag
 * @param options - React Query options
 */
// TODO: Add getUserSettings method to WildduckAPI
const useWildduckUserSettings = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  userId: string,
  devMode: boolean = false,
  options?: UseQueryOptions<WildduckUserSettings>,
): UseQueryResult<WildduckUserSettings> => {
  const queryFn = useCallback(async (): Promise<WildduckUserSettings> => {
    const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = config.apiToken;
    }

    try {
      const response = await networkClient.request<Record<string, unknown>>(
        `${apiUrl}/users/${userId}/settings`,
        { method: "GET", headers },
      );
      const data = response.data as Record<string, unknown>;
      return data || {};
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get user settings failed, returning mock data:",
          err,
        );
        const mockData = WildduckMockData.getUserSettingsQuery();
        return mockData.settings as WildduckUserSettings;
      }
      throw err;
    }
  }, [
    networkClient,
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userSettings(userId),
    queryFn,
    staleTime: STALE_TIMES.USER_PROFILE, // Settings are part of user profile data
    enabled: !!userId,
    ...options,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to get user mailboxes
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - User authentication info
 * @param options - Mailbox query options
 * @param queryOptions - React Query options
 */
const useWildduckUserMailboxes = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  options?: {
    specialUse?: boolean;
    showHidden?: boolean;
    counters?: boolean;
    sizes?: boolean;
  },
  queryOptions?: UseQueryOptions<WildduckMailboxResponse>,
): UseQueryResult<WildduckMailboxResponse> => {
  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async (): Promise<WildduckMailboxResponse> => {
    const response = await api.getMailboxes(wildduckUserAuth, options);
    return response;
  }, [api, wildduckUserAuth, options]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userMailboxes(
      wildduckUserAuth.userId,
      options,
    ),
    queryFn,
    staleTime: STALE_TIMES.MAILBOXES,
    enabled: !!wildduckUserAuth,
    ...queryOptions,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to check authentication status
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param token - Optional authentication token
 * @param devMode - Development mode flag
 * @param queryOptions - React Query options
 */
const useWildduckAuthStatus = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  token?: string,
  devMode: boolean = false,
  queryOptions?: UseQueryOptions<WildduckAuthStatusResponse>,
): UseQueryResult<WildduckAuthStatusResponse> => {
  const queryFn = useCallback(async (): Promise<WildduckAuthStatusResponse> => {
    const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (config.cloudflareWorkerUrl) {
      headers["Authorization"] = `Bearer ${token || config.apiToken}`;
      headers["X-App-Source"] = "0xmail-box";
    } else {
      headers["X-Access-Token"] = token || config.apiToken;
    }

    try {
      const httpResponse = await networkClient.request<{
        success: boolean;
        id?: string;
        username?: string;
        address?: string;
      }>(`${apiUrl}/users/me`, { method: "GET", headers });
      const data = httpResponse.data as {
        success: boolean;
        id?: string;
        username?: string;
        address?: string;
      };

      const response: WildduckAuthStatusResponse = {
        success: data.success,
        authenticated: data.success,
      };

      if (data.success && (data.id || data.username)) {
        const user: { id: string; username: string; address?: string } = {
          id: data.id || "",
          username: data.username || "",
        };
        if (data.address) {
          user.address = data.address;
        }
        response.user = user;
      }

      return response;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Auth status check failed, returning mock data:",
          err,
        );
        return WildduckMockData.getAuthStatusQuery() as WildduckAuthStatusResponse;
      }
      throw err;
    }
  }, [
    networkClient,
    config.cloudflareWorkerUrl,
    config.backendUrl,
    token,
    config.apiToken,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.authStatus(token),
    queryFn,
    staleTime: STALE_TIMES.USER_PROFILE,
    enabled: !!token || !!config.apiToken,
    ...queryOptions,
  });

  return useMemo(
    () => ({
      ...query,
    }),
    [query],
  );
};

/**
 * Hook to search messages
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - User authentication info
 * @param mailboxId - Mailbox ID
 * @param query - Search query string
 * @param searchOptions - Optional search options
 * @param queryOptions - React Query options
 */
const useWildduckSearchMessages = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: WildduckUserAuth,
  mailboxId: string,
  query: string,
  searchOptions?: Record<string, unknown>,
  queryOptions?: UseQueryOptions<WildduckMessagesResponse>,
): UseQueryResult<WildduckMessagesResponse> => {
  const api = useMemo(
    () => new WildduckAPI(networkClient, config),
    [networkClient, config],
  );

  const queryFn = useCallback(async (): Promise<WildduckMessagesResponse> => {
    const response = await api.getMessages(wildduckUserAuth, mailboxId, {
      ...searchOptions,
      q: query,
    } as any);
    return response;
  }, [api, wildduckUserAuth, mailboxId, query, searchOptions]);

  const queryResult = useQuery({
    queryKey: queryKeys.wildduck.searchMessages(
      wildduckUserAuth.userId,
      mailboxId,
      query,
      searchOptions,
    ),
    queryFn,
    staleTime: STALE_TIMES.MESSAGES,
    enabled: !!(wildduckUserAuth && mailboxId && query),
    ...queryOptions,
  });

  return useMemo(
    () => ({
      ...queryResult,
    }),
    [queryResult],
  );
};

export {
  useWildduckHealth,
  useWildduckUsersList,
  useWildduckUser,
  useWildduckUserAddresses,
  useWildduckUserMessages,
  useWildduckMessage,
  useWildduckUserFilters,
  useWildduckUserSettings,
  useWildduckUserMailboxes,
  useWildduckAuthStatus,
  useWildduckSearchMessages,
  type WildduckUserSettings,
  type WildduckAuthStatusResponse,
};
