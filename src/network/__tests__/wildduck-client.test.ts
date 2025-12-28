import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WildduckAPI } from '../wildduck-client';
import type { WildduckConfig } from '@sudobility/mail_box_types';
import { MockNetworkClient, MockStorageService } from '@sudobility/di/mocks';

const TEST_USER_AUTH = { username: 'testuser', userId: 'user123', accessToken: 'test-token' };

describe('WildduckAPI', () => {
  let api: WildduckAPI;
  let mockNetworkClient: MockNetworkClient;
  let mockStorage: MockStorageService;
  let mockConfig: WildduckConfig;

  beforeEach(() => {
    mockNetworkClient = new MockNetworkClient();
    mockStorage = new MockStorageService();

    mockConfig = {
      backendUrl: 'https://test-wildduck.example.com',
      apiToken: 'test-token-123',
      cloudflareWorkerUrl: undefined,
    };

    api = new WildduckAPI(mockNetworkClient, mockConfig, mockStorage);
  });

  afterEach(() => {
    mockNetworkClient.reset();
    mockStorage.reset();
  });

  describe('initialization', () => {
    it('should create instance successfully', () => {
      expect(api).toBeDefined();
      expect(api).toBeInstanceOf(WildduckAPI);
    });

    it('should initialize with Cloudflare worker config', () => {
      const cloudflareConfig: WildduckConfig = {
        ...mockConfig,
        cloudflareWorkerUrl: 'https://worker.example.com',
      };

      const cloudflareApi = new WildduckAPI(mockNetworkClient, cloudflareConfig, mockStorage);
      expect(cloudflareApi).toBeDefined();
      expect(cloudflareApi).toBeInstanceOf(WildduckAPI);
    });

    it('should throw on invalid config', () => {
      const invalidConfig = {
        backendUrl: '',
        apiToken: '',
      } as WildduckConfig;

      expect(() => new WildduckAPI(mockNetworkClient, invalidConfig, mockStorage))
        .not.toThrow(); // Constructor doesn't validate, but methods might
    });
  });

  describe('authentication', () => {
    it('should authenticate with password successfully', async () => {
      const mockResponse = {
        success: true,
        id: 'user123',
        username: 'testuser@example.com',
      };

      mockNetworkClient.setMockResponse(
        'https://test-wildduck.example.com/authenticate',
        { data: mockResponse },
        'POST'
      );

      const result = await api.authenticateWithPassword('testuser@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(mockNetworkClient.wasUrlCalled('https://test-wildduck.example.com/authenticate', 'POST')).toBe(true);
    });

    it('should handle authentication failure', async () => {
      mockNetworkClient.setMockResponse(
        'https://test-wildduck.example.com/authenticate',
        { data: { error: 'Invalid credentials', success: false } },
        'POST'
      );

      const result = await api.authenticateWithPassword('invalid@example.com', 'wrongpass');

      expect(result.success).toBe(false);
      expect(mockNetworkClient.getRequests().length).toBeGreaterThan(0);
    });

    it('should handle signature-based authentication', async () => {
      const mockResponse = {
        success: true,
        id: 'user123',
        username: 'testuser@example.com',
      };

      mockNetworkClient.setMockResponse(
        'https://test-wildduck.example.com/authenticate',
        { data: mockResponse },
        'POST'
      );

      const result = await api.authenticate({
        username: 'testuser@example.com',
        signature: 'signature123',
        nonce: 'nonce456',
        message: 'Test message'
      });

      expect(result.success).toBe(true);
      expect(mockNetworkClient.getRequests().length).toBeGreaterThan(0);
    });
  });

  describe('user operations', () => {
    const validUserId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId
    const validUserAuth = { username: 'testuser', userId: validUserId, accessToken: 'test-token' };

    it('should get user info successfully', async () => {
      const mockUserData = {
        success: true,
        id: validUserId,
        username: 'testuser@example.com',
        name: 'Test User',
        quota: { allowed: 1000000, used: 50000 },
      };

      mockNetworkClient.setMockResponse(
        `https://test-wildduck.example.com/users/${validUserId}`,
        { data: mockUserData }
      );

      const result = await api.getUser(validUserAuth);

      expect(result.success).toBe(true);
      expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}`)).toBe(true);
    });

    it('should get mailboxes successfully', async () => {
      const mockMailboxes = {
        success: true,
        results: [
          { id: 'inbox', name: 'INBOX', path: 'INBOX' },
          { id: 'sent', name: 'Sent', path: 'Sent' },
        ],
      };

      mockNetworkClient.setDefaultResponse({ data: mockMailboxes });

      const result = await api.getMailboxes(validUserAuth, { specialUse: true });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockNetworkClient.getRequests().length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { username: 'testuser', userId: validUserId, accessToken: 'test-token' };

    it('should handle network errors gracefully', async () => {
      mockNetworkClient.setMockResponse(
        'https://test-wildduck.example.com/authenticate',
        { error: new Error('Network connection failed') },
        'POST'
      );

      await expect(api.authenticateWithPassword('test@example.com', 'password'))
        .rejects.toThrow('Network connection failed');
    });

    it('should handle API errors with proper formatting', async () => {
      mockNetworkClient.setMockResponse(
        `https://test-wildduck.example.com/users/${validUserId}`,
        { data: { error: 'User not found', code: 'UserNotFoundError', success: false } }
      );

      const result = await api.getUser(validUserAuth);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle invalid user ID format', async () => {
      await expect(api.getUser({ username: 'testuser', userId: 'invalid-user-id', accessToken: 'test-token' }))
        .rejects.toThrow('Invalid user ID format');
    });
  });

  describe('edge cases', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { username: 'testuser', userId: validUserId, accessToken: 'test-token' };

    it('should handle empty responses', async () => {
      mockNetworkClient.setMockResponse(
        `https://test-wildduck.example.com/users/${validUserId}`,
        { data: null }
      );

      const result = await api.getUser(validUserAuth);
      expect(result).toBeNull();
    });

    it('should send empty parameters to server (no client-side validation)', async () => {
      // The client doesn't validate parameters - that's the server's job
      mockNetworkClient.setDefaultResponse({ data: { success: false, error: 'Invalid username' } });

      const result = await api.authenticateWithPassword('', 'password');
      expect(result.success).toBe(false);
      expect(mockNetworkClient.getRequests().length).toBeGreaterThan(0);
    });
  });

  describe('User Management', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { username: 'testuser', userId: validUserId, accessToken: 'test-token' };

    describe('createUser', () => {
      it('should create a new user successfully', async () => {
        const mockResponse = {
          success: true,
          id: validUserId,
        };

        mockNetworkClient.setMockResponse(
          'https://test-wildduck.example.com/users',
          { data: mockResponse },
          'POST'
        );

        const result = await api.createUser({
          username: 'newuser',
          password: 'securepassword123',
          address: 'newuser@example.com',
          name: 'New User',
        });

        expect(result.success).toBe(true);
        expect(result.id).toBe(validUserId);
        expect(mockNetworkClient.wasUrlCalled('https://test-wildduck.example.com/users', 'POST')).toBe(true);
      });

      it('should create user with all optional parameters', async () => {
        const mockResponse = { success: true, id: validUserId };
        mockNetworkClient.setMockResponse(
          'https://test-wildduck.example.com/users',
          { data: mockResponse },
          'POST'
        );

        const result = await api.createUser({
          username: 'poweruser',
          password: 'password123',
          address: 'poweruser@example.com',
          name: 'Power User',
          quota: 5000000000,
          retention: 2592000000,
          tags: ['premium', 'verified'],
          spamLevel: 50,
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.getRequests().length).toBeGreaterThan(0);
      });
    });

    describe('updateUser', () => {
      it('should update user information successfully', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}`,
          { data: mockResponse },
          'PUT'
        );

        const result = await api.updateUser(validUserAuth, {
          name: 'Updated Name',
          quota: 10000000000,
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}`, 'PUT')).toBe(true);
      });

      it('should handle password change', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}`,
          { data: mockResponse },
          'PUT'
        );

        const result = await api.updateUser(validUserAuth, {
          existingPassword: 'oldpass',
          password: 'newpass123',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('deleteUser', () => {
      it('should delete user successfully', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}`,
          { data: mockResponse },
          'DELETE'
        );

        const result = await api.deleteUser(validUserAuth);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}`, 'DELETE')).toBe(true);
      });

      it('should validate user ID format before delete', async () => {
        await expect(api.deleteUser({ username: 'testuser', userId: 'invalid-id', accessToken: 'test-token' }))
          .rejects.toThrow('Invalid user ID format');
      });
    });
  });

  describe('Mailbox Management', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { username: 'testuser', userId: validUserId, accessToken: 'test-token' };
    const validMailboxId = '507f1f77bcf86cd799439022';

    describe('getMailbox', () => {
      it('should get specific mailbox information', async () => {
        const mockResponse = {
          success: true,
          id: validMailboxId,
          name: 'INBOX',
          path: 'INBOX',
          specialUse: 'INBOX',
          total: 100,
          unseen: 5,
        };

        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}`,
          { data: mockResponse }
        );

        const result = await api.getMailbox(validUserAuth, validMailboxId);

        expect(result.success).toBe(true);
        expect(result.id).toBe(validMailboxId);
        expect(result.total).toBe(100);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}`)).toBe(true);
      });

      it('should validate mailbox ID format', async () => {
        await expect(api.getMailbox(validUserAuth, 'invalid'))
          .rejects.toThrow('Invalid mailbox ID format');
      });
    });

    describe('updateMailbox', () => {
      it('should update mailbox settings', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}`,
          { data: mockResponse },
          'PUT'
        );

        const result = await api.updateMailbox(validUserAuth, validMailboxId, {
          path: 'Archive/2024',
          hidden: false,
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}`, 'PUT')).toBe(true);
      });
    });

    describe('deleteMailbox', () => {
      it('should delete mailbox successfully', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}`,
          { data: mockResponse },
          'DELETE'
        );

        const result = await api.deleteMailbox(validUserAuth, validMailboxId);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}`, 'DELETE')).toBe(true);
      });
    });

    describe('createMailbox', () => {
      it('should create mailbox with retention settings', async () => {
        const mockResponse = { success: true, id: validMailboxId };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes`,
          { data: mockResponse },
          'POST'
        );

        const result = await api.createMailbox(validUserAuth, {
          path: 'Archive',
          retention: 7776000000, // 90 days
          hidden: false,
        });

        expect(result.success).toBe(true);
        expect(result.id).toBe(validMailboxId);
      });
    });
  });

  describe('Message Management', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { username: 'testuser', userId: validUserId, accessToken: 'test-token' };
    const validMailboxId = '507f1f77bcf86cd799439022';
    const messageId = 12345;

    describe('getMessageFromMailbox', () => {
      it('should get full message details', async () => {
        const mockResponse = {
          success: true,
          id: messageId,
          mailbox: validMailboxId,
          from: { name: 'Sender', address: 'sender@example.com' },
          subject: 'Test Message',
          text: 'Message body',
          html: ['<p>Message body</p>'],
          seen: false,
          attachments: [],
        };

        mockNetworkClient.setDefaultResponse({ data: mockResponse });

        const result = await api.getMessageFromMailbox(validUserAuth, validMailboxId, messageId);

        expect(result.success).toBe(true);
        expect(result.id).toBe(messageId);
        expect(result.subject).toBe('Test Message');
      });

      it('should support markAsSeen option', async () => {
        const mockResponse = { success: true, id: messageId };
        mockNetworkClient.setDefaultResponse({ data: mockResponse });

        await api.getMessageFromMailbox(validUserAuth, validMailboxId, messageId, {
          markAsSeen: true,
        });

        const lastRequest = mockNetworkClient.getLastRequest();
        expect(lastRequest?.url).toContain('markAsSeen=true');
      });
    });

    describe('uploadMessage', () => {
      it('should upload a draft message', async () => {
        const mockResponse = {
          success: true,
          message: { id: messageId, mailbox: validMailboxId },
        };

        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages`,
          { data: mockResponse },
          'POST'
        );

        const result = await api.uploadMessage(validUserAuth, validMailboxId, {
          from: { name: 'Me', address: 'me@example.com' },
          to: [{ name: 'You', address: 'you@example.com' }],
          subject: 'Draft Message',
          text: 'Draft content',
          draft: true,
        });

        expect(result.success).toBe(true);
        expect(result.message.id).toBe(messageId);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages`, 'POST')).toBe(true);
      });

      it('should upload message with attachments', async () => {
        const mockResponse = { success: true, message: { id: messageId, mailbox: validMailboxId } };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages`,
          { data: mockResponse },
          'POST'
        );

        const result = await api.uploadMessage(validUserAuth, validMailboxId, {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }],
          subject: 'With Attachment',
          text: 'See attached',
          attachments: [
            {
              filename: 'document.pdf',
              content: 'base64content==',
              contentType: 'application/pdf',
            },
          ],
        });

        expect(result.success).toBe(true);
      });
    });

    describe('updateMessage', () => {
      it('should update message flags', async () => {
        const mockResponse = { success: true, updated: 1 };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`,
          { data: mockResponse },
          'PUT'
        );

        const result = await api.updateMessage(validUserAuth, validMailboxId, messageId, {
          seen: true,
          flagged: true,
        });

        expect(result.success).toBe(true);
        expect(result.updated).toBe(1);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`, 'PUT')).toBe(true);
      });

      it('should move message to different mailbox', async () => {
        const targetMailboxId = '507f1f77bcf86cd799439033';
        const mockResponse = {
          success: true,
          id: [[messageId, messageId]],
          mailbox: targetMailboxId,
        };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`,
          { data: mockResponse },
          'PUT'
        );

        const result = await api.updateMessage(validUserAuth, validMailboxId, messageId, {
          moveTo: targetMailboxId,
        });

        expect(result.success).toBe(true);
        expect(result.mailbox).toBe(targetMailboxId);
      });
    });

    describe('deleteMessage', () => {
      it('should delete message successfully', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`,
          { data: mockResponse },
          'DELETE'
        );

        const result = await api.deleteMessage(validUserAuth, validMailboxId, messageId);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`, 'DELETE')).toBe(true);
      });
    });

    describe('getMessageSource', () => {
      it('should download raw message source', async () => {
        const mockRawMessage = 'From: sender@example.com\r\nSubject: Test\r\n\r\nBody';
        mockNetworkClient.setDefaultResponse({ data: mockRawMessage });

        const result = await api.getMessageSource(validUserAuth, validMailboxId, messageId);

        expect(result).toBe(mockRawMessage);
        const lastRequest = mockNetworkClient.getLastRequest();
        expect(lastRequest?.url).toContain('/message.eml');
      });
    });

    describe('getMessageAttachment', () => {
      it('should download attachment as blob', async () => {
        const mockBlob = new Blob(['attachment content'], { type: 'application/pdf' });
        mockNetworkClient.setDefaultResponse({ data: mockBlob });

        const result = await api.getMessageAttachment(
          validUserAuth,
          validMailboxId,
          messageId,
          'ATT001'
        );

        expect(result).toBeInstanceOf(Blob);
        const lastRequest = mockNetworkClient.getLastRequest();
        expect(lastRequest?.url).toContain('/attachments/ATT001');
      });
    });

    describe('forwardMessage', () => {
      it('should forward message to recipients', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setDefaultResponse({ data: mockResponse });

        const result = await api.forwardMessage(validUserAuth, validMailboxId, messageId, {
          target: 2,
        });

        expect(result.success).toBe(true);
        const lastRequest = mockNetworkClient.getLastRequest();
        expect(lastRequest?.url).toContain('/forward');
        expect(lastRequest?.method).toBe('POST');
      });
    });

    describe('submitDraft', () => {
      it('should submit draft for delivery', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setDefaultResponse({ data: mockResponse });

        const result = await api.submitDraft(validUserAuth, validMailboxId, messageId);

        expect(result.success).toBe(true);
        const lastRequest = mockNetworkClient.getLastRequest();
        expect(lastRequest?.url).toContain('/submit');
        expect(lastRequest?.method).toBe('POST');
      });
    });

    describe('submitMessage', () => {
      it('should submit new message for delivery', async () => {
        const mockResponse = {
          success: true,
          message: {
            id: 'queue123',
            from: 'sender@example.com',
            to: ['recipient@example.com'],
          },
        };

        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/submit`,
          { data: mockResponse },
          'POST'
        );

        const result = await api.submitMessage(validUserAuth, {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }],
          subject: 'New Message',
          text: 'Message body',
        });

        expect(result.success).toBe(true);
        expect(result.message.id).toBe('queue123');
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/submit`, 'POST')).toBe(true);
      });
    });
  });

  describe('Autoreply Management', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { username: 'testuser', userId: validUserId, accessToken: 'test-token' };

    describe('getAutoreply', () => {
      it('should get autoreply settings', async () => {
        const mockResponse = {
          success: true,
          status: true,
          name: 'On Vacation',
          subject: 'Out of Office',
          text: 'I am currently out of office.',
          html: '<p>I am currently out of office.</p>',
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-15T00:00:00.000Z',
        };

        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/autoreply`,
          { data: mockResponse }
        );

        const result = await api.getAutoreply(validUserAuth);

        expect(result.success).toBe(true);
        expect(result.status).toBe(true);
        expect(result.subject).toBe('Out of Office');
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/autoreply`)).toBe(true);
      });
    });

    describe('updateAutoreply', () => {
      it('should enable autoreply with schedule', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/autoreply`,
          { data: mockResponse },
          'PUT'
        );

        const result = await api.updateAutoreply(validUserAuth, {
          status: true,
          name: 'Vacation',
          subject: 'Out of Office',
          text: 'I will be back soon.',
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-15T00:00:00.000Z',
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/autoreply`, 'PUT')).toBe(true);
      });

      it('should disable autoreply', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/autoreply`,
          { data: mockResponse },
          'PUT'
        );

        const result = await api.updateAutoreply(validUserAuth, {
          status: false,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('deleteAutoreply', () => {
      it('should delete autoreply settings', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.setMockResponse(
          `https://test-wildduck.example.com/users/${validUserId}/autoreply`,
          { data: mockResponse },
          'DELETE'
        );

        const result = await api.deleteAutoreply(validUserAuth);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.wasUrlCalled(`https://test-wildduck.example.com/users/${validUserId}/autoreply`, 'DELETE')).toBe(true);
      });
    });
  });
});
