/**
 * Individual hooks for WildDuck Messages API
 * Each hook is isolated with its own state management
 */

// Read operations
export * from "./useWildduckGetMessages";
export * from "./useWildduckGetMessage";
export * from "./useWildduckSearchMessages";
export * from "./useWildduckGetMessageSource";
export * from "./useWildduckGetMessageAttachment";

// Write operations (mutations)
export * from "./useWildduckSendMessage";
export * from "./useWildduckUpdateMessage";
export * from "./useWildduckDeleteMessage";
export * from "./useWildduckUploadMessage";
export * from "./useWildduckForwardMessage";
export * from "./useWildduckSubmitDraft";
