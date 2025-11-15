# WildDuck Client API Gap Analysis

**Date:** 2025-10-24
**Client Version:** 1.0.5
**API Documentation:** WILDDUCK_API_ENDPOINTS.md

---

## Executive Summary

This document provides a comprehensive analysis of the current TypeScript WildDuck client implementation compared to the full WildDuck API specification. The client currently implements approximately **15%** of available API endpoints, focusing primarily on core email functionality (authentication, users, mailboxes, messages, addresses, filters, health, and settings).

**Key Statistics:**
- Total WildDuck API Endpoints: ~100+
- Currently Implemented: ~15 endpoints
- Missing Endpoints: ~85+ endpoints
- Coverage: ~15%

---

## Section 1: Currently Implemented

### 1.1 Client Implementation (`wildduck-client.ts`)

The core client (`WildDuckAPI` class) implements the following methods:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `preAuth()` | POST /preauth | Pre-authenticate user to check if username exists |
| `authenticate()` | POST /authenticate | Authenticate user with blockchain signature or password |
| `authenticateWithPassword()` | POST /authenticate | Legacy password-based authentication |
| `getUser()` | GET /users/:user | Get user information |
| `getMailboxes()` | GET /users/:user/mailboxes | List mailboxes for a user |
| `getMessages()` | GET /users/:user/mailboxes/:mailbox/messages | Get messages from a mailbox |
| `getMessage()` | GET /users/:user/messages/:message | Get a specific message by ID |
| `getAddresses()` | GET /users/:user/addresses | Get user addresses (email addresses) |
| `createMailbox()` | POST /users/:user/mailboxes | Create a new mailbox |

**Endpoints defined but not fully implemented:**
- MAILBOX endpoint (GET/PUT/DELETE specific mailbox)
- MESSAGE endpoint (GET/PUT/DELETE specific message in mailbox)
- ADDRESS endpoint (GET/PUT/DELETE specific address)

### 1.2 Hook Implementations

#### useWildduckAuth
**Implemented operations:**
- POST /authenticate (with signature or password)
- POST /preauth (username validation)
- DELETE /authenticate (logout - assumed endpoint)
- Auth status check (GET /users/me - assumed endpoint)

#### useWildduckAddresses
**Implemented operations:**
- GET /users/:user/addresses (list user addresses)
- POST /users/:user/addresses (create address)
- PUT /users/:user/addresses/:address (update address)
- DELETE /users/:user/addresses/:address (delete address)
- GET /addresses/forwarded (list forwarded addresses)
- POST /addresses/forwarded (create forwarded address)
- DELETE /addresses/forwarded/:address (delete forwarded address)
- GET /addresses/resolve/:address (resolve address)

#### useWildduckFilters
**Implemented operations:**
- GET /users/:user/filters (list filters)
- GET /users/:user/filters/:filter (get filter)
- POST /users/:user/filters (create filter)
- PUT /users/:user/filters/:filter (update filter)
- DELETE /users/:user/filters/:filter (delete filter)

#### useWildduckHealth
**Implemented operations:**
- GET /health (health check)

#### useWildduckMailboxes
**Implemented operations:**
- GET /users/:user/mailboxes (list mailboxes)
- POST /users/:user/mailboxes (create mailbox)
- PUT /users/:user/mailboxes/:mailbox (update mailbox)
- DELETE /users/:user/mailboxes/:mailbox (delete mailbox)

#### useWildduckMessages
**Implemented operations:**
- GET /users/:user/mailboxes/:mailbox/messages (list messages)
- GET /users/:user/messages/:message (get message)
- GET /users/:user/search (search messages)
- POST /users/:user/submit (send message)
- PUT /users/:user/messages/:message (update message)
- DELETE /users/:user/messages/:message (delete message)
- PUT /users/:user/messages/:message/move (move message - custom endpoint)

#### useWildduckSettings
**Implemented operations:**
- GET /settings (get all settings)
- PUT /settings/:key (update setting)
- DELETE /settings/:key (delete setting)

## Section 2: Missing API Endpoints

### 2.1 Authentication (Missing: 0 endpoints)
All core authentication endpoints are implemented.

