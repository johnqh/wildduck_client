# WildDuck API Endpoints Reference

Comprehensive mapping of all WildDuck API endpoints with request/response schemas.

## Table of Contents
- [Authentication](#authentication)
- [Users](#users)
- [Mailboxes](#mailboxes)
- [Messages](#messages)
- [Addresses](#addresses)
- [Filters](#filters)
- [Autoreply](#autoreply)
- [Application-Specific Passwords (ASPs)](#application-specific-passwords-asps)
- [Storage](#storage)
- [Submit](#submit)
- [Settings](#settings)
- [Health](#health)
- [DKIM](#dkim)
- [Domain Aliases](#domain-aliases)
- [TLS Certificates](#tls-certificates)
- [Webhooks](#webhooks)
- [Audit](#audit)

---

## Authentication

### POST /authenticate
**Summary:** Authenticate a user
**Name:** authenticate
**Description:** This method allows to authenticate a user and get an access token

**Request Body:**
- `username` (string, required): Username or E-mail address
- `password` (string, required): Password
- `protocol` (string): Application identifier for security logs
- `scope` (string): Required scope. One of master, imap, smtp, pop3
- `token` (boolean): If true, return a temporary access token
- `sess` (string): Session identifier for logs
- `ip` (string): IP address for logs

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // User ID
  username: string;
  scope: string; // Required scope
  require2fa: Array<string>; // List of enabled 2FA mechanisms
  requirePasswordChange: boolean; // If true, user password must be changed
  token?: string; // Access token (if requested)
}
```

---

## Users

### GET /users
**Summary:** List registered Users
**Name:** getUsers
**Description:** List all registered users

**Query Parameters:**
- `query` (string): Partial match of username or default email address
- `forward` (string): Partial match of a forward email address or URL
- `tags` (string): Comma separated list of tags
- `requiredTags` (string): Comma separated list of tags. User must have all specified tags
- `metaData` (boolean): If true, then includes metaData in the response
- `internalData` (boolean): If true, then includes internalData in the response
- `limit` (number, default: 20, min: 1, max: 250): How many records to return
- `next` (string): Cursor value for next page
- `previous` (string): Cursor value for previous page
- `page` (number): Current page number. Informational only
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  query: string;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: Array<{
    id: string;
    username: string;
    name: string;
    address: string;
    tags: Array<string>;
    targets: Array<string>;
    enabled2fa: Array<string>;
    autoreply: boolean;
    encryptMessages: boolean;
    encryptForwarded: boolean;
    quota: {
      allowed: number;
      used: number;
    };
    metaData?: object;
    internalData?: object;
    hasPasswordSet: boolean;
    activated: boolean;
    disabled: boolean;
    suspended: boolean;
  }>;
}
```

---

### POST /users
**Summary:** Create new user
**Name:** createUser
**Description:** Add a new user

**Request Body:**
- `username` (string, required, min: 3, max: 30): Username of the user
- `password` (string, min: 8): Password for the account
- `hashedPassword` (boolean): If true then password is hashed
- `allowUnsafe` (boolean, default: true): If false, validates password strength
- `address` (string): Default email address for the user
- `emptyAddress` (boolean): Empty address for the user
- `language` (string, max: 20): Language code for the user
- `retention` (number, min: 0): Default retention time (in ms). Set to 0 to disable
- `name` (string, max: 256): Name of the user
- `targets` (array of strings): Forwarding targets
- `spamLevel` (number, min: 0, max: 100): Spam filtering threshold
- `quota` (number, min: 0): Allowed quota in bytes
- `recipients` (number, min: 0): Max daily recipient count
- `forwards` (number, min: 0): Max daily forwarded messages
- `imapMaxUpload` (number, min: 0): Max upload size via IMAP
- `imapMaxDownload` (number, min: 0): Max download size via IMAP
- `pop3MaxDownload` (number, min: 0): Max download size via POP3
- `pop3MaxMessages` (number, min: 0): Max messages to list in POP3 session
- `imapMaxConnections` (number, min: 0): Max parallel IMAP connections
- `receivedMax` (number, min: 0): Max messages to receive from MX
- `fromWhitelist` (array of strings): From addresses that are not spam checked
- `tags` (array of strings): List of tags associated with the user
- `addTagsToAddress` (boolean): If true, autogenerate tags for each address
- `uploadSentMessages` (boolean): Upload sent messages via IMAP
- `mailboxes` (object): Optional names for special mailboxes
- `disabledScopes` (array of strings): List of scopes that are disabled
- `metaData` (object | string): Custom metadata object
- `internalData` (object | string): Internal metadata object
- `pubKey` (string): PGP public key for encryption
- `encryptMessages` (boolean): Encrypt all messages
- `encryptForwarded` (boolean): Encrypt forwarded messages
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // User ID
}
```

---

### GET /users/resolve/:username
**Summary:** Resolve ID for a username
**Name:** resolveUser

**Path Parameters:**
- `username` (string, required): Username of the user

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // User ID (24 byte hex)
}
```

---

### GET /users/:user
**Summary:** Request User information
**Name:** getUser

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  username: string;
  name: string;
  address: string;
  retention: number;
  enabled2fa: Array<string>;
  autoreply: boolean;
  encryptMessages: boolean;
  encryptForwarded: boolean;
  pubKey: string;
  spamLevel: number;
  keyInfo: {
    name: string;
    address: string;
    fingerprint: string;
  };
  metaData: object;
  internalData: object;
  targets: Array<string>;
  limits: {
    quota: { allowed: number; used: number; };
    recipients: { allowed: number; used: number; ttl: number; };
    forwards: { allowed: number; used: number; ttl: number; };
    received: { allowed: number; used: number; ttl: number; };
    imapUpload: { allowed: number; used: number; ttl: number; };
    imapDownload: { allowed: number; used: number; ttl: number; };
    pop3Download: { allowed: number; used: number; ttl: number; };
    imapMaxConnections: { allowed: number; used: number; };
  };
  fromWhitelist: Array<string>;
  disabledScopes: Array<string>;
  hasPasswordSet: boolean;
  activated: boolean;
  disabled: boolean;
  suspended: boolean;
  tags: Array<string>;
}
```

---

### PUT /users/:user
**Summary:** Update User information
**Name:** updateUser

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `existingPassword` (string, min: 8): If provided, validates existing password
- `password` (string, min: 8): New password for the account
- `hashedPassword` (boolean): If true then password is hashed
- `allowUnsafe` (boolean, default: true): If false, validates password strength
- `language` (string, max: 20): Language code
- `name` (string, max: 256): Name of the user
- `targets` (array of strings): Forwarding targets
- `spamLevel` (number, min: 0, max: 100): Spam filtering threshold
- `quota` (number, min: 0): Allowed quota in bytes
- `recipients` (number, min: 0): Max daily recipient count
- `forwards` (number, min: 0): Max daily forwarded messages
- `imapMaxUpload` (number, min: 0): Max upload size via IMAP
- `imapMaxDownload` (number, min: 0): Max download size via IMAP
- `pop3MaxDownload` (number, min: 0): Max download size via POP3
- `pop3MaxMessages` (number, min: 0): Max messages in POP3
- `imapMaxConnections` (number, min: 0): Max parallel IMAP connections
- `receivedMax` (number, min: 0): Max messages from MX
- `fromWhitelist` (array of strings): From addresses not spam checked
- `tags` (array of strings): Tags associated with user
- `retention` (number, min: 0): Default retention time (ms)
- `uploadSentMessages` (boolean): Upload sent messages via IMAP
- `disabledScopes` (array of strings): Disabled scopes
- `disabled` (boolean): If true, user cannot authenticate
- `suspended` (boolean): If true, user cannot use SMTP/IMAP/POP3
- `metaData` (object | string): Custom metadata
- `internalData` (object | string): Internal metadata
- `pubKey` (string): PGP public key
- `encryptMessages` (boolean): Encrypt all messages
- `encryptForwarded` (boolean): Encrypt forwarded messages
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### DELETE /users/:user
**Summary:** Delete a User
**Name:** deleteUser

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### PUT /users/:user/logout
**Summary:** Log out User
**Name:** logoutUser
**Description:** Logs out all user sessions

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `reason` (string, max: 256): Message to show user
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### POST /users/:user/quota/reset
**Summary:** Recalculate User quota
**Name:** recalculateQuota

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  storageUsed: number; // Calculated quota
  previousStorageUsed: number; // Previous quota value
}
```

---

### PUT /users/:user/password/reset
**Summary:** Reset password for a User
**Name:** resetUserPassword
**Description:** Generates a new temporary password that expires in 24h

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `validAfter` (date): Allow using password only after this date
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  password: string; // Temporary password
  validAfter: string; // ISO date string
}
```

---

## Mailboxes

### GET /users/:user/mailboxes
**Summary:** List Mailboxes for a User
**Name:** getMailboxes

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `specialUse` (boolean): Show only folders with specialUse flag set
- `showHidden` (boolean): Show hidden folders
- `counters` (boolean, default: false): Include message and storage counters
- `sizes` (boolean, default: false): Include mailbox size info
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  results: Array<{
    id: string;
    name: string;
    path: string;
    specialUse: string | false;
    modifyIndex: number;
    subscribed: boolean;
    hidden: boolean;
    total?: number; // If counters=true
    unseen?: number; // If counters=true
    size?: number; // If sizes=true
  }>;
}
```

---

### POST /users/:user/mailboxes
**Summary:** Create new Mailbox
**Name:** createMailbox

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `path` (string, required): Full path of the mailbox
- `hidden` (boolean, default: false): Is the folder hidden or not
- `retention` (number, min: 0): Retention time (ms)
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Mailbox ID
}
```

---

### GET /users/:user/mailboxes/:mailbox
**Summary:** Request Mailbox information
**Name:** getMailbox

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
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
```

---

### PUT /users/:user/mailboxes/:mailbox
**Summary:** Update Mailbox information
**Name:** updateMailbox

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox

**Request Body:**
- `path` (string): New path for the mailbox
- `retention` (number, min: 0): Retention time (ms)
- `subscribed` (boolean): Subscription status
- `hidden` (boolean): Is the folder hidden
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### DELETE /users/:user/mailboxes/:mailbox
**Summary:** Delete a Mailbox
**Name:** deleteMailbox

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Messages

### GET /users/:user/mailboxes/:mailbox/messages
**Summary:** List messages in a Mailbox
**Name:** getMessages

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox

**Query Parameters:**
- `unseen` (boolean): If true, returns only unseen messages
- `metaData` (boolean, default: false): If true, includes metaData
- `threadCounters` (boolean, default: false): If true, includes threadMessageCount
- `limit` (number, default: 20, min: 1, max: 250): How many records to return
- `order` (string: 'asc' | 'desc', default: 'desc'): Ordering by insert date
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `sess` (string): Session identifier
- `ip` (string): IP address
- `includeHeaders` (string): Comma separated list of header keys

**Response 200:**
```typescript
{
  success: boolean;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  specialUse: string;
  results: Array<{
    id: number;
    mailbox: string;
    thread: string;
    threadMessageCount?: number;
    from: {
      name: string;
      address: string;
    };
    to: Array<{ name: string; address: string; }>;
    cc: Array<{ name: string; address: string; }>;
    bcc: Array<{ name: string; address: string; }>;
    messageId: string;
    subject: string;
    date: string; // ISO date
    idate?: string; // ISO date
    intro: string;
    attachments: boolean;
    attachmentsList?: Array<{
      id: string;
      hash?: string;
      filename: string;
      contentType: string;
      disposition: string;
      transferEncoding: string;
      related: boolean;
      sizeKb: number;
    }>;
    size: number;
    seen: boolean;
    deleted: boolean;
    flagged: boolean;
    draft: boolean;
    answered: boolean;
    forwarded: boolean;
    references: Array<string>;
    bimi?: {
      certified: boolean;
      url: string;
      image: string;
      type?: 'VMC' | 'CMC';
    };
    contentType: {
      value: string;
      params: object;
    };
    encrypted?: boolean;
    metaData?: object;
    headers?: object;
  }>;
}
```

---

### GET /users/:user/search
**Summary:** Search for messages
**Name:** searchMessages

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `q` (string, max: 1024): Additional query string
- `mailbox` (string, hex, 24 chars): ID of the Mailbox
- `id` (string): Message ID values (comma separated or range)
- `thread` (string, hex, 24 chars): Thread ID
- `or` (object): At least one of the included terms must match
  - `query` (string, max: 255): Search string
  - `from` (string): Partial match for From header
  - `to` (string): Partial match for To/Cc headers
  - `subject` (string): Partial match for Subject header
- `query` (string, max: 255): Search string using MongoDB fulltext
- `datestart` (date): Earliest message storing time
- `dateend` (date): Latest message storing time
- `from` (string): Partial match for From header
- `to` (string): Partial match for To/Cc headers
- `subject` (string): Partial match for Subject header
- `minSize` (number): Minimal message size in bytes
- `maxSize` (number): Maximal message size in bytes
- `attachments` (boolean): Match only messages with attachments
- `flagged` (boolean): Match only messages with \Flagged flag
- `unseen` (boolean): Match only messages without \Seen flag
- `includeHeaders` (string, max: 1024): Comma separated header keys
- `searchable` (boolean): Match messages not in Junk or Trash
- `threadCounters` (boolean, default: false): Include threadMessageCount
- `limit` (number, default: 20, min: 1, max: 250): Records to return
- `order` (string: 'asc' | 'desc'): Ordering by insert date
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  query: string;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: Array<{
    id: number;
    mailbox: string;
    messageId: string;
    thread: string;
    threadMessageCount?: number;
    from: { name: string; address: string; };
    to: Array<{ name: string; address: string; }>;
    cc: Array<{ name: string; address: string; }>;
    bcc: Array<{ name: string; address: string; }>;
    subject: string;
    date: string; // ISO date
    idate?: string; // ISO date
    size: number;
    intro: string;
    attachments: boolean;
    seen: boolean;
    deleted: boolean;
    flagged: boolean;
    answered: boolean;
    forwarded: boolean;
    draft: boolean;
    contentType: {
      value: string;
      params: object;
    };
    metadata?: object;
    headers?: object;
    encrypted?: boolean;
    references: Array<string>;
    bimi?: {
      certified: boolean;
      url: string;
      image: string;
      type?: 'VMC' | 'CMC';
    };
  }>;
}
```

---

### POST /users/:user/search
**Summary:** Search and update messages
**Name:** searchApplyMessages
**Description:** Apply an action to all matching messages (async)

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- (Same search parameters as GET /users/:user/search)
- `action` (object, required): Actions to take
  - `moveTo` (string, hex, 24 chars): Target Mailbox ID
  - `seen` (boolean): State of \Seen flag
  - `flagged` (boolean): State of \Flagged flag
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  scheduled: string; // ID of the scheduled operation
  existing: boolean; // Indicates if operation already exists
}
```

---

### GET /users/:user/mailboxes/:mailbox/messages/:message
**Summary:** Request Message information
**Name:** getMessage

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox
- `message` (number, required): ID of the Message

**Query Parameters:**
- `replaceCidLinks` (boolean, default: false): Replace cid links
- `markAsSeen` (boolean, default: false): Mark message as seen
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
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
  from: { name: string; address: string; };
  replyTo?: { name: string; address: string; };
  to?: { name: string; address: string; };
  cc?: { name: string; address: string; };
  bcc?: { name: string; address: string; };
  subject: string;
  messageId: string;
  date: string; // ISO date
  idate?: string; // ISO date
  list?: {
    id: string;
    unsubscribe: string;
  };
  size: number;
  expires?: string; // ISO date
  seen: boolean;
  deleted: boolean;
  flagged: boolean;
  draft: boolean;
  html?: Array<string>;
  text?: string;
  attachments?: Array<{
    id: string;
    hash?: string;
    filename: string;
    contentType: string;
    disposition: string;
    transferEncoding: string;
    related: boolean;
    sizeKb: number;
  }>;
  verificationResults?: {
    tls?: { name: object; version: object; };
    spf?: object;
    dkim?: object;
  };
  bimi?: {
    certified: boolean;
    url: string;
    image: string;
    type?: 'VMC' | 'CMC';
  };
  contentType: {
    value: string;
    params: object;
  };
  metaData?: object;
  references: Array<string>;
  files?: object;
  outbound?: Array<object>;
  forwardTargets?: object;
  reference?: object;
  answered: boolean;
  forwarded: boolean;
  encrypted?: boolean;
}
```

---

### GET /users/:user/mailboxes/:mailbox/messages/:message/message.eml
**Summary:** Get Message source
**Name:** getMessageSource
**Description:** Returns full RFC822 formatted source

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox
- `message` (number, required): ID of the Message

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
Content-Type: message/rfc822 (binary)

---

### GET /users/:user/mailboxes/:mailbox/messages/:message/attachments/:attachment
**Summary:** Download Attachment
**Name:** getMessageAttachment
**Description:** Returns attachment file contents in binary

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox
- `message` (number, required): ID of the Message
- `attachment` (string, regex: /^ATT\d+$/i, required): ID of the Attachment

**Query Parameters:**
- `sendAsString` (boolean, default: false): Send with correct encoding

**Response 200:**
Content-Type: application/octet-stream (binary)

---

### PUT /users/:user/mailboxes/:mailbox/messages/:message
**Summary:** Update message information with path param
**Name:** updateMessagePathParams
**Description:** Updates message flags or moves to different mailbox

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox
- `message` (string, regex: /^\d+(,\d+)*$|^\d+:(\d+|\*)$/i, required): Message ID(s)

**Request Body:**
- `moveTo` (string, hex, 24 chars): Target Mailbox ID
- `seen` (boolean): State of \Seen flag
- `deleted` (boolean): State of \Deleted flag
- `flagged` (boolean): State of \Flagged flag
- `draft` (boolean): State of \Draft flag
- `expires` (date | false): Expiration date or false
- `metaData` (object | string): Optional metadata
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id?: Array<[number, number]>; // [oldId, newId] if moved
  mailbox?: string; // MoveTo mailbox
  updated?: number; // Number of updated messages if not moved
}
```

---

### PUT /users/:user/mailboxes/:mailbox/messages
**Summary:** Update Message information
**Name:** updateMessage
**Description:** Updates message flags or moves to different mailbox

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox

**Request Body:**
- `message` (string, regex: /^\d+(,\d+)*$|^\d+:(\d+|\*)$/i, required): Message ID(s)
- (Same other fields as PUT with path param above)

**Response 200:**
```typescript
{
  success: boolean;
  id?: Array<[number, number]>;
  mailbox?: string;
  updated?: number;
}
```

---

### DELETE /users/:user/mailboxes/:mailbox/messages/:message
**Summary:** Delete a Message
**Name:** deleteMessage

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox
- `message` (number, required): ID of the Message

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### DELETE /users/:user/mailboxes/:mailbox/messages
**Summary:** Delete all Messages from a Mailbox
**Name:** deleteMessagesInMailbox

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox

**Query Parameters:**
- `async` (boolean, default: false): Schedule deletion task
- `skipArchive` (boolean, default: false): Skip archived messages
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  deleted: number; // Count of deleted messages
  errors: number; // Count of errors during delete
}
```

---

### POST /users/:user/mailboxes/:mailbox/messages
**Summary:** Upload Message
**Name:** uploadMessage
**Description:** Upload RFC822 message or structured message data

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox

**Request Body:**
- `date` (date): Date
- `unseen` (boolean, default: false): Is message unseen
- `flagged` (boolean, default: false): Is message flagged
- `draft` (boolean, default: false): Is message a draft
- `raw` (binary, max: MAX_ALLOWED_MESSAGE_SIZE): base64 encoded message source
- `from` (object): Address for From header
  - `name` (string, max: 255): Name
  - `address` (string, email): Address
- `replyTo` (object): Address for Reply-To header
- `to` (array of objects): Addresses for To header
- `cc` (array of objects): Addresses for Cc header
- `bcc` (array of objects): Addresses for Bcc header
- `headers` (array of objects): Custom headers
  - `key` (string): Header key
  - `value` (string): Header value
- `subject` (string, max: 2KB): Message subject
- `text` (string, max: 1MB): Plaintext message
- `html` (string, max: 1MB): HTML formatted message
- `files` (array of strings, hex, 24 chars): Storage file IDs
- `attachments` (array of objects): Attachments
  - `filename` (string): Filename
  - `content` (string): Base64 encoded content
  - `contentType` (string): MIME type
  - `cid` (string): Content-ID
- `metaData` (object | string): Optional metadata
- `reference` (object): Referenced email
  - `mailbox` (string, hex, 24 chars, required): Mailbox ID
  - `id` (number, required): Message ID
  - `action` (string: 'reply' | 'replyAll' | 'forward', required): Action
  - `attachments` (boolean | array of strings): Include attachments
- `replacePrevious` (object): Delete previous message
  - `mailbox` (string, hex, 24 chars): Mailbox ID
  - `id` (number, required): Message ID
- `bimi` (object): BIMI verification
  - `domain` (string, required): Domain name
  - `selector` (string): BIMI selector
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  message: {
    id: number;
    malbox: string; // Mailbox ID
    size: number;
  };
  previousDeleted?: boolean;
  previousDeleteError?: string;
}
```

---

### POST /users/:user/mailboxes/:mailbox/messages/:message/forward
**Summary:** Forward stored Message
**Name:** forwardStoredMessage
**Description:** Re-forward or forward to other addresses

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox
- `message` (number, required): ID of the Message

**Request Body:**
- `target` (number, min: 1, max: 1000): Number of original forwarding target
- `addresses` (array of strings, email): Additional forward targets
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  queueId: string; // Message ID in outbound queue
  forwarded: Array<{
    seq: string;
    type: string;
    value: string;
  }>;
}
```

---

### POST /users/:user/mailboxes/:mailbox/messages/:message/submit
**Summary:** Submit Draft for delivery
**Name:** submitStoredMessage
**Description:** Submit draft message, moves to Sent mail folder

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `mailbox` (string, hex, 24 chars, required): ID of the Mailbox
- `message` (number, required): ID of the Message

**Request Body:**
- `deleteFiles` (boolean): Delete attachment files listed in metaData.files
- `sendTime` (date): Delivery datestring for scheduled sending
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  queueId: string; // Message ID in outbound queue
  message: {
    id: number;
    mailbox: string;
    size: number;
  };
}
```

---

### DELETE /users/:user/outbound/:queueId
**Summary:** Delete an Outbound Message
**Name:** deleteOutboundMessage
**Description:** Delete outbound emails still in queue

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `queueId` (string, hex, 18-24 chars, required): Outbound queue ID

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### GET /users/:user/archived/messages
**Summary:** List archived messages
**Name:** getArchivedMessages
**Description:** Archive contains all recently deleted messages

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `limit` (number, default: 20, min: 1, max: 250): Records to return
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `order` (string: 'asc' | 'desc', default: 'desc'): Ordering by insert date
- `includeHeaders` (string, max: 1024): Comma separated header keys
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: Array<{
    id: number;
    mailbox: string;
    thread: string;
    threadMessageCount?: number;
    from: { name: string; address: string; };
    to: Array<{ name: string; address: string; }>;
    cc: Array<{ name: string; address: string; }>;
    bcc: Array<{ name: string; address: string; }>;
    messageId: string;
    subject: string;
    date: string;
    idate?: string;
    intro: string;
    attachments: boolean;
    size: number;
    seen: boolean;
    deleted: boolean;
    flagged: boolean;
    draft: boolean;
    answered: boolean;
    forwarded: boolean;
    references: Array<string>;
    bimi?: {
      certified: boolean;
      url: string;
      image: string;
      type?: 'VMC' | 'CMC';
    };
    contentType: {
      value: string;
      params: object;
    };
    encrypted?: boolean;
    metaData?: object;
    headers?: object;
  }>;
}
```

---

### POST /users/:user/archived/restore
**Summary:** Restore archived messages
**Name:** restoreMessages
**Description:** Restore messages of a date range back to mailboxes

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `start` (date, required): Start time datestring
- `end` (date, required): End time datestring
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  task: string; // Task ID
}
```

---

## Addresses

### GET /users/:user/addresses
**Summary:** List registered Addresses
**Name:** getUserAddresses

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  results: Array<{
    id: string;
    name: string;
    address: string;
    main: boolean;
    created: string; // ISO date
    tags: Array<string>;
    forwardedDisabled: boolean;
  }>;
}
```

---

### POST /users/:user/addresses
**Summary:** Create new Address
**Name:** createUserAddress

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `address` (string, email, required): E-mail Address
- `name` (string, max: 256): Identity name
- `tags` (array of strings, max: 128): Address tags
- `main` (boolean, default: false): Indicates main address
- `allowWildcard` (boolean, default: true): If true, uses wildcard
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Address ID
}
```

---

### GET /users/:user/addresses/:address
**Summary:** Request Address information
**Name:** getUserAddress

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `address` (string, hex, 24 chars, required): ID of the Address

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  address: string;
  name: string;
  main: boolean;
  created: string; // ISO date
  tags: Array<string>;
  forwardedDisabled: boolean;
}
```

---

### PUT /users/:user/addresses/:address
**Summary:** Update Address information
**Name:** updateUserAddress

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `address` (string, hex, 24 chars, required): ID of the Address

**Request Body:**
- `name` (string, max: 256): Identity name
- `address` (string, email): New address
- `main` (boolean): Indicates if this is the main address
- `metaData` (object | string): Optional metadata
- `tags` (array of strings, max: 128): Address tags
- `forwardedDisabled` (boolean): Disable forwarded flag
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### DELETE /users/:user/addresses/:address
**Summary:** Delete an Address
**Name:** deleteUserAddress

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `address` (string, hex, 24 chars, required): ID of the Address

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### GET /addresses
**Summary:** List all addresses
**Name:** getAddresses

**Query Parameters:**
- `query` (string, max: 256): Partial match
- `forward` (string, max: 256): Partial match of forwarding target
- `tags` (string): Comma separated list of tags
- `requiredTags` (string): Comma separated list of required tags
- `metaData` (boolean, default: false): Include metaData
- `internalData` (boolean, default: false): Include internalData
- `limit` (number, default: 20, min: 1, max: 250): Records to return
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `page` (number): Current page number
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  query: string;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: Array<{
    id: string;
    name: string;
    address: string;
    user: string;
    forwarded: boolean;
    forwardedDisabled: boolean;
    targets: Array<string>;
    limits: {
      forwards: {
        allowed: number;
        used: number;
        ttl: number;
      };
    };
    tags: Array<string>;
    metaData?: object;
    internalData?: object;
  }>;
}
```

---

### GET /addresses/resolve/:address
**Summary:** Get Address info
**Name:** resolveAddress

**Path Parameters:**
- `address` (string, email, required): Address to resolve

**Query Parameters:**
- `allowWildcard` (boolean, default: false): Match wildcard addresses
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  address: string;
  user: string;
  name: string;
  tags: Array<string>;
}
```

---

### POST /addresses/forwarded
**Summary:** Create new forwarded Address
**Name:** createForwardedAddress

**Request Body:**
- `address` (string, email, required): E-mail Address
- `name` (string, max: 256): Identity name
- `targets` (array of strings | array of objects, required): Forwarding targets
- `forwards` (number, min: 0): Daily forwarding quota
- `allowWildcard` (boolean, default: false): Enable wildcard
- `autoreply` (object): Autoreply settings
  - `status` (boolean): Enable autoreply
  - `name` (string, max: 128): Name used for autoreply
  - `subject` (string, max: 2KB): Autoreply subject
  - `text` (string, max: 128KB): Autoreply plaintext
  - `html` (string, max: 128KB): Autoreply HTML
- `tags` (array of strings, max: 128): Address tags
- `metaData` (object | string): Metadata
- `internalData` (object | string): Internal metadata
- `forwardedDisabled` (boolean): Disable forwarded flag
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Address ID
}
```

---

### GET /addresses/forwarded/:address
**Summary:** Request forwarded Address information
**Name:** getForwardedAddress

**Path Parameters:**
- `address` (string, hex, 24 chars, required): ID of the Address

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  address: string;
  name: string;
  targets: Array<string>;
  limits: {
    forwards: {
      allowed: number;
      used: number;
      ttl: number;
    };
  };
  autoreply: {
    status: boolean;
    name: string;
    subject: string;
    text: string;
    html: string;
    start: string;
    end: string;
  };
  created: string; // ISO date
  tags: Array<string>;
  forwardedDisabled: boolean;
  metaData?: object;
  internalData?: object;
}
```

---

### PUT /addresses/forwarded/:address
**Summary:** Update forwarded Address information
**Name:** updateForwardedAddress

**Path Parameters:**
- `address` (string, hex, 24 chars, required): ID of the Address

**Request Body:**
- `address` (string, email): New address
- `name` (string, max: 256): Identity name
- `targets` (array): Forwarding targets
- `forwards` (number, min: 0): Daily forwarding quota
- `autoreply` (object): Autoreply settings
- `tags` (array of strings, max: 128): Address tags
- `metaData` (object | string): Metadata
- `internalData` (object | string): Internal metadata
- `forwardedDisabled` (boolean): Disable forwarded flag
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### DELETE /addresses/forwarded/:address
**Summary:** Delete a forwarded Address
**Name:** deleteForwardedAddress

**Path Parameters:**
- `address` (string, hex, 24 chars, required): ID of the Address

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### GET /addresses/renameDomain
**Summary:** Rename domain in addresses
**Name:** renameDomain
**Description:** Renames domain names for addresses and DKIM

**Query Parameters:**
- `oldDomain` (string, max: 256, required): Old Domain Name
- `newDomain` (string, max: 256, required): New Domain Name
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  modifiedAddresses: number;
  modifiedUsers: number;
  modifiedDkim: number;
}
```

---

## Filters

### GET /users/:user/filters
**Summary:** List all Filters
**Name:** getUserFilters

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  results: Array<{
    id: string;
    name: string;
    query: object;
    action: object;
    disabled: boolean;
    created: string; // ISO date
  }>;
}
```

---

### POST /users/:user/filters
**Summary:** Create new Filter
**Name:** createUserFilter

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `name` (string, max: 256): Filter name
- `query` (object, required): Filter query conditions
  - `from` (string): From address match
  - `to` (string): To address match
  - `subject` (string): Subject match
  - `text` (string): Body text match
  - `ha` (boolean): Has attachment
  - `size` (number): Message size threshold
- `action` (object, required): Filter actions
  - `seen` (boolean): Mark as seen
  - `flag` (boolean): Mark as flagged
  - `delete` (boolean): Delete message
  - `spam` (boolean): Move to spam
  - `mailbox` (string, hex, 24 chars): Move to mailbox
  - `forward` (string, email): Forward to address
  - `targetUrl` (string): POST message data to URL
- `disabled` (boolean, default: false): Disable filter
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Filter ID
}
```

---

### GET /users/:user/filters/:filter
**Summary:** Request Filter information
**Name:** getUserFilter

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `filter` (string, hex, 24 chars, required): ID of the Filter

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  name: string;
  query: object;
  action: object;
  disabled: boolean;
  created: string; // ISO date
}
```

---

### PUT /users/:user/filters/:filter
**Summary:** Update Filter information
**Name:** updateUserFilter

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `filter` (string, hex, 24 chars, required): ID of the Filter

**Request Body:**
- `name` (string, max: 256): Filter name
- `query` (object): Filter query conditions
- `action` (object): Filter actions
- `disabled` (boolean): Disable filter
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### DELETE /users/:user/filters/:filter
**Summary:** Delete a Filter
**Name:** deleteUserFilter

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `filter` (string, hex, 24 chars, required): ID of the Filter

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Autoreply

### GET /users/:user/autoreply
**Summary:** Request Autoreply information
**Name:** getUserAutoreply

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  status: boolean;
  name: string;
  subject: string;
  text: string;
  html: string;
  start: string | false; // ISO date or false
  end: string | false; // ISO date or false
}
```

---

### PUT /users/:user/autoreply
**Summary:** Update Autoreply information
**Name:** updateUserAutoreply

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `status` (boolean, required): Enable autoreply
- `name` (string, max: 128): Name used in autoreply
- `subject` (string, max: 2KB): Autoreply subject line
- `text` (string, max: 128KB): Autoreply plaintext content
- `html` (string, max: 128KB): Autoreply HTML content
- `start` (date): Start time datestring
- `end` (date): End time datestring
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

### DELETE /users/:user/autoreply
**Summary:** Delete Autoreply information
**Name:** deleteUserAutoreply

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Application-Specific Passwords (ASPs)

### GET /users/:user/asps
**Summary:** List all ASPs
**Name:** getUserASPs

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Query Parameters:**
- `showAll` (boolean, default: false): Show all ASPs including revoked
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  results: Array<{
    id: string;
    description: string;
    scopes: Array<string>;
    lastUse: {
      time: string; // ISO date
      event: string;
    };
    expires: string | false; // ISO date or false
    created: string; // ISO date
  }>;
}
```

---

### POST /users/:user/asps
**Summary:** Create new ASP
**Name:** createUserASP

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `description` (string, max: 256, required): ASP description
- `scopes` (array of strings, required): Allowed scopes (master, imap, smtp, pop3)
- `generateMobileconfig` (boolean): Generate Apple configuration
- `address` (string): Use specific email address
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // ASP ID
  password: string; // Generated ASP password
  mobileconfig?: string; // Base64 Apple configuration (if requested)
}
```

