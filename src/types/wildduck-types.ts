/**
 * Comprehensive WildDuck API Type Definitions
 * Generated based on WildDuck API specification
 */

// ============================================================================
// Common Types
// ============================================================================

export type ObjectId = string; // 24-character hex string

export interface Address {
  name?: string;
  address: string;
}

export interface Attachment {
  id: string;
  hash?: string;
  filename: string;
  contentType: string;
  disposition: string;
  transferEncoding: string;
  related: boolean;
  sizeKb: number;
}

export interface ContentType {
  value: string;
  params: Record<string, unknown>;
}

export interface BimiInfo {
  certified: boolean;
  url: string;
  image: string;
  type?: "VMC" | "CMC";
}

export interface Limits {
  quota?: { allowed: number; used: number };
  recipients?: { allowed: number; used: number; ttl: number };
  forwards?: { allowed: number; used: number; ttl: number };
  received?: { allowed: number; used: number; ttl: number };
  imapUpload?: { allowed: number; used: number; ttl: number };
  imapDownload?: { allowed: number; used: number; ttl: number };
  pop3Download?: { allowed: number; used: number; ttl: number };
  imapMaxConnections?: { allowed: number; used: number };
}

export interface KeyInfo {
  name: string;
  address: string;
  fingerprint: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface PreAuthRequest {
  username: string;
  scope?: string;
  sess?: string;
  ip?: string;
}

export interface PreAuthResponse {
  success: boolean;
  id: string;
  username: string;
  address: string;
  scope: string;
  require2fa: string[];
}

export interface AuthenticateRequest {
  username: string;
  password?: string;
  emailDomain?: string;
  signature?: string;
  nonce?: string;
  message?: string;
  signer?: string;
  protocol?: string;
  scope?: string;
  appId?: string;
  token?: boolean;
  sess?: string;
  ip?: string;
}

export interface AuthenticateResponse {
  success: boolean;
  id: string;
  username: string;
  address: string;
  scope: string;
  require2fa: string[];
  requirePasswordChange: boolean;
  token?: string;
}

// ============================================================================
// User Types
// ============================================================================

export interface CreateUserRequest {
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

export interface CreateUserResponse {
  success: boolean;
  id: string;
}

export interface UpdateUserRequest {
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

export interface UserResponse {
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
  keyInfo: KeyInfo;
  metaData: Record<string, unknown>;
  internalData: Record<string, unknown>;
  targets: string[];
  mtaRelay?: string;
  limits: Limits;
  fromWhitelist: string[];
  disabledScopes: string[];
  hasPasswordSet: boolean;
  activated: boolean;
  disabled: boolean;
  suspended: boolean;
  tags: string[];
}

export interface UserListItem {
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

export interface UserListResponse {
  success: boolean;
  query: string;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: UserListItem[];
}

export interface ResolveUserResponse {
  success: boolean;
  id: string;
}

export interface LogoutUserRequest {
  reason?: string;
  sess?: string;
  ip?: string;
}

export interface QuotaResetResponse {
  success: boolean;
  storageUsed: number;
  previousStorageUsed: number;
}

export interface PasswordResetRequest {
  validAfter?: string;
  sess?: string;
  ip?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  password: string;
  validAfter: string;
}

// ============================================================================
// Mailbox Types
// ============================================================================

export interface MailboxListItem {
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

export interface MailboxListResponse {
  success: boolean;
  results: MailboxListItem[];
}

export interface CreateMailboxRequest {
  path: string;
  hidden?: boolean;
  retention?: number;
  sess?: string;
  ip?: string;
}

export interface CreateMailboxResponse {
  success: boolean;
  id: string;
}

export interface MailboxResponse {
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

export interface UpdateMailboxRequest {
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

export interface MessageListItem {
  id: number;
  mailbox: string;
  thread: string;
  threadMessageCount?: number;
  from: Address;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  messageId: string;
  subject: string;
  date: string;
  idate?: string;
  intro: string;
  attachments: boolean;
  attachmentsList?: Attachment[];
  size: number;
  seen: boolean;
  deleted: boolean;
  flagged: boolean;
  draft: boolean;
  answered: boolean;
  forwarded: boolean;
  references: string[];
  bimi?: BimiInfo;
  contentType: ContentType;
  encrypted?: boolean;
  metaData?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface MessageListResponse {
  success: boolean;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  specialUse: string;
  results: MessageListItem[];
}

export interface MessageResponse {
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
  from: Address;
  replyTo?: Address;
  to?: Address;
  cc?: Address;
  bcc?: Address;
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
  attachments?: Attachment[];
  verificationResults?: {
    tls?: { name: unknown; version: unknown };
    spf?: unknown;
    dkim?: unknown;
  };
  bimi?: BimiInfo;
  contentType: ContentType;
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

export interface SearchMessagesRequest {
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

export interface SearchApplyRequest extends SearchMessagesRequest {
  action: {
    moveTo?: string;
    seen?: boolean;
    flagged?: boolean;
  };
}

export interface SearchApplyResponse {
  success: boolean;
  scheduled: string;
  existing: boolean;
}

export interface UpdateMessageRequest {
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

export interface UpdateMessageResponse {
  success: boolean;
  id?: Array<[number, number]>;
  mailbox?: string;
  updated?: number;
}

export interface UploadMessageRequest {
  date?: string;
  unseen?: boolean;
  flagged?: boolean;
  draft?: boolean;
  raw?: string;
  from?: Address;
  replyTo?: Address;
  to?: Address[];
  cc?: Address[];
  bcc?: Address[];
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

export interface UploadMessageResponse {
  success: boolean;
  message: {
    id: number;
    mailbox: string;
  };
}

export interface ForwardMessageRequest {
  target: number;
  sess?: string;
  ip?: string;
  [key: string]: unknown;
}

export interface SubmitMessageRequest {
  from?: Address;
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
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

export interface SubmitMessageResponse {
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

export interface AddressListItem {
  id: string;
  name: string;
  address: string;
  tags: string[];
  main: boolean;
  created: string;
}

export interface AddressListResponse {
  success: boolean;
  results: AddressListItem[];
}

export interface CreateAddressRequest {
  address: string;
  name?: string;
  main?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface CreateAddressResponse {
  success: boolean;
  id: string;
}

export interface UpdateAddressRequest {
  name?: string;
  main?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface ForwardedAddressListItem {
  id: string;
  address: string;
  name: string;
  targets: string[];
  forwards: number;
  forwardedDisabled: boolean;
  tags: string[];
  created: string;
}

export interface ForwardedAddressListResponse {
  success: boolean;
  results: ForwardedAddressListItem[];
}

export interface CreateForwardedAddressRequest {
  address: string;
  name?: string;
  targets: string[];
  forwards?: number;
  forwardedDisabled?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface UpdateForwardedAddressRequest {
  name?: string;
  targets?: string[];
  forwards?: number;
  forwardedDisabled?: boolean;
  tags?: string[];
  sess?: string;
  ip?: string;
}

export interface ResolveAddressResponse {
  success: boolean;
  id: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface FilterQuery {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  ha?: boolean;
  size?: number;
}

export interface FilterAction {
  seen?: boolean;
  flag?: boolean;
  delete?: boolean;
  spam?: boolean;
  mailbox?: string;
  targets?: string[];
  forward?: string;
}

export interface FilterListItem {
  id: string;
  name: string;
  query: FilterQuery;
  action: FilterAction;
  disabled: boolean;
  created: string;
}

export interface FilterListResponse {
  success: boolean;
  results: FilterListItem[];
}

export interface CreateFilterRequest {
  name: string;
  query: FilterQuery;
  action: FilterAction;
  disabled?: boolean;
  sess?: string;
  ip?: string;
}

export interface CreateFilterResponse {
  success: boolean;
  id: string;
}

export interface UpdateFilterRequest {
  name?: string;
  query?: FilterQuery;
  action?: FilterAction;
  disabled?: boolean;
  sess?: string;
  ip?: string;
}

export interface FilterResponse {
  success: boolean;
  id: string;
  name: string;
  query: FilterQuery;
  action: FilterAction;
  disabled: boolean;
  created: string;
}

// ============================================================================
// Autoreply Types
// ============================================================================

export interface AutoreplyRequest {
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

export interface AutoreplyResponse {
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

export interface ASPListItem {
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

export interface ASPListResponse {
  success: boolean;
  results: ASPListItem[];
}

export interface CreateASPRequest {
  description: string;
  scopes: string[];
  generateMobileconfig?: boolean;
  sess?: string;
  ip?: string;
}

export interface CreateASPResponse {
  success: boolean;
  id: string;
  password: string;
  mobileconfig?: string;
}

export interface ASPResponse {
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

export interface StorageUploadRequest {
  filename: string;
  contentType: string;
  encoding?: string;
  content: string;
  sess?: string;
  ip?: string;
}

export interface StorageUploadResponse {
  success: boolean;
  id: string;
}

export interface StorageListItem {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  created: string;
}

export interface StorageListResponse {
  success: boolean;
  results: StorageListItem[];
}

// ============================================================================
// Settings Types
// ============================================================================

export interface SettingItem {
  key: string;
  value: unknown;
  description: string;
}

export interface SettingsListResponse {
  success: boolean;
  results: SettingItem[];
}

export interface SettingResponse {
  success: boolean;
  key: string;
  value: unknown;
}

export interface UpdateSettingRequest {
  value: unknown;
}

// ============================================================================
// Health Types
// ============================================================================

export interface HealthResponse {
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

export interface WebhookListItem {
  id: string;
  type: string;
  user: string;
  url: string;
  created: string;
}

export interface WebhookListResponse {
  success: boolean;
  results: WebhookListItem[];
}

export interface CreateWebhookRequest {
  type: string;
  user: string;
  url: string;
  sess?: string;
  ip?: string;
}

export interface CreateWebhookResponse {
  success: boolean;
  id: string;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface CreateAuditRequest {
  user: string;
  start: string;
  end: string;
  expires?: string;
  sess?: string;
  ip?: string;
}

export interface CreateAuditResponse {
  success: boolean;
  id: string;
}

export interface AuditResponse {
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

export interface DKIMListItem {
  id: string;
  domain: string;
  selector: string;
  description: string;
  fingerprint: string;
  created: string;
}

export interface DKIMListResponse {
  success: boolean;
  results: DKIMListItem[];
}

export interface CreateDKIMRequest {
  domain: string;
  selector: string;
  description?: string;
  privateKey?: string;
  sess?: string;
  ip?: string;
}

export interface CreateDKIMResponse {
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

export interface SuccessResponse {
  success: boolean;
}

export interface DeleteResponse {
  success: boolean;
}

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

// ============================================================================
// Common Query Parameters
// ============================================================================

export interface PaginationParams {
  limit?: number;
  next?: string;
  previous?: string;
  page?: number;
  sess?: string;
  ip?: string;
}

export interface SessionParams {
  sess?: string;
  ip?: string;
}
