/**
 * Wildduck API Integration Tests
 *
 * These tests run against a live Wildduck server in crypto mode.
 * Set WILDDUCK_ENDPOINT environment variable to enable these tests.
 *
 * Example:
 *   WILDDUCK_ENDPOINT=http://localhost:8080 npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WildduckAPI } from '../../network/wildduck-client';
import { NetworkClient, NetworkResponse, NetworkRequestOptions } from '@sudobility/di';
import axios, { AxiosResponse } from 'axios';
import {
  INTEGRATION_CONFIG,
  generateAuthPayload,
  getTestWalletAddress,
  getTestEmailAddress,
  skipIfNoIntegrationEnv,
} from './setup';

// Create a simple NetworkClient implementation using axios
class AxiosNetworkClient implements NetworkClient {
  private convertResponse<T>(response: AxiosResponse<T>): NetworkResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as any,
      ok: response.status >= 200 && response.status < 300,
      success: response.status >= 200 && response.status < 300,
      timestamp: String(Date.now()),
    };
  }

  async request<T = unknown>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>> {
    const response = await axios(url, {
      method: options?.method,
      data: options?.body,
      headers: options?.headers as any,
    });
    return this.convertResponse<T>(response);
  }

  async get<T = unknown>(url: string, options?: Omit<NetworkRequestOptions, 'method' | 'body'>): Promise<NetworkResponse<T>> {
    const response = await axios.get<T>(url, {
      headers: options?.headers as any,
    });
    return this.convertResponse<T>(response);
  }

  async post<T = unknown>(url: string, body?: unknown, options?: Omit<NetworkRequestOptions, 'method'>): Promise<NetworkResponse<T>> {
    const response = await axios.post<T>(url, body, {
      headers: options?.headers as any,
    });
    return this.convertResponse<T>(response);
  }

  async put<T = unknown>(url: string, body?: unknown, options?: Omit<NetworkRequestOptions, 'method'>): Promise<NetworkResponse<T>> {
    const response = await axios.put<T>(url, body, {
      headers: options?.headers as any,
    });
    return this.convertResponse<T>(response);
  }

  async delete<T = unknown>(url: string, options?: Omit<NetworkRequestOptions, 'method' | 'body'>): Promise<NetworkResponse<T>> {
    const response = await axios.delete<T>(url, {
      headers: options?.headers as any,
    });
    return this.convertResponse<T>(response);
  }

  async patch<T = unknown>(url: string, body?: unknown, options?: Omit<NetworkRequestOptions, 'method'>): Promise<NetworkResponse<T>> {
    const response = await axios.patch<T>(url, body, {
      headers: options?.headers as any,
    });
    return this.convertResponse<T>(response);
  }
}

describe('Wildduck API Integration Tests', () => {
  const skipCheck = skipIfNoIntegrationEnv();

  if (skipCheck.skip) {
    it.skip(skipCheck.reason, () => {});
    return;
  }

  let api: WildduckClient;
  let networkClient: NetworkClient;
  let testUserId: string;
  let authToken: string;
  const testEmailAddress = getTestEmailAddress();
  const testWalletAddress = getTestWalletAddress();

  beforeAll(async () => {
    networkClient = new AxiosNetworkClient();

    api = new WildduckAPI(networkClient, {
      backendUrl: INTEGRATION_CONFIG.endpoint,
      apiToken: INTEGRATION_CONFIG.apiToken,
    });

    console.log('\n=== Integration Test Configuration ===');
    console.log('Endpoint:', INTEGRATION_CONFIG.endpoint);
    console.log('Email Domain:', INTEGRATION_CONFIG.emailDomain);
    console.log('Test Wallet:', testWalletAddress);
    console.log('Test Email:', testEmailAddress);
    console.log('======================================\n');
  });

  describe('Authentication', () => {
    it('should authenticate with crypto signature', async () => {
      const authPayload = await generateAuthPayload({
        username: testEmailAddress,
      });

      const result = await api.authenticate({
        username: authPayload.username,
        signature: authPayload.signature,
        nonce: authPayload.nonce,
        message: authPayload.message,
        signer: authPayload.signer,
        scope: 'master',
        token: true,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.token).toBeDefined();

      // Save for later tests
      testUserId = result.id;
      authToken = result.token;

      console.log('✓ Authentication successful');
      console.log('  User ID:', testUserId);
      console.log('  Token:', authToken.substring(0, 20) + '...');
    });

    it('should fail authentication with invalid signature', async () => {
      const authPayload = await generateAuthPayload({
        username: testEmailAddress,
      });

      await expect(
        api.authenticate({
          username: authPayload.username,
          signature: '0xinvalidsignature',
          nonce: authPayload.nonce,
          message: authPayload.message,
          signer: authPayload.signer,
        })
      ).rejects.toThrow();
    });
  });

  describe('User Operations', () => {
    it('should get user information', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      const result: any = await api.getUser(testUserId);

      expect(result.success).toBe(true);
      expect(result.id).toBe(testUserId);

      console.log('✓ User info retrieved');
      console.log('  Username:', result.username || result.address);
    });

    it('should update user settings', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      const result = await api.updateUser(testUserId, {
        name: 'Integration Test User',
      });

      expect(result.success).toBe(true);

      console.log('✓ User updated successfully');
    });

    it('should get user limits', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      const result: any = await api.getUser(testUserId);

      expect(result.success).toBe(true);
      expect(result.limits).toBeDefined();
      if (result.limits?.quota) {
        expect(result.limits.quota.allowed).toBeGreaterThan(0);
      }

      console.log('✓ User limits retrieved');
    });
  });

  describe('Mailbox Operations', () => {
    let inboxId: string;

    it('should list user mailboxes', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      const result = await api.getMailboxes(testUserId, { specialUse: true });

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);

      // Find INBOX
      const inbox = result.results.find((mb: any) => mb.path === 'INBOX');
      expect(inbox).toBeDefined();
      inboxId = (inbox as any).id;

      console.log('✓ Mailboxes retrieved');
      console.log('  Count:', result.results.length);
      console.log('  INBOX ID:', inboxId);
    });

    it('should get specific mailbox', async () => {
      if (!testUserId || !inboxId) {
        console.warn('Skipping: No testUserId or inboxId available');
        return;
      }

      const result = await api.getMailbox(testUserId, inboxId);

      expect(result.success).toBe(true);
      expect(result.id).toBe(inboxId);
      expect(result.path).toBe('INBOX');

      console.log('✓ Mailbox retrieved');
      console.log('  Messages:', result.total);
      console.log('  Unseen:', result.unseen);
    });

    it('should create and delete a mailbox', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      // Create mailbox
      const createResult: any = await api.createMailbox(testUserId, {
        path: 'Test/Integration',
      });

      expect(createResult.success).toBe(true);
      expect(createResult.id).toBeDefined();

      const newMailboxId = createResult.id;
      console.log('✓ Mailbox created:', newMailboxId);

      // Verify it exists
      const getResult = await api.getMailbox(testUserId, newMailboxId);
      expect(getResult.success).toBe(true);
      expect(getResult.path).toBe('Test/Integration');

      // Delete mailbox
      const deleteResult = await api.deleteMailbox(testUserId, newMailboxId);
      expect(deleteResult.success).toBe(true);

      console.log('✓ Mailbox deleted');
    });
  });

  describe('Message Operations', () => {
    let inboxId: string;
    let testMessageId: number;

    beforeAll(async () => {
      if (!testUserId) return;

      // Get INBOX
      const mailboxes = await api.getMailboxes(testUserId, { specialUse: true });
      const inbox = mailboxes.results.find((mb) => mb.path === 'INBOX');
      if (inbox) {
        inboxId = inbox.id;
      }
    });

    it('should list messages in mailbox', async () => {
      if (!testUserId || !inboxId) {
        console.warn('Skipping: No testUserId or inboxId available');
        return;
      }

      const result = await api.getMessages(testUserId, inboxId);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);

      console.log('✓ Messages listed');
      console.log('  Count:', result.results.length);
    });

    it('should upload and delete a message', async () => {
      if (!testUserId || !inboxId) {
        console.warn('Skipping: No testUserId or inboxId available');
        return;
      }

      // Upload a test message
      const uploadResult = await api.uploadMessage(testUserId, inboxId, {
        from: {
          name: 'Integration Test',
          address: testEmailAddress,
        },
        to: [
          {
            name: 'Test Recipient',
            address: testEmailAddress,
          },
        ],
        subject: 'Integration Test Message',
        text: 'This is a test message created by integration tests.',
        html: '<p>This is a test message created by integration tests.</p>',
        draft: true,
      });

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.message).toBeDefined();
      expect(uploadResult.message.id).toBeDefined();

      testMessageId = uploadResult.message.id;
      console.log('✓ Message uploaded:', testMessageId);

      // Get the message
      const getMessage = await api.getMessageFromMailbox(
        testUserId,
        inboxId,
        testMessageId
      );

      expect(getMessage.success).toBe(true);
      expect(getMessage.subject).toBe('Integration Test Message');

      console.log('✓ Message retrieved');

      // Delete the message
      const deleteResult = await api.deleteMessage(
        testUserId,
        inboxId,
        testMessageId
      );

      expect(deleteResult.success).toBe(true);
      console.log('✓ Message deleted');
    });

    it('should submit a message for delivery', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      const result = await api.submitMessage(testUserId, {
        from: {
          name: 'Integration Test',
          address: testEmailAddress,
        },
        to: [
          {
            name: 'Test Recipient',
            address: testEmailAddress,
          },
        ],
        subject: 'Integration Test - Submit Message',
        text: 'This is a test message submitted for delivery.',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.id).toBeDefined();

      console.log('✓ Message submitted for delivery');
      console.log('  Queue ID:', result.message.id);
    });
  });

  describe('Autoreply Operations', () => {
    it('should get autoreply status', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      const result = await api.getAutoreply(testUserId);

      expect(result.success).toBe(true);
      // Status might be true or false depending on server state
      expect(typeof result.status).toBe('boolean');

      console.log('✓ Autoreply status retrieved');
      console.log('  Enabled:', result.status);
    });

    it('should enable and disable autoreply', async () => {
      if (!testUserId) {
        console.warn('Skipping: No testUserId available');
        return;
      }

      // Enable autoreply
      const enableResult = await api.updateAutoreply(testUserId, {
        status: true,
        subject: 'Out of Office - Integration Test',
        text: 'This is an automated reply from integration tests.',
      });

      expect(enableResult.success).toBe(true);
      console.log('✓ Autoreply enabled');

      // Verify it's enabled
      const getResult = await api.getAutoreply(testUserId);
      expect(getResult.success).toBe(true);
      expect(getResult.status).toBe(true);

      // Disable autoreply
      const disableResult = await api.updateAutoreply(testUserId, {
        status: false,
      });

      expect(disableResult.success).toBe(true);
      console.log('✓ Autoreply disabled');
    });
  });

  afterAll(async () => {
    console.log('\n=== Integration Tests Completed ===\n');
  });
});
