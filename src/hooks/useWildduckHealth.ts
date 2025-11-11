import { useCallback, useEffect, useMemo, useState } from "react";
import type { NetworkClient, Optional } from "@sudobility/types";
import type { WildduckConfig } from "@sudobility/types";
import { WildduckMockData } from "./mocks";

interface WildduckHealthStatus {
  success: boolean;
  version?: string;
  database?: {
    status: "connected" | "disconnected" | "error";
    collections?: number;
  };
  redis?: {
    status: "connected" | "disconnected" | "error";
  };
  imap?: {
    status: "running" | "stopped" | "error";
    connections?: number;
  };
  smtp?: {
    status: "running" | "stopped" | "error";
    connections?: number;
  };
  pop3?: {
    status: "running" | "stopped" | "error";
    connections?: number;
  };
  uptime?: number;
  memory?: {
    used: number;
    free: number;
    total: number;
  };
}

interface UseWildduckHealthReturn {
  isLoading: boolean;
  error: Optional<string>;
  healthStatus: WildduckHealthStatus | null;
  isHealthy: boolean;
  checkHealth: () => Promise<WildduckHealthStatus>;
  startMonitoring: (intervalMs?: number) => void;
  stopMonitoring: () => void;
  isMonitoring: boolean;
  clearError: () => void;
}

/**
 * Hook for Wildduck health monitoring and status operations
 *
 * @param networkClient - Network client for API calls
 * @param config - Wildduck configuration
 * @param devMode - Development mode flag
 */
const useWildduckHealth = (
  networkClient: NetworkClient,
  config: WildduckConfig,
  devMode: boolean = false,
): UseWildduckHealthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Optional<string>>(null);
  const [healthStatus, setHealthStatus] = useState<WildduckHealthStatus | null>(
    null,
  );
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] =
    useState<NodeJS.Timeout | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isHealthy =
    healthStatus?.success === true &&
    healthStatus?.database?.status === "connected" &&
    (healthStatus?.redis?.status === "connected" || !healthStatus?.redis) &&
    (healthStatus?.imap?.status === "running" || !healthStatus?.imap);

  const checkHealth = useCallback(async (): Promise<WildduckHealthStatus> => {
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

      const response = await networkClient.request<WildduckHealthStatus>(
        `${apiUrl}/health`,
        {
          method: "GET",
          headers,
        },
      );

      const healthData = response.data as WildduckHealthStatus;
      setHealthStatus(healthData);
      return healthData;
    } catch (err) {
      if (devMode) {
        console.warn(
          "[DevMode] Health check failed, returning mock data:",
          err,
        );
        const mockHealthData =
          WildduckMockData.getHealth() as WildduckHealthStatus;
        setHealthStatus(mockHealthData);
        return mockHealthData;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to check health";
      setError(errorMessage);

      // Create a basic error health status
      const errorStatus: WildduckHealthStatus = {
        success: false,
        database: { status: "error" },
        redis: { status: "error" },
        imap: { status: "error" },
        smtp: { status: "error" },
        pop3: { status: "error" },
      };

      setHealthStatus(errorStatus);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config.cloudflareWorkerUrl, config.backendUrl, config.apiToken, devMode]);

  const startMonitoring = useCallback(
    (intervalMs: number = 30000) => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }

      setIsMonitoring(true);

      // Initial health check
      checkHealth().catch((error) => {
        console.error("[useWildduckHealth] Health check failed:", error);
      });

      // Set up periodic health checks
      const interval = setInterval(() => {
        checkHealth().catch((error) => {
          console.error("[useWildduckHealth] Health check failed:", error);
        });
      }, intervalMs);

      setMonitoringInterval(interval);
    },
    [checkHealth, monitoringInterval],
  );

  const stopMonitoring = useCallback(() => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    setIsMonitoring(false);
  }, [monitoringInterval]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [monitoringInterval]);

  return useMemo(
    () => ({
      isLoading,
      error,
      healthStatus,
      isHealthy,
      checkHealth,
      startMonitoring,
      stopMonitoring,
      isMonitoring,
      clearError,
    }),
    [
      isLoading,
      error,
      healthStatus,
      isHealthy,
      checkHealth,
      startMonitoring,
      stopMonitoring,
      isMonitoring,
      clearError,
    ],
  );
};

export {
  useWildduckHealth,
  type WildduckHealthStatus,
  type UseWildduckHealthReturn,
};
