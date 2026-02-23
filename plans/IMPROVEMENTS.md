# Improvement Plans for @sudobility/wildduck_client

## Priority 1 - High Impact

### 1. Increase Unit Test Coverage for Hooks - PARTIALLY COMPLETED
- Only two test files exist: `src/network/__tests__/wildduck-client.test.ts` (client unit tests) and `src/__tests__/integration/wildduck-api.integration.test.ts` (integration tests requiring a running server). None of the 11 React hooks in `src/hooks/` have unit tests.
- Priority hook test targets: `useWildduckMessages.ts` (pagination + WebSocket integration), `useWildduckAuth.ts` (authentication flow including blockchain signatures), and `useWildduckMailboxes.ts` (CRUD + WebSocket). These hooks contain the most complex logic and state management.
- The WebSocket client (`src/websocket/client.ts`) and protocol layer (`src/websocket/protocol.ts`) lack unit tests. Testing reconnection with exponential backoff, channel subscription lifecycle, and message parsing would prevent regressions.

**Status**: Added 67 new tests across 3 test files:
- `src/websocket/__tests__/protocol.test.ts` - 36 tests for protocol message builders, parsers, type checks, data extraction, and mock factories
- `src/network/__tests__/wildduck-api-error.test.ts` - 18 tests for the new WildduckApiError class
- `src/hooks/__tests__/query-keys.test.ts` - 13 tests for query key factory, createQueryKey, and getServiceKeys

**Remaining**: React hook unit tests (useWildduckMessages, useWildduckAuth, useWildduckMailboxes) and WebSocket client tests (reconnection, channel lifecycle) still need to be added. These require more complex test setup with React Testing Library, mock providers, and WebSocket mocks.

### 2. Add Comprehensive JSDoc to All Public Exports - COMPLETED
- `src/index.ts` re-exports from 5 barrel files (network, hooks, websocket, components, utils), but the individual exported functions and hooks have minimal JSDoc. Since this is a library consumed by multiple applications, thorough JSDoc with `@param`, `@returns`, `@throws`, and `@example` annotations is essential for developer experience.
- `src/hooks/query-keys.ts` (TanStack Query key factory) and `src/hooks/query-config.ts` (stale time constants) are critical for consumers customizing caching behavior but lack any documentation explaining the chosen stale times or key structure.
- The `WildduckClient` class in `src/network/wildduck-client.ts` has 40+ public methods but none have JSDoc documenting expected error responses, required auth state, or rate limiting considerations.

**Status**: Added comprehensive JSDoc with `@param`, `@returns`, `@throws`, and `@example` annotations to:
- All 40+ public methods on `WildduckClient` class plus the class itself
- Helper functions: `createWildduckClient`, `isValidObjectId`, `emailToUserId`, `validateUserId`
- All stale time constants in `query-config.ts` with usage rationale
- Query key factory in `query-keys.ts`

### 3. Consolidate Hook Patterns (Monolithic vs. Individual) - COMPLETED
- The codebase maintains two parallel hook patterns: "monolithic" hooks (`useWildduckMessage`, `useWildduckUser`, `useWildduckMessages`) and "individual domain" hooks (`useWildduckMailboxes`, `useWildduckFilters`, etc.). The CLAUDE.md recommends monolithic hooks for new code, but the individual hooks are still actively used.
- Migrating the remaining individual domain hooks to the monolithic pattern would reduce API surface area, improve consistency, and simplify maintenance. Alternatively, documenting a clear deprecation path for individual hooks and marking them with `@deprecated` JSDoc tags would signal intent to consumers.

**Status**: Chose the deprecation path approach. Added `@deprecated` JSDoc tags with migration guidance to all individual domain hooks:
- `useWildduckSettings.ts` - deprecated in favor of `WildduckClient.getSettings`/`updateSetting`
- `useWildduckFilters.ts` - deprecated in favor of `WildduckClient` filter methods
- `useWildduckAddresses.ts` - deprecated in favor of `WildduckClient` address methods
- `useWildduckAutoReply.ts` - deprecated in favor of `WildduckClient` autoreply methods
- `useWildduckMailboxes.ts` - deprecated in favor of `useWildduckUserMailboxes`
- Updated `hooks/index.ts` barrel exports with deprecation comments

## Priority 2 - Medium Impact