---

### GET /users/:user/asps/:asp
**Summary:** Request ASP information
**Name:** getUserASP

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `asp` (string, hex, 24 chars, required): ID of the ASP

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  description: string;
  scopes: Array<string>;
  lastUse: {
    time: string; // ISO date
    event: string;
  };
  expires: string | false; // ISO date or false
  created: string; // ISO date
}
```

---

### DELETE /users/:user/asps/:asp
**Summary:** Delete an ASP
**Name:** deleteUserASP

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `asp` (string, hex, 24 chars, required): ID of the ASP

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Storage

### POST /users/:user/storage
**Summary:** Upload File
**Name:** uploadStorage
**Description:** Upload file to storage for later use

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `filename` (string, max: 256): Filename
- `contentType` (string, max: 256): MIME type
- `encoding` (string: 'base64' | 'hex'): Encoding of data field
- `content` (string): File content (base64 or hex encoded)
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // File ID
}
```

---

### GET /users/:user/storage/:file
**Summary:** Download File
**Name:** downloadStorage

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `file` (string, hex, 24 chars, required): ID of the File

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
Binary file content

---

### DELETE /users/:user/storage/:file
**Summary:** Delete a File
**Name:** deleteStorage

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User
- `file` (string, hex, 24 chars, required): ID of the File

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Submit

