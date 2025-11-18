import { useCallback, useMemo, useState } from "react";
import type {
  NetworkClient,
  Optional,
  WildduckUserAuth,
} from "@sudobility/types";
import type { WildduckConfig } from "@sudobility/types";
import { WildduckClient } from "../network/wildduck-client";

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
 * Hook for Wildduck settings management operations
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param wildduckUserAuth - WildDuck user authentication data (single source of truth)
 * @param _devMode - Development mode flag (unused, kept for compatibility)
 */
const useWildduckSettings = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  _wildduckUserAuth: Optional<WildduckUserAuth>,
  _devMode: boolean = false,
): UseWildduckSettingsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [settings, setSettings] = useState<WildduckSettings>({});

  const api = useMemo(
    () => new WildduckClient(networkClient, config),
    [networkClient, config],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getSettings = useCallback(
    async (wildduckUserAuth: WildduckUserAuth): Promise<WildduckSettings> => {
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
    [api],
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
};
