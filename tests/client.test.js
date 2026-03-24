'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const EzPayments = require('../src/index');
const { EzPaymentsError } = require('../src/errors');

describe('EzPayments Client', () => {
  it('should throw if no API key is provided', () => {
    assert.throws(() => new EzPayments(), {
      name: 'EzPaymentsError',
      message: /API key is required/,
    });
  });

  it('should throw if API key is empty string', () => {
    assert.throws(() => new EzPayments(''), {
      name: 'EzPaymentsError',
    });
  });

  it('should create a client with valid API key', () => {
    const client = new EzPayments('sk_test_123');
    assert.ok(client);
    assert.ok(client.paymentLinks);
    assert.ok(client.transactions);
    assert.ok(client.webhookEndpoints);
    assert.ok(client.apiKeys);
  });

  it('should accept custom base URL', () => {
    const client = new EzPayments('sk_test_123', {
      baseUrl: 'https://sandbox.ezpayments.co',
    });
    assert.ok(client);
  });

  it('should accept custom timeout', () => {
    const client = new EzPayments('sk_test_123', {
      timeout: 60000,
    });
    assert.ok(client);
  });

  it('should export all error classes', () => {
    assert.ok(EzPayments.EzPaymentsError);
    assert.ok(EzPayments.AuthenticationError);
    assert.ok(EzPayments.ValidationError);
    assert.ok(EzPayments.NotFoundError);
    assert.ok(EzPayments.RateLimitError);
    assert.ok(EzPayments.ApiError);
    assert.ok(EzPayments.WebhookSignatureError);
  });

  it('should export Webhook class', () => {
    assert.ok(EzPayments.Webhook);
    assert.strictEqual(typeof EzPayments.Webhook.verify, 'function');
    assert.strictEqual(typeof EzPayments.Webhook.generateTestHeader, 'function');
  });

  it('should be importable as default or named export', () => {
    const DefaultExport = require('../src/index');
    const { EzPayments: NamedExport } = require('../src/index');
    assert.strictEqual(DefaultExport, NamedExport);
  });
});

describe('Error classes', () => {
  it('EzPaymentsError should have correct properties', () => {
    const err = new EzPaymentsError('test error', {
      type: 'invalid_request',
      code: 'missing_param',
      param: 'amount',
      statusCode: 400,
      requestId: 'req_123',
    });

    assert.strictEqual(err.message, 'test error');
    assert.strictEqual(err.name, 'EzPaymentsError');
    assert.strictEqual(err.type, 'invalid_request');
    assert.strictEqual(err.code, 'missing_param');
    assert.strictEqual(err.param, 'amount');
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.requestId, 'req_123');
    assert.ok(err instanceof Error);
  });

  it('AuthenticationError should default to status 401', () => {
    const { AuthenticationError } = require('../src/errors');
    const err = new AuthenticationError('Invalid API key');
    assert.strictEqual(err.statusCode, 401);
    assert.strictEqual(err.name, 'AuthenticationError');
    assert.ok(err instanceof EzPaymentsError);
  });

  it('NotFoundError should default to status 404', () => {
    const { NotFoundError } = require('../src/errors');
    const err = new NotFoundError('Not found');
    assert.strictEqual(err.statusCode, 404);
    assert.strictEqual(err.name, 'NotFoundError');
  });

  it('RateLimitError should default to status 429', () => {
    const { RateLimitError } = require('../src/errors');
    const err = new RateLimitError('Too many requests', { retryAfter: 60 });
    assert.strictEqual(err.statusCode, 429);
    assert.strictEqual(err.retryAfter, 60);
    assert.strictEqual(err.name, 'RateLimitError');
  });
});
