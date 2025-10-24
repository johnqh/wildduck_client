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
// TanStack Query hooks
// ============================================================================
export {
  useWildduckUsersList,
  useWildduckUser,
  useWildduckUserAddresses,
  useWildduckUserMessages,
  useWildduckMessage,
  useWildduckUserFilters,
  useWildduckUserSettings,
  useWildduckUserMailboxes,
  useWildduckAuthStatus,
} from "./useWildduckQueries";

// ============================================================================
// Types
// ============================================================================

// Export hook-specific types from TanStack Query hooks
export type {
  WildduckUserSettings,
  WildduckAuthStatusResponse,
} from "./useWildduckQueries";

// Note: WildduckHealthResponse is exported from @sudobility/types via src/types/index.ts

// ============================================================================
// Utilities
// ============================================================================

// Export mock data helper
export { WildduckMockData } from "./mocks";