### POST /users/:user/submit
**Summary:** Submit a Message for delivery
**Name:** submitMessage
**Description:** Create and submit a message for delivery

**Path Parameters:**
- `user` (string, hex, 24 chars, required): ID of the User

**Request Body:**
- `reference` (object): Referenced message for reply/forward
  - `mailbox` (string, hex, 24 chars, required): Mailbox ID
  - `id` (number, required): Message ID
  - `action` (string: 'reply' | 'replyAll' | 'forward', required): Action type
- `mailbox` (string, hex, 24 chars): Target mailbox for Sent
- `uploadOnly` (boolean, default: false): Store draft without sending
- `sendTime` (date): Send time for scheduled sending
- `from` (object): Address for From header
  - `name` (string, max: 255): Name
  - `address` (string, email): Address
- `replyTo` (object): Address for Reply-To header
- `to` (array of objects): Addresses for To header
- `cc` (array of objects): Addresses for Cc header
- `bcc` (array of objects): Addresses for Bcc header
- `subject` (string, max: 2KB): Message subject
- `text` (string, max: 1MB): Plaintext content
- `html` (string, max: 1MB): HTML content
- `headers` (array of objects): Custom headers
- `attachments` (array of objects): Attachments
- `files` (array of strings, hex, 24 chars): Storage file IDs
- `meta` (object): Metadata
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  message: {
    id: number;
    mailbox: string;
    queueId: string;
  };
}
```

---

## Settings

### GET /settings
**Summary:** List settings
**Name:** getSettings

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  settings: object; // Key-value pairs of settings
}
```

