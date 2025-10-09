/**
 * Comprehensive WildDuck API Type Definitions
 * Generated based on WildDuck API specification
 */

// ============================================================================
// Common Types
// ============================================================================

export type WildduckObjectId = string; // 24-character hex string

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Wildduck Configuration
 */
export interface WildduckConfig {
  backendUrl: string;
  apiToken: string;
  cloudflareWorkerUrl?: string;
}

export interface WildduckAddress {
  id: string;
  address: string;
  name?: string;
  main: boolean;
  created?: string;
  metaData?: Record<string, unknown>;
  tags?: string[];
}

export interface WildduckMessageAddress {
  name?: string;
  address: string;
}

export interface WildduckAttachment {
  id: string;
  hash?: string;
  filename: string;
  contentType: string;
  disposition: string;
  transferEncoding: string;
  related: boolean;
  sizeKb: number;
}

export interface WildduckContentType {
  value: string;
  params: Record<string, unknown>;
}

export interface WildduckBimiInfo {
  certified: boolean;
  url: string;
  image: string;
  type?: "VMC" | "CMC";
}

export interface WildduckLimits {
  quota?: { allowed: number; used: number };
  recipients?: { allowed: number; used: number; ttl: number };
  forwards?: { allowed: number; used: number; ttl: number };
  received?: { allowed: number; used: number; ttl: number };
  imapUpload?: { allowed: number; used: number; ttl: number };
  imapDownload?: { allowed: number; used: number; ttl: number };
  pop3Download?: { allowed: number; used: number; ttl: number };
  imapMaxConnections?: { allowed: number; used: number };
}

