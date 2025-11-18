/**
 * WebSocket Provider
 *
 * React context provider for managing WebSocket connections per authentication.
 * Provides a shared WebSocket client instance for all hooks using the same auth.
 */

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import type { WildduckUserAuth } from "@sudobility/types";
import { WildduckWebSocketClient } from "./client";
import type { ConnectionState, WebSocketConfig } from "./types";
import { CLEANUP_DELAY } from "./constants";

import type { TimerHandle } from "./types";

/**
 * Connection instance data
 */
interface ConnectionInstance {
  /** WebSocket client instance */
  client: WildduckWebSocketClient;

  /** User authentication data */
  auth: WildduckUserAuth;

  /** Reference count (number of hooks using this connection) */
  refCount: number;

  /** Cleanup timer (disconnect after delay if refCount reaches 0) */
  cleanupTimer: TimerHandle | null;

  /** Current connection state */
  state: ConnectionState;
}

/**
 * WebSocket context value
 */
export interface WebSocketContextValue {
  /**
   * Get WebSocket client for the given auth
   * Creates a new client if none exists for this userId
   *
   * @param auth - User authentication data
   * @returns WebSocket client instance or null if not enabled
   */
  getClient: (auth: WildduckUserAuth) => WildduckWebSocketClient | null;

  /**
   * Check if WebSocket support is enabled
   */
  isEnabled: boolean;

  /**
   * Check if connected for a specific user
   *
   * @param userId - User ID to check
   * @returns True if connected
   */
  isConnected: (userId: string) => boolean;

  /**
   * Connect to WebSocket server for the given auth
   * If already connected, increments reference count
   *
   * @param auth - User authentication data
   */
  connect: (auth: WildduckUserAuth) => Promise<void>;

  /**
   * Disconnect from WebSocket server for the given user
   * Decrements reference count and disconnects after delay if count reaches 0
   *
   * @param userId - User ID to disconnect
   */
  disconnect: (userId: string) => void;

  /**
   * Get connection state for a user
   *
   * @param userId - User ID
   * @returns Connection state
   */
  getConnectionState: (userId: string) => ConnectionState;
}

/**
 * WebSocket context
 */
const WebSocketContext = createContext<WebSocketContextValue | null>(null);

/**
 * WebSocket provider props
 */
export interface WebSocketProviderProps {
  /** Child components */
  children: ReactNode;

  /** WebSocket configuration */
  config: WebSocketConfig;

  /** Enable WebSocket support (default: false) */
  enabled?: boolean;
}

/**
 * WebSocket Provider Component
 *
 * Manages WebSocket connections per authentication.
 * Connections are shared across all hooks using the same userId.
 * Connections are automatically cleaned up after a delay when no longer in use.
 *
 * @param props - Provider props
 */
export function WebSocketProvider({
  children,
  config,
  enabled = false,
}: WebSocketProviderProps): React.ReactElement {
  // Store connection instances per userId
  const connectionsRef = useRef<Map<string, ConnectionInstance>>(new Map());

  /**
   * Get WebSocket client for the given auth
   */
  const getClient = useCallback(
    (auth: WildduckUserAuth): WildduckWebSocketClient | null => {
      if (!enabled) {
        return null;
      }

      const userId = auth.userId;
      const connection = connectionsRef.current.get(userId);

      if (connection) {
        return connection.client;
      }

      // Create new client
      const client = new WildduckWebSocketClient(config);

      // Store connection instance
      connectionsRef.current.set(userId, {
        client,
        auth,
        refCount: 0,
        cleanupTimer: null,
        state: "disconnected",
      });

      // Set up state change listener
      client.on("stateChange", (_oldState, newState) => {
        const conn = connectionsRef.current.get(userId);
        if (conn) {
          conn.state = newState;
        }
      });

      return client;
    },
    [enabled, config],
  );

  /**
   * Check if connected for a specific user
   */
  const isConnected = useCallback((userId: string): boolean => {
    const connection = connectionsRef.current.get(userId);
    return connection?.client.isConnected ?? false;
  }, []);

  /**
   * Get connection state for a user
   */
  const getConnectionState = useCallback((userId: string): ConnectionState => {
    const connection = connectionsRef.current.get(userId);
    return connection?.state ?? "disconnected";
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(
    async (auth: WildduckUserAuth): Promise<void> => {
      if (!enabled) {
        return;
      }

      const userId = auth.userId;
      let connection = connectionsRef.current.get(userId);

      // Create client if doesn't exist
      if (!connection) {
        const client = new WildduckWebSocketClient(config);

        connection = {
          client,
          auth,
          refCount: 0,
          cleanupTimer: null,
          state: "disconnected",
        };

        // Set up state change listener
        client.on("stateChange", (_oldState, newState) => {
          const conn = connectionsRef.current.get(userId);
          if (conn) {
            conn.state = newState;
          }
        });

        connectionsRef.current.set(userId, connection);
      }

      // Cancel cleanup timer if scheduled
      if (connection.cleanupTimer) {
        clearTimeout(connection.cleanupTimer);
        connection.cleanupTimer = null;
      }

      // Increment reference count
      connection.refCount++;

      // Connect if not already connected/connecting
      if (
        connection.state === "disconnected" ||
        connection.state === "reconnecting"
      ) {
        try {
          await connection.client.connect({
            userId: auth.userId,
            accessToken: auth.accessToken,
          });
        } catch (error) {
          // Connection failed, decrement ref count
          connection.refCount--;
          throw error;
        }
      }
    },
    [enabled, config],
  );

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback((userId: string): void => {
    const connection = connectionsRef.current.get(userId);
    if (!connection) {
      return;
    }

    // Decrement reference count
    connection.refCount = Math.max(0, connection.refCount - 1);

    // Schedule cleanup if no more references
    if (connection.refCount === 0 && !connection.cleanupTimer) {
      connection.cleanupTimer = setTimeout(() => {
        const conn = connectionsRef.current.get(userId);
        if (conn && conn.refCount === 0) {
          // Disconnect and remove
          conn.client.disconnect();
          conn.client.removeAllListeners();
          connectionsRef.current.delete(userId);
        }
      }, CLEANUP_DELAY);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Disconnect all clients
      for (const connection of connectionsRef.current.values()) {
        if (connection.cleanupTimer) {
          clearTimeout(connection.cleanupTimer);
        }
        connection.client.disconnect();
        connection.client.removeAllListeners();
      }
      connectionsRef.current.clear();
    };
  }, []);

  const contextValue: WebSocketContextValue = {
    getClient,
    isEnabled: enabled,
    isConnected,
    connect,
    disconnect,
    getConnectionState,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to access WebSocket context
 *
 * @returns WebSocket context value
 * @throws Error if used outside of WebSocketProvider
 */
export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider. " +
        "Wrap your app with <WebSocketProvider> to use WebSocket features.",
    );
  }

  return context;
}
