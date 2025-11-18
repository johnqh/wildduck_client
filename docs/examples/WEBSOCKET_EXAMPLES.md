# WebSocket Usage Examples

Practical code examples for implementing real-time features with WebSocket support.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Real-time Mailbox List](#real-time-mailbox-list)
3. [Real-time Message List](#real-time-message-list)
4. [Real-time Inbox Counter](#real-time-inbox-counter)
5. [Multi-Account Support](#multi-account-support)
6. [Connection Status Indicator](#connection-status-indicator)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Performance Optimization](#performance-optimization)

---

## Basic Setup

### Minimal Setup (React)

```tsx
import React from 'react';
import { WebSocketProvider } from '@sudobility/wildduck_client';

const wsConfig = {
  url: 'ws://localhost:8080/ws',
  reconnect: true,
};

function App() {
  return (
    <WebSocketProvider enabled={true} config={wsConfig}>
      <MailApp />
    </WebSocketProvider>
  );
}

export default App;
```

### Production Setup with Environment Variables

```tsx
// .env.production
REACT_APP_WS_URL=wss://mail.example.com/ws
REACT_APP_WS_ENABLED=true

// App.tsx
import { WebSocketProvider, type WebSocketConfig } from '@sudobility/wildduck_client';

const wsConfig: WebSocketConfig = {
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws',
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectDelay: 32000,
  reconnectAttempts: 0, // unlimited
  debug: process.env.NODE_ENV === 'development',
};

const wsEnabled = process.env.REACT_APP_WS_ENABLED === 'true';

function App() {
  return (
    <WebSocketProvider enabled={wsEnabled} config={wsConfig}>
      <MailApp />
    </WebSocketProvider>
  );
}
```

### React Native Setup

```tsx
import { WebSocketProvider } from '@sudobility/wildduck_client';

const wsConfig = {
  url: 'ws://your-server.com/ws',
  reconnect: true,
  pingInterval: 30000,  // Adjust for mobile networks
  pongTimeout: 10000,
};

export default function App() {
  return (
    <WebSocketProvider enabled={true} config={wsConfig}>
      <MailApp />
    </WebSocketProvider>
  );
}
```

---

## Real-time Mailbox List

### Basic Mailbox List with Real-time Updates

```tsx
import React, { useEffect } from 'react';
import {
  useWildduckMailboxes,
  type WildduckUserAuth,
  type NetworkClient,
  type WildduckConfig,
} from '@sudobility/wildduck_client';

interface MailboxListProps {
  networkClient: NetworkClient;
  config: WildduckConfig;
  wildduckUserAuth: WildduckUserAuth;
}

function MailboxList({ networkClient, config, wildduckUserAuth }: MailboxListProps) {
  const {
    mailboxes,
    isLoading,
    error,
    getMailboxes,
  } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true } // Enable real-time updates
  );

  // Initial fetch
  useEffect(() => {
    getMailboxes(wildduckUserAuth);
  }, [wildduckUserAuth]);

  if (isLoading) {
    return <div>Loading mailboxes...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="mailbox-list">
      <h2>Mailboxes</h2>
      <ul>
        {mailboxes.map(mailbox => (
          <li key={mailbox.id}>
            <span>{mailbox.name}</span>
            <span className="count">
              {mailbox.total} messages
              {mailbox.unseen > 0 && (
                <span className="unread"> ({mailbox.unseen} unread)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MailboxList;
```

### Mailbox List with Loading States

```tsx
import React, { useEffect, useState } from 'react';

function MailboxListWithStates({ networkClient, config, wildduckUserAuth }) {
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const {
    mailboxes,
    isLoading,
    error,
    getMailboxes,
  } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  useEffect(() => {
    getMailboxes(wildduckUserAuth).then(() => {
      setInitialLoadComplete(true);
    });
  }, [wildduckUserAuth]);

  // Show spinner only on initial load
  if (isLoading && !initialLoadComplete) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div>
      {/* Real-time updates happen silently after initial load */}
      {mailboxes.map(mailbox => (
        <MailboxItem key={mailbox.id} mailbox={mailbox} />
      ))}
    </div>
  );
}
```

---

## Real-time Message List

### Basic Message List with Pagination

```tsx
import React, { useEffect, useState } from 'react';
import {
  useWildduckMessages,
  type WildduckUserAuth,
} from '@sudobility/wildduck_client';

interface MessageListProps {
  mailboxId: string;
  wildduckUserAuth: WildduckUserAuth;
}

function MessageList({ mailboxId, wildduckUserAuth }: MessageListProps) {
  const {
    messages,
    totalMessages,
    hasNextPage,
    next,
    getMessages,
    isLoading,
  } = useWildduckMessages(
    networkClient,
    config,
    false,
    20, // Page size
    { enableWebSocket: true }
  );

  useEffect(() => {
    getMessages(wildduckUserAuth, mailboxId);
  }, [mailboxId, wildduckUserAuth]);

  return (
    <div className="message-list">
      <div className="header">
        <h2>Messages</h2>
        <span>Total: {totalMessages}</span>
      </div>

      <div className="messages">
        {messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>

      {hasNextPage && (
        <button
          onClick={() => next()}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

function MessageItem({ message }) {
  return (
    <div className={`message ${message.seen ? '' : 'unread'}`}>
      <div className="from">{message.from.name || message.from.address}</div>
      <div className="subject">{message.subject}</div>
      <div className="preview">{message.intro}</div>
      <div className="date">{new Date(message.date).toLocaleDateString()}</div>
    </div>
  );
}

export default MessageList;
```

### Infinite Scroll with Real-time Updates

```tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { useWildduckMessages } from '@sudobility/wildduck_client';

function InfiniteMessageList({ mailboxId, wildduckUserAuth }) {
  const observerTarget = useRef(null);

  const {
    messages,
    hasNextPage,
    next,
    getMessages,
  } = useWildduckMessages(
    networkClient,
    config,
    false,
    50, // Larger page size for scroll
    { enableWebSocket: true }
  );

  // Initial load
  useEffect(() => {
    getMessages(wildduckUserAuth, mailboxId);
  }, [mailboxId, wildduckUserAuth]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          next();
        }
      },
      { threshold: 1.0 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasNextPage, next]);

  return (
    <div className="infinite-scroll-container">
      {messages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}

      {/* Trigger for loading more */}
      <div ref={observerTarget} style={{ height: '20px' }} />

      {hasNextPage && <div className="loading">Loading more...</div>}
    </div>
  );
}
```

### New Message Toast Notification

```tsx
import React, { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

function MessageListWithNotifications({ mailboxId, wildduckUserAuth }) {
  const previousCountRef = useRef<number>(0);

  const {
    messages,
    totalMessages,
    getMessages,
  } = useWildduckMessages(
    networkClient,
    config,
    false,
    20,
    { enableWebSocket: true }
  );

  useEffect(() => {
    getMessages(wildduckUserAuth, mailboxId);
  }, [mailboxId, wildduckUserAuth]);

  // Detect new messages
  useEffect(() => {
    if (previousCountRef.current > 0 && totalMessages > previousCountRef.current) {
      const newCount = totalMessages - previousCountRef.current;
      toast.success(`${newCount} new message${newCount > 1 ? 's' : ''}!`);
    }
    previousCountRef.current = totalMessages;
  }, [totalMessages]);

  return (
    <div>
      {messages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
```

---

## Real-time Inbox Counter

### Unread Message Badge

```tsx
import React, { useEffect } from 'react';
import { useWildduckMailboxes } from '@sudobility/wildduck_client';

function UnreadBadge({ wildduckUserAuth }) {
  const { mailboxes, getMailboxes } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  useEffect(() => {
    getMailboxes(wildduckUserAuth);
  }, [wildduckUserAuth]);

  // Calculate total unread across all mailboxes
  const totalUnread = mailboxes.reduce(
    (sum, mailbox) => sum + (mailbox.unseen || 0),
    0
  );

  if (totalUnread === 0) {
    return null;
  }

  return (
    <span className="unread-badge">
      {totalUnread > 99 ? '99+' : totalUnread}
    </span>
  );
}

export default UnreadBadge;
```

### Per-Mailbox Unread Counters

```tsx
function MailboxWithBadge({ mailboxId, wildduckUserAuth }) {
  const { mailboxes, getMailboxes } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  useEffect(() => {
    getMailboxes(wildduckUserAuth);
  }, [wildduckUserAuth]);

  const mailbox = mailboxes.find(m => m.id === mailboxId);

  if (!mailbox) {
    return null;
  }

  return (
    <div className="mailbox-item">
      <span>{mailbox.name}</span>
      {mailbox.unseen > 0 && (
        <span className="badge">{mailbox.unseen}</span>
      )}
    </div>
  );
}
```

---

## Multi-Account Support

### Switch Between Multiple Accounts

```tsx
import React, { useState } from 'react';

interface Account {
  userId: string;
  accessToken: string;
  email: string;
}

function MultiAccountMailApp() {
  const [accounts] = useState<Account[]>([
    { userId: 'user1', accessToken: 'token1', email: 'user1@example.com' },
    { userId: 'user2', accessToken: 'token2', email: 'user2@example.com' },
  ]);
  const [activeAccount, setActiveAccount] = useState<Account>(accounts[0]);

  return (
    <div className="multi-account-app">
      {/* Account Switcher */}
      <div className="account-switcher">
        {accounts.map(account => (
          <button
            key={account.userId}
            onClick={() => setActiveAccount(account)}
            className={activeAccount.userId === account.userId ? 'active' : ''}
          >
            {account.email}
          </button>
        ))}
      </div>

      {/* Each account gets its own WebSocket connection */}
      <MailboxList
        wildduckUserAuth={activeAccount}
        networkClient={networkClient}
        config={config}
      />
    </div>
  );
}
```

### Parallel Account Display

```tsx
function ParallelAccountView({ accounts }) {
  return (
    <div className="parallel-view">
      {accounts.map(account => (
        <div key={account.userId} className="account-column">
          <h3>{account.email}</h3>

          {/* Each gets its own WebSocket connection */}
          <MailboxList
            wildduckUserAuth={account}
            networkClient={networkClient}
            config={config}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## Connection Status Indicator

### Simple Status Indicator

```tsx
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@sudobility/wildduck_client';
import type { ConnectionState } from '@sudobility/wildduck_client';

function ConnectionStatusIndicator({ wildduckUserAuth }) {
  const wsContext = useWebSocket();
  const [status, setStatus] = useState<ConnectionState>('disconnected');

  useEffect(() => {
    if (!wsContext || !wildduckUserAuth) return;

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) return;

    const handleStateChange = (oldState: ConnectionState, newState: ConnectionState) => {
      setStatus(newState);
    };

    client.on('stateChange', handleStateChange);
    setStatus(client.state);

    return () => {
      client.off('stateChange', handleStateChange);
    };
  }, [wsContext, wildduckUserAuth]);

  const statusConfig = {
    disconnected: { color: 'gray', text: 'Offline' },
    connecting: { color: 'yellow', text: 'Connecting...' },
    connected: { color: 'green', text: 'Live' },
    reconnecting: { color: 'orange', text: 'Reconnecting...' },
    disconnecting: { color: 'red', text: 'Disconnecting...' },
  };

  const { color, text } = statusConfig[status];

  return (
    <div className="status-indicator">
      <div
        className="status-dot"
        style={{ backgroundColor: color }}
      />
      <span>{text}</span>
    </div>
  );
}
```

### Advanced Status with Reconnection Count

```tsx
function AdvancedConnectionStatus({ wildduckUserAuth }) {
  const wsContext = useWebSocket();
  const [status, setStatus] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectDelay, setReconnectDelay] = useState(0);

  useEffect(() => {
    if (!wsContext || !wildduckUserAuth) return;

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) return;

    const handleStateChange = (oldState, newState) => {
      setStatus(newState);
      if (newState === 'connected') {
        setReconnectAttempt(0);
      }
    };

    const handleReconnecting = (attempt, delay) => {
      setReconnectAttempt(attempt);
      setReconnectDelay(delay);
    };

    client.on('stateChange', handleStateChange);
    client.on('reconnecting', handleReconnecting);

    return () => {
      client.off('stateChange', handleStateChange);
      client.off('reconnecting', handleReconnecting);
    };
  }, [wsContext, wildduckUserAuth]);

  if (status === 'reconnecting') {
    return (
      <div className="status-reconnecting">
        Reconnecting (attempt {reconnectAttempt}, retry in {reconnectDelay}ms)...
      </div>
    );
  }

  return <ConnectionStatusIndicator wildduckUserAuth={wildduckUserAuth} />;
}
```

---

## Error Handling Patterns

### Error Boundary with Retry

```tsx
import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class WebSocketErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('WebSocket Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Connection Error</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleRetry}>Retry Connection</button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebSocketErrorBoundary;
```

### Graceful Degradation with Fallback

```tsx
function MailboxListWithFallback({ wildduckUserAuth }) {
  const [useWebSocket, setUseWebSocket] = useState(true);

  const { mailboxes, error } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: useWebSocket }
  );

  // Fall back to REST if WebSocket fails
  useEffect(() => {
    if (error && error.includes('WebSocket')) {
      console.warn('WebSocket failed, falling back to REST API');
      setUseWebSocket(false);
    }
  }, [error]);

  return (
    <div>
      {!useWebSocket && (
        <div className="warning">
          Real-time updates unavailable. Using periodic refresh.
        </div>
      )}
      <MailboxList mailboxes={mailboxes} />
    </div>
  );
}
```

---

## Performance Optimization

### Conditional Rendering with useMemo

```tsx
import React, { useMemo } from 'react';

function OptimizedMessageList({ messages }) {
  // Memoize expensive computations
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [messages]);

  const unreadCount = useMemo(() => {
    return messages.filter(m => !m.seen).length;
  }, [messages]);

  return (
    <div>
      <div className="header">
        {unreadCount} unread messages
      </div>
      {sortedMessages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
```

### Virtualized List for Large Datasets

```tsx
import { FixedSizeList as List } from 'react-window';

function VirtualizedMessageList({ messages }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <MessageItem message={messages[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### Debounced Real-time Updates

```tsx
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

function DebouncedMessageList({ mailboxId, wildduckUserAuth }) {
  const [displayMessages, setDisplayMessages] = useState([]);

  const { messages } = useWildduckMessages(
    networkClient,
    config,
    false,
    20,
    { enableWebSocket: true }
  );

  // Debounce updates to avoid too many re-renders
  useEffect(() => {
    const updateDisplay = debounce(() => {
      setDisplayMessages(messages);
    }, 100);

    updateDisplay();

    return () => updateDisplay.cancel();
  }, [messages]);

  return (
    <div>
      {displayMessages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
```

---

## Complete Example Application

Here's a complete mini email app with WebSocket support:

```tsx
import React, { useState, useEffect } from 'react';
import {
  WebSocketProvider,
  useWildduckMailboxes,
  useWildduckMessages,
  type WildduckUserAuth,
} from '@sudobility/wildduck_client';

// App Setup
function App() {
  const wsConfig = {
    url: 'ws://localhost:8080/ws',
    reconnect: true,
  };

  return (
    <WebSocketProvider enabled={true} config={wsConfig}>
      <EmailApp />
    </WebSocketProvider>
  );
}

// Main Email App
function EmailApp() {
  const [wildduckUserAuth] = useState<WildduckUserAuth>({
    userId: 'user123',
    accessToken: 'token123',
  });
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);

  return (
    <div className="email-app">
      <Sidebar
        wildduckUserAuth={wildduckUserAuth}
        selectedMailbox={selectedMailbox}
        onSelectMailbox={setSelectedMailbox}
      />
      <Main
        wildduckUserAuth={wildduckUserAuth}
        mailboxId={selectedMailbox}
      />
    </div>
  );
}

// Sidebar Component
function Sidebar({ wildduckUserAuth, selectedMailbox, onSelectMailbox }) {
  const { mailboxes, getMailboxes } = useWildduckMailboxes(
    networkClient,
    config,
    wildduckUserAuth,
    false,
    { enableWebSocket: true }
  );

  useEffect(() => {
    getMailboxes(wildduckUserAuth);
  }, [wildduckUserAuth]);

  return (
    <aside className="sidebar">
      <h2>Mailboxes</h2>
      {mailboxes.map(mailbox => (
        <button
          key={mailbox.id}
          onClick={() => onSelectMailbox(mailbox.id)}
          className={selectedMailbox === mailbox.id ? 'active' : ''}
        >
          {mailbox.name}
          {mailbox.unseen > 0 && (
            <span className="badge">{mailbox.unseen}</span>
          )}
        </button>
      ))}
    </aside>
  );
}

// Main Content Area
function Main({ wildduckUserAuth, mailboxId }) {
  const { messages, getMessages } = useWildduckMessages(
    networkClient,
    config,
    false,
    20,
    { enableWebSocket: true }
  );

  useEffect(() => {
    if (mailboxId) {
      getMessages(wildduckUserAuth, mailboxId);
    }
  }, [mailboxId, wildduckUserAuth]);

  if (!mailboxId) {
    return <div className="main">Select a mailbox</div>;
  }

  return (
    <main className="main">
      {messages.map(message => (
        <div key={message.id} className="message-preview">
          <strong>{message.from.name}</strong>
          <div>{message.subject}</div>
          <div className="intro">{message.intro}</div>
        </div>
      ))}
    </main>
  );
}

export default App;
```

---

**Note**: All examples assume you have properly configured `networkClient` and `config` instances. See main documentation for setup details.
