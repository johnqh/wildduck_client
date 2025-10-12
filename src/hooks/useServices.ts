/**
 * Custom hooks for accessing services from the dependency injection container
 */

import type {
  PlatformAnalytics,
  PlatformNetwork,
  PlatformNotifications,
  PlatformStorage,
  PlatformTheme,
} from "@sudobility/di";
import { ServiceKeys } from "@sudobility/di";
import { useServiceContainer, useServiceResolver } from "./ServiceProvider";

/**
 * Get a service from the dependency injection container
 */
function useService<T>(serviceKey: string): T {
  const container = useServiceContainer();
  return container.get<T>(serviceKey);
}

/**
 * Get the storage service
 */
function useStorageService(): PlatformStorage {
  const resolver = useServiceResolver();
  return resolver.getStorage();
}

/**
 * Get the analytics service
 */
function useAnalyticsService(): PlatformAnalytics {
  const resolver = useServiceResolver();
  return resolver.getAnalytics();
}

/**
 * Get the theme service
 */
function useThemeService(): PlatformTheme {
  return useService(ServiceKeys.THEME);
}

/**
 * Get the notifications service
 */
function useNotificationsService(): PlatformNotifications {
  return useService(ServiceKeys.NOTIFICATIONS);
}

/**
 * Get the network service
 */
function useNetworkService(): PlatformNetwork {
  return useService(ServiceKeys.NETWORK);
}

/**
 * Get the persistence service
 */
function usePersistenceService(): any {
  return useService(ServiceKeys.PERSISTENCE);
}

/**
 * Get the folder operations service
 */
function useFolderOperations() {
  return useService(ServiceKeys.FOLDER_OPERATIONS);
}

/**
 * Get the application configuration
 * This should be provided by the consuming application through DI context
 * For now, we'll throw an error to indicate proper DI setup is needed
 */
function useAppConfig() {
  const resolver = useServiceResolver();
  return resolver.getConfig();
}

export {
  useAnalyticsService,
  useAppConfig,
  useFolderOperations,
  useNetworkService,
  useNotificationsService,
  usePersistenceService,
  useService,
  useStorageService,
  useThemeService,
};

// Re-export platform types and service keys for convenience
export { ServiceKeys } from "@sudobility/di";
export type {
  PlatformAnalytics,
  PlatformNetwork,
  PlatformNotifications,
  PlatformStorage,
  PlatformTheme,
} from "@sudobility/di";
