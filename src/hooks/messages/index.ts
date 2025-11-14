/**
 * Message Hooks
 *
 * Specialized hooks for message operations in Wildduck.
 *
 * IMPORTANT: Most message operations are now available in monolithic hooks:
 * - useWildduckMessages (collection-level: list, send, upload)
 * - useWildduckMessage (singular-level: get, update, delete, forward, submit)
 *
 * Only specialized hook remaining:
 * - useWildduckSearchMessages (different query pattern - not in monolithic hooks)
 */

export * from "./useWildduckSearchMessages";