---

### GET /settings/:key
**Summary:** Get setting value
**Name:** getSetting

**Path Parameters:**
- `key` (string, required): Setting key

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  key: string;
  value: any; // Setting value
}
```

---

### POST /settings/:key
**Summary:** Set setting value
**Name:** setSetting

**Path Parameters:**
- `key` (string, required): Setting key

**Request Body:**
- `value` (any, required): Setting value
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Health

### GET /health
**Summary:** Check server health
**Name:** health

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## DKIM

### GET /dkim
**Summary:** List registered DKIM keys
**Name:** getDkimKeys

**Query Parameters:**
- `query` (string, max: 255): Partial match of domain name
- `limit` (number, default: 20, min: 1, max: 250): Records to return
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  query: string;
  results: Array<{
    id: string;
    domain: string;
    selector: string;
    description: string;
    fingerprint: string;
    created: string; // ISO date
  }>;
}
```

---

### GET /dkim/resolve/:domain
**Summary:** Resolve ID for a DKIM domain
**Name:** resolveDkim

**Path Parameters:**
- `domain` (string, max: 255, required): DKIM domain

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // DKIM unique ID (24 byte hex)
}
```

---

### POST /dkim
**Summary:** Create or update DKIM key for domain
**Name:** updateDkimKey
**Description:** Add new or update existing DKIM key

**Request Body:**
- `domain` (string, max: 255, required): Domain name (use "*" for wildcard)
- `selector` (string, max: 255, required): Selector for the key
- `privateKey` (string): PEM format RSA or ED25519 private key or base64 ED25519
- `description` (string, max: 255): Key description
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  domain: string;
  selector: string;
  description: string;
  fingerprint: string;
  publicKey: string;
  dnsTxt: {
    name: string;
    value: string;
  };
}
```

