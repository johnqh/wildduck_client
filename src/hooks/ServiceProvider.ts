/**
 * Service container and resolver hooks for dependency injection
 * Provides access to service container in React components
 */

import { createContext, useContext } from "react";

/**
 * Service container interface
 * The consuming application should provide an implementation
 */
export interface ServiceContainer {
  get<T>(key: string): T;
  register<T>(
    key: string,
    factory: (container: ServiceContainer) => T,
    singleton?: boolean,
  ): void;
}

/**
 * Service resolver interface
 * Convenience layer for accessing common services
 */
export interface ServiceResolver {
  getStorage(): any;
  getAnalytics(): any;
  getConfig(): any;
}

// Service container context
const ServiceContainerContext = createContext<ServiceContainer | null>(null);

// Service resolver context (convenience layer)
const ServiceResolverContext = createContext<ServiceResolver | null>(null);

/**
 * Hook to get the service container
 * @throws Error if used outside ServiceProvider
 */
const useServiceContainer = (): ServiceContainer => {
  const container = useContext(ServiceContainerContext);
  if (!container) {
    throw new Error(
      "useServiceContainer must be used within a ServiceProvider. " +
        "Make sure to set up the service container properly in your app.",
    );
  }
  return container;
};

/**
 * Hook to get the service resolver (convenience layer)
 * @throws Error if used outside ServiceProvider
 */
const useServiceResolver = (): ServiceResolver => {
  const resolver = useContext(ServiceResolverContext);
  if (!resolver) {
    throw new Error(
      "useServiceResolver must be used within a ServiceProvider. " +
        "Make sure to set up the service container properly in your app.",
    );
  }
  return resolver;
};

// Export contexts for use in consuming applications
export {
  ServiceContainerContext,
  ServiceResolverContext,
  useServiceContainer,
  useServiceResolver,
};
