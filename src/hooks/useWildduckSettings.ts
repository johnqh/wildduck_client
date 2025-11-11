import { useCallback, useMemo, useState } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type { WildduckConfig } from "@sudobility/types";
import { WildduckMockData } from "./mocks";
import { WildduckClient } from "../network/wildduck-client";

interface WildduckSettings {
  [key: string]: any;
}

interface UseWildduckSettingsReturn {
  isLoading: boolean;
  error: Optional<string>;
  settings: WildduckSettings;
  getSettings: () => Promise<WildduckSettings>;
  updateSetting: (key: string, value: any) => Promise<{ success: boolean }>;
  deleteSetting: (key: string) => Promise<{ success: boolean }>;
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for Wildduck settings management operations
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param devMode - Development mode flag
 */
const useWildduckSettings = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
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

  const getSettings = useCallback(async (): Promise<WildduckSettings> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getSettings();

      const settingsData =
        (response as { results?: WildduckSettings }).results ||
        (response as WildduckSettings);
      setSettings(settingsData);
      return settingsData;
    } catch (err) {
      if (devMode) {
        const mockData = WildduckMockData.getSettings();
        const mockSettings = mockData.data.settings.reduce(
          (acc: WildduckSettings, setting: any) => {
            acc[setting.key] = setting.value;
            return acc;
          },
          {},
        );
        setSettings(mockSettings);
        return mockSettings;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to get settings";
      setError(errorMessage);
      setSettings({});
      console.error("Failed to get settings:", err);
      return {};
    } finally {
      setIsLoading(false);
    }
  }, [api, devMode]);

  const updateSetting = useCallback(
    async (key: string, value: any): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.updateSetting(key, value);

        // Update local settings
        setSettings((prev) => ({ ...prev, [key]: value }));

        return response;
      } catch (err) {
        if (devMode) {
          setSettings((prev) => ({ ...prev, [key]: value }));
          return WildduckMockData.getUpdateSetting();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to update setting";
        setError(errorMessage);
        console.error("Failed to update setting:", err);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [api, devMode],
  );

  const deleteSetting = useCallback(
    async (key: string): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.deleteSetting(key);

        // Remove from local settings
        setSettings((prev) => {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        });

        return response;
      } catch (err) {
        if (devMode) {
          setSettings((prev) => {
            const { [key]: _removed, ...rest } = prev;
            return rest;
          });
          return WildduckMockData.getDeleteSetting();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete setting";
        setError(errorMessage);
        console.error("Failed to delete setting:", err);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [api, devMode],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await getSettings();
  }, [getSettings]);

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
