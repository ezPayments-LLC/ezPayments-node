'use strict';

const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const EzPayments = require('../src/index');
const PaginatedResponse = require('../src/pagination');

/**
 * Creates a mock fetch function that returns the given response.
 */
function mockFetch(statusCode, body, headers = {}) {
  return mock.fn(() =>
    Promise.resolve({
      ok: statusCode >= 200 && statusCode < 300,
      status: statusCode,
      headers: {
        get: (name) => headers[name.toLowerCase()] || null,
      },
      json: () => Promise.resolve(body),
    })
  );
}

describe('PaymentLinks', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    client = new EzPayments('sk_test_123', {
      baseUrl: 'https://api.test.ezpayments.co',
    });
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('create', () => {
    it('should create a payment link', async () => {
      const responseBody = {
        data: {
          id: 'pl_abc123',
          amount: '50.00',
          currency: 'USD',
          description: 'Test payment',
          url: 'https://pay.ezpayments.co/pl_abc123',
          status: 'active',
        },
        meta: { request_id: 'req_001', mode: 'test' },
      };

      globalThis.fetch = mockFetch(201, responseBody, {
        'x-request-id': 'req_001',
      });

      const result = await client.paymentLinks.create({
        amount: '50.00',
        description: 'Test payment',
        currency: 'USD',
      });

      assert.deepStrictEqual(result, responseBody);

      // Verify the fetch call
      const [url, options] = globalThis.fetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v3/payment-links/'));
      assert.strictEqual(options.method, 'POST');
      assert.strictEqual(options.headers.Authorization, 'Bearer sk_test_123');

      const body = JSON.parse(options.body);
      assert.strictEqual(body.amount, '50.00');
      assert.strictEqual(body.description, 'Test payment');
    });

    it('should pass idempotency key header', async () => {
      globalThis.fetch = mockFetch(201, { data: {}, meta: {} });

      await client.paymentLinks.create(
        { amount: '10.00', description: 'test' },
        { idempotencyKey: 'idem_123' }
      );

      const [, options] = globalThis.fetch.mock.calls[0].arguments;
      assert.strictEqual(options.headers['Idempotency-Key'], 'idem_123');
    });
  });

  describe('list', () => {
    it('should return a PaginatedResponse', async () => {
      const responseBody = {
        data: {
          next: 'https://app.ezpayments.co/api/v3/payment-links/?cursor=abc123',
          previous: null,
          results: [
            { id: 'pl_1', amount: '10.00' },
            { id: 'pl_2', amount: '20.00' },
          ],
        },
        meta: { request_id: 'req_002', mode: 'test' },
      };

      globalThis.fetch = mockFetch(200, responseBody);

      const page = await client.paymentLinks.list({ limit: 10 });

      assert.ok(page instanceof PaginatedResponse);
      assert.strictEqual(page.results.length, 2);
      assert.strictEqual(page.results[0].id, 'pl_1');
      assert.strictEqual(page.hasMore, true);
      assert.strictEqual(page.meta.request_id, 'req_002');

      const [url, options] = globalThis.fetch.mock.calls[0].arguments;
      assert.ok(url.includes('limit=10'));
      assert.strictEqual(options.method, 'GET');
    });

    it('should pass startingAfter as starting_after query param', async () => {
      const responseBody = {
        data: { next: null, previous: null, results: [] },
        meta: { request_id: 'req_003', mode: 'test' },
      };

      globalThis.fetch = mockFetch(200, responseBody);

      await client.paymentLinks.list({ limit: 5, startingAfter: 'pl_abc' });

      const [url] = globalThis.fetch.mock.calls[0].arguments;
      assert.ok(url.includes('starting_after=pl_abc'));
      assert.ok(url.includes('limit=5'));
      // startingAfter should not appear as a raw param
      assert.ok(!url.includes('startingAfter='));
    });

    it('should work with no parameters', async () => {
      globalThis.fetch = mockFetch(200, {
        data: { next: null, previous: null, results: [] },
        meta: {},
      });

      const page = await client.paymentLinks.list();
      assert.ok(page instanceof PaginatedResponse);
      assert.strictEqual(page.results.length, 0);
      assert.strictEqual(page.hasMore, false);
    });

    it('should be iterable with for...of', async () => {
      const responseBody = {
        data: {
          next: null,
          previous: null,
          results: [
            { id: 'pl_1' },
            { id: 'pl_2' },
            { id: 'pl_3' },
          ],
        },
        meta: {},
      };

      globalThis.fetch = mockFetch(200, responseBody);

      const page = await client.paymentLinks.list();
      const ids = [];
      for (const item of page) {
        ids.push(item.id);
      }
      assert.deepStrictEqual(ids, ['pl_1', 'pl_2', 'pl_3']);
    });

    it('should pass additional filters through to query', async () => {
      globalThis.fetch = mockFetch(200, {
        data: { next: null, previous: null, results: [] },
        meta: {},
      });

      await client.paymentLinks.list({ limit: 10, status: 'active' });

      const [url] = globalThis.fetch.mock.calls[0].arguments;
      assert.ok(url.includes('status=active'));
      assert.ok(url.includes('limit=10'));
    });
  });

  describe('retrieve', () => {
    it('should retrieve a payment link by ID', async () => {
      const responseBody = {
        data: { id: 'pl_abc123', amount: '50.00' },
        meta: { request_id: 'req_003', mode: 'test' },
      };

      globalThis.fetch = mockFetch(200, responseBody);

      const result = await client.paymentLinks.retrieve('pl_abc123');
      assert.deepStrictEqual(result, responseBody);

      const [url] = globalThis.fetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v3/payment-links/pl_abc123/'));
    });
  });

  describe('update', () => {
    it('should update a payment link', async () => {
      const responseBody = {
        data: { id: 'pl_abc123', description: 'Updated' },
        meta: { request_id: 'req_004', mode: 'test' },
      };

      globalThis.fetch = mockFetch(200, responseBody);

      const result = await client.paymentLinks.update('pl_abc123', {
        description: 'Updated',
      });

      assert.deepStrictEqual(result, responseBody);

      const [url, options] = globalThis.fetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v3/payment-links/pl_abc123/'));
      assert.strictEqual(options.method, 'PATCH');
    });
  });

  describe('del', () => {
    it('should delete a payment link', async () => {
      globalThis.fetch = mockFetch(204, null);
      // Override json() for 204 -- HttpClient handles this
      globalThis.fetch = mock.fn(() =>
        Promise.resolve({
          ok: true,
          status: 204,
          headers: { get: () => null },
        })
      );

      const result = await client.paymentLinks.del('pl_abc123');
      assert.deepStrictEqual(result, { data: null, meta: { request_id: null } });
    });
  });

  describe('getFees', () => {
    it('should retrieve fees for a payment link', async () => {
      const responseBody = {
        data: {
          platform_fee: '1.50',
          processing_fee: '0.75',
          total_fee: '2.25',
        },
        meta: { request_id: 'req_005', mode: 'test' },
      };

      globalThis.fetch = mockFetch(200, responseBody);

      const result = await client.paymentLinks.getFees('pl_abc123');
      assert.deepStrictEqual(result, responseBody);

      const [url] = globalThis.fetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v3/payment-links/pl_abc123/fees/'));
    });
  });

  describe('error handling', () => {
    it('should throw AuthenticationError on 401', async () => {
      globalThis.fetch = mockFetch(401, {
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
          code: 'invalid_api_key',
        },
      });

      await assert.rejects(
        () => client.paymentLinks.list(),
        (err) => {
          assert.strictEqual(err.name, 'AuthenticationError');
          assert.strictEqual(err.message, 'Invalid API key');
          assert.strictEqual(err.statusCode, 401);
          return true;
        }
      );
    });

    it('should throw ValidationError on 400', async () => {
      globalThis.fetch = mockFetch(400, {
        error: {
          type: 'validation_error',
          message: 'Amount is required',
          code: 'missing_field',
          param: 'amount',
        },
      });

      await assert.rejects(
        () => client.paymentLinks.create({}),
        (err) => {
          assert.strictEqual(err.name, 'ValidationError');
          assert.strictEqual(err.param, 'amount');
          return true;
        }
      );
    });

    it('should throw NotFoundError on 404', async () => {
      globalThis.fetch = mockFetch(404, {
        error: {
          type: 'not_found',
          message: 'Payment link not found',
        },
      });

      await assert.rejects(
        () => client.paymentLinks.retrieve('pl_invalid'),
        (err) => {
          assert.strictEqual(err.name, 'NotFoundError');
          assert.strictEqual(err.statusCode, 404);
          return true;
        }
      );
    });

    it('should throw RateLimitError on 429', async () => {
      globalThis.fetch = mockFetch(429, {
        error: {
          type: 'rate_limit',
          message: 'Too many requests',
        },
      });

      await assert.rejects(
        () => client.paymentLinks.list(),
        (err) => {
          assert.strictEqual(err.name, 'RateLimitError');
          assert.strictEqual(err.statusCode, 429);
          return true;
        }
      );
    });

    it('should throw ApiError on 500', async () => {
      globalThis.fetch = mockFetch(500, {
        error: {
          type: 'api_error',
          message: 'Internal server error',
        },
      });

      await assert.rejects(
        () => client.paymentLinks.list(),
        (err) => {
          assert.strictEqual(err.name, 'ApiError');
          assert.strictEqual(err.statusCode, 500);
          return true;
        }
      );
    });
  });
});
