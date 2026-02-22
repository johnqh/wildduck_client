# wildduck_client - AI Development Guide

## Overview

`@sudobility/wildduck_client` is a TypeScript client library for the WildDuck email API, designed for both React and React Native. It provides a low-level HTTP client (`WildduckClient`), a comprehensive set of TanStack Query-powered React hooks for data fetching and mutations, an optional WebSocket client for real-time updates, utility functions for common settings operations, and ready-made React components for connection status display.

- **Package**: `@sudobility/wildduck_client`
- **Version**: 2.3.64
- **License**: BUSL-1.1
- **Package Manager**: Bun
- **Module Type**: ESM (ES2020 target)
- **Compatibility**: React 18+, React Native

## Project Structure

```
src/
├── index.ts                          # Main entry - re-exports all modules
├── network/
│   ├── index.ts                      # Network barrel export
│   ├── wildduck-client.ts            # WildduckClient class + factory + helpers
│   └── __tests__/
│       └── wildduck-client.test.ts   # Client unit tests
├── hooks/
│   ├── index.ts                      # Hooks barrel export
│   ├── query-keys.ts                 # TanStack Query key factory
│   ├── query-config.ts               # Stale time constants (STALE_TIMES)
│   ├── mocks.ts                      # WildduckMockData for devMode fallbacks
│   ├── useWildduckQueries.ts         # TanStack Query GET hooks (11 hooks)
│   ├── useWildduckMessage.ts         # Monolithic single-message hook (query + mutations)
│   ├── useWildduckMessages.ts        # Messages list hook with pagination + WebSocket
│   ├── useWildduckUser.ts            # Monolithic user hook (profile, quota, spam, etc.)
│   ├── useWildduckSearch.ts          # Search messages hook with pagination
│   ├── useWildduckMailboxes.ts       # Mailboxes CRUD hook + WebSocket
│   ├── useWildduckAuth.ts            # Authentication hook (authenticate, preAuth, logout)
│   ├── useWildduckSettings.ts        # User settings key-value CRUD + WebSocket
│   ├── useWildduckFilters.ts         # Email filters CRUD + WebSocket
│   ├── useWildduckAddresses.ts       # Email addresses CRUD + forwarded addresses
│   └── useWildduckAutoReply.ts       # Autoreply/vacation CRUD + WebSocket
├── websocket/
│   ├── index.ts                      # WebSocket barrel export
│   ├── types.ts                      # WebSocket types and interfaces
│   ├── constants.ts                  # WebSocket constants (close codes, channels, events)
│   ├── protocol.ts                   # Protocol message builders and parsers
│   ├── client.ts                     # WildduckWebSocketClient class
│   ├── provider.tsx                  # WebSocketProvider React context
│   └── useWebSocket.ts              # useWebSocket convenience hook
├── components/
│   ├── index.ts                      # Components barrel export
│   └── WebSocketStatus.tsx           # WebSocketStatus, StatusBadge, Stats components
├── types/
│   └── wildduck-search.ts           # Search query params and response types
├── utils/
│   ├── index.ts                      # Utils barrel export
│   ├── user-settings.ts              # getUserInfo, updateUserName, updateUserSettings
│   ├── forwarding.ts                 # get/update/add/remove forwarding targets
│   ├── spam-settings.ts              # get/update spam level and whitelist
│   ├── autoreply.ts                  # get/update/enable/disable/delete auto-reply
│   ├── filters.ts                    # get/create/update/delete/enable/disable filters
│   └── advanced-settings.ts          # uploadSentMessages, SMTP relay settings
└── __tests__/
    └── integration/
        ├── setup.ts                  # Integration test setup
        └── wildduck-api.integration.test.ts
```

## Key Exports

### Client Class