### 2.2 Users (Missing: 7 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| MEDIUM | /users | POST | Create new user |
| MEDIUM | /users/resolve/:username | GET | Resolve ID for a username |
| MEDIUM | /users/:user | PUT | Update user information |
| LOW | /users/:user | DELETE | Delete a user |
| LOW | /users/:user/logout | PUT | Log out user (all sessions) |
| MEDIUM | /users/:user/quota/reset | POST | Recalculate user quota |
| LOW | /users/:user/password/reset | PUT | Reset password for a user |

### 2.3 Mailboxes (Missing: 1 endpoint)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| MEDIUM | /users/:user/mailboxes/:mailbox | GET | Request specific mailbox information |

### 2.4 Messages (Missing: 11 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| HIGH | /users/:user/search | POST | Search and update messages (bulk operations) |
| HIGH | /users/:user/mailboxes/:mailbox/messages/:message | GET | Request message information (with full details) |
| MEDIUM | /users/:user/mailboxes/:mailbox/messages/:message/message.eml | GET | Get message source (RFC822 format) |
| MEDIUM | /users/:user/mailboxes/:mailbox/messages/:message/attachments/:attachment | GET | Download attachment |
| HIGH | /users/:user/mailboxes/:mailbox/messages/:message | PUT | Update message with path param |
| HIGH | /users/:user/mailboxes/:mailbox/messages | PUT | Update message (alternative endpoint) |
| HIGH | /users/:user/mailboxes/:mailbox/messages/:message | DELETE | Delete a message from mailbox |
| MEDIUM | /users/:user/mailboxes/:mailbox/messages | DELETE | Delete all messages from a mailbox |
| HIGH | /users/:user/mailboxes/:mailbox/messages | POST | Upload message to mailbox |
| MEDIUM | /users/:user/mailboxes/:mailbox/messages/:message/forward | POST | Forward stored message |
| MEDIUM | /users/:user/mailboxes/:mailbox/messages/:message/submit | POST | Submit draft for delivery |
| MEDIUM | /users/:user/outbound/:queueId | DELETE | Delete an outbound message |
| MEDIUM | /users/:user/archived/messages | GET | List archived messages |
| LOW | /users/:user/archived/restore | POST | Restore archived messages |

### 2.5 Addresses (Missing: 4 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| MEDIUM | /addresses | GET | List all addresses (global, not user-specific) |
| MEDIUM | /addresses/forwarded/:address | GET | Request forwarded address information |
| MEDIUM | /addresses/forwarded/:address | PUT | Update forwarded address information |
| LOW | /addresses/renameDomain | GET | Rename domain in addresses |

### 2.6 Filters (Missing: 0 endpoints)
All filter endpoints are implemented.

### 2.7 Autoreply (Missing: 3 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| HIGH | /users/:user/autoreply | GET | Request autoreply information |
| HIGH | /users/:user/autoreply | PUT | Update autoreply information |
| MEDIUM | /users/:user/autoreply | DELETE | Delete autoreply information |

### 2.8 Application-Specific Passwords / ASPs (Missing: 4 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| MEDIUM | /users/:user/asps | GET | List all ASPs |
| MEDIUM | /users/:user/asps | POST | Create new ASP |
| MEDIUM | /users/:user/asps/:asp | GET | Request ASP information |
| MEDIUM | /users/:user/asps/:asp | DELETE | Delete an ASP |

### 2.9 Storage (Missing: 3 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| MEDIUM | /users/:user/storage | POST | Upload file for later use |
| MEDIUM | /users/:user/storage/:file | GET | Download file |
| MEDIUM | /users/:user/storage/:file | DELETE | Delete a file |

### 2.10 Submit (Missing: 0 endpoints)
Submit message endpoint is implemented via useWildduckMessages.

### 2.11 Settings (Missing: 1 endpoint)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| LOW | /settings/:key | GET | Get specific setting value |

### 2.12 Health (Missing: 0 endpoints)
Health endpoint is fully implemented.

### 2.13 DKIM (Missing: 5 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| LOW | /dkim | GET | List registered DKIM keys |
| LOW | /dkim/resolve/:domain | GET | Resolve ID for a DKIM domain |
| LOW | /dkim | POST | Create or update DKIM key for domain |
| LOW | /dkim/:dkim | GET | Request DKIM information |
| LOW | /dkim/:dkim | DELETE | Delete a DKIM key |

