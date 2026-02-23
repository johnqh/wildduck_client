/**
 * Query Key Factory for Wildduck TanStack Query
 *
 * Provides type-safe, consistent query keys for Wildduck API endpoints.
 * Following TanStack Query best practices for key structure.
 */

const wildduckBase = () => ["wildduck"] as const;

export const queryKeys = {
  // Wildduck API keys
  wildduck: {
    all: wildduckBase,

    // Health and status
    health: () => [...wildduckBase(), "health"] as const,

    // User management
    users: () => [...wildduckBase(), "users"] as const,
    usersList: (filters?: Record<string, unknown>) =>
      [...wildduckBase(), "users", "list", filters] as const,
    user: (userId: string) => [...wildduckBase(), "users", userId] as const,

    // Email addresses
    addresses: () => [...wildduckBase(), "addresses"] as const,
    userAddresses: (userId: string) =>
      [...wildduckBase(), "addresses", userId] as const,
    forwardedAddresses: (userId: string) =>
      [...wildduckBase(), "addresses", "forwarded", userId] as const,
    resolveAddress: (address: string) =>
      [...wildduckBase(), "addresses", "resolve", address] as const,

    // Mailboxes
    mailboxes: () => [...wildduckBase(), "mailboxes"] as const,
    userMailboxes: (userId: string, options?: Record<string, unknown>) =>
      [...wildduckBase(), "mailboxes", userId, options] as const,

    // Messages
    messages: () => [...wildduckBase(), "messages"] as const,
    userMessages: (
      userId: string,
      mailboxId: string,
      filters?: Record<string, unknown>,
    ) => [...wildduckBase(), "messages", userId, mailboxId, filters] as const,
    message: (userId: string, mailboxId: string, messageId: string) =>
      [...wildduckBase(), "messages", userId, mailboxId, messageId] as const,
    searchMessages: (
      userId: string,
      mailboxId: string,
      query: string,
      options?: Record<string, unknown>,
    ) =>
      [
        ...wildduckBase(),
        "messages",
        "search",
        userId,
        mailboxId,
        { query, ...options },
      ] as const,

    // Filters and settings
    filters: () => [...wildduckBase(), "filters"] as const,
    userFilters: (userId: string) =>
      [...wildduckBase(), "filters", userId] as const,

    settings: () => [...wildduckBase(), "settings"] as const,
    userSettings: (userId: string) =>
      [...wildduckBase(), "settings", userId] as const,

    // Authentication
    auth: () => [...wildduckBase(), "auth"] as const,
    authStatus: (token?: string) =>
      [...wildduckBase(), "auth", "status", token] as const,
  },
} as const;

/**
 * Utility type to extract query key from the factory
 */
export type QueryKey = readonly unknown[];

/**
 * Helper function to create a query key for custom endpoints
 * Use this when you need a one-off query key that doesn't fit the factory pattern
 */
export const createQueryKey = (
  service: string,
  ...parts: (string | number | object)[]
): readonly unknown[] => {
  return [service, ...parts] as const;
};

/**
 * Helper to get all keys for wildduck service (useful for invalidation)
 */
export const getServiceKeys = () => {
  return queryKeys.wildduck.all();
};

// ============================================================================
// Type-Safe Invalidation Helpers
// ============================================================================
//
// These helpers wrap `queryClient.invalidateQueries()` with properly typed
// query keys, preventing typo-induced stale-cache bugs and improving
// refactoring safety. Import `QueryClient` from `@tanstack/react-query`.

import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate all wildduck queries.
 *
 * @param queryClient - TanStack QueryClient instance
 *
 * @example
 * ```ts
 * invalidateAllWildduck(queryClient);
 * ```
 */
export const invalidateAllWildduck = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.wildduck.all() });

/**
 * Invalidate user-specific queries (profile, settings, addresses, etc.).
 *
 * @param queryClient - TanStack QueryClient instance
 * @param userId - The MongoDB ObjectId of the user
 *
 * @example
 * ```ts
 * invalidateUser(queryClient, "507f1f77bcf86cd799439011");
 * ```
 */
export const invalidateUser = (queryClient: QueryClient, userId: string) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.wildduck.user(userId),
  });

/**
 * Invalidate the users list query.
 *
 * @param queryClient - TanStack QueryClient instance
 *
 * @example
 * ```ts
 * invalidateUsersList(queryClient);
 * ```
 */
export const invalidateUsersList = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.wildduck.users() });

/**
 * Invalidate all message queries for a specific user.
 *
 * @param queryClient - TanStack QueryClient instance
 * @param userId - The MongoDB ObjectId of the user
 *
 * @example
 * ```ts
 * invalidateUserMessages(queryClient, "507f1f77bcf86cd799439011");
 * ```
 */
export const invalidateUserMessages = (
  queryClient: QueryClient,
  userId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.wildduck.messages(),
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey[0] === "wildduck" &&
      query.queryKey[1] === "messages" &&
      query.queryKey[2] === userId,
  });

/**
 * Invalidate mailbox queries for a specific user.
 *
 * @param queryClient - TanStack QueryClient instance
 * @param userId - The MongoDB ObjectId of the user
 *
 * @example
 * ```ts
 * invalidateUserMailboxes(queryClient, "507f1f77bcf86cd799439011");
 * ```
 */
export const invalidateUserMailboxes = (
  queryClient: QueryClient,
  userId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.wildduck.userMailboxes(userId),
  });

/**
 * Invalidate address queries for a specific user.
 *
 * @param queryClient - TanStack QueryClient instance
 * @param userId - The MongoDB ObjectId of the user
 *
 * @example
 * ```ts
 * invalidateUserAddresses(queryClient, "507f1f77bcf86cd799439011");
 * ```
 */
export const invalidateUserAddresses = (
  queryClient: QueryClient,
  userId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.wildduck.userAddresses(userId),
  });

/**
 * Invalidate filter queries for a specific user.
 *
 * @param queryClient - TanStack QueryClient instance
 * @param userId - The MongoDB ObjectId of the user
 *
 * @example
 * ```ts
 * invalidateUserFilters(queryClient, "507f1f77bcf86cd799439011");
 * ```
 */
export const invalidateUserFilters = (
  queryClient: QueryClient,
  userId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.wildduck.userFilters(userId),
  });

/**
 * Invalidate settings queries for a specific user.
 *
 * @param queryClient - TanStack QueryClient instance
 * @param userId - The MongoDB ObjectId of the user
 *
 * @example
 * ```ts
 * invalidateUserSettings(queryClient, "507f1f77bcf86cd799439011");
 * ```
 */
export const invalidateUserSettings = (
  queryClient: QueryClient,
  userId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.wildduck.userSettings(userId),
  });

/**
 * Invalidate a single message query.
 *
 * @param queryClient - TanStack QueryClient instance
 * @param userId - The MongoDB ObjectId of the user
 * @param mailboxId - The mailbox containing the message
 * @param messageId - The message ID
 *
 * @example
 * ```ts
 * invalidateMessage(queryClient, userId, mailboxId, "12345");
 * ```
 */
export const invalidateMessage = (
  queryClient: QueryClient,
  userId: string,
  mailboxId: string,
  messageId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: queryKeys.wildduck.message(userId, mailboxId, messageId),
  });

/**
 * Invalidate auth status queries.
 *
 * @param queryClient - TanStack QueryClient instance
 *
 * @example
 * ```ts
 * invalidateAuthStatus(queryClient);
 * ```
 */
export const invalidateAuthStatus = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.wildduck.auth() });