- **`WildduckClient`** - Core API client class (also exported as `WildduckAPI` for legacy compatibility)
- **`createWildduckClient(networkClient, config, storage?)`** - Factory function (also exported as `createWildduckAPI`)
- **`emailToUserId(emailAddress, storage)`** - Resolve email to MongoDB user ID from storage
- **`validateUserId(userId)`** - Validate MongoDB ObjectId format
- **`isValidObjectId(id)`** - Check if string is valid 24-char hex ObjectId

### React Hooks (Monolithic - Recommended)

- **`useWildduckMessage(networkClient, config, params)`** - Single message: get, update, delete, forward, submit draft
- **`useWildduckUser(networkClient, config, params)`** - Single user: profile, quota, limits, spam, forwarding, encryption, 2FA
- **`useWildduckMessages(networkClient, config, devMode?, pageSize?, options?)`** - Messages list with pagination, send, upload, update, delete, move; optional WebSocket
- **`useWildduckSearch(networkClient, config, params, pageSize?)`** - Search messages with accumulated pagination

### React Hooks (Individual Domain)

- **`useWildduckMailboxes(networkClient, config, wildduckUserAuth, devMode?, options?)`** - Mailbox CRUD; optional WebSocket
- **`useWildduckAuth(networkClient, config, storage, devMode?)`** - authenticate, preAuth, logout, getAuthStatus
- **`useWildduckSettings(networkClient, config, wildduckUserAuth, devMode?, options?)`** - Key-value settings CRUD; optional WebSocket
- **`useWildduckFilters(networkClient, config, wildduckUserAuth, devMode?, options?)`** - Email filter CRUD; optional WebSocket
- **`useWildduckAddresses(networkClient, config, devMode?)`** - Address CRUD + forwarded addresses
- **`useWildduckAutoReply(networkClient, config, wildduckUserAuth, devMode?, options?)`** - Autoreply CRUD; optional WebSocket

### React Hooks (TanStack Query GET Hooks)

- **`useWildduckHealth`** - Server health status
- **`useWildduckUsersList`** - Users list with filters
- **`useWildduckUser`** - Single user by ID (query-only version)
- **`useWildduckUserAddresses`** - User email addresses
- **`useWildduckUserMessages`** - User messages with filters
- **`useWildduckMessage`** - Single message (query-only version)
- **`useWildduckUserFilters`** - User email filters
- **`useWildduckUserSettings`** - User settings
- **`useWildduckUserMailboxes`** - User mailboxes
- **`useWildduckAuthStatus`** - Auth token status check
- **`useWildduckSearchMessages`** - Search messages

### WebSocket

- **`WildduckWebSocketClient`** - Low-level WebSocket client with auto-reconnect
- **`WebSocketProvider`** / **`useWebSocketContext`** - React context for shared connections
- **`useWebSocket`** - Convenience hook for WebSocket context
- **Channels**: `mailboxes`, `messages`, `settings`, `filters`, `autoreply`
- **Protocol helpers**: `buildSubscribeMessage`, `buildUnsubscribeMessage`, `buildFetchMessage`, `parseServerMessage`, etc.

### React Components

- **`WebSocketStatus`** - Full connection status display with reconnect info
- **`WebSocketStatusBadge`** - Minimal colored dot indicator
- **`WebSocketStats`** - Connection statistics (state, subscriptions, reconnect attempts)

### Utility Functions

- **User Settings**: `getUserInfo`, `updateUserName`, `updateUserSettings`
- **Forwarding**: `getForwardingTargets`, `updateForwardingTargets`, `addForwardingTarget`, `removeForwardingTarget`
- **Spam**: `getSpamSettings`, `updateSpamLevel`, `updateFromWhitelist`, `addToFromWhitelist`, `removeFromWhitelist`, `updateSpamSettings`
- **Auto-Reply**: `getAutoReply`, `updateAutoReply`, `enableAutoReply`, `disableAutoReply`, `deleteAutoReply`
- **Filters**: `getFilters`, `getFilter`, `createFilter`, `updateFilter`, `deleteFilter`, `enableFilter`, `disableFilter`
- **Advanced**: `getAdvancedSettings`, `updateUploadSentMessages`, `getSMTPRelay`, `updateSMTPRelay`, `enableSMTPRelay`, `disableSMTPRelay`, `deleteSMTPRelay`

