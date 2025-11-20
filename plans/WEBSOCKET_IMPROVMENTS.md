# WebSocket Improvements Plan

## Executive Summary

This plan addresses critical race conditions, cleanup issues, and architectural inconsistencies discovered in the WebSocket integration across all Wildduck hooks. The improvements will enhance reliability, type safety, and maintainability.

---

## Phase 1: Critical Fixes (Priority: High)

### 1.1 Fix Unconditional Disconnect in Cleanup

**Problem**: All hooks call `wsContext.disconnect(userId)` unconditionally in cleanup, even when not connected.

**Impact**: Could disconnect connections used by other hooks, causing unexpected disconnections.

**Files Affected**:
- `src/hooks/useWildduckAutoReply.ts:186-198`
- `src/hooks/useWildduckFilters.ts:209-221`
- `src/hooks/useWildduckMailboxes.ts:322-335`
- `src/hooks/useWildduckMessages.ts:330-344`
- `src/hooks/useWildduckSettings.ts:191-203`

**Solution**:
```typescript
// Before:
return () => {
  client.off("data", handleData);
  client.off("update", handleUpdate);

  if (wsSubscribedRef.current) {
    client.unsubscribe("autoreply").catch(...);
    wsSubscribedRef.current = false;
  }

  wsContext.disconnect(wildduckUserAuth.userId); // ❌ Unconditional
};

// After:
return () => {
  client.off("data", handleData);
  client.off("update", handleUpdate);

  if (wsSubscribedRef.current) {
    client.unsubscribe("autoreply").catch(...);
    wsSubscribedRef.current = false;
    wsContext.disconnect(wildduckUserAuth.userId); // ✅ Guarded
  }
};
```

**Tasks**:
- [ ] Update cleanup in useWildduckAutoReply.ts
- [ ] Update cleanup in useWildduckFilters.ts
- [ ] Update cleanup in useWildduckMailboxes.ts
- [ ] Update cleanup in useWildduckMessages.ts
- [ ] Update cleanup in useWildduckSettings.ts

---

### 1.2 Fix Effect Dependencies (Object Reference Issues)

**Problem**: Full `wildduckUserAuth` object in dependencies causes unnecessary re-runs when parent re-renders with new object reference.

**Impact**: Causes disconnect/reconnect storms, poor performance, potential race conditions.

**Solution**: Extract stable identifiers for dependency array.

**Option A - Use userId only**:
```typescript
const userId = wildduckUserAuth?.userId || null;

useEffect(() => {
  if (!shouldUseWebSocket || !wildduckUserAuth || !wsContext) {
    return;
  }
  // ... subscription logic
}, [shouldUseWebSocket, userId, wsContext, queryClient]); // Use userId instead of wildduckUserAuth
```

**Option B - Use useMemo for auth**:
```typescript
const stableAuth = useMemo(
  () => wildduckUserAuth,
  [wildduckUserAuth?.userId, wildduckUserAuth?.accessToken]
);

useEffect(() => {
  // ... use stableAuth
}, [shouldUseWebSocket, stableAuth, wsContext, queryClient]);
```

**Decision Needed**: Choose Option A (simpler) or Option B (more explicit)

**Tasks**:
- [ ] Decide on approach (A or B)
- [ ] Update useWildduckAutoReply dependencies
- [ ] Update useWildduckFilters dependencies
- [ ] Update useWildduckMailboxes dependencies
- [ ] Update useWildduckMessages dependencies
- [ ] Update useWildduckSettings dependencies
- [ ] Test re-render behavior with new dependencies

---

### 1.3 Fix Subscription State Race Condition

**Problem**: `wsSubscribedRef.current` and `currentMailboxIdRef.current` set before subscribe promise resolves.

**Impact**: If component unmounts during subscription, cleanup may fail or behave incorrectly.

**Files Affected**:
- `src/hooks/useWildduckMessages.ts:296-328`
- All other hooks have similar pattern at subscription time

