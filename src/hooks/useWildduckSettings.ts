import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type {
  WildduckConfig,
  WildduckUserAuth,
} from "@sudobility/mail_box_types";
import { WildduckClient } from "../network/wildduck-client";
import { useWebSocket } from "../websocket/useWebSocket";
import type { ChannelName, ServerResponseData } from "../websocket/types";
import { useQueryClient } from "@tanstack/react-query";

interface WildduckSettings {
  [key: string]: any;
}

interface UseWildduckSettingsReturn {
  isLoading: boolean;
  error: Optional<string>;
  settings: WildduckSettings;
  getSettings: (
    wildduckUserAuth: WildduckUserAuth,
  ) => Promise<WildduckSettings>;
  updateSetting: (
    wildduckUserAuth: WildduckUserAuth,
    key: string,
    value: any,
  ) => Promise<{ success: boolean }>;
  deleteSetting: (
    wildduckUserAuth: WildduckUserAuth,
    key: string,
  ) => Promise<{ success: boolean }>;
  clearError: () => void;
  refresh: (wildduckUserAuth: WildduckUserAuth) => Promise<void>;
}

/**
 * Hook options for Wildduck settings
 */
interface UseWildduckSettingsOptions {
  /** Enable WebSocket real-time updates (default: false) */
  enableWebSocket?: boolean;
}

/**
 * Hook for Wildduck settings management operations
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - WildDuck user authentication data (single source of truth)
 * @param _devMode - Development mode flag (unused, kept for compatibility)
 * @param options - Hook options (including WebSocket enablement)
 */
const useWildduckSettings = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  wildduckUserAuth: Optional<WildduckUserAuth>,
  _devMode: boolean = false,
  options?: UseWildduckSettingsOptions,
): UseWildduckSettingsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [settings, setSettings] = useState<WildduckSettings>({});

  const queryClient = useQueryClient();
  const wsSubscribedRef = useRef(false);

  // Get WebSocket context (if provider is available)
  let wsContext;
  try {
    wsContext = useWebSocket();
  } catch {
    // WebSocketProvider not available, that's fine
    wsContext = null;
  }

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  // Determine if WebSocket should be used
  const shouldUseWebSocket =
    options?.enableWebSocket &&
    wsContext?.isEnabled &&
    wildduckUserAuth !== null;

  // WebSocket subscription and real-time updates
  useEffect(() => {
    if (!shouldUseWebSocket || !wildduckUserAuth || !wsContext) {
      return;
    }

    const client = wsContext.getClient(wildduckUserAuth);
    if (!client) {
      return;
    }

    // Handle data messages (initial subscription response)
    const handleData = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "settings" || !data.success) {
        return;
      }

      const settingsData = data as any;
      const settingsObj = (settingsData.settings as WildduckSettings) || {};

      // Update local state
      setSettings(settingsObj);

      // Update cache
      queryClient.setQueryData(
        ["wildduck-settings", wildduckUserAuth.userId],
        settingsObj,
      );
    };

    // Handle update messages (real-time updates)
    const handleUpdate = (channel: ChannelName, data: ServerResponseData) => {
      if (channel !== "settings" || !data.success) {
        return;
      }

      const updateData = data as any;
      const event = updateData.event as "updated" | "deleted";
      const key = updateData.key as string;
      const value = updateData.value;

      if (!event || !key) {
        // If no specific event, invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: ["wildduck-settings", wildduckUserAuth.userId],
        });
        return;
      }

      // Update settings based on event
      setSettings((currentSettings) => {
        let updatedSettings: WildduckSettings;

        switch (event) {
          case "updated":
            // Update or create setting
            updatedSettings = { ...currentSettings, [key]: value };
            break;

          case "deleted": {
            // Remove setting
            const { [key]: _removed, ...rest } = currentSettings;
            updatedSettings = rest;
            break;
          }

          default:
            updatedSettings = currentSettings;
        }

        // Update cache
        queryClient.setQueryData(
          ["wildduck-settings", wildduckUserAuth.userId],
          updatedSettings,
        );

        return updatedSettings;
      });
    };

    // Register event handlers
    client.on("data", handleData);
    client.on("update", handleUpdate);

    // Subscribe to settings channel
    if (!wsSubscribedRef.current) {
      wsSubscribedRef.current = true;
      // Connect first, then subscribe
      wsContext
        .connect(wildduckUserAuth)
        .then(() => {
          return client.subscribe("settings", {
            userId: wildduckUserAuth.userId,
            token: wildduckUserAuth.accessToken,
          });
        })
        .catch((error) => {
          console.error(
            "Failed to connect/subscribe to settings channel:",
            error,
          );
          wsSubscribedRef.current = false;
        });
    }

    // Cleanup
    return () => {
      client.off("data", handleData);
      client.off("update", handleUpdate);

      if (wsSubscribedRef.current) {
        client.unsubscribe("settings").catch((error) => {
          console.error("Failed to unsubscribe from settings:", error);
        });
        wsSubscribedRef.current = false;
      }

      wsContext.disconnect(wildduckUserAuth.userId);
    };
  }, [shouldUseWebSocket, wildduckUserAuth, wsContext, queryClient]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getSettings = useCallback(
    async (wildduckUserAuth: WildduckUserAuth): Promise<WildduckSettings> => {
      const isWebSocketConnected =
        shouldUseWebSocket && !!wsContext?.isConnected(wildduckUserAuth.userId);

      if (isWebSocketConnected) {
        return (
          queryClient.getQueryData<WildduckSettings>([
            "wildduck-settings",
            wildduckUserAuth.userId,
          ]) || settings
        );
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.getSettings(wildduckUserAuth);

        const settingsData =
          (response as { results?: WildduckSettings }).results ||
          (response as WildduckSettings);
        setSettings(settingsData);
        return settingsData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get settings";
        setError(errorMessage);
        setSettings({});
        console.error("Failed to get settings:", err);
        return {};
      } finally {
        setIsLoading(false);
      }
    },
    [api, queryClient, settings, shouldUseWebSocket, wsContext],
  );

  const updateSetting = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      key: string,
      value: any,
    ): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.updateSetting(wildduckUserAuth, key, value);

        // Update local settings
        setSettings((prev) => ({ ...prev, [key]: value }));

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update setting";
        setError(errorMessage);
        console.error("Failed to update setting:", err);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  const deleteSetting = useCallback(
    async (
      wildduckUserAuth: WildduckUserAuth,
      key: string,
    ): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.deleteSetting(wildduckUserAuth, key);

        // Remove from local settings
        setSettings((prev) => {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        });

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete setting";
        setError(errorMessage);
        console.error("Failed to delete setting:", err);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  const refresh = useCallback(
    async (wildduckUserAuth: WildduckUserAuth): Promise<void> => {
      await getSettings(wildduckUserAuth);
    },
    [getSettings],
  );

  return useMemo(
    () => ({
      isLoading,
      error,
      settings,
      getSettings,
      updateSetting,
      deleteSetting,
      clearError,
      refresh,
    }),
    [
      isLoading,
      error,
      settings,
      getSettings,
      updateSetting,
      deleteSetting,
      clearError,
      refresh,
    ],
  );
};

export {
  useWildduckSettings,
  type WildduckSettings,
  type UseWildduckSettingsReturn,
  type UseWildduckSettingsOptions,
};