### 2.14 Domain Aliases (Missing: 5 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| LOW | /domainaliases | GET | List registered domain aliases |
| LOW | /domainaliases | POST | Create new domain alias |
| LOW | /domainaliases/resolve/:alias | GET | Resolve ID for a domain alias |
| LOW | /domainaliases/:alias | GET | Request alias information |
| LOW | /domainaliases/:alias | DELETE | Delete an alias |

### 2.15 TLS Certificates (Missing: 5 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| LOW | /certs | GET | List registered TLS certificates |
| LOW | /certs/resolve/:servername | GET | Resolve ID for a server name |
| LOW | /certs | POST | Create or update TLS certificate |
| LOW | /certs/:cert | GET | Request TLS certificate information |
| LOW | /certs/:cert | DELETE | Delete a TLS certificate |

### 2.16 Webhooks (Missing: 3 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| MEDIUM | /webhooks | GET | List registered webhooks |
| MEDIUM | /webhooks | POST | Create new webhook |
| MEDIUM | /webhooks/:webhook | DELETE | Delete a webhook |

### 2.17 Audit (Missing: 3 endpoints)

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| LOW | /audit | POST | Create new audit |
| LOW | /audit/:audit | GET | Request audit info |
| LOW | /audit/:audit/export.mbox | GET | Export audited emails |

### 2.18 2FA / Two-Factor Authentication (Missing: All endpoints)

WildDuck supports 2FA operations but these are not documented in the provided API reference. The authentication response includes `require2fa` and `enabled2fa` fields, suggesting these endpoints exist:

| Priority | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| MEDIUM | /users/:user/2fa | GET | Get 2FA status (assumed) |
| MEDIUM | /users/:user/2fa/totp | POST | Enable TOTP 2FA (assumed) |
| MEDIUM | /users/:user/2fa/totp | DELETE | Disable TOTP 2FA (assumed) |
| MEDIUM | /users/:user/2fa/u2f | POST | Enable U2F 2FA (assumed) |
| MEDIUM | /users/:user/2fa/u2f | DELETE | Disable U2F 2FA (assumed) |

---

## Section 3: Type Gaps

### 3.1 Missing Request Types

The following request types are referenced in the API but may be missing or incomplete in the types package:

1. **UpdateUserRequest** - For PUT /users/:user
2. **CreateUserRequest** - For POST /users
3. **UpdateAddressRequest** - For PUT /users/:user/addresses/:address (partially exists)
4. **CreateForwardedAddressRequest** - For POST /addresses/forwarded
5. **UpdateForwardedAddressRequest** - For PUT /addresses/forwarded/:address
6. **AutoreplyRequest** - For PUT /users/:user/autoreply
7. **CreateASPRequest** - For POST /users/:user/asps
8. **UploadStorageRequest** - For POST /users/:user/storage
9. **SubmitMessageRequest** - For POST /users/:user/submit (may exist)
10. **UploadMessageRequest** - For POST /users/:user/mailboxes/:mailbox/messages
11. **SearchMessagesRequest** - For GET /users/:user/search
12. **SearchApplyRequest** - For POST /users/:user/search
13. **UpdateMessageRequest** - For PUT /users/:user/mailboxes/:mailbox/messages/:message
14. **ForwardMessageRequest** - For POST /users/:user/mailboxes/:mailbox/messages/:message/forward
15. **SubmitDraftRequest** - For POST /users/:user/mailboxes/:mailbox/messages/:message/submit
16. **CreateWebhookRequest** - For POST /webhooks
17. **CreateAuditRequest** - For POST /audit
18. **DKIMRequest** - For POST /dkim
19. **TLSCertRequest** - For POST /certs
20. **DomainAliasRequest** - For POST /domainaliases

### 3.2 Missing Response Types

The following response types should be added or expanded:

