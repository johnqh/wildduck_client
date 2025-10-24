/**
 * Mock data helpers for Wildduck API responses in development mode
 */

import type {
  WildduckAuthResponse as AuthenticationResponse,
  WildduckPreAuthResponse as PreAuthResponse,
} from "@sudobility/types";

export class WildduckMockData {
  static getAuthStatus() {
    return {
      authenticated: true,
      user: {
        id: "mock-user-id",
        username: "mock@example.com",
      },
    };
  }

  static getPreAuth(): PreAuthResponse {
    return {
      success: true,
      id: "mock-session-id",
      nonce: "mock-nonce-12345",
      algorithm: "ES256K",
    } as unknown as PreAuthResponse;
  }

  static getAuthentication(username: string): AuthenticationResponse {
    return {
      success: true,
      token: "mock-auth-token-12345",
      user: { id: "mock-user-id", username },
    } as unknown as AuthenticationResponse;
  }

  static getLogout() {
    return { success: true };
  }

  static getHealth() {
    return {
      success: true,
      data: {
        status: "healthy",
        version: "1.16.0",
        database: { status: "connected", responseTime: "5ms" },
        redis: { status: "connected", responseTime: "2ms" },
        imap: { status: "running", port: 993 },
        smtp: { status: "running", port: 587 },
        pop3: { status: "running", port: 995 },
        uptime: 86400,
        memory: { used: "512MB", total: "2GB" },
      },
    };
  }

  static getSettings() {
    return {
      success: true,
      data: {
        settings: [
          { key: "maxStorage", value: "1GB", type: "storage" },
          { key: "maxUsers", value: "1000", type: "number" },
          { key: "enableImap", value: "true", type: "boolean" },
          { key: "enableSmtp", value: "true", type: "boolean" },
          { key: "enablePop3", value: "false", type: "boolean" },
        ],
      },
    };
  }

  static getUpdateSetting() {
    return { success: true };
  }

  static getDeleteSetting() {
    return { success: true };
  }

  static getMailboxes() {
    return {
      success: true,
      data: {
        mailboxes: [
          {
            id: "inbox",
            name: "INBOX",
            path: "INBOX",
            specialUse: "\\Inbox",
            messages: 42,
          },
          {
            id: "sent",
            name: "Sent",
            path: "Sent",
            specialUse: "\\Sent",
            messages: 15,
          },
          {
            id: "drafts",
            name: "Drafts",
            path: "Drafts",
            specialUse: "\\Drafts",
            messages: 3,
          },
          {
            id: "trash",
            name: "Trash",
            path: "Trash",
            specialUse: "\\Trash",
            messages: 8,
          },
        ],
      },
    };
  }

  static getCreateMailbox(): { success: boolean; id: string } {
    return { success: true, id: `mock-mailbox-id-${Date.now()}` };
  }

  static getUpdateMailbox() {
    return { success: true };
  }

  static getDeleteMailbox() {
    return { success: true };
  }

  static getUser(userId: string) {
    return {
      success: true,
      data: {
        user: {
          id: userId,
          username: `user-${userId}@example.com`,
          name: `Mock User ${userId}`,
          quota: { allowed: 1073741824, used: 134217728 },
          activated: true,
          disabled: false,
          suspended: false,
          created: new Date().toISOString(),
        },
      },
    };
  }

  static getUsers() {
    return {
      success: true,
      data: {
        users: [
          {
            id: "user1",
            username: "user1@example.com",
            name: "Mock User 1",
            activated: true,
          },
          {
            id: "user2",
            username: "user2@example.com",
            name: "Mock User 2",
            activated: true,
          },
          {
            id: "user3",
            username: "user3@example.com",
            name: "Mock User 3",
            activated: false,
          },
        ],
        total: 3,
        page: 1,
        pages: 1,
      },
    };
  }

  static getFilters() {
    return {
      success: true,
      data: {
        filters: [
          {
            id: "filter1",
            name: "Important emails",
            query: { from: "important@company.com" },
            action: { seen: true, mailbox: "Important" },
          },
          {
            id: "filter2",
            name: "Spam filter",
            query: { subject: "SPAM" },
            action: { delete: true },
          },
        ],
      },
    };
  }

  static getFilter(filterId: string) {
    return {
      success: true,
      data: {
        filter: {
          id: filterId,
          name: `Mock Filter ${filterId}`,
          query: { from: "test@example.com" },
          action: { seen: true },
        },
      },
    };
  }

  static getCreateFilter(): { success: boolean; id: string } {
    return { success: true, id: `mock-filter-id-${Date.now()}` };
  }

  static getUpdateFilter() {
    return { success: true };
  }

  static getDeleteFilter() {
    return { success: true };
  }

