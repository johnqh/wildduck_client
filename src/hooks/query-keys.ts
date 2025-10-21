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