**Solution**:
```typescript
// Before:
if (!wsSubscribedRef.current) {
  wsSubscribedRef.current = true; // ❌ Set before async operation completes
  wsContext
    .connect(wildduckUserAuth)
    .then(() => client.subscribe("autoreply", {...}))
    .catch((error) => {
      wsSubscribedRef.current = false;
    });
}

// After:
if (!wsSubscribedRef.current) {
  const subscriptionPromise = wsContext
    .connect(wildduckUserAuth)
    .then(() => client.subscribe("autoreply", {...}))
    .then(() => {
      wsSubscribedRef.current = true; // ✅ Set after success
    })
    .catch((error) => {
      console.error("Failed to connect/subscribe:", error);
      // wsSubscribedRef remains false
    });
}
```

**Tasks**:
- [ ] Update subscription logic in useWildduckAutoReply
- [ ] Update subscription logic in useWildduckFilters
- [ ] Update subscription logic in useWildduckMailboxes
- [ ] Update subscription logic in useWildduckMessages (including mailbox change handling)
- [ ] Update subscription logic in useWildduckSettings
- [ ] Add tests for unmount-during-subscription scenarios

---

## Phase 2: Moderate Improvements (Priority: Medium)

### 2.1 Add Proper TypeScript Types for WebSocket Messages

**Problem**: Extensive use of `as any` bypasses type safety.

**Impact**: Runtime errors if server response schema changes.

**Files Affected**: All hooks (handleData and handleUpdate functions)

**Solution**:
1. Create type definitions for WebSocket messages
2. Replace `as any` with proper types

**New Types to Create** (`src/websocket/message-types.ts`):
```typescript
// Base response
export interface WebSocketResponse {
  success: boolean;
  channel: ChannelName;
}

// Data responses (initial subscription)
export interface AutoreplyDataResponse extends WebSocketResponse {
  channel: "autoreply";
  autoreply: WildduckAutoreplyResponse;
}

export interface FiltersDataResponse extends WebSocketResponse {
  channel: "filters";
  filters: WildduckFilterListItem[];
}

export interface MailboxesDataResponse extends WebSocketResponse {
  channel: "mailboxes";
  mailboxes: WildduckMailbox[];
}

export interface MessagesDataResponse extends WebSocketResponse {
  channel: "messages";
  messages: WildduckMessage[];
  total: number;
  nextCursor?: string | false;
  previousCursor?: string | false;
}

export interface SettingsDataResponse extends WebSocketResponse {
  channel: "settings";
  settings: WildduckSettings;
}

// Update responses (real-time events)
export interface AutoreplyUpdateResponse extends WebSocketResponse {
  channel: "autoreply";
  event: "updated" | "deleted";
  autoreply?: WildduckAutoreplyResponse;
}

export interface FiltersUpdateResponse extends WebSocketResponse {
  channel: "filters";
  event: "created" | "updated" | "deleted";
  filter: WildduckFilterListItem;
}

export interface MailboxesUpdateResponse extends WebSocketResponse {
  channel: "mailboxes";
  event: "created" | "updated" | "deleted";
  mailbox: WildduckMailbox;
}

export interface MessagesUpdateResponse extends WebSocketResponse {
  channel: "messages";
  event: "created" | "updated" | "deleted";
  message: WildduckMessage;
}

export interface SettingsUpdateResponse extends WebSocketResponse {
  channel: "settings";
  event: "updated" | "deleted";
  key: string;
  value?: any;
}

// Type guards
export function isAutoreplyDataResponse(data: ServerResponseData): data is AutoreplyDataResponse {
  return data.success && 'autoreply' in data;
}

export function isFiltersDataResponse(data: ServerResponseData): data is FiltersDataResponse {
  return data.success && 'filters' in data;
}

// ... more type guards
```