---

### GET /dkim/:dkim
**Summary:** Request DKIM information
**Name:** getDkimKey

**Path Parameters:**
- `dkim` (string, hex, 24 chars, required): ID of the DKIM

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  domain: string;
  selector: string;
  description: string;
  fingerprint: string;
  publicKey: string;
  dnsTxt: {
    name: string;
    value: string;
  };
  created: string; // ISO date
}
```

---

### DELETE /dkim/:dkim
**Summary:** Delete a DKIM key
**Name:** deleteDkimKey

**Path Parameters:**
- `dkim` (string, hex, 24 chars, required): ID of the DKIM

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Domain Aliases

### GET /domainaliases
**Summary:** List registered Domain Aliases
**Name:** getDomainAliases

**Query Parameters:**
- `query` (string, max: 255): Partial match of alias or domain
- `limit` (number, default: 20, min: 1, max: 250): Records to return
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: Array<{
    id: string;
    alias: string;
    domain: string;
  }>;
}
```

---

### POST /domainaliases
**Summary:** Create new Domain Alias
**Name:** createDomainAlias
**Description:** Accept mail on username@domain and username@alias

**Request Body:**
- `alias` (string, max: 255, required): Domain Alias
- `domain` (string, max: 255, required): Domain name
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Domain Alias ID
}
```

---

### GET /domainaliases/resolve/:alias
**Summary:** Resolve ID for a domain alias
**Name:** resolveDomainAlias

**Path Parameters:**
- `alias` (string, max: 255, required): Alias domain

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Unique ID (24 byte hex)
}
```

