/**
 * WebSocketStatus Component
 *
 * A ready-to-use React component for displaying WebSocket connection status.
 * Monitors connection state and provides visual feedback to users.
 */

import React, { useEffect, useState } from "react";
import type { WildduckUserAuth } from "@sudobility/mail_box_types";
import { useWebSocket } from "../websocket/useWebSocket";
import type { ConnectionState } from "../websocket/types";

export interface WebSocketStatusProps {
  /** User authentication for connection monitoring */
  wildduckUserAuth: WildduckUserAuth | null;

  /** Show reconnection attempt count (default: true) */
  showReconnectCount?: boolean;

  /** Show detailed connection info (default: false) */
  showDetails?: boolean;

  /** Custom CSS class name */
  className?: string;

  /** Custom styles */
  style?: React.CSSProperties;

  /** Render custom status indicator */
  renderStatus?: (
    state: ConnectionState,
    reconnectAttempt: number,
  ) => React.ReactNode;
}

/**
 * WebSocketStatus component - displays current WebSocket connection status
 *
 * @example
 * ```tsx
 * <WebSocketStatus wildduckUserAuth={auth} showReconnectCount={true} />
 * ```
 */
export function WebSocketStatus({
  wildduckUserAuth,
  showReconnectCount = true,
  showDetails = false,
  className = "",
  style,
  renderStatus,
}: WebSocketStatusProps): React.ReactElement | null {
  const wsContext = useWebSocket();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectDelay, setReconnectDelay] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!wsContext || !wildduckUserAuth) {
      return;
    }

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) {
      return;
    }

    // Update initial state
    setConnectionState(client.state);
    setReconnectAttempt(client.reconnectAttempt);

    // State change handler
    const handleStateChange = (
      _oldState: ConnectionState,
      newState: ConnectionState,
    ) => {
      setConnectionState(newState);

      // Clear error when connected
      if (newState === "connected") {
        setLastError(null);
        setReconnectAttempt(0);
      }
    };

    // Reconnection handler
    const handleReconnecting = (attempt: number, delay: number) => {
      setReconnectAttempt(attempt);
      setReconnectDelay(delay);
    };

    // Error handler
    const handleError = (error: Error) => {
      setLastError(error.message);
    };

    // Register event listeners
    client.on("stateChange", handleStateChange);
    client.on("reconnecting", handleReconnecting);
    client.on("error", handleError);

    // Cleanup
    return () => {
      client.off("stateChange", handleStateChange);
      client.off("reconnecting", handleReconnecting);
      client.off("error", handleError);
    };
  }, [wsContext, wildduckUserAuth]);

  // Don't render if WebSocket is not available
  if (!wsContext || !wildduckUserAuth) {
    return null;
  }

  // Custom render function if provided
  if (renderStatus) {
    return <>{renderStatus(connectionState, reconnectAttempt)}</>;
  }

  // Status configuration
  const statusConfig: Record<
    ConnectionState,
    { color: string; text: string; emoji: string }
  > = {
    disconnected: { color: "#6c757d", text: "Offline", emoji: "⚫" },
    connecting: { color: "#ffc107", text: "Connecting...", emoji: "🟡" },
    connected: { color: "#28a745", text: "Live", emoji: "🟢" },
    reconnecting: {
      color: "#fd7e14",
      text: "Reconnecting...",
      emoji: "🟠",
    },
    disconnecting: { color: "#dc3545", text: "Disconnecting...", emoji: "🔴" },
  };

  const { color, text } = statusConfig[connectionState];

  return (
    <div
      className={`websocket-status ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 12px",
        borderRadius: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        fontSize: "14px",
        ...style,
      }}
    >
      {/* Status indicator dot */}
      <span
        className="status-dot"
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: color,
        }}
        title={text}
      />

      {/* Status text */}
      <span className="status-text" style={{ fontWeight: 500 }}>
        {text}
      </span>

      {/* Reconnection info */}
      {showReconnectCount &&
        connectionState === "reconnecting" &&
        reconnectAttempt > 0 && (
          <span
            className="reconnect-info"
            style={{ fontSize: "12px", color: "#6c757d" }}
          >
            (attempt {reconnectAttempt})
          </span>
        )}

      {/* Detailed info */}
      {showDetails && (
        <div
          className="status-details"
          style={{
            fontSize: "12px",
            color: "#6c757d",
            marginLeft: "8px",
          }}
        >
          {connectionState === "reconnecting" && reconnectDelay > 0 && (
            <span>Retry in {Math.round(reconnectDelay / 1000)}s</span>
          )}
          {lastError && connectionState !== "connected" && (
            <span title={lastError}> | Error</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal status badge - just a colored dot
 */
export interface WebSocketStatusBadgeProps {
  wildduckUserAuth: WildduckUserAuth | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function WebSocketStatusBadge({
  wildduckUserAuth,
  size = 8,
  className = "",
  style,
}: WebSocketStatusBadgeProps): React.ReactElement | null {
  const wsContext = useWebSocket();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  useEffect(() => {
    if (!wsContext || !wildduckUserAuth) {
      return;
    }

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) {
      return;
    }

    setConnectionState(client.state);

    const handleStateChange = (
      _oldState: ConnectionState,
      newState: ConnectionState,
    ) => {
      setConnectionState(newState);
    };

    client.on("stateChange", handleStateChange);

    return () => {
      client.off("stateChange", handleStateChange);
    };
  }, [wsContext, wildduckUserAuth]);

  if (!wsContext || !wildduckUserAuth) {
    return null;
  }

  const colorMap: Record<ConnectionState, string> = {
    disconnected: "#6c757d",
    connecting: "#ffc107",
    connected: "#28a745",
    reconnecting: "#fd7e14",
    disconnecting: "#dc3545",
  };

  return (
    <span
      className={`websocket-status-badge ${className}`}
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor: colorMap[connectionState],
        ...style,
      }}
      title={connectionState}
    />
  );
}

/**
 * Connection statistics component
 */
export interface WebSocketStatsProps {
  wildduckUserAuth: WildduckUserAuth | null;
  className?: string;
  style?: React.CSSProperties;
}

export function WebSocketStats({
  wildduckUserAuth,
  className = "",
  style,
}: WebSocketStatsProps): React.ReactElement | null {
  const wsContext = useWebSocket();
  const [stats, setStats] = useState({
    state: "disconnected" as ConnectionState,
    reconnectAttempt: 0,
    subscriptions: 0,
  });

  useEffect(() => {
    if (!wsContext || !wildduckUserAuth) {
      return;
    }

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) {
      return;
    }

    const updateStats = () => {
      setStats({
        state: client.state,
        reconnectAttempt: client.reconnectAttempt,
        subscriptions: client.subscriptions.size,
      });
    };

    updateStats();

    const handleStateChange = () => updateStats();
    const handleReconnecting = () => updateStats();

    client.on("stateChange", handleStateChange);
    client.on("reconnecting", handleReconnecting);

    return () => {
      client.off("stateChange", handleStateChange);
      client.off("reconnecting", handleReconnecting);
    };
  }, [wsContext, wildduckUserAuth]);

  if (!wsContext || !wildduckUserAuth) {
    return null;
  }

  return (
    <div
      className={`websocket-stats ${className}`}
      style={{
        padding: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        borderRadius: "4px",
        ...style,
      }}
    >
      <div>State: {stats.state}</div>
      <div>Subscriptions: {stats.subscriptions}</div>
      {stats.reconnectAttempt > 0 && (
        <div>Reconnect attempts: {stats.reconnectAttempt}</div>
      )}
    </div>
  );
}
