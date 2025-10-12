/**
 * Wildduck API hooks for React and React Native
 */

// ============================================================================
// Individual endpoint hooks (recommended - use these for new code)
// ============================================================================

// Messages API hooks
export * from "./messages";

// Mailboxes API hooks
export * from "./mailboxes";

// Users API hooks
export * from "./users";

// Addresses API hooks
export * from "./addresses";

// Autoreply API hooks
export * from "./autoreply";

// ============================================================================
// Legacy monolithic hooks (deprecated - use individual hooks instead)
// ============================================================================
export * from "./useWildduckHealth";
export * from "./useWildduckSettings";
export * from "./useWildduckMessages"; // Deprecated - use individual message hooks
export * from "./useWildduckMailboxes"; // Deprecated - use individual mailbox hooks
export * from "./useWildduckUsers"; // Deprecated - use individual user hooks
export * from "./useWildduckFilters";
export * from "./useWildduckAddresses"; // Deprecated - use useWildduckGetAddresses
export * from "./useWildduckAuth";

// ============================================================================
// TanStack Query hooks (with prefixed names to avoid conflicts)
// ============================================================================
export {
  useWildduckHealth as useWildduckHealthQuery,
  useWildduckUsersList as useWildduckUsersListQuery,
  useWildduckUser as useWildduckUserQuery,
  useWildduckUserAddresses as useWildduckUserAddressesQuery,
  useWildduckUserMessages as useWildduckUserMessagesQuery,
  useWildduckMessage as useWildduckMessageQuery,
  useWildduckUserFilters as useWildduckUserFiltersQuery,
  useWildduckUserSettings as useWildduckUserSettingsQuery,
  useWildduckUserMailboxes as useWildduckUserMailboxesQuery,
  useWildduckAuthStatus as useWildduckAuthStatusQuery,
  useWildduckSearchMessages as useWildduckSearchMessagesQuery,
} from "./useWildduckQueries";

// ============================================================================
// Types
// ============================================================================

// Export types from TanStack Query hooks
export type {
  WildduckUserSettings,
  WildduckFilter,
  WildduckAuthStatusResponse,
} from "./useWildduckQueries";

// Export Wildduck API response types from local types
export type {
  WildduckUser as WildduckUser,
  WildduckAddress as WildduckAddress,
  WildduckMessage as WildduckMessage,
  WildduckMessagesResponse as WildduckMessagesResponse,
  WildduckMailbox as WildduckMailbox,
  WildduckMailboxResponse as WildduckMailboxesResponse,
} from "@sudobility/types";

// Export WildduckUserAuth type for authentication
export type { WildduckUserAuth } from "@sudobility/types";

// ============================================================================
// Utilities
// ============================================================================

// Export mock data helper
export { WildduckMockData } from "./mocks";