  static getUserAddresses() {
    return {
      success: true,
      data: {
        addresses: [
          {
            id: "addr1",
            address: "main@example.com",
            main: true,
            created: new Date().toISOString(),
          },
          {
            id: "addr2",
            address: "alias@example.com",
            main: false,
            created: new Date().toISOString(),
          },
        ],
      },
    };
  }

  static getCreateAddress(): { success: boolean; id: string } {
    return { success: true, id: `mock-address-id-${Date.now()}` };
  }

  static getUpdateAddress() {
    return { success: true };
  }

  static getDeleteAddress() {
    return { success: true };
  }

  static getForwardedAddresses() {
    return {
      success: true,
      data: {
        addresses: [
          {
            id: "fwd1",
            address: "forward@example.com",
            target: "destination@example.com",
          },
        ],
      },
    };
  }

  static getCreateForwardedAddress(): { success: boolean; id: string } {
    return { success: true, id: `mock-forwarded-id-${Date.now()}` };
  }

  static getDeleteForwardedAddress() {
    return { success: true };
  }

  static getResolveAddress(address: string): {
    success: boolean;
    user?: string;
  } {
    return { success: true, user: `mock-user-${address.replace("@", "-at-")}` };
  }

  // TanStack Query specific mocks
  static getHealthQuery() {
    return {
      success: true,
      version: "1.16.0",
      mongodb: {
        status: "connected",
        responseTime: "5ms",
      },
      redis: {
        status: "connected",
        responseTime: "2ms",
      },
      imap: {
        status: "running",
      },
      smtp: {
        status: "running",
      },
    };
  }

  static getUsersListQuery() {
    return {
      users: [
        { id: "user1", username: "user1@example.com", name: "Mock User 1" },
        { id: "user2", username: "user2@example.com", name: "Mock User 2" },
      ],
      total: 2,
      page: 1,
      pages: 1,
    };
  }

  static getUserQuery(userId: string) {
    return {
      id: userId,
      username: `${userId}@example.com`,
      name: `Mock User ${userId}`,
      quota: { allowed: 1073741824, used: 134217728 },
      activated: true,
    };
  }

  static getUserAddressesQuery() {
    return {
      addresses: [
        { id: "addr1", address: "main@example.com", main: true },
        { id: "addr2", address: "alias@example.com", main: false },
      ],
    };
  }

  static getUserMessagesQuery() {
    return {
      messages: [
        {
          id: "msg1",
          mailbox: "INBOX",
          thread: "thread1",
          envelope: {
            date: new Date().toISOString(),
            subject: "Mock Message 1",
            from: [{ name: "Mock Sender", address: "sender@example.com" }],
            to: [{ name: "Mock Recipient", address: "recipient@example.com" }],
          },
          seen: false,
          flagged: false,
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    };
  }

  static getMessageQuery(messageId: string, userId: string) {
    return {
      id: messageId,
      mailbox: "mock-mailbox",
      thread: "mock-thread",
      envelope: {
        date: new Date().toISOString(),
        subject: `Mock Message ${messageId}`,
        from: [{ name: "Mock Sender", address: "sender@example.com" }],
        to: [{ name: "Mock Recipient", address: `${userId}@example.com` }],
        messageId,
      },
      date: new Date().toISOString(),
      idate: new Date().toISOString(),
      size: 2048,
      intro: "This is a mock email message content...",
      attachments: false,
      seen: false,
      deleted: false,
      draft: false,
      flagged: false,
      answered: false,
      forwarded: false,
    };
  }

  static getUserFiltersQuery() {
    return {
      filters: [
        {
          id: "filter1",
          name: "Important emails",
          query: { from: "important@company.com" },
          action: { seen: true },
        },
      ],
    };
  }

  static getUserSettingsQuery() {
    return {
      settings: {
        maxStorage: "1GB",
        maxUsers: 1000,
        enableImap: true,
        enableSmtp: true,
        enablePop3: false,
      },
    };
  }

  static getUserMailboxesQuery() {
    return {
      mailboxes: [
        {
          id: "inbox",
          name: "INBOX",
          path: "INBOX",
          specialUse: "\\Inbox",
          messages: 42,
        },
        {
          id: "sent",
          name: "Sent",
          path: "Sent",
          specialUse: "\\Sent",
          messages: 15,
        },
      ],
    };
  }

  static getAuthStatusQuery() {
    return {
      authenticated: true,
      user: { id: "mock-user", username: "mock@example.com" },
    };
  }

  static getSearchMessagesQuery() {
    return {
      messages: [
        {
          id: "search-result-1",
          mailbox: "INBOX",
          envelope: {
            subject: "Search Result 1",
            from: [{ name: "Search Sender", address: "search@example.com" }],
          },
          seen: false,
        },
      ],
      total: 1,
    };
  }
}
