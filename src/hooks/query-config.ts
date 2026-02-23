/**
 * Wildduck TanStack Query Configuration
 *
 * Provides stale time constants for Wildduck queries. These values control how
 * long TanStack Query considers cached data "fresh" before triggering a background
 * refetch on the next access. Lower values give more up-to-date data at the cost
 * of more API calls; higher values reduce network traffic.
 *
 * Consumers can override these defaults per-hook via the TanStack Query `staleTime`
 * option. When WebSocket real-time updates are enabled, stale times matter less
 * because the cache is updated in real time.
 *
 * @example
 * ```ts
 * import { STALE_TIMES } from "@sudobility/wildduck_client";
 *
 * // Use a custom stale time for a specific query
 * const result = useWildduckHealth(networkClient, config, false, {
 *   staleTime: STALE_TIMES.HEALTH_STATUS * 2, // double the default
 * });
 * ```
 */

/**
 * Default stale times (in milliseconds) for different types of Wildduck queries.
 *
 * - **USER_PROFILE** (5 min): User profile data (name, tags, quota, settings)
 *   changes infrequently and is typically updated by the user themselves.
 * - **MAILBOXES** (5 min): Mailbox structure (INBOX, Sent, Drafts) is stable.
 *   New mailboxes are rare and can be invalidated on mutation.
 * - **EMAIL_ADDRESSES** (2 min): User email addresses change occasionally
 *   (adding/removing aliases). Shorter than profile to catch alias changes.
 * - **HEALTH_STATUS** (1 min): Server health should be checked periodically
 *   but not too aggressively.
 * - **MESSAGES** (30 sec): New emails arrive frequently. This is the most
 *   time-sensitive data. WebSocket support reduces dependence on this value.
 * - **MESSAGE_CONTENT** (5 min): Individual message content is effectively
 *   immutable once fetched (subject, body, attachments do not change).
 */
export const STALE_TIMES = {
  /** User profile, settings, and account data. 5 minutes. */
  USER_PROFILE: 5 * 60 * 1000,

  /** Mailbox list and structure. 5 minutes. */
  MAILBOXES: 5 * 60 * 1000,

  /** User email addresses and aliases. 2 minutes. */
  EMAIL_ADDRESSES: 2 * 60 * 1000,

  /** Server health status. 1 minute. */
  HEALTH_STATUS: 1 * 60 * 1000,

  /** Message list (inbox, sent, etc.). 30 seconds. */
  MESSAGES: 30 * 1000,

  /** Individual message content (immutable). 5 minutes. */
  MESSAGE_CONTENT: 5 * 60 * 1000,
} as const;
