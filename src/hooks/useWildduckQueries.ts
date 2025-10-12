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
  WildduckAddress,
  WildduckConfig,
  WildduckMailboxResponse,
  WildduckMessage,
  WildduckMessagesResponse,
  WildduckUser,
} from "@sudobility/types";
import axios from "axios";
import { WildduckMockData } from "./mocks";

// Define response types based on Wildduck API
interface WildduckHealthResponse {
  status: string;
  version: string;
  uptime: number;
  // Add other health response fields as needed
}

// Users list response (not defined in @sudobility/types)
interface WildduckUsersResponse {
  success: boolean;
  results: WildduckUser[];
  error?: string;
}

interface WildduckUserSettings {
  // Define based on actual API response
  [key: string]: unknown;
}

interface WildduckFilter {
  id: string;
  name: string;
  query: object;
  action: object;
  disabled: boolean;
  created: string;
  // Add other filter fields
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
 */
const useWildduckHealth = (
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
      const response = await axios.get(`${apiUrl}/health`, { headers });
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
  }, [config.cloudflareWorkerUrl, config.backendUrl, config.apiToken, devMode]);

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
 */
const useWildduckUsersList = (
  config: WildduckConfig,
  devMode: boolean = false,
  filters?: Record<string, unknown>,
  options?: UseQueryOptions<WildduckUsersResponse>,
): UseQueryResult<WildduckUsersResponse> => {
  const queryFn = useCallback(async (): Promise<WildduckUsersResponse> => {
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
      const response = await axios.get(`${apiUrl}/users?${params}`, {
        headers,
      });
      return response.data as WildduckUsersResponse;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get users list failed, returning mock data:",
          err,
        );
        return WildduckMockData.getUsersListQuery() as unknown as WildduckUsersResponse;
      }
      throw err;
    }
  }, [
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
 */
const useWildduckUser = (
  config: WildduckConfig,
  userId: string,
  devMode: boolean = false,
  options?: UseQueryOptions<WildduckUser>,
): UseQueryResult<WildduckUser> => {
  const queryFn = useCallback(async (): Promise<WildduckUser> => {
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
      const response = await axios.get(`${apiUrl}/users/${userId}`, {
        headers,
      });
      const userData = response.data as {
        success: boolean;
        id: string;
        username: string;
        address?: string;
      };
      return {
        id: userData.id,
        username: userData.username,
        name: userData.address || userData.username,
        ...(userData.address && { address: userData.address }),
        tags: [],
        quota: {
          allowed: 0,
          used: 0,
        },
        hasPasswordSet: false,
        activated: userData.success || false,
        disabled: false,
        suspended: false,
        created: new Date().toISOString(),
      };
    } catch (err) {
      if (devMode) {
        console.warn("[DevMode] Get user failed, returning mock data:", err);
        return WildduckMockData.getUserQuery(userId) as WildduckUser;
      }
      throw err;
    }
  }, [
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.user(userId),
    queryFn,
    staleTime: STALE_TIMES.USER_PROFILE,
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
 * Hook to get user addresses
 */
const useWildduckUserAddresses = (
  config: WildduckConfig,
  userId: string,
  devMode: boolean = false,
  options?: UseQueryOptions<WildduckAddress[]>,
): UseQueryResult<WildduckAddress[]> => {
  const queryFn = useCallback(async (): Promise<WildduckAddress[]> => {
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
      const response = await axios.get(`${apiUrl}/users/${userId}/addresses`, {
        headers,
      });
      const addressData = response.data as {
        success: boolean;
        results: Array<{ id: string; address: string; main: boolean }>;
      };
      return (
        addressData.results?.map((addr) => ({
          id: addr.id,
          address: addr.address,
          created: new Date().toISOString(),
          main: addr.main,
        })) || []
      );
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get user addresses failed, returning mock data:",
          err,
        );
        const mockData = WildduckMockData.getUserAddressesQuery();
        return mockData.addresses as WildduckAddress[];
      }
      throw err;
    }
  }, [
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userAddresses(userId),
    queryFn,
    staleTime: STALE_TIMES.EMAIL_ADDRESSES,
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
 * Hook to get user messages with optional filters
 */
const useWildduckUserMessages = (
  config: WildduckConfig,
  userId: string,
  mailboxId: string,
  devMode: boolean = false,
  filters?: Record<string, unknown>,
  options?: UseQueryOptions<WildduckMessagesResponse>,
): UseQueryResult<WildduckMessagesResponse> => {
  const queryFn = useCallback(async (): Promise<WildduckMessagesResponse> => {
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
      const response = await axios.get(
        `${apiUrl}/users/${userId}/mailboxes/${mailboxId}/messages`,
        { headers },
      );
      const messagesData = response.data as {
        success: boolean;
        results: any[];
        total: number;
        page: number;
      };
      return {
        success: messagesData.success as true,
        total: messagesData.total,
        page: messagesData.page,
        results: messagesData.results.map((msg) => ({
          id: msg.id,
          mailbox: msg.mailbox,
          thread: msg.thread || "",
          ...(msg.from && {
            from: { name: msg.from.name, address: msg.from.address || "" },
          }),
          to:
            msg.to?.map((addr: any) => ({
              name: addr.name,
              address: addr.address || "",
            })) || [],
          cc: msg.cc?.map((addr: any) => ({
            name: addr.name,
            address: addr.address || "",
          })),
          bcc: msg.bcc?.map((addr: any) => ({
            name: addr.name,
            address: addr.address || "",
          })),
          subject: msg.subject || "",
          date: msg.date || "",
          intro: msg.intro || "",
          seen: msg.seen || false,
          deleted: msg.deleted || false,
          flagged: msg.flagged || false,
          draft: msg.draft || false,
          answered: msg.answered || false,
          size: msg.size || 0,
          ha: msg.attachments || false,
          attachments: msg.attachments || false,
        })) as WildduckMessage[],
      };
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get user messages failed, returning mock data:",
          err,
        );
        return WildduckMockData.getUserMessagesQuery() as unknown as WildduckMessagesResponse;
      }
      throw err;
    }
  }, [
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    mailboxId,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userMessages(userId, mailboxId, filters),
    queryFn,
    staleTime: STALE_TIMES.MESSAGES,
    enabled: !!(userId && mailboxId),
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
 */
const useWildduckMessage = (
  config: WildduckConfig,
  userId: string,
  messageId: string,
  devMode: boolean = false,
  options?: UseQueryOptions<WildduckMessage>,
): UseQueryResult<WildduckMessage> => {
  const queryFn = useCallback(async (): Promise<WildduckMessage> => {
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
      const response = await axios.get(
        `${apiUrl}/users/${userId}/messages/${messageId}`,
        { headers },
      );
      const messageData = response.data as any;
      return {
        id: messageData.id,
        mailbox: messageData.mailbox,
        thread: messageData.thread || "",
        ...(messageData.from && {
          from: {
            name: messageData.from.name,
            address: messageData.from.address || "",
          },
        }),
        to:
          messageData.to?.map((addr: any) => ({
            name: addr.name,
            address: addr.address || "",
          })) || [],
        cc: messageData.cc?.map((addr: any) => ({
          name: addr.name,
          address: addr.address || "",
        })),
        bcc: messageData.bcc?.map((addr: any) => ({
          name: addr.name,
          address: addr.address || "",
        })),
        subject: messageData.subject || "",
        date: messageData.date || "",
        intro: messageData.intro || "",
        seen: messageData.seen || false,
        deleted: messageData.deleted || false,
        flagged: messageData.flagged || false,
        draft: messageData.draft || false,
        answered: messageData.answered || false,
        size: messageData.size || 0,
        ha: messageData.attachments || false,
        attachments: messageData.attachments || false,
      };
    } catch (err) {
      if (devMode) {
        console.warn("[DevMode] Get message failed, returning mock data:", err);
        return WildduckMockData.getMessageQuery(
          messageId,
          userId,
        ) as unknown as WildduckMessage;
      }
      throw err;
    }
  }, [
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    messageId,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.message(userId, messageId),
    queryFn,
    staleTime: STALE_TIMES.MESSAGE_CONTENT,
    enabled: !!(userId && messageId),
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
 * Note: getUserFilters method not yet implemented in WildduckAPI
 */
const useWildduckUserFilters = (
  config: WildduckConfig,
  userId: string,
  devMode: boolean = false,
  options?: UseQueryOptions<WildduckFilter[]>,
): UseQueryResult<WildduckFilter[]> => {
  const queryFn = useCallback(async (): Promise<WildduckFilter[]> => {
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
      const response = await axios.get(`${apiUrl}/users/${userId}/filters`, {
        headers,
      });
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
        return mockData.filters as WildduckFilter[];
      }
      throw err;
    }
  }, [
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
 * Note: getUserSettings method not yet implemented in WildduckAPI
 */
const useWildduckUserSettings = (
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
      const response = await axios.get(`${apiUrl}/users/${userId}/settings`, {
        headers,
      });
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
 */
const useWildduckUserMailboxes = (
  config: WildduckConfig,
  userId: string,
  devMode: boolean = false,
  options?: {
    specialUse?: boolean;
    showHidden?: boolean;
    counters?: boolean;
    sizes?: boolean;
  },
  queryOptions?: UseQueryOptions<WildduckMailboxResponse>,
): UseQueryResult<WildduckMailboxResponse> => {
  const queryFn = useCallback(async (): Promise<WildduckMailboxResponse> => {
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
    if (options?.specialUse) params.set("specialUse", "true");
    if (options?.showHidden) params.set("showHidden", "true");
    if (options?.counters) params.set("counters", "true");
    if (options?.sizes) params.set("sizes", "true");

    const queryString = params.toString();
    const endpoint = `${apiUrl}/users/${userId}/mailboxes${queryString ? `?${queryString}` : ""}`;

    try {
      const response = await axios.get(endpoint, { headers });
      return response.data as WildduckMailboxResponse;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get user mailboxes failed, returning mock data:",
          err,
        );
        const mockData = WildduckMockData.getUserMailboxesQuery();
        return {
          success: true,
          results: mockData.mailboxes,
        } as unknown as WildduckMailboxResponse;
      }
      throw err;
    }
  }, [
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    options,
    devMode,
  ]);

  const query = useQuery({
    queryKey: queryKeys.wildduck.userMailboxes(userId, options),
    queryFn,
    staleTime: STALE_TIMES.MAILBOXES,
    enabled: !!userId,
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
 */
const useWildduckAuthStatus = (
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
      const httpResponse = await axios.get(`${apiUrl}/users/me`, { headers });
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
 */
const useWildduckSearchMessages = (
  config: WildduckConfig,
  userId: string,
  mailboxId: string,
  query: string,
  devMode: boolean = false,
  searchOptions?: Record<string, unknown>,
  queryOptions?: UseQueryOptions<WildduckMessagesResponse>,
): UseQueryResult<WildduckMessagesResponse> => {
  const queryFn = useCallback(async (): Promise<WildduckMessagesResponse> => {
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
    params.set("q", query);
    if (searchOptions) {
      Object.entries(searchOptions).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });
    }

    try {
      const response = await axios.get(
        `${apiUrl}/users/${userId}/mailboxes/${mailboxId}/messages?${params}`,
        { headers },
      );
      return response.data as WildduckMessagesResponse;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Search messages failed, returning mock data:",
          err,
        );
        return WildduckMockData.getSearchMessagesQuery() as unknown as WildduckMessagesResponse;
      }
      throw err;
    }
  }, [
    config.cloudflareWorkerUrl,
    config.backendUrl,
    config.apiToken,
    userId,
    mailboxId,
    query,
    searchOptions,
    devMode,
  ]);

  const queryResult = useQuery({
    queryKey: queryKeys.wildduck.searchMessages(
      userId,
      mailboxId,
      query,
      searchOptions,
    ),
    queryFn,
    staleTime: STALE_TIMES.MESSAGES,
    enabled: !!(userId && mailboxId && query),
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
  type WildduckHealthResponse,
  type WildduckUserSettings,
  type WildduckFilter,
  type WildduckAuthStatusResponse,
};