**Tasks**:
- [ ] Create `src/websocket/message-types.ts` with all WebSocket message types
- [ ] Create type guards for runtime validation
- [ ] Update useWildduckAutoReply to use typed messages
- [ ] Update useWildduckFilters to use typed messages
- [ ] Update useWildduckMailboxes to use typed messages
- [ ] Update useWildduckMessages to use typed messages
- [ ] Update useWildduckSettings to use typed messages
- [ ] Add validation in handlers to verify message structure

---

### 2.2 Add Connection Resilience

**Problem**: No handling for unexpected disconnections, no reconnection logic, no timeouts.

**Impact**: Broken WebSocket connections leave UI in stale state until page refresh.

**Solution**: Add reconnection logic and timeouts at the WebSocketContext level.

**Tasks**:
- [ ] Investigate WebSocketContext implementation (check if it already has reconnection)
- [ ] If not, add automatic reconnection with exponential backoff
- [ ] Add connection state tracking (connecting, connected, disconnected, error)
- [ ] Add timeout for connect/subscribe operations (e.g., 10 seconds)
- [ ] Expose connection state to hooks via context
- [ ] Update hooks to show connection status to users (optional)
- [ ] Add connection health checks (ping/pong)

**Reconnection Strategy**:
```typescript
// Pseudo-code for WebSocketContext
class WebSocketManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(auth) {
    try {
      await this.doConnect(auth);
      this.reconnectAttempts = 0; // Reset on success
    } catch (error) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        await sleep(delay);
        return this.connect(auth); // Retry
      }
      throw error;
    }
  }
}
```

---

### 2.3 Investigate Multi-Hook Disconnect Behavior

**Problem**: If multiple hooks are active, each calls `disconnect(userId)` on unmount. Unclear if this causes premature disconnections.

**Investigation Needed**:
1. Does WebSocketContext use reference counting?
2. What happens if hook A disconnects while hook B is still using the connection?
3. Should disconnection be automatic when all subscribers unsubscribe?

**Tasks**:
- [ ] Review WebSocketContext implementation
- [ ] Check if reference counting exists
- [ ] If no ref counting, implement it in WebSocketContext
- [ ] Add tests with multiple concurrent hooks
- [ ] Document the expected behavior in WebSocketContext
- [ ] Consider making disconnect automatic (when subscription count reaches 0)

**Proposed Reference Counting**:
```typescript
// In WebSocketContext
private subscriptionCounts = new Map<string, number>();

subscribe(userId, channel) {
  const key = `${userId}:${channel}`;
  const count = this.subscriptionCounts.get(key) || 0;
  this.subscriptionCounts.set(key, count + 1);

  if (count === 0) {
    // First subscription, actually subscribe to server
    await this.doSubscribe(channel);
  }
}

unsubscribe(userId, channel) {
  const key = `${userId}:${channel}`;
  const count = this.subscriptionCounts.get(key) || 0;

  if (count <= 1) {
    // Last subscription, actually unsubscribe from server
    this.subscriptionCounts.delete(key);
    await this.doUnsubscribe(channel);
  } else {
    this.subscriptionCounts.set(key, count - 1);
  }
}
```

---

## Phase 3: Architecture & Consistency (Priority: Low-Medium)

### 3.1 Standardize State Management Approach

**Problem**: Inconsistent state management across hooks:
- useWildduckAutoReply: Pure React Query (no useState)
- useWildduckFilters: useState + React Query
- useWildduckMessages: useState + React Query
- useWildduckMailboxes: React Query with cached reads
- useWildduckSettings: useState + React Query

**Decision Needed**: Choose one approach for all hooks.

**Option A - Pure React Query**:
- Pro: Single source of truth, automatic caching
- Con: More complex for real-time updates

**Option B - useState + React Query**:
- Pro: Easier real-time updates, more React-like
- Con: Duplicate state, potential desync

**Option C - useState only (remove React Query)**:
- Pro: Simpler, no duplication
- Con: Lose caching benefits, manual cache management