---

### GET /domainaliases/:alias
**Summary:** Request Alias information
**Name:** getDomainAlias

**Path Parameters:**
- `alias` (string, hex, 24 chars, required): ID of the Alias

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  alias: string;
  domain: string;
  created: string; // ISO date
}
```

---

### DELETE /domainaliases/:alias
**Summary:** Delete an Alias
**Name:** deleteDomainAlias

**Path Parameters:**
- `alias` (string, hex, 24 chars, required): ID of the Alias

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## TLS Certificates

### GET /certs
**Summary:** List registered TLS certificates
**Name:** getTLSCertificates

**Query Parameters:**
- `query` (string, max: 255): Partial match of server name
- `altNames` (boolean, default: false): Match query against SAN
- `limit` (number, default: 20, min: 1, max: 250): Records to return
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  query: string;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: Array<{
    id: string;
    servername: string;
    acme: boolean;
    description: string;
    fingerprint: string;
    created: string; // ISO date
    expires: string; // ISO date
    autogenerated?: boolean;
    altNames: Array<string>;
  }>;
}
```

---

### GET /certs/resolve/:servername
**Summary:** Resolve ID for a server name
**Name:** resolveTLSCertificate

**Path Parameters:**
- `servername` (string, hostname, required): Server name

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Unique ID (24 byte hex)
}
```

---

### POST /certs
**Summary:** Create or update TLS certificate
**Name:** updateTLSCertificate
**Description:** Add new or update existing TLS certificate

**Request Body:**
- `servername` (string, hostname, required): Server name
- `privateKey` (string): PEM formatted private key (optional if ACME managed)
- `cert` (string): PEM formatted certificate (optional if ACME managed)
- `ca` (array of strings): CA chain certificates
- `description` (string, max: 1024): Certificate description
- `acme` (boolean, default: false): ACME managed certificate
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  servername: string;
  description: string;
  fingerprint: string;
  expires: string; // ISO date
  altNames: Array<string>;
  acme: boolean;
}
```

