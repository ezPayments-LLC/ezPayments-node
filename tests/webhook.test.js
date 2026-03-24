'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');

const { Webhook, WebhookSignatureError } = require('../src/index');

/**
 * Helper to generate a valid signature header for testing.
 */
function generateHeader(secret, body, timestamp) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payload = `${ts}.${body}`;
  const signature = createHmac('sha256', secret).update(payload, 'utf-8').digest('hex');
  return { header: `t=${ts},v1=${signature}`, timestamp: ts };
}

describe('Webhook', () => {
  const secret = 'whsec_test_secret_key';
  const eventPayload = JSON.stringify({
    type: 'payment_link.paid',
    data: { id: 'pl_abc123', amount: '50.00' },
  });

  describe('verify', () => {
    it('should verify a valid webhook signature', () => {
      const { header } = generateHeader(secret, eventPayload);
      const event = Webhook.verify(secret, header, eventPayload);

      assert.strictEqual(event.type, 'payment_link.paid');
      assert.strictEqual(event.data.id, 'pl_abc123');
    });

    it('should verify with Buffer body', () => {
      const bodyBuffer = Buffer.from(eventPayload, 'utf-8');
      const { header } = generateHeader(secret, eventPayload);
      const event = Webhook.verify(secret, header, bodyBuffer);

      assert.strictEqual(event.type, 'payment_link.paid');
    });

    it('should reject an invalid signature', () => {
      const ts = Math.floor(Date.now() / 1000);
      const header = `t=${ts},v1=invalidsignaturehex0000000000000000000000000000000000000000000000000000000000000000`;

      assert.throws(
        () => Webhook.verify(secret, header, eventPayload),
        (err) => {
          assert.strictEqual(err.name, 'WebhookSignatureError');
          assert.ok(err.message.includes('verification failed'));
          return true;
        }
      );
    });

    it('should reject when timestamp is too old', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const { header } = generateHeader(secret, eventPayload, oldTimestamp);

      assert.throws(
        () => Webhook.verify(secret, header, eventPayload, { tolerance: 300 }),
        (err) => {
          assert.strictEqual(err.name, 'WebhookSignatureError');
          assert.ok(err.message.includes('too old'));
          return true;
        }
      );
    });

    it('should reject when timestamp is in the future', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 minutes ahead
      const { header } = generateHeader(secret, eventPayload, futureTimestamp);

      assert.throws(
        () => Webhook.verify(secret, header, eventPayload, { tolerance: 300 }),
        (err) => {
          assert.strictEqual(err.name, 'WebhookSignatureError');
          assert.ok(err.message.includes('future'));
          return true;
        }
      );
    });

    it('should accept custom tolerance', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 500;
      const { header } = generateHeader(secret, eventPayload, oldTimestamp);

      // Should fail with default tolerance (300s)
      assert.throws(
        () => Webhook.verify(secret, header, eventPayload, { tolerance: 300 }),
        { name: 'WebhookSignatureError' }
      );

      // Should pass with extended tolerance
      const event = Webhook.verify(secret, header, eventPayload, { tolerance: 600 });
      assert.strictEqual(event.type, 'payment_link.paid');
    });

    it('should reject with wrong secret', () => {
      const { header } = generateHeader(secret, eventPayload);

      assert.throws(
        () => Webhook.verify('whsec_wrong_secret', header, eventPayload),
        { name: 'WebhookSignatureError' }
      );
    });

    it('should reject with tampered body', () => {
      const { header } = generateHeader(secret, eventPayload);
      const tamperedBody = JSON.stringify({ type: 'tampered' });

      assert.throws(
        () => Webhook.verify(secret, header, tamperedBody),
        { name: 'WebhookSignatureError' }
      );
    });

    it('should throw if secret is missing', () => {
      const { header } = generateHeader(secret, eventPayload);

      assert.throws(
        () => Webhook.verify(null, header, eventPayload),
        (err) => {
          assert.strictEqual(err.name, 'WebhookSignatureError');
          assert.ok(err.message.includes('secret is required'));
          return true;
        }
      );
    });

    it('should throw if signature header is missing', () => {
      assert.throws(
        () => Webhook.verify(secret, null, eventPayload),
        (err) => {
          assert.strictEqual(err.name, 'WebhookSignatureError');
          assert.ok(err.message.includes('Signature header is required'));
          return true;
        }
      );
    });

    it('should throw if body is missing', () => {
      const { header } = generateHeader(secret, eventPayload);

      assert.throws(
        () => Webhook.verify(secret, header, null),
        (err) => {
          assert.strictEqual(err.name, 'WebhookSignatureError');
          assert.ok(err.message.includes('body is required'));
          return true;
        }
      );
    });

    it('should throw on malformed signature header', () => {
      assert.throws(
        () => Webhook.verify(secret, 'invalid-header-format', eventPayload),
        { name: 'WebhookSignatureError' }
      );
    });
  });

  describe('generateTestHeader', () => {
    it('should generate a valid test header', () => {
      const header = Webhook.generateTestHeader(secret, eventPayload);
      assert.ok(header.startsWith('t='));
      assert.ok(header.includes(',v1='));

      // Should be verifiable
      const event = Webhook.verify(secret, header, eventPayload);
      assert.strictEqual(event.type, 'payment_link.paid');
    });

    it('should accept a custom timestamp', () => {
      const ts = 1700000000;
      const header = Webhook.generateTestHeader(secret, eventPayload, { timestamp: ts });
      assert.ok(header.startsWith(`t=${ts}`));
    });
  });
});
