/**
 * Type exports for @johnqh/wildduck_client
 * Re-exporting all Wildduck types from local types file
 */

// Re-export all Wildduck types from local file
export * from "./wildduck-types";

// Re-export non-Wildduck types from @johnqh/types that are still needed
export type { Optional, NetworkClient } from "@johnqh/types";