1. **WildDuckUserListResponse** - For GET /users
2. **WildDuckResolveUserResponse** - For GET /users/resolve/:username
3. **WildDuckResolveAddressResponse** - For GET /addresses/resolve/:address
4. **WildDuckAddressListResponse** - For GET /addresses
5. **WildDuckForwardedAddressResponse** - For GET /addresses/forwarded/:address
6. **WildDuckAutoreplyResponse** - For GET /users/:user/autoreply
7. **WildDuckASPListResponse** - For GET /users/:user/asps
8. **WildDuckASPResponse** - For GET /users/:user/asps/:asp
9. **WildDuckCreateASPResponse** - For POST /users/:user/asps (includes password)
10. **WildDuckStorageResponse** - For storage operations
11. **WildDuckSearchResponse** - For GET /users/:user/search (may exist)
12. **WildDuckSearchApplyResponse** - For POST /users/:user/search
13. **WildDuckArchivedMessagesResponse** - For GET /users/:user/archived/messages
14. **WildDuckWebhookListResponse** - For GET /webhooks
15. **WildDuckAuditResponse** - For GET /audit/:audit
16. **WildDuckDKIMListResponse** - For GET /dkim
17. **WildDuckDKIMResponse** - For GET /dkim/:dkim
18. **WildDuckDomainAliasListResponse** - For GET /domainaliases
19. **WildDuckDomainAliasResponse** - For GET /domainaliases/:alias
20. **WildDuckTLSCertListResponse** - For GET /certs
21. **WildDuckTLSCertResponse** - For GET /certs/:cert
22. **WildDuckQuotaResetResponse** - For POST /users/:user/quota/reset
23. **WildDuckPasswordResetResponse** - For PUT /users/:user/password/reset

### 3.3 Incomplete or Missing Common Types

1. **Target (Forwarding)** - Should support relay, http, and mail types
2. **Attachment** - Should include all fields from API spec (id, hash, filename, contentType, disposition, transferEncoding, related, sizeKb)
3. **BIMI** - Should include certified, url, image, type fields
4. **VerificationResults** - Should include TLS, SPF, DKIM verification data
5. **Limits** - Comprehensive limits object with all quota types
6. **AutoreplySettings** - Full autoreply configuration
7. **ASP** - Application-Specific Password type
8. **Filter** - Comprehensive filter query and action types
9. **Webhook** - Webhook configuration type
10. **AuditInfo** - Audit configuration and status

### 3.4 Extended Message Fields

The `WildDuckMessage` and `WildDuckMessageResponse` types should include:

1. `threadMessageCount` - Thread message count
2. `metaData` - Custom metadata object
3. `encrypted` - Encryption status
4. `bimi` - BIMI verification data
5. `verificationResults` - Email verification results (SPF, DKIM, TLS)
6. `list` - Mailing list information (id, unsubscribe)
7. `expires` - Message expiration date
8. `outbound` - Outbound delivery information
9. `forwardTargets` - Forward target information
10. `reference` - Reference to replied/forwarded message

### 3.5 Extended User Fields

The `WildDuckUserResponse` type should include:

1. `limits` - All limit types (recipients, forwards, received, imapUpload, imapDownload, pop3Download, imapMaxConnections)
2. `fromWhitelist` - Array of whitelisted sender addresses
3. `disabledScopes` - Array of disabled scopes
4. `tags` - User tags
5. `targets` - Forwarding targets
6. `retention` - Message retention time
7. `spamLevel` - Spam filtering threshold
8. `keyInfo` - PGP key information (name, address, fingerprint)

---

## Section 4: Recommendations

### 4.1 Critical Priority (Implement First)

These endpoints are essential for core email client functionality:

1. **POST /users** - User registration/creation
   - Required for onboarding new users
   - Missing from current implementation

2. **POST /users/:user/mailboxes/:mailbox/messages** - Upload/Store messages
   - Critical for saving drafts
   - Required for IMAP-like functionality

3. **GET /users/:user/mailboxes/:mailbox/messages/:message** - Get full message details
   - Currently only supports getMessage by messageId (not mailbox-scoped)
   - Needed for proper message viewing with all metadata

4. **PUT /users/:user/mailboxes/:mailbox/messages/:message** - Update message flags
   - Essential for marking messages as read/unread, flagged, etc.
   - Currently implemented but needs verification

