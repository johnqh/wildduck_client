# WebSocket Support - Technical Design & Implementation Plan

## Executive Summary

This document outlines the design and implementation plan for adding optional WebSocket support to the wildduck_client library. The implementation maintains full backward compatibility with existing REST API patterns while enabling real-time updates through WebSocket connections.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server WebSocket Protocol](#server-websocket-protocol)
3. [Client Architecture](#client-architecture)
4. [Implementation Phases](#implementation-phases)
5. [API Design](#api-design)
6. [Testing Strategy](#testing-strategy)
7. [Migration Guide](#migration-guide)

---

## Architecture Overview

### Design Principles

1. **Opt-in by default**: WebSocket support is disabled unless explicitly enabled
2. **Backward compatible**: All existing hooks continue to work unchanged
3. **Progressive enhancement**: WebSockets enhance the API, don't replace it
4. **Single source of truth**: React Query cache remains authoritative
5. **Resilient**: Automatic reconnection with exponential backoff
6. **Per-auth connections**: One WebSocket connection per WildduckUserAuth

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
├─────────────────────────────────────────────────────────────┤
│  Component 1          Component 2          Component 3       │
│  ↓                    ↓                    ↓                 │
│  useWildduckMailboxes useWildduckMessages  useWildduckSettings│
│  ↓                    ↓                    ↓                 │
│  (optional socket param)                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              WebSocketProvider (React Context)               │
│  - Manages connections per WildduckUserAuth                  │
│  - Handles authentication, reconnection, subscriptions       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│               WildduckWebSocketClient                        │
│  - Connection lifecycle management                           │
│  - Protocol handling (subscribe/unsubscribe/fetch)           │
│  - Event emission and subscription tracking                  │
│  - Automatic reconnection with exponential backoff           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  WebSocket Connection                        │
│                  (ws://server/ws)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Server WebSocket Protocol

The wildduck server already implements a WebSocket server with the following protocol:

### Connection
- **URL**: `ws://[server]/ws`
- **Protocol**: Native WebSocket (RFC 6455)
- **Compression**: Per-message deflate enabled

### Message Format

All messages are JSON with the following structure:

#### Client → Server Messages

```typescript
// Subscribe to a channel
{
  type: "subscribe",
  channel: "mailboxes" | "messages" | "settings" | "filters" | "autoreply",
  data: {
    userId: string,
    token: string,
    // channel-specific params (e.g., mailboxId for messages)
  }
}

// Unsubscribe from a channel
{
  type: "unsubscribe",
  channel: string,
  data: {}
}

// Fetch more data (pagination)
{
  type: "fetch",
  channel: "messages",
  data: {
    mailboxId: string,
    cursor?: string
  }
}
```

#### Server → Client Messages

```typescript
// Initial data response (on subscribe)
{
  type: "data",
  channel: string,
  data: {
    code: 200,
    response: {
      success: true,
      // channel-specific data
      mailboxes?: Array<Mailbox>,
      messages?: Array<Message>,
      hasMore?: boolean
    }
  }
}

// Real-time update
{
  type: "update",
  channel: string,
  data: {
    code: 200,
    response: {
      success: true,
      // update-specific data
      event?: "created" | "updated" | "deleted",
      // affected resources
    }
  }
}

// Error response
{
  type: "data",
  channel: string,
  data: {
    code: 400 | 401 | 403 | 404 | 500,
    response: {
      success: false,
      error: string,
      message: string
    }
  }
}

// Disconnect notification
{
  type: "disconnect",
  channel: "system",
  data: {
    reason: "server_shutdown" | "timeout" | "token_expired"
  }
}
```

### Available Channels

1. **mailboxes**: List of user's mailboxes
   - Subscribe data: `{ userId, token }`
   - Initial response: `{ mailboxes: Array<Mailbox> }`
   - Updates: mailbox created, renamed, deleted

2. **messages**: List of messages in a mailbox
   - Subscribe data: `{ userId, token, mailboxId }`
   - Initial response: `{ messages: Array<Message>, hasMore: boolean }`
   - Updates: new message, message updated, message deleted
   - Supports pagination via `fetch` type

3. **settings**: User settings
   - Subscribe data: `{ userId, token }`
   - Updates: settings changed

4. **filters**: Email filters
   - Subscribe data: `{ userId, token }`
   - Updates: filter created, updated, deleted

5. **autoreply**: Auto-reply settings
   - Subscribe data: `{ userId, token }`
   - Updates: autoreply enabled, disabled, updated

### Connection Management

- **Heartbeat**: Server sends PING every 30s, expects PONG within 5s
- **Token validation**: Server validates token every 5 minutes
- **Disconnection**: Server sends disconnect message before closing
- **Multi-worker**: Uses Redis pub/sub for update distribution
- **Update batching**: Updates batched within 100ms window

---

## Client Architecture

### Core Components

#### 1. WildduckWebSocketClient

Low-level WebSocket client managing connection lifecycle.

**Responsibilities:**
- Establish and maintain WebSocket connection
- Handle protocol-level communication
- Emit events for upper layers
- Automatic reconnection with exponential backoff
- Track subscriptions and resubscribe on reconnect

**API:**
```typescript
class WildduckWebSocketClient extends EventEmitter {
  constructor(config: WebSocketConfig);

  connect(auth: WildduckUserAuth): Promise<void>;
  disconnect(): void;

  subscribe(channel: string, params: SubscriptionParams): Promise<SubscriptionResponse>;
  unsubscribe(channel: string): Promise<void>;
  fetch(channel: string, params: FetchParams): Promise<FetchResponse>;

  on(event: 'connected' | 'disconnected' | 'error' | 'reconnecting', handler: Function): void;
  on(event: 'data' | 'update', handler: (channel: string, data: any) => void): void;

  get isConnected(): boolean;
  get readyState(): WebSocketReadyState;
}

interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number; // Initial delay in ms
  maxReconnectDelay?: number; // Max delay in ms
  reconnectAttempts?: number; // Max attempts (0 = unlimited)
  pingInterval?: number;
}
```

**State Machine:**
```
DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTED
       ↑                         ↓
       └─── RECONNECTING ←───────┘
```

**Reconnection Strategy:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max)
- Resubscribe to all active channels on reconnect
- Emit 'reconnecting' event with attempt number
- Refetch all data after successful reconnection

#### 2. WebSocketProvider (React Context)

React context provider managing WebSocket connections per authentication.

**Responsibilities:**
- Create and manage WebSocket client instances per userId
- Provide connection state to child components
- Handle authentication lifecycle
- Cleanup on unmount

**API:**
```typescript
interface WebSocketContextValue {
  getClient: (auth: WildduckUserAuth) => WildduckWebSocketClient | null;
  isEnabled: boolean;
  isConnected: (userId: string) => boolean;
  connect: (auth: WildduckUserAuth) => Promise<void>;
  disconnect: (userId: string) => void;
}

function WebSocketProvider({
  children,
  config,
  enabled = false // Opt-in by default
}: {
  children: React.ReactNode;
  config: WebSocketConfig;
  enabled?: boolean;
}): JSX.Element;

function useWebSocket(): WebSocketContextValue;
```

**Connection Lifecycle:**
```typescript
// Connections stored per userId
Map<userId, {
  client: WildduckWebSocketClient,
  auth: WildduckUserAuth,
  refCount: number
}>

// When first hook requests connection:
// 1. Create WildduckWebSocketClient
// 2. Call client.connect(auth)
// 3. Increment refCount
// 4. Return client

// When hook unmounts:
// 1. Decrement refCount
// 2. If refCount === 0, disconnect after delay (5s)

// On disconnect:
// 1. Call client.disconnect()
// 2. Remove from map
```

#### 3. Enhanced Hooks

Add optional WebSocket support to existing hooks.

**Pattern:**
```typescript
function useWildduckMailboxes(
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: Optional<WildduckUserAuth>,
  devMode: boolean = false,
  options?: {
    enableWebSocket?: boolean; // Per-hook opt-in
  }
): UseWildduckMailboxesReturn {
  const { getClient, isConnected } = useWebSocket();
  const wsClient = options?.enableWebSocket && wildduckUserAuth
    ? getClient(wildduckUserAuth)
    : null;

  // Subscribe to WebSocket channel if available
  useEffect(() => {
    if (!wsClient || !wildduckUserAuth) return;

    const handleUpdate = (channel: string, data: any) => {
      if (channel === 'mailboxes') {
        // Update React Query cache
        queryClient.setQueryData(
          ['wildduck-mailboxes', wildduckUserAuth.userId],
          data.response.mailboxes
        );
      }
    };

    wsClient.on('data', handleUpdate);
    wsClient.on('update', handleUpdate);

    // Subscribe to channel
    wsClient.subscribe('mailboxes', {
      userId: wildduckUserAuth.userId,
      token: wildduckUserAuth.accessToken
    }).then((response) => {
      // Use initial data from subscription
      queryClient.setQueryData(
        ['wildduck-mailboxes', wildduckUserAuth.userId],
        response.mailboxes
      );
    });

    return () => {
      wsClient.off('data', handleUpdate);
      wsClient.off('update', handleUpdate);
      wsClient.unsubscribe('mailboxes');
    };
  }, [wsClient, wildduckUserAuth]);

  // Rest of hook implementation remains the same
  // ...
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal**: Build the foundational WebSocket client and connection management.

**Tasks:**

1. **Create WebSocket Client** (`src/websocket/client.ts`)
   - Implement `WildduckWebSocketClient` class
   - Connection lifecycle management
   - Protocol message handling
   - Event emitter for data/update events
   - Error handling

2. **Implement Reconnection Logic**
   - Exponential backoff algorithm
   - Subscription state tracking
   - Resubscribe on reconnect
   - Connection state management

3. **Add TypeScript Types** (`src/websocket/types.ts`)
   - WebSocket message types
   - Subscription parameter types
   - Response types for each channel
   - Error types

4. **Unit Tests**
   - Mock WebSocket implementation
   - Test connection lifecycle
   - Test reconnection logic
   - Test subscription management
   - Test error handling

**Deliverables:**
- ✅ `WildduckWebSocketClient` fully functional
- ✅ Complete type definitions
- ✅ Unit test coverage >90%

**Files to Create:**
```
src/
  websocket/
    client.ts              # WebSocket client implementation
    types.ts               # TypeScript type definitions
    constants.ts           # Constants (reconnect delays, etc.)
    protocol.ts            # Protocol message builders/parsers
    client.test.ts         # Unit tests
```

---

### Phase 2: React Context Integration (Week 1-2)

**Goal**: Create React context provider for managing WebSocket connections.

**Tasks:**

1. **Create Context Provider** (`src/websocket/provider.tsx`)
   - Implement `WebSocketProvider` component
   - Connection management per userId
   - Reference counting for shared connections
   - Configuration propagation

2. **Create Hook** (`src/websocket/useWebSocket.ts`)
   - Implement `useWebSocket()` hook
   - Access to WebSocket client
   - Connection state queries
   - Imperative connect/disconnect

3. **Add Configuration**
   - Extend `WildduckConfig` with WebSocket options
   - Default configuration values
   - Environment variable support

4. **Integration Tests**
   - Test context provider mounting/unmounting
   - Test connection sharing between hooks
   - Test cleanup and disconnection
   - Test configuration handling

**Deliverables:**
- ✅ `WebSocketProvider` ready for use
- ✅ `useWebSocket()` hook functional
- ✅ Integration test suite

**Files to Create:**
```
src/
  websocket/
    provider.tsx           # React context provider
    useWebSocket.ts        # Hook to access WebSocket
    provider.test.tsx      # Integration tests
```

---

### Phase 3: Hook Enhancement - Mailboxes (Week 2)

**Goal**: Add WebSocket support to `useWildduckMailboxes` as a proof of concept.

**Tasks:**

1. **Enhance useWildduckMailboxes**
   - Add optional `enableWebSocket` parameter
   - Subscribe to `mailboxes` channel
   - Handle initial data from subscription
   - Handle real-time updates
   - Update React Query cache

2. **Handle Update Events**
   - Mailbox created: Add to list
   - Mailbox updated: Update in list
   - Mailbox deleted: Remove from list
   - Maintain sort order

3. **Fallback Logic**
   - Graceful degradation if WebSocket unavailable
   - Continue using REST API if WebSocket disabled
   - Handle WebSocket errors without breaking hook

4. **Tests**
   - Test WebSocket subscription flow
   - Test update handling
   - Test fallback to REST API
   - Test error scenarios

**Deliverables:**
- ✅ `useWildduckMailboxes` with WebSocket support
- ✅ Update handling for all mailbox events
- ✅ Comprehensive test coverage

**Modified Files:**
```
src/
  hooks/
    useWildduckMailboxes.ts   # Enhanced with WebSocket support
    useWildduckMailboxes.test.ts # Updated tests
```

---

### Phase 4: Hook Enhancement - Messages (Week 2-3)

**Goal**: Add WebSocket support to `useWildduckMessages`.

**Tasks:**

1. **Enhance useWildduckMessages**
   - Add optional `enableWebSocket` parameter
   - Subscribe to `messages` channel
   - Handle initial data and pagination
   - Handle real-time updates
   - Implement `fetch` for infinite scroll

2. **Handle Update Events**
   - Message new: Add to list (prepend)
   - Message updated: Update in list (flags, seen status)
   - Message deleted: Remove from list
   - Handle pagination state

3. **Pagination Support**
   - Use WebSocket `fetch` type for pagination
   - Maintain cursor state
   - Handle `hasMore` flag
   - Integrate with existing `next()` function

4. **Tests**
   - Test message subscription
   - Test real-time updates
   - Test pagination via WebSocket
   - Test fallback scenarios

**Deliverables:**
- ✅ `useWildduckMessages` with WebSocket support
- ✅ Pagination working via WebSocket
- ✅ Update handling for all message events

**Modified Files:**
```
src/
  hooks/
    useWildduckMessages.ts   # Enhanced with WebSocket support
    useWildduckMessages.test.ts # Updated tests
```

---

### Phase 5: Hook Enhancement - Settings, Filters, AutoReply (Week 3)

**Goal**: Add WebSocket support to remaining hooks.

**Tasks:**

1. **Enhance useWildduckSettings**
   - Add WebSocket subscription to `settings` channel
   - Handle settings updates
   - Tests

2. **Enhance useWildduckFilters**
   - Add WebSocket subscription to `filters` channel
   - Handle filter CRUD updates
   - Tests

3. **Enhance useWildduckAutoReply**
   - Add WebSocket subscription to `autoreply` channel
   - Handle autoreply updates
   - Tests

4. **Unified Pattern**
   - Extract common WebSocket subscription logic
   - Create helper hook `useWebSocketChannel`
   - Refactor all hooks to use shared pattern

**Deliverables:**
- ✅ All hooks support WebSocket
- ✅ Shared subscription pattern
- ✅ Complete test coverage

**Modified Files:**
```
src/
  hooks/
    useWildduckSettings.ts
    useWildduckFilters.ts
    useWildduckAutoReply.ts
    useWebSocketChannel.ts      # New shared hook
  websocket/
    helpers.ts                  # Shared subscription helpers
```

---

### Phase 6: Documentation & Examples (Week 3-4)

**Goal**: Provide comprehensive documentation and examples.

**Tasks:**

1. **API Documentation**
   - Document all WebSocket APIs
   - Document hook options
   - Document configuration options
   - Add JSDoc comments

2. **Usage Examples**
   - Basic WebSocket setup
   - Real-time mailbox list
   - Real-time message list
   - Error handling patterns
   - Advanced configuration

3. **Migration Guide**
   - How to enable WebSocket support
   - Breaking changes (none expected)
   - Performance considerations
   - Debugging tips

4. **Storybook Stories**
   - WebSocket-enabled hook examples
   - Connection state visualization
   - Update animations

**Deliverables:**
- ✅ Complete API documentation
- ✅ Working examples
- ✅ Migration guide
- ✅ Storybook stories

**Files to Create:**
```
docs/
  websocket/
    README.md              # Overview and getting started
    api.md                 # Complete API reference
    examples.md            # Usage examples
    migration.md           # Migration guide
    troubleshooting.md     # Common issues and solutions
examples/
  websocket-basic/         # Basic usage example
  websocket-advanced/      # Advanced patterns
stories/
  WebSocket.stories.tsx    # Storybook examples
```

---

### Phase 7: Performance & Polish (Week 4)

**Goal**: Optimize performance and add polish features.

**Tasks:**

1. **Performance Optimization**
   - Implement update batching on client side
   - Optimize React Query cache updates
   - Minimize re-renders
   - Profile and optimize memory usage

2. **Developer Experience**
   - Add connection state indicator component
   - Add debug logging (opt-in)
   - Add performance monitoring
   - Add error reporting hooks

3. **Production Readiness**
   - Security audit
   - Memory leak testing
   - Long-running connection tests
   - Load testing (many subscriptions)

4. **Polish**
   - Add TypeScript strict mode compliance
   - Add ESLint rules for WebSocket code
   - Code review and cleanup
   - Final documentation pass

**Deliverables:**
- ✅ Optimized performance
- ✅ Developer tools and debugging
- ✅ Production-ready code
- ✅ Security audit complete

**Files to Create/Modify:**
```
src/
  websocket/
    monitoring.ts          # Performance monitoring
    debug.ts               # Debug utilities
  components/
    WebSocketStatus.tsx    # Connection status component
```

---

## API Design

### Configuration

```typescript
// Extend existing WildduckConfig
interface WildduckConfig {
  // ... existing fields
  websocket?: {
    enabled?: boolean;           // Default: false (opt-in)
    url?: string;                // Default: derived from backendUrl
    reconnect?: boolean;         // Default: true
    reconnectDelay?: number;     // Default: 1000ms
    maxReconnectDelay?: number;  // Default: 32000ms
    reconnectAttempts?: number;  // Default: 0 (unlimited)
    autoSubscribe?: boolean;     // Default: true (subscribe on mount)
    debug?: boolean;             // Default: false
  };
}
```

### Usage Example

```typescript
import {
  WebSocketProvider,
  useWildduckMailboxes,
  useWildduckMessages
} from '@sudobility/wildduck-client';

function App() {
  return (
    <WebSocketProvider
      config={{
        url: 'ws://localhost:8080/ws',
        reconnect: true,
        reconnectDelay: 1000,
        maxReconnectDelay: 32000,
        debug: process.env.NODE_ENV === 'development'
      }}
      enabled={true} // Enable WebSocket support globally
    >
      <MailApp />
    </WebSocketProvider>
  );
}

function MailApp() {
  const auth = useAuth(); // Your auth hook

  // Enable WebSocket for this hook
  const { mailboxes, isLoading } = useWildduckMailboxes(
    networkClient,
    config,
    auth,
    false,
    { enableWebSocket: true } // Opt-in per hook
  );

  const { messages } = useWildduckMessages(
    networkClient,
    config,
    false,
    { enableWebSocket: true } // Opt-in per hook
  );

  // Mailboxes and messages automatically update in real-time!
  return <MailboxList mailboxes={mailboxes} />;
}
```

### Connection Status Component

```typescript
import { useWebSocket } from '@sudobility/wildduck-client';

function ConnectionStatus() {
  const { isConnected, isReconnecting } = useWebSocket();

  if (isReconnecting) {
    return <Badge color="yellow">Reconnecting...</Badge>;
  }

  return (
    <Badge color={isConnected ? 'green' : 'red'}>
      {isConnected ? 'Connected' : 'Disconnected'}
    </Badge>
  );
}
```

---

## Testing Strategy

### Unit Tests

**What to test:**
- WebSocket client connection lifecycle
- Message protocol parsing and building
- Reconnection logic and backoff
- Subscription management
- Error handling
- Event emission

**Tools:**
- Jest
- Mock WebSocket implementation
- ws library for testing

**Coverage target:** >90%

### Integration Tests

**What to test:**
- Context provider lifecycle
- Connection sharing between hooks
- Hook subscription and unsubscription
- Real-time updates to React Query cache
- Fallback to REST API
- Reconnection with resubscription

**Tools:**
- React Testing Library
- Mock WebSocket server
- Testing with multiple components

**Coverage target:** >85%

### E2E Tests

**What to test:**
- Full user workflow with real-time updates
- WebSocket connection with real server
- Multi-tab synchronization
- Network interruption handling
- Long-running connections

**Tools:**
- Playwright or Cypress
- Real WildDuck test server
- Network throttling

**Coverage:** Critical user flows

### Manual Testing Checklist

- [ ] Connect to WebSocket server
- [ ] Authenticate with valid token
- [ ] Subscribe to mailboxes channel
- [ ] Receive initial mailbox list
- [ ] Create mailbox via API, see update in real-time
- [ ] Rename mailbox via API, see update in real-time
- [ ] Delete mailbox via API, see update in real-time
- [ ] Subscribe to messages channel
- [ ] Receive initial message list
- [ ] Send new email, see update in real-time
- [ ] Mark message as read, see update in real-time
- [ ] Delete message, see update in real-time
- [ ] Disconnect network, verify reconnection
- [ ] Verify data refetch after reconnection
- [ ] Test with multiple tabs open
- [ ] Test token expiration handling
- [ ] Test server shutdown gracefully

---

## Migration Guide

### For Library Users

#### Before (REST API Only)

```typescript
import { useWildduckMailboxes } from '@sudobility/wildduck-client';

function MyComponent() {
  const { mailboxes, refresh } = useWildduckMailboxes(
    networkClient,
    config,
    auth,
    false
  );

  // Must manually call refresh() to get updates
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [refresh]);

  return <MailboxList mailboxes={mailboxes} />;
}
```

#### After (With WebSocket Support)

```typescript
import {
  WebSocketProvider,
  useWildduckMailboxes
} from '@sudobility/wildduck-client';

// 1. Wrap your app with WebSocketProvider
function App() {
  return (
    <WebSocketProvider
      config={{ url: 'ws://localhost:8080/ws' }}
      enabled={true}
    >
      <MyComponent />
    </WebSocketProvider>
  );
}

// 2. Enable WebSocket in the hook
function MyComponent() {
  const { mailboxes } = useWildduckMailboxes(
    networkClient,
    config,
    auth,
    false,
    { enableWebSocket: true } // Add this option
  );

  // No need to poll! Updates happen automatically
  // refresh() still available for manual refresh

  return <MailboxList mailboxes={mailboxes} />;
}
```

### Breaking Changes

**None.** WebSocket support is completely opt-in and backward compatible.

### Configuration Changes

No changes to existing configuration. WebSocket configuration is optional:

```typescript
const config: WildduckConfig = {
  backendUrl: 'http://localhost:8080',
  // New optional field:
  websocket: {
    url: 'ws://localhost:8080/ws', // Optional: defaults to ws://[backendUrl]/ws
    enabled: true,
    reconnect: true
  }
};
```

### Performance Considerations

#### Benefits:
- Eliminates polling overhead
- Reduces API requests by 90%+
- Near-instant UI updates
- Lower server load

#### Trade-offs:
- Additional WebSocket connection
- Slightly higher memory usage (connection state)
- Requires WebSocket support on server

#### Recommendations:
- Enable WebSocket for frequently updated data (mailboxes, messages)
- Keep REST API fallback for occasional data (settings, filters)
- Monitor WebSocket connection health in production
- Use connection pooling in production (already handled per-auth)

---

## Open Questions & Decisions

### 1. Error Recovery Strategy

**Question:** When a WebSocket update fails to parse or apply, should we:
- A) Refetch the entire dataset from REST API
- B) Log the error and continue
- C) Show a user-facing error notification

**Recommendation:** A) Refetch the entire dataset. This ensures data consistency even if an update is malformed or conflicts with local state.

### 2. Update Conflict Resolution

**Question:** If a local mutation (e.g., mark message as read) is pending and a WebSocket update arrives for the same resource, how do we handle it?

**Recommendation:**
- Track pending mutations in React Query
- Ignore WebSocket updates for resources with pending mutations
- Apply WebSocket update after mutation completes
- This matches React Query's optimistic update pattern

### 3. Cross-Tab Synchronization

**Question:** Should we support multiple tabs using the same auth token?

**Recommendation:**
- Yes, by default each tab creates its own WebSocket connection
- Server already supports multiple connections per user
- Consider using Shared Workers or BroadcastChannel for future optimization

### 4. Message Batching

**Question:** Server batches updates (100ms window). Should client also batch cache updates?

**Recommendation:**
- Yes, batch React Query cache updates within a 50ms window
- Reduces re-renders
- Implement in Phase 7 (Performance)

### 5. Debug Mode

**Question:** What debug information should be exposed?

**Recommendation:**
- Connection state changes
- Subscription lifecycle
- Message send/receive (with timestamps)
- Reconnection attempts
- Performance metrics (message latency, cache update time)
- Expose via `debug: true` config option

---

## Success Metrics

### Phase Completion Criteria

Each phase is complete when:
1. All deliverables are implemented
2. All tests pass with required coverage
3. Documentation is complete
4. Code review is approved
5. No critical bugs remain

### Overall Success Metrics

1. **API Compatibility**: 100% backward compatible with existing hooks
2. **Test Coverage**: >85% for all WebSocket code
3. **Performance**: <50ms latency from server update to cache update
4. **Reliability**: Auto-reconnection success rate >99%
5. **Documentation**: All APIs documented with examples
6. **Adoption**: Clear migration path for existing users

---

## Risk Assessment & Mitigation

### Risk 1: WebSocket Connection Instability
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Implement robust reconnection logic (exponential backoff)
- Fall back to REST API if WebSocket repeatedly fails
- Add connection health monitoring
- Add user-facing connection status indicator

### Risk 2: Update Race Conditions
**Probability:** Low
**Impact:** High
**Mitigation:**
- Use React Query's built-in optimistic updates
- Implement update conflict resolution
- Add version/timestamp tracking if needed
- Comprehensive testing of concurrent updates

### Risk 3: Memory Leaks
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Proper cleanup in useEffect hooks
- Reference counting for shared connections
- Memory leak testing in Phase 7
- Connection timeout and garbage collection

### Risk 4: Breaking Changes
**Probability:** Low
**Impact:** High
**Mitigation:**
- WebSocket support is opt-in
- No changes to existing hook APIs
- Comprehensive backward compatibility tests
- Version with semantic versioning (minor version bump)

### Risk 5: Browser Compatibility
**Probability:** Low
**Impact:** Low
**Mitigation:**
- WebSocket API is widely supported (95%+ browsers)
- Feature detection and graceful degradation
- Fallback to REST API if WebSocket unavailable
- Document browser requirements

---

## Appendix

### A. Server Protocol Examples

#### Example 1: Mailbox Subscription

Client sends:
```json
{
  "type": "subscribe",
  "channel": "mailboxes",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
  }
}
```

Server responds with initial data:
```json
{
  "type": "data",
  "channel": "mailboxes",
  "data": {
    "code": 200,
    "response": {
      "success": true,
      "mailboxes": [
        {
          "id": "507f1f77bcf86cd799439012",
          "name": "INBOX",
          "path": "INBOX",
          "specialUse": "\\Inbox",
          "modifyIndex": 123,
          "subscribed": true,
          "hidden": false
        }
      ]
    }
  }
}
```

Server sends update (when mailbox created):
```json
{
  "type": "update",
  "channel": "mailboxes",
  "data": {
    "code": 200,
    "response": {
      "success": true,
      "event": "created",
      "mailbox": {
        "id": "507f1f77bcf86cd799439013",
        "name": "Work",
        "path": "Work",
        "modifyIndex": 124,
        "subscribed": true,
        "hidden": false
      }
    }
  }
}
```

#### Example 2: Messages Subscription with Pagination

Client subscribes:
```json
{
  "type": "subscribe",
  "channel": "messages",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "mailboxId": "507f1f77bcf86cd799439012"
  }
}
```

Server responds:
```json
{
  "type": "data",
  "channel": "messages",
  "data": {
    "code": 200,
    "response": {
      "success": true,
      "mailboxId": "507f1f77bcf86cd799439012",
      "messages": [ /* ... 500 messages ... */ ],
      "hasMore": true
    }
  }
}
```

Client fetches more:
```json
{
  "type": "fetch",
  "channel": "messages",
  "data": {
    "mailboxId": "507f1f77bcf86cd799439012"
  }
}
```

#### Example 3: Error Response

```json
{
  "type": "data",
  "channel": "mailboxes",
  "data": {
    "code": 401,
    "response": {
      "success": false,
      "error": "Unauthorized",
      "message": "Invalid or expired token"
    }
  }
}
```

### B. Type Definitions

```typescript
// src/websocket/types.ts

export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

export interface WebSocketConfig {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectAttempts?: number;
  autoSubscribe?: boolean;
  debug?: boolean;
}

export interface SubscriptionParams {
  userId: string;
  token: string;
  [key: string]: any; // Channel-specific params
}

export interface SubscriptionResponse {
  success: boolean;
  [key: string]: any; // Channel-specific data
}

export interface FetchParams {
  [key: string]: any; // Channel-specific params
}

export interface FetchResponse {
  success: boolean;
  [key: string]: any; // Channel-specific data
}

export interface WebSocketMessage {
  type: 'data' | 'update' | 'disconnect';
  channel: string;
  data: {
    code: number;
    response: {
      success: boolean;
      error?: string;
      message?: string;
      [key: string]: any;
    };
  };
}

export interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'fetch';
  channel: string;
  data: Record<string, any>;
}

export type WebSocketEventMap = {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  reconnecting: (attempt: number, delay: number) => void;
  error: (error: Error) => void;
  data: (channel: string, data: any) => void;
  update: (channel: string, data: any) => void;
};
```

### C. Implementation Checklist

#### Phase 1: Core Infrastructure
- [ ] Create project structure
- [ ] Implement `WildduckWebSocketClient` class
- [ ] Add connection state management
- [ ] Implement reconnection with exponential backoff
- [ ] Add protocol message builders
- [ ] Add protocol message parsers
- [ ] Implement event emitter
- [ ] Add subscription tracking
- [ ] Add TypeScript types
- [ ] Write unit tests
- [ ] Achieve >90% test coverage

#### Phase 2: React Context Integration
- [ ] Create `WebSocketProvider` component
- [ ] Implement connection management per userId
- [ ] Add reference counting
- [ ] Implement `useWebSocket` hook
- [ ] Add configuration handling
- [ ] Add cleanup logic
- [ ] Write integration tests
- [ ] Test multi-component scenarios

#### Phase 3: Hook Enhancement - Mailboxes
- [ ] Add `enableWebSocket` option to useWildduckMailboxes
- [ ] Implement subscription logic
- [ ] Handle initial data from WebSocket
- [ ] Handle mailbox created updates
- [ ] Handle mailbox updated updates
- [ ] Handle mailbox deleted updates
- [ ] Implement fallback to REST API
- [ ] Write tests for WebSocket flow
- [ ] Write tests for fallback scenarios

#### Phase 4: Hook Enhancement - Messages
- [ ] Add `enableWebSocket` option to useWildduckMessages
- [ ] Implement subscription logic
- [ ] Handle initial messages
- [ ] Handle new message updates
- [ ] Handle message updated updates
- [ ] Handle message deleted updates
- [ ] Implement `fetch` for pagination
- [ ] Update pagination state
- [ ] Write comprehensive tests

#### Phase 5: Hook Enhancement - Others
- [ ] Enhance useWildduckSettings
- [ ] Enhance useWildduckFilters
- [ ] Enhance useWildduckAutoReply
- [ ] Create shared `useWebSocketChannel` helper
- [ ] Refactor all hooks to use shared pattern
- [ ] Write tests for all enhanced hooks

#### Phase 6: Documentation & Examples
- [ ] Write API documentation
- [ ] Create usage examples
- [ ] Write migration guide
- [ ] Add troubleshooting guide
- [ ] Create basic example project
- [ ] Create advanced example project
- [ ] Add Storybook stories
- [ ] Review all documentation

#### Phase 7: Performance & Polish
- [ ] Implement client-side update batching
- [ ] Optimize React Query cache updates
- [ ] Profile performance
- [ ] Optimize memory usage
- [ ] Add connection status component
- [ ] Add debug logging
- [ ] Add performance monitoring
- [ ] Security audit
- [ ] Memory leak testing
- [ ] Load testing
- [ ] Code review
- [ ] Final polish

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding optional WebSocket support to wildduck_client while maintaining full backward compatibility. The phased approach allows for incremental development and testing, reducing risk and ensuring quality.

**Key Principles:**
1. **Opt-in**: WebSocket support is optional and disabled by default
2. **Backward Compatible**: All existing APIs continue to work unchanged
3. **Progressive Enhancement**: WebSockets enhance the experience without breaking existing functionality
4. **Resilient**: Automatic reconnection and graceful degradation
5. **Performant**: Reduced API calls, near-instant updates, optimized cache updates
6. **Developer-Friendly**: Clear APIs, comprehensive docs, helpful debugging tools

**Next Steps:**
1. Review this plan with the team
2. Get approval for the architecture
3. Set up project tracking (GitHub issues/project board)
4. Begin Phase 1 implementation
5. Schedule weekly sync meetings to review progress

**Estimated Timeline:**
- Total: 3-4 weeks
- Phase 1: 3-4 days
- Phase 2: 2-3 days
- Phase 3: 3-4 days
- Phase 4: 3-4 days
- Phase 5: 3-4 days
- Phase 6: 2-3 days
- Phase 7: 2-3 days

**Questions or Feedback:**
Please review this plan and provide feedback on:
1. Architecture decisions
2. API design
3. Implementation phases and timeline
4. Testing strategy
5. Any concerns or risks not addressed

---

*Last Updated: 2025-01-18*
*Version: 1.0*
*Author: Claude Code*