---

### GET /certs/:cert
**Summary:** Request TLS certificate information
**Name:** getTLSCertificate

**Path Parameters:**
- `cert` (string, hex, 24 chars, required): ID of the TLS certificate

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  servername: string;
  description: string;
  fingerprint: string;
  expires: string; // ISO date
  created: string; // ISO date
  autogenerated?: boolean;
  altNames: Array<string>;
  acme: boolean;
  hasCert: boolean;
}
```

---

### DELETE /certs/:cert
**Summary:** Delete a TLS certificate
**Name:** deleteTLSCert

**Path Parameters:**
- `cert` (string, hex, 24 chars, required): ID of the TLS certificate

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Webhooks

### GET /webhooks
**Summary:** List registered Webhooks
**Name:** getWebhooks

**Query Parameters:**
- `type` (string, max: 128): Prefix or exact match (use "*" for all)
- `user` (string, hex, 24 chars): User ID
- `limit` (number, default: 20, min: 1, max: 250): Records to return
- `next` (string): Cursor for next page
- `previous` (string): Cursor for previous page
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  total: number;
  page: number;
  previousCursor: string | false;
  nextCursor: string | false;
  results: Array<{
    id: string;
    type: Array<string>;
    user: string | null;
    url: string;
  }>;
}
```

---