### Types

- **`WildduckSearchQueryParams`** - Search query parameters
- **`WildduckSearchMessagesResponse`** - Search results with pagination cursors
- **`WildduckUserSettings`** - User settings dictionary
- **`WildduckAuthStatusResponse`** - Auth status check response
- **`WildduckMockData`** - Mock data class for devMode

## API Methods (WildduckClient)

### Authentication
- `preAuth(request)` - Check if username exists (returns nonce for signing)
- `authenticate(request, options?)` - Authenticate with blockchain signature (SIWE/SIWS)
- `authenticateWithPassword(username, password, scope?)` - Legacy password auth
- `checkAuthStatus(token)` - Validate auth token via `/users/me`
- `logout(token)` - Delete auth token

### Users
- `createUser(request)` - Create new user
- `getUser(wildduckUserAuth)` - Get user info
- `updateUser(wildduckUserAuth, request)` - Update user
- `deleteUser(wildduckUserAuth)` - Delete user
- `getUsersList(filters?)` - List users (system-level)
- `getUserSettings(wildduckUserAuth)` - Get user settings via user endpoint
- `updateUserSettings(wildduckUserAuth, settings)` - Update user settings
- `getSettings(wildduckUserAuth)` - Get key-value settings via `/settings` endpoint
- `updateSetting(wildduckUserAuth, key, value)` - Update single setting
- `deleteSetting(wildduckUserAuth, key)` - Delete single setting

### Mailboxes
- `getMailboxes(wildduckUserAuth, options?)` - List mailboxes (specialUse, showHidden, counters, sizes)
- `getMailbox(wildduckUserAuth, mailboxId)` - Get single mailbox
- `createMailbox(wildduckUserAuth, request)` - Create mailbox
- `updateMailbox(wildduckUserAuth, mailboxId, request)` - Update mailbox
- `deleteMailbox(wildduckUserAuth, mailboxId)` - Delete mailbox

### Messages
- `getMessages(wildduckUserAuth, mailboxId, options?)` - List messages (limit, page, order, next/previous cursors, unseen, flagged, thread, uid, includeHeaders)
- `getMessage(wildduckUserAuth, mailboxId, messageId)` - Get single message
- `getMessageFromMailbox(wildduckUserAuth, mailboxId, messageId, options?)` - Get message with replaceCidLinks, markAsSeen options
- `searchMessages(wildduckUserAuth, params)` - Search across mailboxes (q, from, to, subject, datestart, dateend, minSize, maxSize, attachments, etc.)
- `uploadMessage(wildduckUserAuth, mailboxId, request)` - Upload/create message (drafts, imports)
- `updateMessage(wildduckUserAuth, mailboxId, messageId, request)` - Update flags, move to mailbox
- `deleteMessage(wildduckUserAuth, mailboxId, messageId)` - Delete message
- `submitMessage(wildduckUserAuth, request)` - Submit new message for delivery
- `submitDraft(wildduckUserAuth, mailboxId, messageId)` - Submit draft for delivery
- `forwardMessage(wildduckUserAuth, mailboxId, messageId, request)` - Forward stored message
- `getMessageSource(wildduckUserAuth, mailboxId, messageId)` - Get raw RFC822 source
- `getMessageAttachment(wildduckUserAuth, mailboxId, messageId, attachmentId)` - Download attachment

### Addresses
- `getAddresses(wildduckUserAuth)` - Get user email addresses
- `createAddress(wildduckUserAuth, params)` - Create address
- `updateAddress(wildduckUserAuth, addressId, params)` - Update address
- `deleteAddress(wildduckUserAuth, addressId)` - Delete address
- `resolveAddress(address)` - Resolve address to user (system-level)
- `getForwardedAddresses()` - List forwarded addresses (system-level)
- `createForwardedAddressSystem(params)` - Create forwarded address (system-level)
- `deleteForwardedAddressSystem(addressId)` - Delete forwarded address (system-level)