### 4. Improve Error Handling and Typed Error Responses - PARTIALLY COMPLETED
- The `WildduckClient.request<T>()` method handles HTTP errors but the error types returned to hook consumers are not strongly typed. Defining a `WildduckApiError` class with fields for `statusCode`, `errorCode`, and `message` would let consumers handle specific error conditions (e.g., quota exceeded, rate limited, not found) without string parsing.
- Several hooks catch errors silently (e.g., WebSocket provider try/catch in hooks). Documenting which errors are swallowed and which propagate would help consumers implement proper error boundaries.

**Status**: Created `WildduckApiError` class in `src/network/wildduck-api-error.ts` with:
- `statusCode`, `errorCode`, and `message` fields
- Convenience boolean getters: `isNotFound`, `isUnauthorized`, `isForbidden`, `isRateLimited`, `isValidationError`, `isServerError`
- Exported from `src/network/index.ts`
- Full test coverage in `src/network/__tests__/wildduck-api-error.test.ts`

**Remaining**: Integrating `WildduckApiError` into `WildduckClient.request()` to throw typed errors instead of generic errors. Documenting which errors are swallowed in WebSocket hooks.

### 5. Add Offline and Optimistic Update Support
- The TanStack Query integration provides caching but there is no explicit offline support. Adding `networkMode: 'offlineFirst'` configuration and documenting cache persistence strategies (e.g., `persistQueryClient` from TanStack) would improve the React Native experience where network connectivity is intermittent.
- Mutation hooks (send message, move message, update flags) do not implement optimistic updates. Adding optimistic cache updates with rollback on failure for common operations like flagging messages and moving to trash would improve perceived performance.

### 6. WebSocket Provider Robustness
- `src/websocket/provider.tsx` creates a single WebSocket context but does not handle the case where the provider is unmounted and remounted (e.g., during React Native navigation). Documenting expected behavior and adding connection reuse across mounts would prevent unnecessary reconnections.
- The `useWebSocket.ts` hook uses a try/catch pattern to handle missing providers, but this means WebSocket failures are silent. Adding an `onError` callback to the `WebSocketProvider` props would give consumers visibility into connection issues.

## Priority 3 - Nice to Have

### 7. Add Storybook or Example App for Components
- `src/components/WebSocketStatus.tsx` exports three React components (`WebSocketStatus`, `WebSocketStatusBadge`, `WebSocketStats`) but there are no visual tests or interactive examples. Adding a minimal example app or Storybook setup would help consumers understand component usage and customization.

### 8. Add Bundle Size Monitoring
- As an ESM library consumed by both web and React Native apps, bundle size is important. Adding a bundle size check to the CI pipeline (e.g., `bundlewatch` or `size-limit`) would catch accidental dependency additions or code bloat that affects consumers.
- The `viem` dev dependency is heavy; verifying it is properly tree-shaken from the production build and not accidentally included as a runtime dependency would be worthwhile.

### 9. Type-Safe Query Key Invalidation - COMPLETED
- `src/hooks/query-keys.ts` provides a factory for query keys, but invalidation calls in mutation success handlers use inline key arrays. Creating typed invalidation helpers (e.g., `invalidateUserMessages(queryClient, userId)`) would prevent typo-induced stale cache bugs and improve refactoring safety.

**Status**: Added 10 type-safe invalidation helper functions to `src/hooks/query-keys.ts`:
- `invalidateAllWildduck(queryClient)` - Invalidate all wildduck queries
- `invalidateUser(queryClient, userId)` - Invalidate a specific user's data
- `invalidateUsersList(queryClient)` - Invalidate the users list
- `invalidateUserMessages(queryClient, userId)` - Invalidate a user's messages
- `invalidateUserMailboxes(queryClient, userId)` - Invalidate a user's mailboxes
- `invalidateUserAddresses(queryClient, userId)` - Invalidate a user's addresses
- `invalidateUserFilters(queryClient, userId)` - Invalidate a user's filters
- `invalidateUserSettings(queryClient, userId)` - Invalidate a user's settings
- `invalidateMessage(queryClient, userId, mailboxId, messageId)` - Invalidate a specific message
- `invalidateAuthStatus(queryClient)` - Invalidate auth status
- All exported from `src/hooks/index.ts`
- Test coverage in `src/hooks/__tests__/query-keys.test.ts`
