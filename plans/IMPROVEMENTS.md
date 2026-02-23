# Improvement Plans for @sudobility/wildduck_client

## Priority 1 - High Impact

### 1. Increase Unit Test Coverage for Hooks
- Only two test files exist: `src/network/__tests__/wildduck-client.test.ts` (client unit tests) and `src/__tests__/integration/wildduck-api.integration.test.ts` (integration tests requiring a running server). None of the 11 React hooks in `src/hooks/` have unit tests.
- Priority hook test targets: `useWildduckMessages.ts` (pagination + WebSocket integration), `useWildduckAuth.ts` (authentication flow including blockchain signatures), and `useWildduckMailboxes.ts` (CRUD + WebSocket). These hooks contain the most complex logic and state management.
- The WebSocket client (`src/websocket/client.ts`) and protocol layer (`src/websocket/protocol.ts`) lack unit tests. Testing reconnection with exponential backoff, channel subscription lifecycle, and message parsing would prevent regressions.

### 2. Add Comprehensive JSDoc to All Public Exports
- `src/index.ts` re-exports from 5 barrel files (network, hooks, websocket, components, utils), but the individual exported functions and hooks have minimal JSDoc. Since this is a library consumed by multiple applications, thorough JSDoc with `@param`, `@returns`, `@throws`, and `@example` annotations is essential for developer experience.
- `src/hooks/query-keys.ts` (TanStack Query key factory) and `src/hooks/query-config.ts` (stale time constants) are critical for consumers customizing caching behavior but lack any documentation explaining the chosen stale times or key structure.
- The `WildduckClient` class in `src/network/wildduck-client.ts` has 40+ public methods but none have JSDoc documenting expected error responses, required auth state, or rate limiting considerations.

### 3. Consolidate Hook Patterns (Monolithic vs. Individual)
- The codebase maintains two parallel hook patterns: "monolithic" hooks (`useWildduckMessage`, `useWildduckUser`, `useWildduckMessages`) and "individual domain" hooks (`useWildduckMailboxes`, `useWildduckFilters`, etc.). The CLAUDE.md recommends monolithic hooks for new code, but the individual hooks are still actively used.
- Migrating the remaining individual domain hooks to the monolithic pattern would reduce API surface area, improve consistency, and simplify maintenance. Alternatively, documenting a clear deprecation path for individual hooks and marking them with `@deprecated` JSDoc tags would signal intent to consumers.

## Priority 2 - Medium Impact

### 4. Improve Error Handling and Typed Error Responses
- The `WildduckClient.request<T>()` method handles HTTP errors but the error types returned to hook consumers are not strongly typed. Defining a `WildduckApiError` class with fields for `statusCode`, `errorCode`, and `message` would let consumers handle specific error conditions (e.g., quota exceeded, rate limited, not found) without string parsing.
- Several hooks catch errors silently (e.g., WebSocket provider try/catch in hooks). Documenting which errors are swallowed and which propagate would help consumers implement proper error boundaries.

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

### 9. Type-Safe Query Key Invalidation
- `src/hooks/query-keys.ts` provides a factory for query keys, but invalidation calls in mutation success handlers use inline key arrays. Creating typed invalidation helpers (e.g., `invalidateUserMessages(queryClient, userId)`) would prevent typo-induced stale cache bugs and improve refactoring safety.