### Autoreply
- `getAutoreply(wildduckUserAuth)` - Get autoreply settings
- `updateAutoreply(wildduckUserAuth, request)` - Update autoreply
- `deleteAutoreply(wildduckUserAuth)` - Disable autoreply

### Filters
- `getFilters(wildduckUserAuth)` - List filters
- `getFilter(wildduckUserAuth, filterId)` - Get single filter
- `createFilter(wildduckUserAuth, filter)` - Create filter
- `updateFilter(wildduckUserAuth, filterId, filter)` - Update filter
- `deleteFilter(wildduckUserAuth, filterId)` - Delete filter

### Spam
- `getSpamSettings(wildduckUserAuth)` - Get spam settings (via user endpoint)
- `updateSpamLevel(wildduckUserAuth, spamLevel)` - Update spam level
- `addToWhitelist(wildduckUserAuth, address)` - Add to sender whitelist
- `removeFromWhitelist(wildduckUserAuth, address)` - Remove from whitelist

### Forwarding
- `getForwardingTargets(wildduckUserAuth)` - Get forwarding targets (via user endpoint)
- `addForwardingTarget(wildduckUserAuth, target)` - Add target
- `removeForwardingTarget(wildduckUserAuth, target)` - Remove target

### System
- `getHealth()` - Server health check

## Development Commands

```bash
# Install dependencies
bun install

# Build the library
bun run build                  # tsc -p tsconfig.build.json

# Watch mode compilation
bun run build:watch

# Clean dist directory
bun run clean

# Type checking
bun run typecheck              # tsc --noEmit
bun run typecheck:watch

# Unit testing (Vitest with happy-dom)
bun run test                   # Watch mode
bun run test:run               # Single run
bun run test:coverage          # With coverage report
bun run test:watch

# Integration testing
bun run test:integration       # Requires running WildDuck server
bun run test:integration:watch

# Code quality
bun run lint                   # ESLint (src/**/*.ts,tsx)
bun run lint:fix               # Auto-fix ESLint issues
bun run format                 # Prettier format
bun run format:check           # Check formatting

# Full check (lint + typecheck + test)
bun run check-all
```

## Architecture/Patterns

### Authentication Model

All API calls require a `WildduckUserAuth` object containing `userId` (MongoDB ObjectId), `username`, and `accessToken`. Authentication is per-request via Bearer token (the deprecated `setUserToken` instance method is a no-op). The primary auth flow is blockchain-based (SIWE/SIWS signatures) with password auth as a legacy fallback.

### Hook Architecture

Hooks follow two patterns:

1. **Monolithic hooks** (`useWildduckMessage`, `useWildduckUser`, `useWildduckMessages`) - Combine queries and mutations for a domain, with auto-invalidation on mutation success. These are the recommended pattern for new code.

2. **Individual domain hooks** (`useWildduckMailboxes`, `useWildduckFilters`, etc.) - Imperative-style hooks using local state + `useQueryClient` for cache management. Support optional WebSocket for real-time updates.

All hooks accept a `NetworkClient` interface (from `@sudobility/types`) and a `WildduckConfig` object, making them transport-agnostic.

### TanStack Query Integration

- Query keys are produced by a centralized factory in `query-keys.ts` (e.g., `queryKeys.wildduck.user(userId)`)
- Stale times are defined in `query-config.ts` (`STALE_TIMES.MESSAGES = 30s`, `STALE_TIMES.USER_PROFILE = 5min`, etc.)
- Mutations auto-invalidate related queries via `queryClient.invalidateQueries()`
- `devMode` flag on most hooks triggers mock data fallback from `WildduckMockData`

### WebSocket Real-Time Support

Optional WebSocket support is layered on top of REST hooks. The pattern is:

