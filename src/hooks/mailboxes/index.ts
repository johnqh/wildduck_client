/**
 * Individual hooks for WildDuck Mailboxes API
 * Each hook is isolated with its own state management
 */

// Read operations
export * from "./useGetMailboxes";
export * from "./useGetMailbox";

// Write operations (mutations)
export * from "./useCreateMailbox";
export * from "./useUpdateMailbox";
export * from "./useDeleteMailbox";