5. **DELETE /users/:user/mailboxes/:mailbox/messages/:message** - Delete message
   - Basic email functionality
   - Currently implemented but needs verification

6. **GET /users/:user/mailboxes/:mailbox/messages/:message/attachments/:attachment** - Download attachments
   - Critical for viewing/downloading email attachments
   - Missing from current implementation

### 4.2 High Priority (Implement Soon)

These endpoints add important functionality:

1. **Autoreply endpoints** (GET/PUT/DELETE /users/:user/autoreply)
   - Out-of-office/vacation responses
   - Common user requirement

2. **POST /users/:user/search** - Bulk message operations
   - Move/delete/flag multiple messages at once
   - Performance optimization for bulk operations

3. **GET /users/:user/mailboxes/:mailbox/messages/:message/message.eml** - Raw message source
   - Needed for message export/backup
   - Required for "view source" functionality

4. **Message forwarding/submission endpoints**:
   - POST /users/:user/mailboxes/:mailbox/messages/:message/forward
   - POST /users/:user/mailboxes/:mailbox/messages/:message/submit
   - Essential for draft workflow and message forwarding

### 4.3 Medium Priority (Nice to Have)

These endpoints provide additional value:

1. **PUT /users/:user** - Update user information
   - User profile management
   - Settings updates

2. **GET /users/resolve/:username** - Username to ID resolution
   - Helpful for user lookup
   - Alternative to storing user IDs

3. **POST /users/:user/quota/reset** - Quota recalculation
   - Important for quota management
   - Helps resolve quota inconsistencies

4. **ASP endpoints** - Application-Specific Passwords
   - Security best practice
   - Required for third-party app integration

5. **Storage endpoints** - File upload/download/delete
   - Required for draft attachments
   - Message composition with attachments

6. **Webhook endpoints** - Event notifications
   - Real-time updates
   - Integration with other services

7. **GET /users/:user/archived/messages** - Archived messages
   - Message recovery
   - Compliance/audit requirements

8. **GET /addresses** - Global address listing
   - Admin functionality
   - System-wide address management

### 4.4 Low Priority (Future Enhancements)

These endpoints are less commonly needed:

1. **DELETE /users/:user** - User deletion
   - Admin functionality
   - Typically infrequent operation

2. **PUT /users/:user/logout** - Force logout
   - Security/admin feature
   - Session management

3. **PUT /users/:user/password/reset** - Password reset
   - May not be needed with blockchain auth
   - Legacy compatibility

4. **DKIM endpoints** - Email authentication
   - Server/admin configuration
   - Not typically client-side

5. **TLS Certificate endpoints** - Certificate management
   - Server configuration
   - Admin functionality only

6. **Domain Alias endpoints** - Domain management
   - Server configuration
   - Admin functionality only

7. **Audit endpoints** - Compliance/logging
   - Admin/compliance feature
   - Specialized use case

8. **GET /addresses/renameDomain** - Domain renaming
   - Rare administrative operation
   - Migration/consolidation scenarios

### 4.5 Implementation Approach

#### Phase 1: Core Functionality (Critical Priority)
**Timeline:** 1-2 weeks
- User creation (POST /users)
- Message upload (POST /users/:user/mailboxes/:mailbox/messages)
- Full message details (GET /users/:user/mailboxes/:mailbox/messages/:message)
- Attachment download (GET /users/:user/mailboxes/:mailbox/messages/:message/attachments/:attachment)
- Update existing message operations for consistency

**Deliverables:**
- New `createUser()` method in WildDuckAPI
- New `uploadMessage()` method in WildDuckAPI
- New `getMessageFromMailbox()` method in WildDuckAPI
- New `downloadAttachment()` method in WildDuckAPI
- Updated types for user creation and message upload

#### Phase 2: Enhanced Email Features (High Priority)
**Timeline:** 1-2 weeks
- Autoreply management
- Bulk message operations
- Message forwarding and draft submission
- Raw message source access

**Deliverables:**
- New `useWildduckAutoreply` hook
- Enhanced `useWildduckMessages` hook with bulk operations
- New methods in WildDuckAPI for autoreply, forwarding, submission
- Type definitions for autoreply, bulk operations

