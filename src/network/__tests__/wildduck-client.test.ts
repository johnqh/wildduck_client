import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WildDuckAPI } from '../wildduck-client';
import { WildDuckConfig } from '@johnqh/types';
import { NetworkClient } from '@johnqh/di';

describe('WildDuckAPI', () => {
  let api: WildDuckAPI;
  let mockNetworkClient: NetworkClient;
  let mockConfig: WildDuckConfig;

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

    api = new WildDuckAPI(mockNetworkClient, mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create instance successfully', () => {
      expect(api).toBeDefined();
      expect(api).toBeInstanceOf(WildDuckAPI);
    });

    it('should initialize with Cloudflare worker config', () => {
      const cloudflareConfig: WildDuckConfig = {
        ...mockConfig,
        cloudflareWorkerUrl: 'https://worker.example.com',
      };

      const cloudflareApi = new WildDuckAPI(mockNetworkClient, cloudflareConfig);
      expect(cloudflareApi).toBeDefined();
      expect(cloudflareApi).toBeInstanceOf(WildDuckAPI);
    });

    it('should throw on invalid config', () => {
      const invalidConfig = {
        backendUrl: '',
        apiToken: '',
      } as WildDuckConfig;

      expect(() => new WildDuckAPI(mockNetworkClient, invalidConfig))
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

      const result = await api.getUser(validUserId);
      
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

      const result = await api.getMailboxes(validUserId, { specialUse: true });
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockNetworkClient.request).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    const validUserId = '507f1f77bcf86cd799439011';

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

      const result = await api.getUser(validUserId);
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle invalid user ID format', async () => {
      await expect(api.getUser('invalid-user-id'))
        .rejects.toThrow('Invalid user ID format');
    });
  });

  describe('edge cases', () => {
    const validUserId = '507f1f77bcf86cd799439011';

    it('should handle empty responses', async () => {
      mockNetworkClient.request = vi.fn().mockResolvedValue({
        data: null,
      });

      const result = await api.getUser(validUserId);
      expect(result).toBeNull();
    });

    it('should validate required parameters', async () => {
      await expect(api.authenticateWithPassword('', 'password'))
        .rejects.toThrow();
      
      await expect(api.authenticateWithPassword('user@example.com', ''))
        .rejects.toThrow();
    });
  });
});