**Recommendation**: Option A (Pure React Query) with proper cache updates for WebSocket events.

**Tasks**:
- [ ] Decide on state management approach
- [ ] Create a migration guide
- [ ] Update all hooks to use chosen approach
- [ ] Remove duplicate state updates
- [ ] Update documentation

---

### 3.2 Standardize Cache Keys

**Problem**: Inconsistent cache key patterns:
- Some include userId: `["wildduck-mailboxes", userId]`
- Some don't in certain queries

**Solution**: Establish consistent cache key convention.

**Proposed Convention**:
```typescript
// Resource lists
["wildduck-{resource}", userId]
// Example: ["wildduck-mailboxes", "user123"]

// Individual resources
["wildduck-{resource}", userId, resourceId]
// Example: ["wildduck-mailbox", "user123", "inbox123"]

// Parameterized queries
["wildduck-{resource}", userId, { ...params }]
// Example: ["wildduck-messages", "user123", { mailboxId: "inbox123" }]
```

**Tasks**:
- [ ] Document cache key convention
- [ ] Update all query keys to follow convention
- [ ] Update invalidation calls to match new keys
- [ ] Add helper functions for cache key generation

---

### 3.3 Add Runtime Validation for WebSocket Messages

**Problem**: No validation that server responses match expected schema.

**Solution**: Add optional runtime validation using Zod or similar.

