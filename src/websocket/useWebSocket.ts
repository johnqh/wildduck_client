/**
 * useWebSocket Hook
 *
 * Convenience hook for accessing WebSocket context and client.
 */

import { useWebSocketContext } from "./provider";
import type { WebSocketContextValue } from "./provider";

/**
 * Hook to access WebSocket functionality
 *
 * Provides access to WebSocket client management and connection state.
 * Must be used within a WebSocketProvider.
 *
 * @returns WebSocket context value
 * @throws Error if used outside of WebSocketProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getClient, isConnected, connect, disconnect } = useWebSocket();
 *   const auth = useAuth(); // Your auth hook
 *
 *   useEffect(() => {
 *     if (auth) {
 *       connect(auth);
 *       return () => disconnect(auth.userId);
 *     }
 *   }, [auth, connect, disconnect]);
 *
 *   const wsClient = getClient(auth);
 *
 *   return (
 *     <div>
 *       Status: {isConnected(auth.userId) ? 'Connected' : 'Disconnected'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebSocket(): WebSocketContextValue {
  return useWebSocketContext();
}
