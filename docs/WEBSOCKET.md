# WebSocket Support Guide

Complete guide for using real-time WebSocket updates in wildduck_client.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Setup](#setup)
4. [Hook Usage](#hook-usage)
5. [Advanced Configuration](#advanced-configuration)
6. [Error Handling](#error-handling)
7. [Troubleshooting](#troubleshooting)
8. [Migration Guide](#migration-guide)
9. [API Reference](#api-reference)

---

## Overview

The wildduck_client library supports optional WebSocket connections for real-time updates. When enabled, your application receives instant notifications when data changes on the server, eliminating the need for polling.

### Key Features

- **Opt-in by default**: WebSocket support is disabled unless explicitly enabled
- **Backward compatible**: Existing code continues to work without changes
- **Automatic reconnection**: Built-in exponential backoff reconnection strategy
- **Per-user connections**: Single WebSocket connection per authenticated user
- **React Query integration**: Seamless cache updates on real-time events
- **React Native compatible**: Works in both React JS and React Native (0.64+)

### Supported Hooks

All major hooks support WebSocket real-time updates:

- `useWildduckMailboxes` - Real-time mailbox updates (created, updated, deleted)
- `useWildduckMessages` - Real-time message updates with pagination
- `useWildduckFilters` - Real-time filter updates
- `useWildduckAutoReply` - Real-time autoreply updates
- `useWildduckSettings` - Real-time user settings updates

---

## Quick Start

### 1. Wrap your app with WebSocketProvider

```tsx
import { WebSocketProvider } from '@sudobility/wildduck_client';

function App() {
  return (
    <WebSocketProvider
      enabled={true}
      config={{
        url: 'ws://your-wildduck-server.com/ws',
        reconnect: true,
        reconnectDelay: 1000,
        maxReconnectDelay: 32000,
      }}
    >
      <YourApp />
    </WebSocketProvider>
  );
}
```

### 2. Enable WebSocket in your hooks

```tsx
import { useWildduckMailboxes } from '@sudobility/wildduck_client';

function MailboxList() {
  const { mailboxes } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false, // devMode
    { enableWebSocket: true } // Enable WebSocket
  );

  return (
    <div>
      {mailboxes.map(mailbox => (
        <div key={mailbox.id}>{mailbox.name}</div>
      ))}
    </div>
  );
}
```

That's it! Your mailboxes will now update in real-time.

---

## Setup

### Installation

WebSocket support is included in the base package:

```bash
npm install @sudobility/wildduck_client
```

### Provider Configuration

The `WebSocketProvider` must wrap your application tree at a level where authentication is available:

```tsx
import {
  WebSocketProvider,
  type WebSocketConfig
} from '@sudobility/wildduck_client';

const wsConfig: WebSocketConfig = {
  // Required: WebSocket server URL
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws',

  // Optional: Enable automatic reconnection (default: true)
  reconnect: true,

  // Optional: Initial reconnection delay in ms (default: 1000)
  reconnectDelay: 1000,

  // Optional: Maximum reconnection delay in ms (default: 32000)
  maxReconnectDelay: 32000,

  // Optional: Max reconnection attempts, 0 = unlimited (default: 0)
  reconnectAttempts: 0,

  // Optional: Auto-subscribe to channels on connect (default: true)
  autoSubscribe: true,

  // Optional: Enable debug logging (default: false)
  debug: false,

  // Optional: Ping interval in ms, 0 = disable (default: 30000)
  pingInterval: 30000,

  // Optional: Pong timeout in ms (default: 5000)
  pongTimeout: 5000,
};

function App() {
  return (
    <WebSocketProvider
      enabled={true}
      config={wsConfig}
    >
      <YourApp />
    </WebSocketProvider>
  );
}
```

### Environment-based Configuration

```tsx
// Disable WebSocket in development, enable in production
const wsEnabled = process.env.NODE_ENV === 'production';

<WebSocketProvider enabled={wsEnabled} config={wsConfig}>
  <App />
</WebSocketProvider>
```

---

## Hook Usage

### useWildduckMailboxes

Real-time mailbox synchronization:

```tsx
import { useWildduckMailboxes } from '@sudobility/wildduck_client';

function MailboxList() {
  const { mailboxes, isLoading, error } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {mailboxes.map(mailbox => (
        <li key={mailbox.id}>
          {mailbox.name} ({mailbox.total} messages)
        </li>
      ))}
    </ul>
  );
}
```

**Real-time events:**
- New mailbox created → automatically appears in list
- Mailbox renamed → name updates instantly
- Mailbox deleted → removed from list
- Message counts → updated when messages arrive/deleted

### useWildduckMessages

Real-time message synchronization with pagination:

```tsx
import { useWildduckMessages } from '@sudobility/wildduck_client';

function MessageList({ mailboxId }: { mailboxId: string }) {
  const {
    messages,
    totalMessages,
    hasNextPage,
    next,
    getMessages,
  } = useWildduckMessages(
    networkClient,
    config,
    false,
    20, // page size
    { enableWebSocket: true }
  );

  useEffect(() => {
    if (wildduckUserAuth) {
      getMessages(wildduckUserAuth, mailboxId);
    }
  }, [mailboxId, wildduckUserAuth]);

  return (
    <div>
      <div>Total: {totalMessages} messages</div>
      {messages.map(msg => (
        <div key={msg.id}>
          <strong>{msg.from.name}</strong>: {msg.subject}
        </div>
      ))}
      {hasNextPage && (
        <button onClick={() => next()}>Load More</button>
      )}
    </div>
  );
}
```

**Real-time events:**
- New message arrives → prepended to list
- Message flagged/read → flags update instantly
- Message deleted → removed from list
- WebSocket pagination → fetch next page via WebSocket

### useWildduckFilters

Real-time filter synchronization:

```tsx
import { useWildduckFilters } from '@sudobility/wildduck_client';

function FilterList() {
  const { filters, getFilters } = useWildduckFilters(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  useEffect(() => {
    if (wildduckUserAuth) {
      getFilters(wildduckUserAuth);
    }
  }, [wildduckUserAuth]);

  return (
    <ul>
      {filters.map(filter => (
        <li key={filter.id}>{filter.name}</li>
      ))}
    </ul>
  );
}
```

**Real-time events:**
- Filter created → appears in list
- Filter updated → properties update
- Filter deleted → removed from list

### useWildduckAutoReply

Real-time autoreply synchronization:

```tsx
import { useWildduckAutoReply } from '@sudobility/wildduck_client';

function AutoReplySettings() {
  const { autoreply, getAutoreply } = useWildduckAutoReply(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  useEffect(() => {
    if (wildduckUserAuth) {
      getAutoreply(wildduckUserAuth);
    }
  }, [wildduckUserAuth]);

  return (
    <div>
      {autoreply ? (
        <div>
          <div>Status: {autoreply.status ? 'Enabled' : 'Disabled'}</div>
          <div>Message: {autoreply.message}</div>
        </div>
      ) : (
        <div>No autoreply configured</div>
      )}
    </div>
  );
}
```

**Real-time events:**
- Autoreply updated → settings reflect changes
- Autoreply deleted → cleared from UI

### useWildduckSettings

Real-time settings synchronization:

```tsx
import { useWildduckSettings } from '@sudobility/wildduck_client';

function UserSettings() {
  const { settings, getSettings } = useWildduckSettings(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  useEffect(() => {
    if (wildduckUserAuth) {
      getSettings(wildduckUserAuth);
    }
  }, [wildduckUserAuth]);

  return (
    <div>
      <div>Language: {settings.language}</div>
      <div>Timezone: {settings.timezone}</div>
    </div>
  );
}
```

**Real-time events:**
- Setting updated → value changes instantly
- Setting deleted → key removed from object

---

## Advanced Configuration

### Conditional WebSocket Enable

Enable WebSocket only for premium users:

```tsx
function App() {
  const { user } = useAuth();
  const wsEnabled = user?.plan === 'premium';

  return (
    <WebSocketProvider enabled={wsEnabled} config={wsConfig}>
      <YourApp />
    </WebSocketProvider>
  );
}
```

### Multiple Connections

Each authenticated user gets their own WebSocket connection:

```tsx
// User 1 connects
const mailboxes1 = useWildduckMailboxes(
  networkClient,
  config,
  userAuth1, // userId: "user1"
  false,
  { enableWebSocket: true }
);

// User 2 connects (separate WebSocket connection)
const mailboxes2 = useWildduckMailboxes(
  networkClient,
  config,
  userAuth2, // userId: "user2"
  false,
  { enableWebSocket: true }
);
```

### Connection Monitoring

Monitor connection state:

```tsx
import { useWebSocket } from '@sudobility/wildduck_client';

function ConnectionStatus() {
  const wsContext = useWebSocket();
  const [connectionState, setConnectionState] = useState('disconnected');

  useEffect(() => {
    if (!wsContext || !wildduckUserAuth) return;

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) return;

    const handleStateChange = (oldState, newState) => {
      setConnectionState(newState);
    };

    client.on('stateChange', handleStateChange);
    return () => client.off('stateChange', handleStateChange);
  }, [wsContext, wildduckUserAuth]);

  return <div>Status: {connectionState}</div>;
}
```

---

## Error Handling

### Connection Errors

WebSocket connections handle errors automatically with exponential backoff reconnection:

```tsx
import { useWebSocket } from '@sudobility/wildduck_client';

function ErrorMonitor() {
  const wsContext = useWebSocket();
  const [lastError, setLastError] = useState<Error | null>(null);

  useEffect(() => {
    if (!wsContext || !wildduckUserAuth) return;

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) return;

    const handleError = (error: Error) => {
      console.error('WebSocket error:', error);
      setLastError(error);
    };

    client.on('error', handleError);
    return () => client.off('error', handleError);
  }, [wsContext, wildduckUserAuth]);

  if (lastError) {
    return <div>Connection error: {lastError.message}</div>;
  }

  return null;
}
```

### Graceful Degradation

Hooks automatically fall back to REST API if WebSocket fails:

```tsx
// If WebSocket connection fails, hooks continue working via REST API
const { mailboxes } = useWildduckMailboxes(
  networkClient,
  config,
  wildduckUserAuth,
  false,
  { enableWebSocket: true } // Will try WebSocket, fall back to REST
);
```

### Subscription Errors

Handle subscription failures:

```tsx
useEffect(() => {
  const client = wsContext?.getClient(wildduckUserAuth);
  if (!client) return;

  client
    .subscribe('mailboxes', {
      userId: wildduckUserAuth.userId,
      token: wildduckUserAuth.accessToken,
    })
    .catch((error) => {
      console.error('Subscription failed:', error);
      // Hook will fall back to REST API automatically
    });
}, [wsContext, wildduckUserAuth]);
```

---

## Troubleshooting

### WebSocket connection not establishing

**Problem**: WebSocket stays in "connecting" state

**Solutions**:
1. Verify WebSocket URL is correct:
   ```tsx
   config={{ url: 'ws://your-server.com/ws' }} // ✓ Correct
   config={{ url: 'wss://your-server.com/ws' }} // ✓ For HTTPS
   config={{ url: 'http://your-server.com/ws' }} // ✗ Wrong protocol
   ```

2. Check server CORS settings
3. Verify authentication token is valid
4. Check browser console for connection errors

### Real-time updates not appearing

**Problem**: Changes on server don't appear in UI

**Solutions**:
1. Verify `enableWebSocket: true` is set in hook options
2. Check that `WebSocketProvider` is enabled
3. Verify user is authenticated (wildduckUserAuth is not null)
4. Check React Query cache isn't being overwritten
5. Verify server is sending update events

### Multiple subscriptions to same channel

**Problem**: Duplicate events or memory leaks

**Solution**: The library automatically manages subscriptions. Each hook's useEffect cleanup unsubscribes:

```tsx
// ✓ Correct - automatic cleanup
useEffect(() => {
  // Subscribe on mount
  return () => {
    // Auto-unsubscribe on unmount
  };
}, [deps]);
```

### WebSocket disconnects frequently

**Problem**: Connection drops every few seconds

**Solutions**:
1. Increase ping interval:
   ```tsx
   config={{
     pingInterval: 60000, // 60 seconds
     pongTimeout: 10000,  // 10 seconds
   }}
   ```

2. Check network stability
3. Verify server isn't timing out idle connections
4. Check for proxy/load balancer timeout settings

### Token expiration

**Problem**: WebSocket disconnects when auth token expires

**Solution**: Refresh token and reconnect:

```tsx
useEffect(() => {
  if (tokenExpired && wsContext) {
    // Disconnect old connection
    wsContext.disconnect(oldUserId);

    // Reconnect with new token
    wsContext.connect(newUserAuth);
  }
}, [tokenExpired, wsContext]);
```

---

## Migration Guide

### From REST-only to WebSocket

**Before** (REST only):
```tsx
const { mailboxes } = useWildduckMailboxes(
  networkClient,
  config,
  wildduckUserAuth,
  false
);
```

**After** (WebSocket enabled):
```tsx
// 1. Add WebSocketProvider (one-time setup)
<WebSocketProvider enabled={true} config={wsConfig}>
  <App />
</WebSocketProvider>

// 2. Enable WebSocket in hook (per-component)
const { mailboxes } = useWildduckMailboxes(
  networkClient,
  config,
  wildduckUserAuth,
  false,
  { enableWebSocket: true } // Add this option
);
```

### Gradual Migration

Enable WebSocket feature-by-feature:

```tsx
// Week 1: Enable for mailboxes only
const { mailboxes } = useWildduckMailboxes(..., { enableWebSocket: true });
const { messages } = useWildduckMessages(...); // Still REST

// Week 2: Add messages
const { messages } = useWildduckMessages(..., { enableWebSocket: true });

// Week 3: Add remaining hooks
const { filters } = useWildduckFilters(..., { enableWebSocket: true });
```

### Testing Migration

Test both modes in parallel:

```tsx
// Enable WebSocket only in development
const wsEnabled = process.env.NODE_ENV === 'development';

<WebSocketProvider enabled={wsEnabled} config={wsConfig}>
  <App />
</WebSocketProvider>
```

---

## API Reference

### WebSocketProvider

```tsx
interface WebSocketProviderProps {
  children: ReactNode;
  config: WebSocketConfig;
  enabled?: boolean; // default: false
}
```

### WebSocketConfig

```tsx
interface WebSocketConfig {
  url: string;                  // Required: WebSocket server URL
  reconnect?: boolean;          // default: true
  reconnectDelay?: number;      // default: 1000ms
  maxReconnectDelay?: number;   // default: 32000ms
  reconnectAttempts?: number;   // default: 0 (unlimited)
  autoSubscribe?: boolean;      // default: true
  debug?: boolean;              // default: false
  pingInterval?: number;        // default: 30000ms
  pongTimeout?: number;         // default: 5000ms
}
```

### Hook Options

All hooks accept an options parameter:

```tsx
interface HookOptions {
  enableWebSocket?: boolean; // default: false
}
```

### Connection States

```tsx
type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnecting';
```

### Event Types

```tsx
interface WebSocketEventMap {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  reconnecting: (attempt: number, delay: number) => void;
  error: (error: Error) => void;
  data: (channel: ChannelName, data: ServerResponseData) => void;
  update: (channel: ChannelName, data: ServerResponseData) => void;
  stateChange: (oldState: ConnectionState, newState: ConnectionState) => void;
}
```

---

## Best Practices

1. **Enable WebSocket at the provider level once**
   ```tsx
   // ✓ Good - single provider
   <WebSocketProvider enabled={true} config={config}>
     <App />
   </WebSocketProvider>
   ```

2. **Enable per-hook as needed**
   ```tsx
   // ✓ Good - opt-in per feature
   { enableWebSocket: true }
   ```

3. **Handle both online and offline gracefully**
   - WebSocket connection issues are handled automatically
   - Hooks fall back to REST API seamlessly

4. **Don't manually manage subscriptions**
   ```tsx
   // ✗ Bad - don't manually subscribe
   useEffect(() => {
     client.subscribe(...);
     client.subscribe(...); // Duplicate!
   }, []);

   // ✓ Good - let hooks manage subscriptions
   const { mailboxes } = useWildduckMailboxes(..., { enableWebSocket: true });
   ```

5. **Monitor connection state in production**
   - Use error boundaries
   - Log connection issues
   - Track reconnection patterns

---

## Performance Considerations

### Connection Pooling

One WebSocket connection per authenticated user:
- Multiple hooks share the same connection
- Automatic reference counting
- Connection closed after 5s delay when unused

### Memory Usage

- Each subscription adds ~1KB to memory
- Automatic cleanup on unmount
- No memory leaks with proper React patterns

### Network Traffic

- Initial data via WebSocket (replaces REST call)
- Real-time updates are typically <1KB per event
- Ping/pong messages every 30s (~100 bytes)

### Battery Impact (Mobile)

- WebSocket connections are efficient on mobile
- Native implementation in React Native
- Consider disabling on low battery

---

## Security Considerations

### Authentication

- Access token sent in subscription messages
- Token validated server-side
- Connection rejected if token invalid

### Authorization

- Server enforces user permissions
- Users only receive updates for their own data
- Channel subscriptions validated per-user

### Network Security

- Use `wss://` (WebSocket Secure) in production
- Enable TLS/SSL on server
- Validate server certificates

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/anthropics/wildduck_client/issues
- Documentation: See /docs folder
- Examples: See /examples folder

---

**Version**: 2.3.0
**Last Updated**: 2025-01-18