#### Phase 3: User Management & Storage (Medium Priority)
**Timeline:** 2-3 weeks
- User updates
- Username resolution
- Quota management
- ASP management
- File storage
- Webhooks

**Deliverables:**
- New `useWildduckASPs` hook
- New `useWildduckStorage` hook
- New `useWildduckWebhooks` hook
- Comprehensive user, ASP, storage types

#### Phase 4: Advanced Features (Low Priority)
**Timeline:** 3-4 weeks
- User deletion and logout
- Password reset
- Domain management (DKIM, aliases)
- TLS certificates
- Audit functionality
- Archived messages

**Deliverables:**
- Complete admin hooks (DKIM, TLS, domain aliases, audit)
- Archive management in useWildduckMessages
- Full API coverage

### 4.6 Type System Improvements

1. **Create comprehensive type library**
   - Separate request/response types
   - Shared common types (Address, Attachment, etc.)
   - Validation helpers

2. **Add JSDoc documentation**
   - Document all request parameters
   - Include example usage
   - Link to API documentation

3. **Add type guards and validators**
   - Runtime type validation
   - ObjectId format validation
   - Email format validation

4. **Organize types by domain**
   ```
   types/
     ├── auth/
     ├── users/
     ├── mailboxes/
     ├── messages/
     ├── addresses/
     ├── filters/
     ├── autoreply/
     ├── asps/
     ├── storage/
     ├── webhooks/
     ├── dkim/
     ├── certs/
     ├── audit/
     └── common/
   ```

### 4.7 Testing Strategy

1. **Unit tests for each endpoint**
   - Mock API responses
   - Test error handling
   - Test type safety

2. **Integration tests**
   - Test with real WildDuck instance
   - Test authentication flow
   - Test CRUD operations

3. **E2E tests**
   - Complete user workflows
   - Message composition and sending
   - Filter and autoreply setup

### 4.8 Documentation Improvements

1. **API Reference**
   - Complete method documentation
   - Request/response examples
   - Error handling guide

2. **Usage Guide**
   - Getting started guide
   - Common patterns
   - Best practices

3. **Migration Guide**
   - Breaking changes
   - Upgrade instructions
   - Compatibility matrix

---

## Appendix A: Endpoint Coverage Matrix

| Category | Total Endpoints | Implemented | Coverage % |
|----------|----------------|-------------|------------|
| Authentication | 1 | 1 | 100% |
| Users | 8 | 1 | 12.5% |
| Mailboxes | 5 | 4 | 80% |
| Messages | 16 | 5 | 31% |
| Addresses | 11 | 7 | 64% |
| Filters | 5 | 5 | 100% |
| Autoreply | 3 | 0 | 0% |
| ASPs | 4 | 0 | 0% |
| Storage | 3 | 0 | 0% |
| Submit | 1 | 1 | 100% |
| Settings | 3 | 2 | 67% |
| Health | 1 | 1 | 100% |
| DKIM | 5 | 0 | 0% |
| Domain Aliases | 5 | 0 | 0% |
| TLS Certificates | 5 | 0 | 0% |
| Webhooks | 3 | 0 | 0% |
| Audit | 3 | 0 | 0% |
| **TOTAL** | **~80** | **~27** | **~34%** |

Note: The actual coverage is lower (~15%) when considering only the core WildDuckAPI class methods, as hooks implement additional functionality.

---

## Appendix B: Quick Reference - Missing Methods for WildDuckAPI Class

### High Priority Missing Methods