### POST /webhooks
**Summary:** Create new Webhook
**Name:** createWebhook

**Request Body:**
- `type` (array of strings, max: 128, required): Event types to match
- `user` (string, hex, 24 chars): User ID to match
- `url` (string, uri, required): URL to POST data to
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Webhook ID
}
```

---

### DELETE /webhooks/:webhook
**Summary:** Delete a webhook
**Name:** deleteWebhook

**Path Parameters:**
- `webhook` (string, hex, 24 chars, required): ID of the Webhook

**Query Parameters:**
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
}
```

---

## Audit

### POST /audit
**Summary:** Create new audit
**Name:** createAudit
**Description:** Initiates a message audit

**Request Body:**
- `user` (string, hex, 24 chars, required): ID of the User
- `start` (date): Start time as ISO date
- `end` (date): End time as ISO date
- `expires` (date, required): Expiration date
- `sess` (string): Session identifier
- `ip` (string): IP address

**Response 200:**
```typescript
{
  success: boolean;
  id: string; // Audit ID
}
```

---

### GET /audit/:audit
**Summary:** Request Audit Info
**Name:** getAudit
**Description:** Returns information about stored audit

**Path Parameters:**
- `audit` (string, hex, 24 chars, required): ID of the Audit

**Response 200:**
```typescript
{
  success: boolean;
  id: string;
  user: string;
  start: string | false; // ISO date
  end: string | false; // ISO date
  expires: string; // ISO date
  import: {
    status: string;
    failed: number;
    copied: number;
  };
}
```

---

### GET /audit/:audit/export.mbox
**Summary:** Export Audited Emails
**Name:** getAuditEmails
**Description:** Returns mailbox file with all audited emails

**Path Parameters:**
- `audit` (string, hex, 24 chars, required): ID of the Audit

**Response 200:**
Content-Type: application/octet-stream (MBOX format)

---

## Common Types

### Address
```typescript
{
  name: string; // max: 255
  address: string; // email format
}
```

### Attachment
```typescript
{
  filename?: string;
  content: string; // base64 or data URL
  contentType?: string;
  cid?: string; // Content-ID for inline images
}
```

### Header
```typescript
{
  key: string;
  value: string;
}
```

### Target (Forwarding)
```typescript
string | { // email address
  id: string; // relay ID
  type: 'relay' | 'http' | 'mail';
  value: string;
}
```

---

## Error Response Format

All endpoints may return error responses in this format:

```typescript
{
  error: string; // Error message
  code: string; // Error code (e.g., 'InputValidationError', 'UserNotFound')
  details?: Array<{ // For validation errors
    message: string;
    path: Array<string>;
    type: string;
    context: object;
  }>;
}
```

Common error codes:
- `InputValidationError`: Invalid request parameters
- `UserNotFound`: User does not exist
- `MailboxNotFound`: Mailbox does not exist
- `MessageNotFound`: Message does not exist
- `NoSuchMailbox`: Mailbox does not exist
- `InternalDatabaseError`: MongoDB error
- `OverQuotaError`: User over quota
- `UserDisabled`: User account disabled
- `RateLimitedError`: Rate limit exceeded
- `AuthenticationFailed`: Authentication failed

---

## Authentication

Most endpoints require authentication via:
- Access token in `X-Access-Token` header
- Session ID in request body/query (`sess` parameter)

Some endpoints also support role-based access control with different permission levels.

---

## Pagination

List endpoints support cursor-based pagination:
- `limit`: Number of records per page (default: 20, max: 250)
- `next`: Cursor for next page
- `previous`: Cursor for previous page
- `page`: Current page number (informational)

Response includes:
- `nextCursor`: Cursor for next page or `false`
- `previousCursor`: Cursor for previous page or `false`
- `total`: Total number of records

---

## Special Query Parameters

Common across many endpoints:
- `sess`: Session identifier for logging
- `ip`: IP address for logging
- `metaData`: Custom metadata object/string
- `tags`: Array of tags for categorization
