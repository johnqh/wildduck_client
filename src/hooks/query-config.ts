/**
 * Wildduck TanStack Query Configuration
 *
 * Provides stale time constants for Wildduck queries.
 */

/**
 * Default stale times for different types of Wildduck queries
 */
export const STALE_TIMES = {
  // User data - changes infrequently
  USER_PROFILE: 5 * 60 * 1000, // 5 minutes

  // Mailboxes - mailbox structure is stable
  MAILBOXES: 5 * 60 * 1000, // 5 minutes

  // Email addresses - change occasionally
  EMAIL_ADDRESSES: 2 * 60 * 1000, // 2 minutes

  // Health status
  HEALTH_STATUS: 1 * 60 * 1000, // 1 minute

  // Messages - new emails arrive frequently
  MESSAGES: 30 * 1000, // 30 seconds

  // Message content - immutable once fetched
  MESSAGE_CONTENT: 5 * 60 * 1000, // 5 minutes
} as const;
