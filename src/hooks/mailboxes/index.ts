/**
 * Individual hooks for WildDuck Mailboxes API
 * Each hook is isolated with its own state management
 */

// Read operations
export * from "./useWildduckGetMailboxes";
export * from "./useWildduckGetMailbox";

// Write operations (mutations)
export * from "./useWildduckCreateMailbox";
export * from "./useWildduckUpdateMailbox";
export * from "./useWildduckDeleteMailbox";
