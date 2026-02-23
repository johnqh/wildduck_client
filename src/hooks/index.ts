/**
 * Wildduck API hooks for React and React Native
 */

// ============================================================================
// Monolithic Hooks (recommended - use these for new code)
// ============================================================================

// Single resource hooks (for operations on specific items)
export * from "./useWildduckMessage"; // Single message operations
export * from "./useWildduckUser"; // Single user + all settings

// Collection hooks (for list/search/create operations)
export * from "./useWildduckMessages"; // Messages list and operations
export * from "./useWildduckSearch"; // Search messages

// ============================================================================
// Individual domain hooks (deprecated - migrate to monolithic hooks)
// These hooks will be removed in v3. Each export below is marked @deprecated
// in its source file. Prefer the monolithic hooks above for new code.
// ============================================================================
export * from "./useWildduckSettings"; // @deprecated - use WildduckClient.getSettings / updateSetting
export * from "./useWildduckMailboxes"; // @deprecated - use useWildduckUserMailboxes
export * from "./useWildduckFilters"; // @deprecated - use WildduckClient filter methods
export * from "./useWildduckAddresses"; // @deprecated - use WildduckClient address methods
export * from "./useWildduckAutoReply"; // @deprecated - use WildduckClient autoreply methods
export * from "./useWildduckAuth"; // Still actively used (no monolithic replacement)

// ============================================================================
// TanStack Query hooks
// ============================================================================
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

// Export query key factory and invalidation helpers
export { queryKeys, createQueryKey, getServiceKeys } from "./query-keys";
export {
  invalidateAllWildduck,
  invalidateUser,
  invalidateUsersList,
  invalidateUserMessages,
  invalidateUserMailboxes,
  invalidateUserAddresses,
  invalidateUserFilters,
  invalidateUserSettings,
  invalidateMessage,
  invalidateAuthStatus,
} from "./query-keys";

// Export stale time constants
export { STALE_TIMES } from "./query-config";
