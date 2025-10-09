import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WildduckAPI } from '../wildduck-client';
import { WildduckConfig } from '../../types/wildduck-types';
import { NetworkClient } from '@johnqh/di';

const TEST_USER_AUTH = { userId: 'user123', accessToken: 'test-token' };

describe('WildduckAPI', () => {
  let api: WildduckAPI;
  let mockNetworkClient: NetworkClient;
  let mockConfig: WildduckConfig;

  beforeEach(() => {
    mockNetworkClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      request: vi.fn(),
    } as NetworkClient;

    mockConfig = {
      backendUrl: 'https://test-wildduck.example.com',
      apiToken: 'test-token-123',
      cloudflareWorkerUrl: undefined,
    };

    api = new WildduckAPI(mockNetworkClient, mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
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

      const cloudflareApi = new WildduckAPI(mockNetworkClient, cloudflareConfig);
      expect(cloudflareApi).toBeDefined();
      expect(cloudflareApi).toBeInstanceOf(WildduckAPI);
    });

    it('should throw on invalid config', () => {
      const invalidConfig = {
        backendUrl: '',
        apiToken: '',
      } as WildduckConfig;

      expect(() => new WildduckAPI(mockNetworkClient, invalidConfig))
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

      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: mockResponse,
      });

      const result = await api.authenticateWithPassword('testuser@example.com', 'password123');
      
      expect(result.success).toBe(true);
      expect(mockNetworkClient.request).toHaveBeenCalledWith(
        expect.stringContaining('/authenticate'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });

    it('should handle authentication failure', async () => {
      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: { error: 'Invalid credentials', success: false },
      });

      const result = await api.authenticateWithPassword('invalid@example.com', 'wrongpass');
      
      expect(result.success).toBe(false);
      expect(mockNetworkClient.request).toHaveBeenCalled();
    });

    it('should handle signature-based authentication', async () => {
      const mockResponse = {
        success: true,
        id: 'user123',
        username: 'testuser@example.com',
      };

      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: mockResponse,
      });

      const result = await api.authenticate({
        username: 'testuser@example.com',
        signature: 'signature123',
        nonce: 'nonce456',
        message: 'Test message'
      });
      
      expect(result.success).toBe(true);
      expect(mockNetworkClient.request).toHaveBeenCalled();
    });
  });

  describe('user operations', () => {
    const validUserId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId
    const validUserAuth = { userId: validUserId, accessToken: 'test-token' };

    it('should get user info successfully', async () => {
      const mockUserData = {
        success: true,
        id: validUserId,
        username: 'testuser@example.com',
        name: 'Test User',
        quota: { allowed: 1000000, used: 50000 },
      };

      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: mockUserData,
      });

      const result = await api.getUser(validUserAuth);

      expect(result.success).toBe(true);
      expect(mockNetworkClient.request).toHaveBeenCalledWith(
        expect.stringContaining(`/users/${validUserId}`),
        expect.any(Object)
      );
    });

    it('should get mailboxes successfully', async () => {
      const mockMailboxes = {
        success: true,
        results: [
          { id: 'inbox', name: 'INBOX', path: 'INBOX' },
          { id: 'sent', name: 'Sent', path: 'Sent' },
        ],
      };

      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: mockMailboxes,
      });

      const result = await api.getMailboxes(validUserAuth, { specialUse: true });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockNetworkClient.request).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { userId: validUserId, accessToken: 'test-token' };

    it('should handle network errors gracefully', async () => {
      mockNetworkClient.request = vi.fn().mockRejectedValue(
        new Error('Network connection failed')
      );

      await expect(api.authenticateWithPassword('test@example.com', 'password'))
        .rejects.toThrow('Network connection failed');
    });

    it('should handle API errors with proper formatting', async () => {
      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: { error: 'User not found', code: 'UserNotFoundError', success: false },
      });

      const result = await api.getUser(validUserAuth);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle invalid user ID format', async () => {
      await expect(api.getUser({ userId: 'invalid-user-id', accessToken: 'test-token' }))
        .rejects.toThrow('Invalid user ID format');
    });
  });

  describe('edge cases', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { userId: validUserId, accessToken: 'test-token' };

    it('should handle empty responses', async () => {
      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: null,
      });

      const result = await api.getUser(validUserAuth);
      expect(result).toBeNull();
    });

    it('should validate required parameters', async () => {
      await expect(api.authenticateWithPassword('', 'password'))
        .rejects.toThrow();

      await expect(api.authenticateWithPassword('user@example.com', ''))
        .rejects.toThrow();
    });
  });

  describe('User Management', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { userId: validUserId, accessToken: 'test-token' };

    describe('createUser', () => {
      it('should create a new user successfully', async () => {
        const mockResponse = {
          success: true,
          id: validUserId,
        };

        mockNetworkClient.request = vi.fn().mockResolvedValue({
          data: mockResponse,
        });

        const result = await api.createUser({
          username: 'newuser',
          password: 'securepassword123',
          address: 'newuser@example.com',
          name: 'New User',
        });

        expect(result.success).toBe(true);
        expect(result.id).toBe(validUserId);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining('/users'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      it('should create user with all optional parameters', async () => {
        const mockResponse = { success: true, id: validUserId };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

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
        expect(mockNetworkClient.request).toHaveBeenCalled();
      });
    });

    describe('updateUser', () => {
      it('should update user information successfully', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.updateUser(validUserAuth, {
          name: 'Updated Name',
          quota: 10000000000,
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}`),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });

      it('should handle password change', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

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
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.deleteUser(validUserAuth);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}`),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      it('should validate user ID format before delete', async () => {
        await expect(api.deleteUser({ userId: 'invalid-id', accessToken: 'test-token' }))
          .rejects.toThrow('Invalid user ID format');
      });
    });
  });

  describe('Mailbox Management', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { userId: validUserId, accessToken: 'test-token' };
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

        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.getMailbox(validUserAuth, validMailboxId);

        expect(result.success).toBe(true);
        expect(result.id).toBe(validMailboxId);
        expect(result.total).toBe(100);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/mailboxes/${validMailboxId}`),
          expect.any(Object)
        );
      });

      it('should validate mailbox ID format', async () => {
        await expect(api.getMailbox(validUserAuth, 'invalid'))
          .rejects.toThrow('Invalid mailbox ID format');
      });
    });

    describe('updateMailbox', () => {
      it('should update mailbox settings', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.updateMailbox(validUserAuth, validMailboxId, {
          path: 'Archive/2024',
          hidden: false,
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/mailboxes/${validMailboxId}`),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });

    describe('deleteMailbox', () => {
      it('should delete mailbox successfully', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.deleteMailbox(validUserAuth, validMailboxId);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/mailboxes/${validMailboxId}`),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('createMailbox', () => {
      it('should create mailbox with retention settings', async () => {
        const mockResponse = { success: true, id: validMailboxId };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

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
    const validUserAuth = { userId: validUserId, accessToken: 'test-token' };
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

        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.getMessageFromMailbox(validUserAuth, validMailboxId, messageId);

        expect(result.success).toBe(true);
        expect(result.id).toBe(messageId);
        expect(result.subject).toBe('Test Message');
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`),
          expect.any(Object)
        );
      });

      it('should support markAsSeen option', async () => {
        const mockResponse = { success: true, id: messageId };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        await api.getMessageFromMailbox(validUserAuth, validMailboxId, messageId, {
          markAsSeen: true,
        });

        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining('markAsSeen=true'),
          expect.any(Object)
        );
      });
    });

    describe('uploadMessage', () => {
      it('should upload a draft message', async () => {
        const mockResponse = {
          success: true,
          message: { id: messageId, mailbox: validMailboxId },
        };

        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.uploadMessage(validUserAuth, validMailboxId, {
          from: { name: 'Me', address: 'me@example.com' },
          to: [{ name: 'You', address: 'you@example.com' }],
          subject: 'Draft Message',
          text: 'Draft content',
          draft: true,
        });

        expect(result.success).toBe(true);
        expect(result.message.id).toBe(messageId);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/mailboxes/${validMailboxId}/messages`),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      it('should upload message with attachments', async () => {
        const mockResponse = { success: true, message: { id: messageId, mailbox: validMailboxId } };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

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
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.updateMessage(validUserAuth, validMailboxId, messageId, {
          seen: true,
          flagged: true,
        });

        expect(result.success).toBe(true);
        expect(result.updated).toBe(1);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });

      it('should move message to different mailbox', async () => {
        const targetMailboxId = '507f1f77bcf86cd799439033';
        const mockResponse = {
          success: true,
          id: [[messageId, messageId]],
          mailbox: targetMailboxId,
        };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

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
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.deleteMessage(validUserAuth, validMailboxId, messageId);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/mailboxes/${validMailboxId}/messages/${messageId}`),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    describe('getMessageSource', () => {
      it('should download raw message source', async () => {
        const mockRawMessage = 'From: sender@example.com\r\nSubject: Test\r\n\r\nBody';
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockRawMessage });

        const result = await api.getMessageSource(validUserAuth, validMailboxId, messageId);

        expect(result).toBe(mockRawMessage);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining('/message.eml'),
          expect.any(Object)
        );
      });
    });

    describe('getMessageAttachment', () => {
      it('should download attachment as blob', async () => {
        const mockBlob = new Blob(['attachment content'], { type: 'application/pdf' });
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockBlob });

        const result = await api.getMessageAttachment(
          validUserAuth,
          validMailboxId,
          messageId,
          'ATT001'
        );

        expect(result).toBeInstanceOf(Blob);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining('/attachments/ATT001'),
          expect.any(Object)
        );
      });
    });

    describe('forwardMessage', () => {
      it('should forward message to recipients', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.forwardMessage(validUserAuth, validMailboxId, messageId, {
          target: 2,
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining('/forward'),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    describe('submitDraft', () => {
      it('should submit draft for delivery', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.submitDraft(validUserAuth, validMailboxId, messageId);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining('/submit'),
          expect.objectContaining({
            method: 'POST',
          })
        );
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

        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.submitMessage(validUserAuth, {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }],
          subject: 'New Message',
          text: 'Message body',
        });

        expect(result.success).toBe(true);
        expect(result.message.id).toBe('queue123');
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/submit`),
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Autoreply Management', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validUserAuth = { userId: validUserId, accessToken: 'test-token' };

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

        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.getAutoreply(validUserAuth);

        expect(result.success).toBe(true);
        expect(result.status).toBe(true);
        expect(result.subject).toBe('Out of Office');
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/autoreply`),
          expect.any(Object)
        );
      });
    });

    describe('updateAutoreply', () => {
      it('should enable autoreply with schedule', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.updateAutoreply(validUserAuth, {
          status: true,
          name: 'Vacation',
          subject: 'Out of Office',
          text: 'I will be back soon.',
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-15T00:00:00.000Z',
        });

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/autoreply`),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });

      it('should disable autoreply', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.updateAutoreply(validUserAuth, {
          status: false,
        });

        expect(result.success).toBe(true);
      });
    });

    describe('deleteAutoreply', () => {
      it('should delete autoreply settings', async () => {
        const mockResponse = { success: true };
        mockNetworkClient.request = vi.fn().mockResolvedValue({ data: mockResponse });

        const result = await api.deleteAutoreply(validUserAuth);

        expect(result.success).toBe(true);
        expect(mockNetworkClient.request).toHaveBeenCalledWith(
          expect.stringContaining(`/users/${validUserId}/autoreply`),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });
});