/**
 * Individual hooks for WildDuck Messages API
 * Each hook is isolated with its own state management
 */

// Read operations
export * from "./useGetMessages";
export * from "./useGetMessage";
export * from "./useSearchMessages";
export * from "./useGetMessageSource";
export * from "./useGetMessageAttachment";

// Write operations (mutations)
export * from "./useSendMessage";
export * from "./useUpdateMessage";
export * from "./useDeleteMessage";
export * from "./useUploadMessage";
export * from "./useForwardMessage";
export * from "./useSubmitDraft";