1. Wrap app in `<WebSocketProvider config={wsConfig} enabled={true}>`
2. Pass `{ enableWebSocket: true }` in hook options
3. Hooks auto-subscribe to channels (`mailboxes`, `messages`, `settings`, `filters`, `autoreply`)
4. Real-time updates (created/updated/deleted events) are applied to local state and TanStack Query cache
5. `WildduckWebSocketClient` handles reconnection with exponential backoff

### Validation

- All user IDs are validated as 24-char hex MongoDB ObjectIds via `validateUserId()` / `isValidObjectId()`
- Mailbox IDs are similarly validated before API calls
- Message IDs can be numeric or ObjectId depending on WildDuck configuration

### TypeScript Configuration

- Strict mode with all strict checks enabled
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- `noUnusedLocals: true` and `noUnusedParameters: true`
- Target ES2020 with ESNext modules and bundler resolution
- JSX mode: `react`

## Common Tasks

### Adding a New API Hook

1. Create `src/hooks/useWildduck<Feature>.ts`
2. Accept `(networkClient: NetworkClient, config: WildduckConfig, ...)` parameters
3. Create `WildduckClient` instance with `useMemo`
4. Use `useQuery` for reads and `useMutation` for writes
5. On mutation success, invalidate related queries via `queryClient`
6. Support `devMode` fallback with `WildduckMockData`
7. Export from `src/hooks/index.ts`
8. Re-exported automatically from `src/index.ts` via `export * from "./hooks"`

### Adding a New WildduckClient Method

1. Add the method to `src/network/wildduck-client.ts` inside the `WildduckClient` class
2. Use the private `request<T>()` method for HTTP calls
3. Accept `wildduckUserAuth: WildduckUserAuth` as first parameter for authenticated endpoints
4. Validate `userId` with `validateUserId()` and `mailboxId` with `isValidObjectId()`
5. Type request/response using types from `@sudobility/mail_box_types`

### Adding WebSocket Support to a Hook

1. Import `useWebSocket` from `../websocket/useWebSocket`
2. Accept `options?: { enableWebSocket?: boolean }` parameter
3. Try/catch `useWebSocket()` to gracefully handle missing provider
4. Use `wsContext.getClient(auth)` to get the client
5. Subscribe to the appropriate channel in a `useEffect`
6. Handle `data` events (initial subscription data) and `update` events (real-time changes)
7. Update both local state and TanStack Query cache
8. Clean up subscriptions and disconnect in the effect cleanup function

### Adding a New Utility Function

1. Create or add to a file in `src/utils/`
2. Accept `(networkClient: NetworkClient, config: WildduckConfig, wildduckUserAuth: WildduckUserAuth, ...)` parameters
3. Instantiate `WildduckAPI` (the legacy export alias for `WildduckClient`)
4. Export from `src/utils/index.ts`

### Running Integration Tests

1. Ensure a WildDuck server is running
2. Configure `.env` with API URL (see `.env.example`)
3. Run `bun run test:integration`

## Peer/Key Dependencies

### Peer Dependencies (must be provided by consumer)

- `@sudobility/di` ^1.5.35 - Dependency injection interfaces (provides `StorageService`)
- `@sudobility/mail_box_types` ^1.0.9 - WildDuck API type definitions (request/response types, `WildduckConfig`, `WildduckUserAuth`)
- `@sudobility/types` ^1.9.51 - Shared types (provides `NetworkClient`, `Optional`)
- `@tanstack/react-query` >=5.0.0 - Data fetching and caching
- `react` >=18.0.0

### Key Dev Dependencies

- `typescript` ^5.9.3 - TypeScript compiler
- `vitest` ^3.2.4 - Test runner (with `happy-dom` environment)
- `@testing-library/react` ^16.3.0 - React testing utilities
- `eslint` ^9.38.0 - Linter with React hooks plugin
- `prettier` ^3.6.2 - Code formatter
- `viem` ^2.38.4 - Ethereum utilities (used in blockchain auth context)
- `axios` ^1.13.0 - HTTP client (dev dependency, not bundled)
