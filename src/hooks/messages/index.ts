/**
 * Message Hooks
 *
 * Specialized hooks for message operations in Wildduck.
 *
 * IMPORTANT: Most message operations are now available in monolithic hooks:
 * - useWildduckMessages (collection-level: list, send, upload)
 * - useWildduckMessage (singular-level: get, update, delete, forward, submit)
 *
 * Only specialized hooks that remain:
 * - useWildduckSearchMessages (different query pattern)
 * - useWildduckUploadMessage (kept for backward compatibility, use useWildduckMessages.uploadMessage instead)
 */

export * from "./useWildduckSearchMessages";
export * from "./useWildduckUploadMessage";