export interface WildduckKeyInfo {
  name: string;
  address: string;
  fingerprint: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface WildduckUserAuth {
  userId: string;
  accessToken: string;
}

export interface WildduckPreAuthRequest {
  username: string;
  scope?: string;
  sess?: string;
  ip?: string;
}

export interface WildduckPreAuthResponse {
  success: boolean;
  id?: string;
  username?: string;
  address?: string;
  scope?: string[];
  require2fa?: string[];
  requirePasswordChange?: boolean;
  message?: string;
  nonce?: string;
}

export interface WildduckAuthenticateRequest {
  username: string;
  password?: string;
  emailDomain?: string;
  signature?: string;
  message?: string;
  signer?: string;
  protocol?: string;
  scope?: string;
  appId?: string;
  token?: boolean;
  sess?: string;
  ip?: string;
}

export interface WildduckAuthResponse {
  success: boolean;
  id?: string;
  username?: string;
  address?: string;
  scope?: string[];
  token?: string;
  require2fa?: string[];
  requirePasswordChange?: boolean;
  message?: string;
  error?: string;
}

// Request builder functions
export function createPreAuthRequest(
  username: string,
  options?: Partial<WildduckPreAuthRequest>,
): WildduckPreAuthRequest {
  return {
    username,
    scope: "master",
    ...options,
  };
}

export function createAuthenticateRequest(
  username: string,
  signature?: string,
  message?: string,
  options?: Partial<WildduckAuthenticateRequest>,
): WildduckAuthenticateRequest {
  return {
    username,
    ...(signature && { signature }),
    ...(message && { message }),
    protocol: "API",
    scope: "master",
    token: false,
    ...options,
  };
}

// ============================================================================
// User Types
// ============================================================================

/**
 * Simplified Wildduck User type (from @johnqh/types pattern)
 */
export interface WildduckUser {
  id: string;
  username: string;
  name?: string;
  address?: string;
  language?: string;
  retention?: number;
  quota?: {
    allowed: number;
    used: number;
  };
  disabled: boolean;
  suspended: boolean;
  tags?: string[];
  hasPasswordSet?: boolean;
  activated?: boolean;
  created?: string;
}

// Use the detailed response type as the main WildduckUserResponse (for test compatibility)
export interface WildduckUserResponse {
  success: boolean;
  id: string;
  username: string;
  name: string;
  address: string;
  language?: string;
  retention: number;
  uploadSentMessages?: boolean;
  enabled2fa: string[];
  autoreply: boolean;
  encryptMessages: boolean;
  encryptForwarded: boolean;
  pubKey: string;
  spamLevel: number;
  keyInfo: WildduckKeyInfo;
  metaData: Record<string, unknown>;
  internalData: Record<string, unknown>;
  targets: string[];
  mtaRelay?: string;
  limits: WildduckLimits;
  fromWhitelist: string[];
  disabledScopes: string[];
  hasPasswordSet: boolean;
  activated: boolean;
  disabled: boolean;
  suspended: boolean;
  tags: string[];
}

export interface WildduckSimpleUserResponse {
  success: boolean;
  id?: string;
  error?: string;
}

export interface WildduckCreateUserRequest {
  username: string;
  password?: string;
  hashedPassword?: boolean;
  allowUnsafe?: boolean;
  address?: string;
  emptyAddress?: boolean;
  language?: string;
  retention?: number;
  name?: string;
  targets?: string[];
  spamLevel?: number;
  quota?: number;
  recipients?: number;
  forwards?: number;
  imapMaxUpload?: number;
  imapMaxDownload?: number;
  pop3MaxDownload?: number;
  pop3MaxMessages?: number;
  imapMaxConnections?: number;
  receivedMax?: number;
  fromWhitelist?: string[];
  tags?: string[];
  addTagsToAddress?: boolean;
  uploadSentMessages?: boolean;
  mailboxes?: Record<string, string>;
  disabledScopes?: string[];
  metaData?: Record<string, unknown> | string;
  internalData?: Record<string, unknown> | string;
  pubKey?: string;
  encryptMessages?: boolean;
  encryptForwarded?: boolean;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface WildduckCreateUserResponse {
  success: boolean;
  id: string;
}

export interface WildduckUpdateUserRequest {
  existingPassword?: string;
  password?: string;
  hashedPassword?: boolean;
  allowUnsafe?: boolean;
  language?: string;
  name?: string;
  targets?: string[];
  spamLevel?: number;
  quota?: number;
  recipients?: number;
  forwards?: number;
  imapMaxUpload?: number;
  imapMaxDownload?: number;
  pop3MaxDownload?: number;
  pop3MaxMessages?: number;
  imapMaxConnections?: number;
  receivedMax?: number;
  fromWhitelist?: string[];
  tags?: string[];
  retention?: number;
  uploadSentMessages?: boolean;
  disabledScopes?: string[];
  disabled?: boolean;
  suspended?: boolean;
  metaData?: Record<string, unknown> | string;
  internalData?: Record<string, unknown> | string;
  pubKey?: string;
  encryptMessages?: boolean;
  encryptForwarded?: boolean;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface WildduckUserListItem {
  id: string;
  username: string;
  name: string;
  address: string;
  tags: string[];
  targets: string[];
  enabled2fa: string[];
  autoreply: boolean;
  encryptMessages: boolean;
  encryptForwarded: boolean;
  quota: {
    allowed: number;
    used: number;
  };
  metaData?: Record<string, unknown>;
  internalData?: Record<string, unknown>;
  hasPasswordSet: boolean;
  activated: boolean;
  disabled: boolean;
  suspended: boolean;
}

export interface WildduckUserListResponse {
  success: boolean;
  query: string;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: WildduckUserListItem[];
}

export interface WildduckResolveUserResponse {
  success: boolean;
  id: string;
}

export interface WildduckLogoutUserRequest {
  reason?: string;
  sess?: string;
  ip?: string;
}

export interface WildduckQuotaResetResponse {
  success: boolean;
  storageUsed: number;
  previousStorageUsed: number;
}

export interface WildduckPasswordResetRequest {
  validAfter?: string;
  sess?: string;
  ip?: string;
}

export interface WildduckPasswordResetResponse {
  success: boolean;
  password: string;
  validAfter: string;
}

// ============================================================================
// Mailbox Types
// ============================================================================

/**
 * Simplified Wildduck Mailbox type (from @johnqh/types pattern)
 */
export interface WildduckMailbox {
  id: string;
  name: string;
  path: string;
  specialUse?: "Inbox" | "Sent" | "Trash" | "Drafts" | "Junk" | "Archive";
  modifyIndex: number;
  subscribed: boolean;
  hidden: boolean;
  total?: number;
  unseen?: number;
  size?: number;
}

export interface WildduckMailboxResponse {
  success: boolean;
  results: WildduckMailbox[];
  error?: string;
}

/** Get mailboxes request */
export interface GetMailboxesRequest {
  sess?: string;
  ip?: string;
  limit?: number;
  page?: number;
  next?: string;
  previous?: string;
  specialUse?: boolean;
  showHidden?: boolean;
  counters?: boolean;
  sizes?: boolean;
}

/** Get messages request */
export interface GetMessagesRequest {
  sess?: string;
  ip?: string;
  limit?: number;
  page?: number;
  next?: string;
  previous?: string;
  order?: "asc" | "desc";
  unseen?: boolean;
  flagged?: boolean;
  thread?: string;
  includeHeaders?: string[];
  uid?: boolean;
}

/** Create new mailbox request */
export interface CreateMailboxRequest {
  path: string;
  hidden?: boolean;
  retention?: number;
  encryptMessages?: boolean;
  sess?: string;
  ip?: string;
}

/** Update existing mailbox request */
export interface UpdateMailboxRequest {
  path?: string;
  retention?: number;
  subscribed?: boolean;
  encryptMessages?: boolean;
  hidden?: boolean;
  sess?: string;
  ip?: string;
}

export interface WildduckMailboxListItem {
  id: string;
  name: string;
  path: string;
  specialUse: string | false;
  modifyIndex: number;
  subscribed: boolean;
  hidden: boolean;
  total?: number;
  unseen?: number;
  size?: number;
}

export interface WildduckMailboxListResponse {
  success: boolean;
  results: WildduckMailboxListItem[];
}

export interface WildduckCreateMailboxRequest {
  path: string;
  hidden?: boolean;
  retention?: number;
  sess?: string;
  ip?: string;
}

export interface WildduckCreateMailboxResponse {
  success: boolean;
  id: string;
}

export interface WildduckDetailedMailboxResponse {
  success: boolean;
  id: string;
  name: string;
  path: string;
  specialUse: string | false;
  modifyIndex: number;
  subscribed: boolean;
  hidden: boolean;
  total: number;
  unseen: number;
}

export interface WildduckUpdateMailboxRequest {
  path?: string;
  retention?: number;
  subscribed?: boolean;
  hidden?: boolean;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

// ============================================================================
// Message Types
// ============================================================================

export interface WildduckMessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  hash?: string;
}

export interface WildduckMessageBase {
  id: string;
  mailbox: string;
  thread: string;
  from?: WildduckMessageAddress;
  to: WildduckMessageAddress[];
  cc?: WildduckMessageAddress[];
  bcc?: WildduckMessageAddress[];
  subject: string;
  date: string;
  intro: string;
  seen: boolean;
  deleted: boolean;
  flagged: boolean;
  draft: boolean;
  answered: boolean;
  size: number;
  ha: boolean; // has attachments
}

export interface WildduckMessage extends WildduckMessageBase {
  attachments: boolean;
}

export interface WildduckMessageDetail extends WildduckMessageBase {
  user: string;
  html?: string;
  text?: string;
  headers?: Record<string, string | string[]>;
  attachments: WildduckMessageAttachment[];
  references?: string[];
  inReplyTo?: string;
}

export interface WildduckMessagesResponse {
  success: boolean;
  total: number;
  page: number;
  previousCursor?: string;
  nextCursor?: string;
  results: WildduckMessage[];
  error?: string;
}

export interface WildduckMessageResponse {
  success: boolean;
  data?: WildduckMessageDetail;
  error?: string;
}

export interface WildduckMessageListItem {
  id: number;
  mailbox: string;
  thread: string;
  threadMessageCount?: number;
  from: WildduckMessageAddress;
  to: WildduckMessageAddress[];
  cc: WildduckMessageAddress[];
  bcc: WildduckMessageAddress[];
  messageId: string;
  subject: string;
  date: string;
  idate?: string;
  intro: string;
  attachments: boolean;
  attachmentsList?: WildduckAttachment[];
  size: number;
  seen: boolean;
  deleted: boolean;
  flagged: boolean;
  draft: boolean;
  answered: boolean;
  forwarded: boolean;
  references: string[];
  bimi?: WildduckBimiInfo;
  contentType: WildduckContentType;
  encrypted?: boolean;
  metaData?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface WildduckMessageListResponse {
  success: boolean;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  specialUse: string;
  results: WildduckMessageListItem[];
}

export interface WildduckDetailedMessageResponse {
  success: boolean;
  id: number;
  mailbox: string;
  user: string;
  envelope: {
    from: string;
    rcpt: Array<{
      value: string;
      formatted: string;
    }>;
  };
  thread: string;
  from: WildduckMessageAddress;
  replyTo?: WildduckMessageAddress;
  to?: WildduckMessageAddress;
  cc?: WildduckMessageAddress;
  bcc?: WildduckMessageAddress;
  subject: string;
  messageId: string;
  date: string;
  idate?: string;
  list?: {
    id: string;
    unsubscribe: string;
  };
  size: number;
  expires?: string;
  seen: boolean;
  deleted: boolean;
  flagged: boolean;
  draft: boolean;
  html?: string[];
  text?: string;
  attachments?: WildduckAttachment[];
  verificationResults?: {
    tls?: { name: unknown; version: unknown };
    spf?: unknown;
    dkim?: unknown;
  };
  bimi?: WildduckBimiInfo;
  contentType: WildduckContentType;
  metaData?: Record<string, unknown>;
  references: string[];
  files?: Record<string, unknown>;
  outbound?: unknown[];
  forwardTargets?: Record<string, unknown>;
  reference?: Record<string, unknown>;
  answered: boolean;
  forwarded: boolean;
  encrypted?: boolean;
}

export interface WildduckSearchMessagesRequest {
  q?: string;
  mailbox?: string;
  id?: string;
  thread?: string;
  or?: {
    query?: string;
    from?: string;
    to?: string;
    subject?: string;
  };
  query?: string;
  datestart?: string;
  dateend?: string;
  from?: string;
  to?: string;
  subject?: string;
  minSize?: number;
  maxSize?: number;
  attachments?: boolean;
  flagged?: boolean;
  unseen?: boolean;
  includeHeaders?: string;
  searchable?: boolean;
  threadCounters?: boolean;
  limit?: number;
  order?: "asc" | "desc";
  next?: string;
  previous?: string;
  sess?: string;
  ip?: string;
}

export interface WildduckSearchApplyRequest
  extends WildduckSearchMessagesRequest {
  action: {
    moveTo?: string;
    seen?: boolean;
    flagged?: boolean;
  };
}

export interface WildduckSearchApplyResponse {
  success: boolean;
  scheduled: string;
  existing: boolean;
}

export interface WildduckUpdateMessageRequest {
  message?: string;
  moveTo?: string;
  seen?: boolean;
  deleted?: boolean;
  flagged?: boolean;
  draft?: boolean;
  expires?: string | false;
  metaData?: Record<string, unknown> | string;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface WildduckUpdateMessageResponse {
  success: boolean;
  id?: Array<[number, number]>;
  mailbox?: string;
  updated?: number;
}

export interface WildduckUploadMessageRequest {
  date?: string;
  unseen?: boolean;
  flagged?: boolean;
  draft?: boolean;
  raw?: string;
  from?: WildduckAddress;
  replyTo?: WildduckAddress;
  to?: WildduckAddress[];
  cc?: WildduckAddress[];
  bcc?: WildduckAddress[];
  headers?: Array<{ key: string; value: string }>;
  subject?: string;
  text?: string;
  html?: string;
  files?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
    cid?: string;
  }>;
  metaData?: Record<string, unknown> | string;
  reference?: {
    mailbox: string;
    id: number;
    action: "reply" | "replyAll" | "forward";
    attachments?: boolean | string[];
  };
  replacePrevious?: {
    mailbox: string;
    id: number;
  };
  bimi?: {
    domain: string;
    selector?: string;
  };
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface WildduckUploadMessageResponse {
  success: boolean;
  message: {
    id: number;
    mailbox: string;
  };
}

export interface WildduckForwardMessageRequest {
  target: number;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface WildduckSubmitMessageRequest {
  from?: WildduckAddress;
  to: WildduckAddress[];
  cc?: WildduckAddress[];
  bcc?: WildduckAddress[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: Array<{ key: string; value: string }>;
  files?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
    cid?: string;
  }>;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface WildduckSubmitMessageResponse {
  success: boolean;
  message: {
    id: string;
    from: string;
    to: string[];
  };
}

// ============================================================================
// Address Types
// ============================================================================

export interface WildduckAddressResponse {
  success: boolean;
  results?: WildduckAddress[];
  error?: string;
}

export interface WildduckAddressListItem {
  id: string;
  name: string;
  address: string;
  tags: string[];
  main: boolean;
  created: string;
}

export interface WildduckAddressListResponse {
  success: boolean;
  results: WildduckAddressListItem[];
}

export interface WildduckCreateAddressRequest {
  address: string;
  name?: string;
  main?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface WildduckCreateAddressResponse {
  success: boolean;
  id: string;
}

export interface WildduckUpdateAddressRequest {
  name?: string;
  main?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface WildduckForwardedAddressListItem {
  id: string;
  address: string;
  name: string;
  targets: string[];
  forwards: number;
  forwardedDisabled: boolean;
  tags: string[];
  created: string;
}

export interface WildduckForwardedAddressListResponse {
  success: boolean;
  results: WildduckForwardedAddressListItem[];
}

export interface WildduckCreateForwardedAddressRequest {
  address: string;
  name?: string;
  targets: string[];
  forwards?: number;
  forwardedDisabled?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface WildduckUpdateForwardedAddressRequest {
  name?: string;
  targets?: string[];
  forwards?: number;
  forwardedDisabled?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface WildduckResolveAddressResponse {
  success: boolean;
  id: string;
}

// ============================================================================
// Filter Types
// ============================================================================

/** Message filter query conditions */
export interface FilterQuery {
  from?: string;
  to?: string;
  subject?: string;
  listId?: string;
  text?: string;
  ha?: boolean;
  size?: number;
}

/** Actions to take on filtered messages */
export interface FilterAction {
  seen?: boolean;
  flag?: boolean;
  delete?: boolean;
  spam?: boolean;
  mailbox?: string;
  targets?: string[];
}

export interface WildduckFilterQuery {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  ha?: boolean;
  size?: number;
}

export interface WildduckFilterAction {
  seen?: boolean;
  flag?: boolean;
  delete?: boolean;
  spam?: boolean;
  mailbox?: string;
  targets?: string[];
  forward?: string;
}

export interface WildduckFilterListItem {
  id: string;
  name: string;
  query: WildduckFilterQuery;
  action: WildduckFilterAction;
  disabled: boolean;
  created: string;
}

export interface WildduckFilterListResponse {
  success: boolean;
  results: WildduckFilterListItem[];
}

export interface WildduckCreateFilterRequest {
  name: string;
  query: WildduckFilterQuery;
  action: WildduckFilterAction;
  disabled?: boolean;
  sess?: string;
  ip?: string;
}

export interface WildduckCreateFilterResponse {
  success: boolean;
  id: string;
}

export interface WildduckUpdateFilterRequest {
  name?: string;
  query?: WildduckFilterQuery;
  action?: WildduckFilterAction;
  disabled?: boolean;
  sess?: string;
  ip?: string;
}

export interface WildduckFilterResponse {
  success: boolean;
  id: string;
  name: string;
  query: WildduckFilterQuery;
  action: WildduckFilterAction;
  disabled: boolean;
  created: string;
}

/** Email filter */
export interface EmailFilter {
  id: string;
  name: string;
  query: FilterQuery;
  action: FilterAction;
  disabled?: boolean;
}

/** Response from filter operations */
export interface FilterResponse {
  success: boolean;
  id?: string;
}

// ============================================================================
// Autoreply Types
// ============================================================================

export interface WildduckAutoreplyRequest {
  status?: boolean;
  name?: string;
  subject?: string;
  text?: string;
  html?: string;
  start?: string;
  end?: string;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface WildduckAutoreplyResponse {
  success: boolean;
  status: boolean;
  name: string;
  subject: string;
  text: string;
  html: string;
  start: string | false;
  end: string | false;
}

// ============================================================================
// Application-Specific Password Types
// ============================================================================

export interface WildduckASPListItem {
  id: string;
  description: string;
  scopes: string[];
  lastUse:
    | {
        time: string;
        event: string;
      }
    | false;
  created: string;
}

export interface WildduckASPListResponse {
  success: boolean;
  results: WildduckASPListItem[];
}

export interface WildduckCreateASPRequest {
  description: string;
  scopes: string[];
  generateMobileconfig?: boolean;
  sess?: string;
  ip?: string;
}

export interface WildduckCreateASPResponse {
  success: boolean;
  id: string;
  password: string;
  mobileconfig?: string;
}

export interface WildduckASPResponse {
  success: boolean;
  id: string;
  description: string;
  scopes: string[];
  lastUse:
    | {
        time: string;
        event: string;
      }
    | false;
  created: string;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface WildduckStorageUploadRequest {
  filename: string;
  contentType: string;
  encoding?: string;
  content: string;
  sess?: string;
  ip?: string;
}

export interface WildduckStorageUploadResponse {
  success: boolean;
  id: string;
}

export interface WildduckStorageListItem {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  created: string;
}

export interface WildduckStorageListResponse {
  success: boolean;
  results: WildduckStorageListItem[];
}

// ============================================================================
// Settings Types
// ============================================================================

export interface WildduckSettingItem {
  key: string;
  value: unknown;
  description: string;
}

export interface WildduckSettingsListResponse {
  success: boolean;
  results: WildduckSettingItem[];
}

export interface WildduckSettingResponse {
  success: boolean;
  key: string;
  value: unknown;
}

export interface WildduckUpdateSettingRequest {
  value: unknown;
}

/**
 * User information response (detailed)
 */
export interface UserInfo {
  success: boolean;
  id: string;
  username: string;
  name?: string;
  address: string;
  retention?: number;
  enabled2fa?: string[];
  autoreply?: boolean;
  encryptMessages?: boolean;
  encryptForwarded?: boolean;
  pubKey?: string;
  metaData?: Record<string, unknown>;
  internalData?: Record<string, unknown>;
  hasPasswordSet?: boolean;
  activated?: boolean;
  disabled?: boolean;
  suspended?: boolean;
  quota: {
    allowed: number;
    used: number;
  };
  targets?: string[];
  spamLevel?: number;
  uploadSentMessages?: boolean;
  mtaRelay?: string;
  limits: {
    quota: {
      allowed: number;
      used: number;
    };
    recipients?: {
      allowed: number;
      used: number;
      ttl: number;
    };
    forwards?: {
      allowed: number;
      used: number;
      ttl: number;
    };
    received?: {
      allowed: number;
      used: number;
      ttl: number;
    };
    imapUpload?: {
      allowed: number;
      used: number;
      ttl: number;
    };
    imapDownload?: {
      allowed: number;
      used: number;
      ttl: number;
    };
    pop3Download?: {
      allowed: number;
      used: number;
      ttl: number;
    };
    imapMaxConnections?: {
      allowed: number;
    };
  };
  tags?: string[];
  disabledScopes?: string[];
  fromWhitelist?: string[];
}

/**
 * Auto-reply (out of office) settings response
 */
export interface AutoReplySettings {
  success: boolean;
  status?: boolean;
  name?: string;
  subject?: string;
  text?: string;
  html?: string;
  start?: string;
  end?: string;
}

/**
 * Forwarding target response types
 * Forwarding target - can be email, SMTP relay, or HTTP webhook
 */
export type ForwardingTarget = string;

/**
 * Spam settings response
 */
export interface SpamSettings {
  success: boolean;
  spamLevel?: number;
  fromWhitelist?: string[];
}

/**
 * SMTP relay configuration
 */
export interface SMTPRelay {
  enabled: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

/**
 * Advanced settings response
 */
export interface AdvancedSettings {
  success: boolean;
  uploadSentMessages?: boolean;
  smtpRelay?: SMTPRelay;
}

// ============================================================================
// Health Types
// ============================================================================

export interface WildduckHealthResponse {
  success: boolean;
  version: string;
  mongodb: {
    status: string;
    responseTime: string;
  };
  redis: {
    status: string;
    responseTime: string;
  };
  imap: {
    status: string;
  };
  smtp: {
    status: string;
  };
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WildduckWebhookListItem {
  id: string;
  type: string;
  user: string;
  url: string;
  created: string;
}

export interface WildduckWebhookListResponse {
  success: boolean;
  results: WildduckWebhookListItem[];
}

export interface WildduckCreateWebhookRequest {
  type: string;
  user: string;
  url: string;
  sess?: string;
  ip?: string;
}

export interface WildduckCreateWebhookResponse {
  success: boolean;
  id: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface WildduckCreateAuditRequest {
  user: string;
  start: string;
  end: string;
  expires?: string;
  sess?: string;
  ip?: string;
}

export interface WildduckCreateAuditResponse {
  success: boolean;
  id: string;
}

export interface WildduckAuditResponse {
  success: boolean;
  id: string;
  user: string;
  start: string;
  end: string;
  expires: string;
  import: {
    status: string;
    failed: number;
    copied: number;
  };
}

// ============================================================================
// DKIM Types
// ============================================================================

export interface WildduckDKIMListItem {
  id: string;
  domain: string;
  selector: string;
  description: string;
  fingerprint: string;
  created: string;
}

export interface WildduckDKIMListResponse {
  success: boolean;
  results: WildduckDKIMListItem[];
}

export interface WildduckCreateDKIMRequest {
  domain: string;
  selector: string;
  description?: string;
  privateKey?: string;
  sess?: string;
  ip?: string;
}

export interface WildduckCreateDKIMResponse {
  success: boolean;
  id: string;
  domain: string;
  selector: string;
  dnsTxt: {
    name: string;
    value: string;
  };
}

// ============================================================================
// Success Response Types
// ============================================================================

export interface WildduckSuccessResponse {
  success: boolean;
}

export interface WildduckDeleteResponse {
  success: boolean;
}

// ============================================================================
// Error Response
// ============================================================================

export interface WildduckErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

// ============================================================================
// Common Query Parameters
// ============================================================================

export interface WildduckPaginationParams {
  limit?: number;
  next?: string;
  previous?: string;
  page?: number;
  sess?: string;
  ip?: string;
}

export interface WildduckSessionParams {
  sess?: string;
  ip?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export const isWildduckAuthResponse = (
  obj: unknown,
): obj is WildduckAuthResponse => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "success" in obj &&
    typeof (obj as WildduckAuthResponse).success === "boolean"
  );
};

export const isWildduckMessage = (obj: unknown): obj is WildduckMessage => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "subject" in obj &&
    typeof (obj as WildduckMessage).id === "string" &&
    typeof (obj as WildduckMessage).subject === "string"
  );
};
