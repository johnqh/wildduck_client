# WildDuck Client Hooks Documentation

Comprehensive documentation for all WildDuck API hooks with detailed parameter explanations and usage examples.

## Table of Contents

- [Messages API](#messages-api)
- [Mailboxes API](#mailboxes-api)
- [Users API](#users-api)
- [Addresses API](#addresses-api)
- [Autoreply API](#autoreply-api)

---

## Messages API

### useWildduckGetMessages

Retrieve messages from a specific mailbox with pagination and filtering options.

**Hook Signature:**
```typescript
const { getMessages, loading, error, data } = useWildduckGetMessages(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getMessages(
  userAuth: WildduckUserAuth,
  mailboxId: string,
  options?: GetMessagesOptions
): Promise<WildDuckMessagesResponse>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAuth` | `WildduckUserAuth` | Yes | User authentication (`{userId, accessToken}`) |
| `mailboxId` | `string` | Yes | Mailbox ID (24-character hex string) |
| `options` | `GetMessagesOptions` | No | Filtering and pagination options |

**Options Fields:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `20` | Number of messages to return (1-250) |
| `next` | `string` | - | Cursor string for next page |
| `previous` | `string` | - | Cursor string for previous page |
| `order` | `"asc" \| "desc"` | `"desc"` | Sort order (newest first or oldest first) |
| `unseen` | `boolean` | - | If `true`, returns only unseen messages |
| `metaData` | `boolean` | `false` | Include metadata in response |
| `threadCounters` | `boolean` | `false` | Include thread message counters |
| `includeHeaders` | `string` | - | Comma-separated list of headers to include (e.g., "From,Subject,Date") |

**Response:**
```typescript
{
  success: boolean;
  total: number;          // Total number of messages
  page: number;           // Current page number
  previousCursor: string | false;  // Cursor for previous page
  nextCursor: string | false;      // Cursor for next page
  results: WildDuckMessage[];      // Array of messages
}
```

**Example Usage:**

```typescript
import { useWildduckGetMessages } from 'wildduck_client';

function MessageList() {
  const { getMessages } = useWildduckGetMessages(networkClient, config);
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);

  // Fetch first page of unread messages
  const fetchUnreadMessages = async () => {
    const result = await getMessages(userAuth, mailboxId, {
      limit: 50,
      unseen: true,
      order: 'desc',
      metaData: true
    });
    setMessages(result.results);
    setCursor(result.nextCursor);
  };

  // Load next page
  const loadNextPage = async () => {
    const result = await getMessages(userAuth, mailboxId, {
      next: cursor,
      limit: 50
    });
    setMessages(prev => [...prev, ...result.results]);
    setCursor(result.nextCursor);
  };

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          <h3>{msg.subject}</h3>
          <p>From: {msg.from.address}</p>
          <p>Unseen: {msg.unseen}</p>
        </div>
      ))}
      {cursor && <button onClick={loadNextPage}>Load More</button>}
    </div>
  );
}
```

**Pagination Example:**
```typescript
// Paginate through all messages in a mailbox
async function getAllMessages(userAuth, mailboxId) {
  let allMessages = [];
  let cursor = null;

  do {
    const response = await getMessages(userAuth, mailboxId, {
      limit: 100,
      next: cursor
    });

    allMessages.push(...response.results);
    cursor = response.nextCursor;

  } while (cursor);  // Continue until no more pages

  return allMessages;
}
```

---

### useWildduckGetMessage

Retrieve a single message by its ID.

**Hook Signature:**
```typescript
const { getMessage, loading, error, data } = useWildduckGetMessage(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getMessage(
  userAuth: WildduckUserAuth,
  messageId: string,
  options?: GetMessageOptions
): Promise<WildDuckMessage>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userAuth` | `WildduckUserAuth` | Yes | User authentication |
| `messageId` | `string` | Yes | Message ID (24-character hex string) |
| `options` | `GetMessageOptions` | No | Additional options |

**Options Fields:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `replaceCidLinks` | `boolean` | `false` | If true, replaces CID links with attachment URLs |
| `markAsSeen` | `boolean` | `false` | Mark message as seen when retrieved |

**Example Usage:**
```typescript
const { getMessage } = useWildduckGetMessage(networkClient, config);

// Get message and mark as seen
const message = await getMessage(userAuth, messageId, {
  replaceCidLinks: true,
  markAsSeen: true
});

console.log(message.subject);
console.log(message.html);  // HTML content with CID links replaced
```

---

### useWildduckUpdateMessage

Update message properties (e.g., mark as seen, move to folder, flag).

**Hook Signature:**
```typescript
const { updateMessage, loading, error } = useWildduckUpdateMessage(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async updateMessage(
  userAuth: WildduckUserAuth,
  messageId: string,
  updates: MessageUpdates
): Promise<{ success: boolean }>
```

**Updates Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `seen` | `boolean` | Mark message as seen/unseen |
| `flagged` | `boolean` | Set/remove flagged status |
| `draft` | `boolean` | Mark as draft |
| `mailbox` | `string` | Move to different mailbox (mailbox ID) |
| `moveTo` | `string` | Alternative to `mailbox` - target mailbox ID |
| `expires` | `Date \| number` | Set expiration date (ISO string or timestamp) |

**Example Usage:**
```typescript
const { updateMessage } = useWildduckUpdateMessage(networkClient, config);

// Mark message as read and flagged
await updateMessage(userAuth, messageId, {
  seen: true,
  flagged: true
});

// Move message to Trash folder
await updateMessage(userAuth, messageId, {
  mailbox: trashMailboxId
});

// Set message to expire in 30 days
const expirationDate = new Date();
expirationDate.setDate(expirationDate.getDate() + 30);
await updateMessage(userAuth, messageId, {
  expires: expirationDate
});
```

---

### useWildduckDeleteMessage

Delete a message (moves to Trash or permanently deletes).

**Hook Signature:**
```typescript
const { deleteMessage, loading, error } = useWildduckDeleteMessage(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async deleteMessage(
  userAuth: WildduckUserAuth,
  messageId: string
): Promise<{ success: boolean }>
```

**Example Usage:**
```typescript
const { deleteMessage } = useWildduckDeleteMessage(networkClient, config);

// Delete a message
await deleteMessage(userAuth, messageId);
```

---

### useWildduckSearchMessages

Search for messages across all mailboxes.

**Hook Signature:**
```typescript
const { searchMessages, loading, error } = useWildduckSearchMessages(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async searchMessages(
  userAuth: WildduckUserAuth,
  searchQuery: SearchQuery
): Promise<WildDuckMessagesResponse>
```

**SearchQuery Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `query` | `string` | Search query string |
| `mailbox` | `string` | Limit search to specific mailbox ID |
| `limit` | `number` | Number of results to return (default: 20) |
| `next` | `string` | Cursor for next page |
| `previous` | `string` | Cursor for previous page |

**Example Usage:**
```typescript
const { searchMessages } = useWildduckSearchMessages(networkClient, config);

// Search for messages containing "invoice"
const results = await searchMessages(userAuth, {
  query: 'invoice',
  limit: 50
});

// Search within specific mailbox
const inboxResults = await searchMessages(userAuth, {
  query: 'from:john@example.com',
  mailbox: inboxMailboxId,
  limit: 100
});
```

---

### useWildduckGetMessageSource

Get the raw RFC822 message source.

**Hook Signature:**
```typescript
const { getMessageSource, loading, error } = useWildduckGetMessageSource(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getMessageSource(
  userAuth: WildduckUserAuth,
  messageId: string
): Promise<{ data: string }>
```

**Example Usage:**
```typescript
const { getMessageSource } = useWildduckGetMessageSource(networkClient, config);

// Get raw email source
const source = await getMessageSource(userAuth, messageId);
console.log(source.data);  // Raw RFC822 email content
```

---

### useWildduckGetMessageAttachment

Download a message attachment.

**Hook Signature:**
```typescript
const { getAttachment, loading, error } = useWildduckGetMessageAttachment(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getAttachment(
  userAuth: WildduckUserAuth,
  messageId: string,
  attachmentId: string
): Promise<Blob>
```

**Example Usage:**
```typescript
const { getAttachment } = useWildduckGetMessageAttachment(networkClient, config);

// Download attachment
const blob = await getAttachment(userAuth, messageId, attachmentId);

// Create download link
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'attachment.pdf';
link.click();
```

---

### useWildduckForwardMessage

Forward a message to another email address.

**Hook Signature:**
```typescript
const { forwardMessage, loading, error } = useWildduckForwardMessage(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async forwardMessage(
  userAuth: WildduckUserAuth,
  messageId: string,
  forwardData: ForwardData
): Promise<{ success: boolean; queueId: string }>
```

**ForwardData Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | `string` | Yes | Target email address |
| `addresses` | `string[]` | No | Alternative: multiple target addresses |

**Example Usage:**
```typescript
const { forwardMessage } = useWildduckForwardMessage(networkClient, config);

// Forward to single address
await forwardMessage(userAuth, messageId, {
  target: 'colleague@example.com'
});

// Forward to multiple addresses
await forwardMessage(userAuth, messageId, {
  addresses: ['alice@example.com', 'bob@example.com']
});
```

---

### useWildduckSendMessage

Send a new email message.

**Hook Signature:**
```typescript
const { sendMessage, loading, error } = useWildduckSendMessage(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async sendMessage(
  userAuth: WildduckUserAuth,
  messageData: SendMessageData
): Promise<{ success: boolean; message: { id: string; queueId: string } }>
```

**SendMessageData Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | `Address` | No | Sender address (defaults to user's main address) |
| `to` | `Address[]` | Yes | Recipient addresses |
| `cc` | `Address[]` | No | CC addresses |
| `bcc` | `Address[]` | No | BCC addresses |
| `subject` | `string` | No | Email subject |
| `text` | `string` | No | Plain text content |
| `html` | `string` | No | HTML content |
| `headers` | `Record<string, string>` | No | Custom headers |
| `attachments` | `Attachment[]` | No | File attachments |
| `meta` | `object` | No | Metadata |

**Address Type:**
```typescript
type Address = string | { name?: string; address: string };
```

**Attachment Type:**
```typescript
interface Attachment {
  filename: string;
  content: string;  // Base64 encoded
  contentType?: string;
  cid?: string;     // For inline images
}
```

**Example Usage:**
```typescript
const { sendMessage } = useWildduckSendMessage(networkClient, config);

// Send simple email
await sendMessage(userAuth, {
  to: [{ name: 'John Doe', address: 'john@example.com' }],
  subject: 'Hello',
  text: 'This is a test message',
  html: '<p>This is a <b>test</b> message</p>'
});

// Send with attachment
await sendMessage(userAuth, {
  to: ['recipient@example.com'],
  subject: 'Invoice',
  text: 'Please find the invoice attached.',
  attachments: [{
    filename: 'invoice.pdf',
    content: base64Content,
    contentType: 'application/pdf'
  }]
});

// Send with CC and BCC
await sendMessage(userAuth, {
  to: ['primary@example.com'],
  cc: ['manager@example.com'],
  bcc: ['archive@example.com'],
  subject: 'Team Update',
  html: '<h1>Weekly Update</h1><p>...</p>'
});
```

---

### useWildduckUploadMessage

Upload a raw RFC822 message directly to a mailbox.

**Hook Signature:**
```typescript
const { uploadMessage, loading, error } = useWildduckUploadMessage(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async uploadMessage(
  userAuth: WildduckUserAuth,
  mailboxId: string,
  messageData: UploadMessageData
): Promise<{ success: boolean; message: { id: string } }>
```

**UploadMessageData Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `raw` | `string` | Yes | Raw RFC822 message content (base64 encoded) |
| `date` | `Date \| string` | No | Internal date for the message |
| `flags` | `string[]` | No | IMAP flags (e.g., ['\\Seen', '\\Flagged']) |
| `unseen` | `boolean` | No | If true, message is marked as unseen |
| `flagged` | `boolean` | No | If true, message is flagged |
| `draft` | `boolean` | No | If true, message is marked as draft |

**Example Usage:**
```typescript
const { uploadMessage } = useWildduckUploadMessage(networkClient, config);

// Upload message to Inbox
const rawMessage = btoa(`From: sender@example.com
To: recipient@example.com
Subject: Test Message
Content-Type: text/plain

This is a test message.`);

await uploadMessage(userAuth, inboxMailboxId, {
  raw: rawMessage,
  flags: ['\\Seen']
});
```

---

### useWildduckSubmitDraft

Submit a draft message for delivery.

**Hook Signature:**
```typescript
const { submitDraft, loading, error } = useWildduckSubmitDraft(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async submitDraft(
  userAuth: WildduckUserAuth,
  messageId: string,
  submitData?: SubmitDraftData
): Promise<{ success: boolean; queueId: string }>
```

**SubmitDraftData Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `sendTime` | `Date \| string` | Schedule delivery for a specific time |
| `deleteAfter` | `boolean` | Delete draft after sending (default: true) |

**Example Usage:**
```typescript
const { submitDraft } = useWildduckSubmitDraft(networkClient, config);

// Send draft immediately
await submitDraft(userAuth, draftMessageId);

// Schedule draft for later
const sendTime = new Date();
sendTime.setHours(sendTime.getHours() + 2);
await submitDraft(userAuth, draftMessageId, {
  sendTime,
  deleteAfter: true
});
```

---

## Mailboxes API

### useWildduckGetMailboxes

List all mailboxes for a user.

**Hook Signature:**
```typescript
const { getMailboxes, loading, error } = useWildduckGetMailboxes(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getMailboxes(
  userAuth: WildduckUserAuth,
  options?: GetMailboxesOptions
): Promise<{ success: boolean; results: WildDuckMailbox[] }>
```

**Options Fields:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `specialUse` | `boolean` | `false` | Only return folders with special use flags (Inbox, Sent, Trash, etc.) |
| `showHidden` | `boolean` | `false` | Include hidden folders in listing |
| `counters` | `boolean` | `false` | Include message counters (total & unseen) - has performance overhead |
| `sizes` | `boolean` | `false` | Include mailbox sizes in bytes - has significant performance overhead |

**Example Usage:**
```typescript
const { getMailboxes } = useWildduckGetMailboxes(networkClient, config);

// Get all mailboxes with counters
const mailboxes = await getMailboxes(userAuth, {
  counters: true
});

mailboxes.results.forEach(mailbox => {
  console.log(`${mailbox.name}: ${mailbox.total} messages (${mailbox.unseen} unseen)`);
});

// Get only special folders (Inbox, Sent, Trash, etc.)
const specialFolders = await getMailboxes(userAuth, {
  specialUse: true,
  counters: true
});
```

**Response:**
```typescript
{
  success: true,
  results: [
    {
      id: "507f1f77bcf86cd799439011",
      name: "Inbox",
      path: "INBOX",
      specialUse: "\\Inbox",
      modifyIndex: 123,
      subscribed: true,
      hidden: false,
      total: 42,        // Only if counters: true
      unseen: 5,        // Only if counters: true
      size: 1048576     // Only if sizes: true
    },
    // ... more mailboxes
  ]
}
```

---

### useWildduckGetMailbox

Get information about a specific mailbox.

**Hook Signature:**
```typescript
const { getMailbox, loading, error } = useWildduckGetMailbox(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getMailbox(
  userAuth: WildduckUserAuth,
  mailboxId: string
): Promise<WildDuckMailbox>
```

**Alternative (resolve by path):**
```typescript
async getMailbox(
  userAuth: WildduckUserAuth,
  'resolve',
  path: string
): Promise<WildDuckMailbox>
```

**Example Usage:**
```typescript
const { getMailbox } = useWildduckGetMailbox(networkClient, config);

// Get mailbox by ID
const mailbox = await getMailbox(userAuth, mailboxId);

// Get mailbox by path
const inbox = await getMailbox(userAuth, 'resolve', 'INBOX');
const sent = await getMailbox(userAuth, 'resolve', 'Sent Mail');
```

**Response:**
```typescript
{
  success: true,
  id: "507f1f77bcf86cd799439011",
  name: "Inbox",
  path: "INBOX",
  specialUse: "\\Inbox",
  modifyIndex: 123,
  subscribed: true,
  hidden: false,
  encryptMessages: false,
  total: 42,
  unseen: 5
}
```

---

### useWildduckCreateMailbox

Create a new mailbox (folder).

**Hook Signature:**
```typescript
const { createMailbox, loading, error } = useWildduckCreateMailbox(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async createMailbox(
  userAuth: WildduckUserAuth,
  mailboxData: CreateMailboxData
): Promise<{ success: boolean; id: string }>
```

**CreateMailboxData Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | Yes | Full path of the mailbox (e.g., "Work/Projects") |
| `hidden` | `boolean` | No | If true, folder is hidden from IMAP clients |
| `retention` | `number` | No | Retention policy in milliseconds (0 to disable) |
| `encryptMessages` | `boolean` | No | If true, messages in this mailbox are encrypted |

**Example Usage:**
```typescript
const { createMailbox } = useWildduckCreateMailbox(networkClient, config);

// Create simple folder
await createMailbox(userAuth, {
  path: 'Projects'
});

// Create nested folder
await createMailbox(userAuth, {
  path: 'Work/Clients/CompanyA'
});

// Create folder with retention (auto-delete after 30 days)
await createMailbox(userAuth, {
  path: 'Temporary',
  retention: 30 * 24 * 60 * 60 * 1000,  // 30 days in ms
  hidden: false
});

// Create encrypted folder
await createMailbox(userAuth, {
  path: 'Sensitive',
  encryptMessages: true
});
```

---

### useWildduckUpdateMailbox

Update mailbox properties.

**Hook Signature:**
```typescript
const { updateMailbox, loading, error } = useWildduckUpdateMailbox(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async updateMailbox(
  userAuth: WildduckUserAuth,
  mailboxId: string,
  updates: UpdateMailboxData
): Promise<{ success: boolean }>
```

**UpdateMailboxData Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Rename mailbox (provide new full path) |
| `retention` | `number` | Update retention policy (ms) |
| `subscribed` | `boolean` | Change subscription status |
| `hidden` | `boolean` | Show/hide folder from IMAP clients |
| `encryptMessages` | `boolean` | Enable/disable encryption for new messages |

**Example Usage:**
```typescript
const { updateMailbox } = useWildduckUpdateMailbox(networkClient, config);

// Rename mailbox
await updateMailbox(userAuth, mailboxId, {
  path: 'Work/ClientsRenamed'
});

// Set retention to 90 days
await updateMailbox(userAuth, mailboxId, {
  retention: 90 * 24 * 60 * 60 * 1000
});

// Unsubscribe from mailbox
await updateMailbox(userAuth, mailboxId, {
  subscribed: false
});

// Hide mailbox
await updateMailbox(userAuth, mailboxId, {
  hidden: true
});
```

---

### useWildduckDeleteMailbox

Delete a mailbox and all its messages.

**Hook Signature:**
```typescript
const { deleteMailbox, loading, error } = useWildduckDeleteMailbox(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async deleteMailbox(
  userAuth: WildduckUserAuth,
  mailboxId: string
): Promise<{ success: boolean }>
```

**Example Usage:**
```typescript
const { deleteMailbox } = useWildduckDeleteMailbox(networkClient, config);

// Delete mailbox (WARNING: This deletes all messages in the folder!)
await deleteMailbox(userAuth, mailboxId);
```

**Note:** Special mailboxes like INBOX cannot be deleted.

---

## Users API

### useWildduckGetUser

Get detailed information about a user.

**Hook Signature:**
```typescript
const { getUser, loading, error } = useWildduckGetUser(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getUser(
  userAuth: WildduckUserAuth
): Promise<UserInfo>
```

**Response includes:**
- User ID, username, email address, display name
- 2FA status, encryption settings
- Quota information (used/allowed)
- Rate limits (recipients, forwards, IMAP/POP3 bandwidth)
- Feature flags, tags, disabled scopes
- Account status (activated, disabled, suspended)

**Example Usage:**
```typescript
const { getUser } = useWildduckGetUser(networkClient, config);

const userInfo = await getUser(userAuth);

console.log(`Username: ${userInfo.username}`);
console.log(`Email: ${userInfo.address}`);
console.log(`Quota: ${userInfo.limits.quota.used} / ${userInfo.limits.quota.allowed} bytes`);
console.log(`2FA: ${userInfo.enabled2fa.join(', ')}`);
console.log(`Recipients today: ${userInfo.limits.recipients.used} / ${userInfo.limits.recipients.allowed}`);
```

---

### useWildduckCreateUser

Create a new user account (admin only).

**Hook Signature:**
```typescript
const { createUser, loading, error } = useWildduckCreateUser(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async createUser(
  userData: CreateUserData
): Promise<{ success: boolean; id: string }>
```

**CreateUserData Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | `string` | Yes | Username (dots are informational only) |
| `password` | `string \| false` | Yes | Password or `false` to disable master password |
| `address` | `string` | No | Default email address (auto-generated if not set) |
| `name` | `string` | No | Display name |
| `quota` | `number` | No | Storage quota in bytes (0 = unlimited) |
| `recipients` | `number` | No | Messages per 24h that can be sent |
| `forwards` | `number` | No | Messages per 24h that can be forwarded |
| `filters` | `number` | No | Max number of filters allowed |
| `imapMaxUpload` | `number` | No | Bytes per 24h uploadable via IMAP |
| `imapMaxDownload` | `number` | No | Bytes per 24h downloadable via IMAP |
| `pop3MaxDownload` | `number` | No | Bytes per 24h downloadable via POP3 |
| `imapMaxConnections` | `number` | No | Max parallel IMAP connections |
| `receivedMax` | `number` | No | Max messages receivable per 60 seconds |
| `targets` | `string[]` | No | Forwarding targets (email addresses or URLs) |
| `spamLevel` | `number` | No | Spam threshold (0-100, default 50) |
| `tags` | `string[]` | No | Tags associated with user |
| `language` | `string` | No | Language code |
| `retention` | `number` | No | Default retention time in ms |
| `encryptMessages` | `boolean` | No | Encrypt received messages |
| `encryptForwarded` | `boolean` | No | Encrypt forwarded messages |
| `pubKey` | `string` | No | PGP public key for encryption |
| `disabledScopes` | `string[]` | No | Disable specific scopes ("imap", "pop3", "smtp") |

**Example Usage:**
```typescript
const { createUser } = useWildduckCreateUser(networkClient, config);

// Create basic user
await createUser({
  username: 'johndoe',
  password: 'SecurePassword123',
  name: 'John Doe',
  address: 'john.doe@example.com'
});

// Create user with quotas and limits
await createUser({
  username: 'enterprise_user',
  password: 'EnterprisePass123',
  name: 'Enterprise User',
  quota: 10 * 1024 * 1024 * 1024,  // 10 GB
  recipients: 1000,  // 1000 emails per day
  forwards: 500,
  imapMaxDownload: 50 * 1024 * 1024,  // 50 MB per day
  tags: ['enterprise', 'priority']
});

// Create user with forwarding
await createUser({
  username: 'forwarder',
  password: 'ForwardPass123',
  targets: ['john@otherdomain.com', 'http://webhook.example.com/inbox']
});
```

---

### useWildduckUpdateUser

Update user account settings.

**Hook Signature:**
```typescript
const { updateUser, loading, error } = useWildduckUpdateUser(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async updateUser(
  userAuth: WildduckUserAuth,
  updates: UpdateUserData
): Promise<{ success: boolean }>
```

**UpdateUserData Fields:**

All fields from CreateUserData plus:

| Field | Type | Description |
|-------|------|-------------|
| `existingPassword` | `string` | Verify existing password before changes |
| `disabled` | `boolean` | Disable user account (can't login or receive mail) |
| `suspended` | `boolean` | Suspend authentication only |
| `disable2fa` | `boolean` | Disable all 2FA methods |

**Example Usage:**
```typescript
const { updateUser } = useWildduckUpdateUser(networkClient, config);

// Change password
await updateUser(userAuth, {
  existingPassword: 'OldPassword123',
  password: 'NewPassword456'
});

// Update quota
await updateUser(userAuth, {
  quota: 20 * 1024 * 1024 * 1024  // 20 GB
});

// Update name and add tags
await updateUser(userAuth, {
  name: 'John Smith',
  tags: ['premium', 'verified']
});

// Disable account
await updateUser(userAuth, {
  disabled: true
});
```

---

### useWildduckDeleteUser

Delete a user account.

**Hook Signature:**
```typescript
const { deleteUser, loading, error } = useWildduckDeleteUser(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async deleteUser(
  userAuth: WildduckUserAuth,
  options?: DeleteUserOptions
): Promise<{
  success: boolean;
  code: string;
  user: string;
  addresses: { deleted: number };
  task: string;
}>
```

**Options Fields:**

| Option | Type | Description |
|--------|------|-------------|
| `deleteAfter` | `Date` | Schedule deletion for a future date (user is recoverable until then) |

**Example Usage:**
```typescript
const { deleteUser } = useWildduckDeleteUser(networkClient, config);

// Delete user immediately
await deleteUser(userAuth);

// Schedule deletion for 30 days from now (recoverable)
const deleteDate = new Date();
deleteDate.setDate(deleteDate.getDate() + 30);
await deleteUser(userAuth, {
  deleteAfter: deleteDate
});
```

---

### User Settings Hooks

#### useWildduckUserQuota

Manage user storage quota.

```typescript
const { getQuota, updateQuota } = useWildduckUserQuota(networkClient, config);

// Get quota info
const quota = await getQuota(userAuth);
console.log(`Used: ${quota.used} / ${quota.allowed} bytes`);

// Update quota
await updateQuota(userAuth, {
  quota: 50 * 1024 * 1024 * 1024  // 50 GB
});
```

---

#### useWildduckUserLimits

Manage user rate limits.

```typescript
const { getLimits, updateLimits } = useWildduckUserLimits(networkClient, config);

// Update sending limits
await updateLimits(userAuth, {
  recipients: 500,           // 500 emails per day
  forwards: 100,             // 100 forwards per day
  imapMaxUpload: 100 * 1024 * 1024,    // 100 MB per day
  imapMaxDownload: 500 * 1024 * 1024,  // 500 MB per day
  receivedMax: 10            // 10 emails per minute
});
```

---

#### useWildduckUserEncryption

Manage user encryption settings.

```typescript
const { getEncryption, updateEncryption } = useWildduckUserEncryption(
  networkClient,
  config
);

// Enable encryption
await updateEncryption(userAuth, {
  encryptMessages: true,
  encryptForwarded: true,
  pubKey: `-----BEGIN PGP PUBLIC KEY BLOCK-----
...
-----END PGP PUBLIC KEY BLOCK-----`
});
```

---

#### useWildduckUserForwarding

Manage email forwarding.

```typescript
const { getForwarding, updateForwarding } = useWildduckUserForwarding(
  networkClient,
  config
);

// Set up forwarding
await updateForwarding(userAuth, {
  targets: [
    'personal@gmail.com',
    'work@company.com',
    'http://webhook.example.com/inbox'
  ]
});
```

---

#### useWildduckUserSpam

Manage spam filtering settings.

```typescript
const { getSpamSettings, updateSpamSettings } = useWildduckUserSpam(
  networkClient,
  config
);

// Adjust spam level (0 = everything is spam, 100 = nothing is spam)
await updateSpamSettings(userAuth, {
  spamLevel: 70  // Less aggressive spam filtering
});
```

---

#### useWildduckUser2FA

Manage two-factor authentication.

```typescript
const { get2FAStatus, disable2FA } = useWildduckUser2FA(networkClient, config);

// Check 2FA status
const status = await get2FAStatus(userAuth);
console.log('Enabled methods:', status.enabled2fa);  // e.g., ['totp', 'u2f']

// Disable all 2FA methods
await disable2FA(userAuth);
```

---

#### useWildduckUserProfile

Manage user profile information.

```typescript
const { getProfile, updateProfile } = useWildduckUserProfile(
  networkClient,
  config
);

// Update profile
await updateProfile(userAuth, {
  name: 'John Doe',
  language: 'en',
  retention: 365 * 24 * 60 * 60 * 1000  // 1 year
});
```

---

## Addresses API

### useWildduckGetAddresses

Get all email addresses for a user.

**Hook Signature:**
```typescript
const { getAddresses, loading, error } = useWildduckGetAddresses(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getAddresses(
  userAuth: WildduckUserAuth,
  options?: GetAddressesOptions
): Promise<{ success: boolean; results: WildDuckAddress[] }>
```

**Options Fields:**

| Option | Type | Description |
|--------|------|-------------|
| `metaData` | `boolean` | Include metadata in response |
| `internalData` | `boolean` | Include internal metadata (admin only) |

**Example Usage:**
```typescript
const { getAddresses } = useWildduckGetAddresses(networkClient, config);

const addresses = await getAddresses(userAuth);

addresses.results.forEach(addr => {
  console.log(`${addr.address} (${addr.main ? 'Main' : 'Alias'})`);
  console.log(`Tags: ${addr.tags.join(', ')}`);
});
```

**Response:**
```typescript
{
  success: true,
  results: [
    {
      id: "507f1f77bcf86cd799439011",
      name: "John Doe",
      address: "john.doe@example.com",
      main: true,
      tags: ["primary"],
      created: "2023-01-15T10:30:00.000Z"
    },
    {
      id: "507f1f77bcf86cd799439012",
      name: "J. Doe",
      address: "j.doe@example.com",
      main: false,
      tags: ["alias"],
      created: "2023-02-20T14:20:00.000Z"
    }
  ]
}
```

---

## Autoreply API

### useWildduckGetAutoreply

Get auto-reply (vacation) settings.

**Hook Signature:**
```typescript
const { getAutoreply, loading, error } = useWildduckGetAutoreply(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async getAutoreply(
  userAuth: WildduckUserAuth
): Promise<AutoreplyInfo>
```

**Example Usage:**
```typescript
const { getAutoreply } = useWildduckGetAutoreply(networkClient, config);

const autoreply = await getAutoreply(userAuth);

if (autoreply.status) {
  console.log('Autoreply enabled');
  console.log(`Subject: ${autoreply.subject}`);
  console.log(`Message: ${autoreply.text}`);
  console.log(`Active from ${autoreply.start} to ${autoreply.end}`);
}
```

---

### useWildduckUpdateAutoreply

Update auto-reply settings.

**Hook Signature:**
```typescript
const { updateAutoreply, loading, error } = useWildduckUpdateAutoreply(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async updateAutoreply(
  userAuth: WildduckUserAuth,
  autoreplyData: AutoreplyData
): Promise<{ success: boolean; id: string }>
```

**AutoreplyData Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `boolean` | Yes | Enable/disable autoreply |
| `name` | `string` | No | Name to use in From header |
| `subject` | `string` | No | Subject line (empty = use original subject) |
| `text` | `string` | No | Plain text message |
| `html` | `string` | No | HTML formatted message |
| `start` | `Date \| false` | No | Start date or `false` to disable |
| `end` | `Date \| false` | No | End date or `false` to disable |

**Example Usage:**
```typescript
const { updateAutoreply } = useWildduckUpdateAutoreply(networkClient, config);

// Enable vacation autoreply
const startDate = new Date('2024-07-01');
const endDate = new Date('2024-07-15');

await updateAutoreply(userAuth, {
  status: true,
  name: 'John Doe',
  subject: 'Out of Office',
  text: 'I am currently on vacation and will respond when I return on July 15th.',
  html: '<p>I am currently on <strong>vacation</strong> and will respond when I return on <strong>July 15th</strong>.</p>',
  start: startDate,
  end: endDate
});

// Disable autoreply
await updateAutoreply(userAuth, {
  status: false
});
```

---

### useWildduckDeleteAutoreply

Delete auto-reply settings.

**Hook Signature:**
```typescript
const { deleteAutoreply, loading, error } = useWildduckDeleteAutoreply(
  networkClient,
  config,
  devMode
);
```

**Method:**
```typescript
async deleteAutoreply(
  userAuth: WildduckUserAuth
): Promise<{ success: boolean }>
```

**Example Usage:**
```typescript
const { deleteAutoreply } = useWildduckDeleteAutoreply(networkClient, config);

// Remove autoreply settings completely
await deleteAutoreply(userAuth);
```

---

## Common Patterns

### Cursor-Based Pagination

All list endpoints that support pagination use cursor-based pagination:

```typescript
async function getAllItems(fetchFunction, userAuth, ...args) {
  let allItems = [];
  let cursor = null;

  do {
    const response = await fetchFunction(userAuth, ...args, {
      limit: 100,
      next: cursor
    });

    allItems.push(...response.results);
    cursor = response.nextCursor;

  } while (cursor);

  return allItems;
}

// Usage
const allMessages = await getAllItems(getMessages, userAuth, mailboxId);
```

### Error Handling

All hooks return errors in a consistent format:

```typescript
const { getData, error } = useSomeHook(networkClient, config);

try {
  await getData(userAuth);
} catch (err) {
  if (error) {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    // Common error codes:
    // - UserNotFound
    // - MailboxNotFound
    // - AddressNotFound
    // - InputValidationError
    // - InternalDatabaseError
    // - AuthenticationRequired
  }
}
```

### Working with WildduckUserAuth

All hooks require a `WildduckUserAuth` object:

```typescript
const userAuth: WildduckUserAuth = {
  userId: '507f1f77bcf86cd799439011',  // 24-character hex string
  accessToken: 'user-access-token-here' // Bearer token
};

// The accessToken is sent as: Authorization: Bearer {accessToken}
```

---

## Performance Considerations

### Expensive Operations

Some operations have performance implications:

1. **Mailbox Counters**: Getting message counts (`counters: true`) requires database queries
2. **Mailbox Sizes**: Getting storage sizes (`sizes: true`) requires aggregation queries
3. **Search Operations**: Full-text search across mailboxes can be resource-intensive
4. **Large Pagination**: Fetching many pages sequentially is slower than targeted queries

### Best Practices

1. **Use Pagination**: Always paginate large result sets
2. **Selective Fields**: Only request counters/sizes when needed
3. **Cache Results**: Cache mailbox lists and user info when possible
4. **Batch Operations**: Group multiple updates when possible
5. **Optimize Search**: Use specific mailbox IDs in search when possible

---

## Type Definitions

```typescript
interface WildduckUserAuth {
  userId: string;      // 24-character hex string
  accessToken: string; // Bearer token
}

interface WildDuckMessage {
  id: string;
  mailbox: string;
  thread: string;
  from: { name?: string; address: string };
  to: Array<{ name?: string; address: string }>;
  subject: string;
  date: string;
  intro: string;
  attachments: boolean;
  size: number;
  seen: boolean;
  flagged: boolean;
  draft: boolean;
  answered: boolean;
  forwarded: boolean;
  contentType?: {
    value: string;
    type: string;
  };
  text?: string;
  html?: string[];
}

interface WildDuckMailbox {
  id: string;
  name: string;
  path: string;
  specialUse?: string;
  modifyIndex: number;
  subscribed: boolean;
  hidden: boolean;
  encryptMessages: boolean;
  total?: number;
  unseen?: number;
  size?: number;
  retention?: number;
}

interface WildDuckAddress {
  id: string;
  name?: string;
  address: string;
  main: boolean;
  tags: string[];
  created: string;
  metaData?: Record<string, any>;
  internalData?: Record<string, any>;
}
```

---

## Additional Resources

- [WildDuck GitHub Repository](https://github.com/nodemailer/wildduck)
- [WildDuck API Documentation](https://docs.wildduck.email/api/)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Last Updated:** 2025-10-09