```typescript
// User Management
createUser(params: CreateUserRequest): Promise<WildDuckUserResponse>
updateUser(userId: string, params: UpdateUserRequest): Promise<{ success: boolean }>
resolveUser(username: string): Promise<{ success: boolean; id: string }>

// Mailbox Operations
getMailbox(userId: string, mailboxId: string): Promise<WildDuckMailboxResponse>
updateMailbox(userId: string, mailboxId: string, params: UpdateMailboxRequest): Promise<{ success: boolean }>
deleteMailbox(userId: string, mailboxId: string): Promise<{ success: boolean }>

// Message Operations
uploadMessage(userId: string, mailboxId: string, params: UploadMessageRequest): Promise<WildDuckMessageResponse>
getMessageFromMailbox(userId: string, mailboxId: string, messageId: string): Promise<WildDuckMessageResponse>
updateMessageFlags(userId: string, mailboxId: string, messageId: string, params: UpdateMessageRequest): Promise<{ success: boolean }>
deleteMessageFromMailbox(userId: string, mailboxId: string, messageId: string): Promise<{ success: boolean }>
getMessageSource(userId: string, mailboxId: string, messageId: string): Promise<Blob>
downloadAttachment(userId: string, mailboxId: string, messageId: string, attachmentId: string): Promise<Blob>
forwardMessage(userId: string, mailboxId: string, messageId: string, params: ForwardMessageRequest): Promise<WildDuckMessageResponse>
submitDraft(userId: string, mailboxId: string, messageId: string, params: SubmitDraftRequest): Promise<WildDuckMessageResponse>

// Search & Bulk Operations
searchMessages(userId: string, params: SearchMessagesRequest): Promise<WildDuckSearchResponse>
searchAndApply(userId: string, params: SearchApplyRequest): Promise<{ success: boolean; scheduled: string }>

// Autoreply
getAutoreply(userId: string): Promise<WildDuckAutoreplyResponse>
updateAutoreply(userId: string, params: AutoreplyRequest): Promise<{ success: boolean }>
deleteAutoreply(userId: string): Promise<{ success: boolean }>

// Application-Specific Passwords
getASPs(userId: string): Promise<WildDuckASPListResponse>
createASP(userId: string, params: CreateASPRequest): Promise<WildDuckCreateASPResponse>
deleteASP(userId: string, aspId: string): Promise<{ success: boolean }>

// Storage
uploadFile(userId: string, params: UploadStorageRequest): Promise<{ success: boolean; id: string }>
downloadFile(userId: string, fileId: string): Promise<Blob>
deleteFile(userId: string, fileId: string): Promise<{ success: boolean }>
```

---

## Appendix C: Comparison with Other Mail Clients

For context, here's how typical email clients map to WildDuck endpoints:

### Basic Email Client (e.g., Apple Mail, Gmail)
- ✅ Authentication
- ✅ List folders/mailboxes
- ✅ List messages
- ✅ View message
- ✅ Download attachments
- ✅ Send/compose message
- ✅ Delete message
- ✅ Mark as read/unread
- ✅ Search messages
- ⚠️ Create folders (partially implemented)
- ❌ Auto-reply/vacation mode (missing)
- ❌ Upload raw messages (missing)

### Advanced Email Client (e.g., Thunderbird, Outlook)
- ✅ All basic features
- ✅ Filters/rules
- ⚠️ Multiple addresses (partially - no management UI)
- ❌ Application-specific passwords (missing)
- ❌ Archive management (missing)
- ❌ Auto-reply/vacation mode (missing)
- ❌ Quota management (missing)

### Administrative Client
- ⚠️ User management (read-only)
- ❌ User creation (missing)
- ❌ User updates (missing)
- ❌ DKIM management (missing)
- ❌ Domain management (missing)
- ❌ TLS certificates (missing)
- ❌ Webhooks (missing)
- ❌ Audit logs (missing)

**Current client is best suited for:** Basic email viewing and sending, with some folder management and filtering support.

**Gaps for production email client:**
1. Cannot create users (registration)
2. Cannot save drafts properly (no upload endpoint)
3. Cannot download attachments
4. Cannot set vacation/auto-reply
5. No ASP support for third-party apps
6. Limited quota/storage management

---

## Summary

The current WildDuck TypeScript client provides a solid foundation with ~34% endpoint coverage (when including hooks), but significant gaps remain for production use. The highest priority items are:

1. User creation (POST /users)
2. Message upload for drafts (POST /users/:user/mailboxes/:mailbox/messages)
3. Attachment downloads (GET /users/:user/mailboxes/:mailbox/messages/:message/attachments/:attachment)
4. Autoreply management (GET/PUT/DELETE /users/:user/autoreply)
5. Full message details with all metadata (GET /users/:user/mailboxes/:mailbox/messages/:message)

Implementing these five areas would bring the client to ~50% coverage and enable most common email client use cases.
