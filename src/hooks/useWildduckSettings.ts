import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import type { Optional } from "@johnqh/types";
import type { WildduckConfig } from "@johnqh/types";
import { WildduckMockData } from "./mocks";

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
 */
const useWildduckSettings = (
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckSettingsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [settings, setSettings] = useState<WildduckSettings>({});

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getSettings = useCallback(async (): Promise<WildduckSettings> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use config URLs and headers
      const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (config.cloudflareWorkerUrl) {
        headers["Authorization"] = `Bearer ${config.apiToken}`;
        headers["X-App-Source"] = "0xmail-box";
      } else {
        headers["X-Access-Token"] = config.apiToken;
      }

      const response = await axios.get(`${apiUrl}/settings`, { headers });

      const settingsData =
        (response.data as { results?: WildduckSettings } | WildduckSettings)
          .results || (response.data as WildduckSettings);
      setSettings(settingsData);
      return settingsData;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Get settings failed, returning mock data:",
          err,
        );
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
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config.cloudflareWorkerUrl, config.backendUrl, config.apiToken, devMode]);

  const updateSetting = useCallback(
    async (key: string, value: any): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (config.cloudflareWorkerUrl) {
          headers["Authorization"] = `Bearer ${config.apiToken}`;
          headers["X-App-Source"] = "0xmail-box";
        } else {
          headers["X-Access-Token"] = config.apiToken;
        }

        const response = await axios.put(
          `${apiUrl}/settings/${key}`,
          { value },
          { headers },
        );

        // Update local settings
        setSettings((prev) => ({ ...prev, [key]: value }));

        return response.data as { success: boolean };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Update setting failed, returning mock success:",
            err,
          );
          setSettings((prev) => ({ ...prev, [key]: value }));
          return WildduckMockData.getUpdateSetting();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to update setting";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [config.cloudflareWorkerUrl, config.backendUrl, config.apiToken, devMode],
  );

  const deleteSetting = useCallback(
    async (key: string): Promise<{ success: boolean }> => {
      setIsLoading(true);
      setError(null);

      try {
        // Use config URLs and headers
        const apiUrl = config.cloudflareWorkerUrl || config.backendUrl;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (config.cloudflareWorkerUrl) {
          headers["Authorization"] = `Bearer ${config.apiToken}`;
          headers["X-App-Source"] = "0xmail-box";
        } else {
          headers["X-Access-Token"] = config.apiToken;
        }

        const response = await axios.delete(`${apiUrl}/settings/${key}`, {
          headers,
        });

        // Remove from local settings
        setSettings((prev) => {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        });

        return response.data as { success: boolean };
      } catch (err) {
        if (devMode) {
          console.warn(
            "[DevMode] Delete setting failed, returning mock success:",
            err,
          );
          setSettings((prev) => {
            const { [key]: _removed, ...rest } = prev;
            return rest;
          });
          return WildduckMockData.getDeleteSetting();
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete setting";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [config.cloudflareWorkerUrl, config.backendUrl, config.apiToken, devMode],
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