**Tasks**:
- [ ] Install validation library (e.g., Zod)
- [ ] Define schemas for all WebSocket message types
- [ ] Add validation in handleData and handleUpdate
- [ ] Log validation errors (don't crash, fail gracefully)
- [ ] Add development-mode strict validation

**Example with Zod**:
```typescript
import { z } from "zod";

const AutoreplyDataSchema = z.object({
  success: z.boolean(),
  channel: z.literal("autoreply"),
  autoreply: z.object({
    status: z.boolean(),
    subject: z.string().optional(),
    // ... rest of schema
  }),
});

const handleData = (channel: ChannelName, data: ServerResponseData) => {
  if (channel !== "autoreply" || !data.success) return;

  // Validate
  const result = AutoreplyDataSchema.safeParse(data);
  if (!result.success) {
    console.error("Invalid autoreply data:", result.error);
    return; // Fail gracefully
  }

  const autoreply = result.data.autoreply;
  // ... use typed data
};
```

---

## Phase 4: Testing & Documentation (Priority: Medium)

### 4.1 Add Comprehensive Tests

**Test Coverage Needed**:
- WebSocket subscription/unsubscription lifecycle
- Real-time update handling (created, updated, deleted events)
- Cleanup on unmount
- Multiple hooks with same userId
- Component re-renders (verify no unnecessary reconnects)
- Network failures and reconnection
- Race conditions (unmount during subscription)

**Tasks**:
- [ ] Set up WebSocket mock for testing
- [ ] Write unit tests for each hook's WebSocket logic
- [ ] Write integration tests for multi-hook scenarios
- [ ] Write tests for edge cases (rapid mount/unmount, etc.)
- [ ] Add E2E tests with real WebSocket server (optional)

**Test Framework**:
```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { MockWebSocketProvider } from "./test-utils/MockWebSocketProvider";

describe("useWildduckAutoReply WebSocket", () => {
  it("subscribes on mount when WebSocket enabled", async () => {
    const { result } = renderHook(
      () => useWildduckAutoReply(client, config, auth, false, { enableWebSocket: true }),
      { wrapper: MockWebSocketProvider }
    );

    await waitFor(() => {
      expect(mockWsContext.subscribe).toHaveBeenCalledWith("autoreply", {
        userId: auth.userId,
        token: auth.accessToken,
      });
    });
  });

  it("updates cache on real-time update event", async () => {
    // ... test implementation
  });

  it("cleans up on unmount", async () => {
    const { unmount } = renderHook(/* ... */);
    unmount();

    expect(mockWsContext.unsubscribe).toHaveBeenCalledWith("autoreply");
    expect(mockWsContext.disconnect).toHaveBeenCalledWith(auth.userId);
  });
});
```

---

### 4.2 Update Documentation

**Tasks**:
- [ ] Document WebSocket integration in README
- [ ] Add JSDoc comments to WebSocket-related code
- [ ] Create troubleshooting guide for WebSocket issues
- [ ] Document connection lifecycle
- [ ] Add examples of enabling WebSocket in hooks
- [ ] Document performance implications
- [ ] Create migration guide from non-WebSocket usage

**Documentation Sections**:
1. **Quick Start** - How to enable WebSocket in hooks
2. **Architecture** - How WebSocket integration works
3. **Connection Lifecycle** - Connect → Subscribe → Updates → Unsubscribe → Disconnect
4. **Troubleshooting** - Common issues and solutions
5. **Performance** - When to use WebSocket vs polling
6. **API Reference** - All WebSocket-related options and types

---

## Phase 5: Performance & Optimization (Priority: Low)

### 5.1 Add Debouncing for Rapid Updates

**Problem**: Rapid WebSocket updates cause many re-renders.

**Solution**: Debounce state updates for high-frequency channels.

**Tasks**:
- [ ] Identify high-frequency update channels
- [ ] Add debounce utility
- [ ] Apply debouncing to state updates
- [ ] Make debounce time configurable
- [ ] Measure performance improvement

---

### 5.2 Optimize Cache Updates

**Problem**: Both local state and React Query cache updated, causing duplicate work.

**Tasks**:
- [ ] Profile render performance with WebSocket updates
- [ ] Eliminate duplicate cache updates if possible
- [ ] Use React Query's `setQueriesData` for batch updates
- [ ] Consider using `useSyncExternalStore` for WebSocket state

---

## Implementation Order

### Week 1: Critical Fixes
1. Phase 1.1 - Fix unconditional disconnect
2. Phase 1.2 - Fix effect dependencies
3. Phase 1.3 - Fix subscription state race

### Week 2: Type Safety & Resilience
4. Phase 2.1 - Add TypeScript types
5. Phase 2.2 - Add connection resilience
6. Phase 2.3 - Investigate multi-hook behavior

### Week 3: Architecture & Testing
7. Phase 3.1 - Standardize state management
8. Phase 3.2 - Standardize cache keys
9. Phase 4.1 - Add tests

### Week 4: Polish
10. Phase 3.3 - Add runtime validation
11. Phase 4.2 - Update documentation
12. Phase 5.1 & 5.2 - Performance optimizations

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking changes in API | High | Thorough testing, incremental rollout |
| Performance regression | Medium | Benchmark before/after, profiling |
| WebSocket server changes needed | Medium | Coordinate with backend team |
| Increased bundle size (Zod) | Low | Make validation optional/dev-only |

---

## Success Metrics

- [ ] Zero disconnect-related bugs in production
- [ ] No unnecessary reconnection storms
- [ ] 100% type coverage for WebSocket messages
- [ ] All hooks use consistent patterns
- [ ] Test coverage > 80% for WebSocket code
- [ ] Documentation complete and reviewed
- [ ] Performance benchmarks show no regression

---

## Open Questions

1. Does WebSocketContext already implement reference counting?
2. Should we coordinate with backend team on message schema validation?
3. What's the expected behavior when WebSocket and REST API return conflicting data?
4. Should WebSocket be opt-in or opt-out by default?
5. Do we need to support WebSocket-only mode (no REST fallback)?

---

## Related Files

- WebSocket Integration: `src/websocket/`
- Hooks: `src/hooks/useWildduck*.ts`
- Context: Check WebSocketProvider implementation
- Types: `@sudobility/types` package

---

*Plan created: 2025-11-20*
*Last updated: 2025-11-20*
*Status: Draft - Awaiting Review*
