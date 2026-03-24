'use strict';

const { createHmac } = require('node:crypto');
const { WebhookSignatureError } = require('./errors');

/**
 * Default tolerance for webhook timestamp validation (5 minutes).
 * @type {number}
 */
const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Utility class for verifying ezPayments webhook signatures.
 *
 * ezPayments signs every webhook request with an HMAC-SHA256 signature
 * sent in the `X-EzPayments-Signature` header. Use this class to verify
 * that incoming webhook payloads are authentic.
 *
 * @example
 * const { Webhook } = require('ezpayments');
 *
 * app.post('/webhooks', (req, res) => {
 *   try {
 *     const event = Webhook.verify(
 *       process.env.WEBHOOK_SECRET,
 *       req.headers['x-ezpayments-signature'],
 *       req.body, // raw body string
 *     );
 *     // Process the verified event
 *     res.sendStatus(200);
 *   } catch (err) {
 *     res.status(400).send(err.message);
 *   }
 * });
 */
class Webhook {
  /**
   * Verifies a webhook signature and returns the parsed event payload.
   *
   * @param {string} secret - The webhook signing secret (from endpoint creation)
   * @param {string} signatureHeader - The value of the `X-EzPayments-Signature` header
   * @param {string|Buffer} body - The raw request body (must not be parsed/modified)
   * @param {object} [options]
   * @param {number} [options.tolerance=300] - Maximum age of the webhook in seconds
   * @returns {object} The parsed webhook event payload
   * @throws {WebhookSignatureError} If the signature is invalid or the timestamp is too old
   *
   * @example
   * const event = Webhook.verify(secret, signatureHeader, rawBody);
   */
  static verify(secret, signatureHeader, body, { tolerance = DEFAULT_TOLERANCE_SECONDS } = {}) {
    if (!secret) {
      throw new WebhookSignatureError('Webhook secret is required');
    }
    if (!signatureHeader) {
      throw new WebhookSignatureError('Signature header is required');
    }
    if (!body) {
      throw new WebhookSignatureError('Request body is required');
    }

    const { timestamp, signatures } = Webhook._parseSignatureHeader(signatureHeader);

    if (!timestamp || signatures.length === 0) {
      throw new WebhookSignatureError(
        'Invalid signature header format. Expected: t=timestamp,v1=signature'
      );
    }

    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;
    if (age > tolerance) {
      throw new WebhookSignatureError(
        `Webhook timestamp too old (${age}s > ${tolerance}s tolerance)`
      );
    }
    if (age < -tolerance) {
      throw new WebhookSignatureError(
        `Webhook timestamp is in the future (${-age}s ahead)`
      );
    }

    // Compute expected signature
    const rawBody = typeof body === 'string' ? body : body.toString('utf-8');
    const payload = `${timestamp}.${rawBody}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(payload, 'utf-8')
      .digest('hex');

    // Constant-time comparison against all provided signatures
    const isValid = signatures.some((sig) => {
      if (sig.length !== expectedSignature.length) return false;
      const a = Buffer.from(sig, 'utf-8');
      const b = Buffer.from(expectedSignature, 'utf-8');
      return require('node:crypto').timingSafeEqual(a, b);
    });

    if (!isValid) {
      throw new WebhookSignatureError('Webhook signature verification failed');
    }

    // Parse and return the event payload
    try {
      return JSON.parse(rawBody);
    } catch {
      throw new WebhookSignatureError('Failed to parse webhook body as JSON');
    }
  }

  /**
   * Generates a signature header for testing purposes.
   *
   * @param {string} secret - The webhook signing secret
   * @param {string|Buffer} body - The request body
   * @param {object} [options]
   * @param {number} [options.timestamp] - Unix timestamp (defaults to current time)
   * @returns {string} The signature header value
   */
  static generateTestHeader(secret, body, { timestamp } = {}) {
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const rawBody = typeof body === 'string' ? body : body.toString('utf-8');
    const payload = `${ts}.${rawBody}`;
    const signature = createHmac('sha256', secret)
      .update(payload, 'utf-8')
      .digest('hex');
    return `t=${ts},v1=${signature}`;
  }

  /**
   * Parses the signature header into its components.
   *
   * @param {string} header - The signature header value
   * @returns {{ timestamp: number|null, signatures: string[] }}
   * @private
   */
  static _parseSignatureHeader(header) {
    const parts = header.split(',');
    let timestamp = null;
    const signatures = [];

    for (const part of parts) {
      const [key, value] = part.split('=', 2);
      if (key === 't') {
        timestamp = parseInt(value, 10);
        if (isNaN(timestamp)) timestamp = null;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }

    return { timestamp, signatures };
  }
}

module.exports = Webhook;
