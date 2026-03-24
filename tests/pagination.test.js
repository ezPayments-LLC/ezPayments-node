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

describe('PaginatedResponse', () => {
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

  it('should be exported from the package', () => {
    assert.ok(EzPayments.PaginatedResponse);
    assert.strictEqual(EzPayments.PaginatedResponse, PaginatedResponse);
  });

  it('should expose results, hasMore, and meta', async () => {
    const responseBody = {
      data: {
        next: 'https://app.ezpayments.co/api/v3/payment-links/?cursor=abc123',
        previous: null,
        results: [{ id: 'pl_1' }, { id: 'pl_2' }],
      },
      meta: { request_id: 'req_001', mode: 'live' },
    };

    globalThis.fetch = mockFetch(200, responseBody);

    const page = await client.paymentLinks.list();

    assert.strictEqual(page.results.length, 2);
    assert.strictEqual(page.hasMore, true);
    assert.strictEqual(page.meta.request_id, 'req_001');
    assert.strictEqual(page.previousUrl, null);
    assert.ok(page.nextUrl.includes('cursor=abc123'));
  });

  it('should report hasMore as false when next is null', async () => {
    globalThis.fetch = mockFetch(200, {
      data: { next: null, previous: null, results: [{ id: 'pl_1' }] },
      meta: {},
    });

    const page = await client.paymentLinks.list();
    assert.strictEqual(page.hasMore, false);
  });

  it('should fetch the next page via nextPage()', async () => {
    // First page
    const firstResponse = {
      data: {
        next: 'https://api.test.ezpayments.co/api/v3/payment-links/?cursor=cur_2&limit=2',
        previous: null,
        results: [{ id: 'pl_1' }, { id: 'pl_2' }],
      },
      meta: { request_id: 'req_001', mode: 'test' },
    };

    globalThis.fetch = mockFetch(200, firstResponse);
    const firstPage = await client.paymentLinks.list({ limit: 2 });

    assert.strictEqual(firstPage.results.length, 2);
    assert.strictEqual(firstPage.hasMore, true);

    // Second page
    const secondResponse = {
      data: {
        next: null,
        previous: 'https://api.test.ezpayments.co/api/v3/payment-links/?limit=2',
        results: [{ id: 'pl_3' }],
      },
      meta: { request_id: 'req_002', mode: 'test' },
    };

    globalThis.fetch = mockFetch(200, secondResponse);
    const secondPage = await firstPage.nextPage();

    assert.ok(secondPage instanceof PaginatedResponse);
    assert.strictEqual(secondPage.results.length, 1);
    assert.strictEqual(secondPage.results[0].id, 'pl_3');
    assert.strictEqual(secondPage.hasMore, false);
    assert.ok(secondPage.previousUrl !== null);

    // Verify the query params from the next URL were forwarded
    const [url] = globalThis.fetch.mock.calls[0].arguments;
    assert.ok(url.includes('cursor=cur_2'));
    assert.ok(url.includes('limit=2'));
  });

  it('should throw when calling nextPage() with no more pages', async () => {
    globalThis.fetch = mockFetch(200, {
      data: { next: null, previous: null, results: [] },
      meta: {},
    });

    const page = await client.paymentLinks.list();
    await assert.rejects(() => page.nextPage(), {
      message: 'No more pages available.',
    });
  });

  it('should fetch the previous page via previousPage()', async () => {
    const responseBody = {
      data: {
        next: null,
        previous: 'https://api.test.ezpayments.co/api/v3/payment-links/?limit=2',
        results: [{ id: 'pl_3' }],
      },
      meta: {},
    };

    globalThis.fetch = mockFetch(200, responseBody);
    const page = await client.paymentLinks.list({ limit: 2, startingAfter: 'pl_2' });

    const prevResponse = {
      data: {
        next: 'https://api.test.ezpayments.co/api/v3/payment-links/?cursor=cur_2&limit=2',
        previous: null,
        results: [{ id: 'pl_1' }, { id: 'pl_2' }],
      },
      meta: {},
    };

    globalThis.fetch = mockFetch(200, prevResponse);
    const prevPage = await page.previousPage();

    assert.ok(prevPage instanceof PaginatedResponse);
    assert.strictEqual(prevPage.results.length, 2);
  });

  it('should throw when calling previousPage() with no previous page', async () => {
    globalThis.fetch = mockFetch(200, {
      data: { next: null, previous: null, results: [] },
      meta: {},
    });

    const page = await client.paymentLinks.list();
    await assert.rejects(() => page.previousPage(), {
      message: 'No previous page available.',
    });
  });

  it('should be iterable with Symbol.iterator', async () => {
    globalThis.fetch = mockFetch(200, {
      data: {
        next: null,
        previous: null,
        results: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      },
      meta: {},
    });

    const page = await client.paymentLinks.list();

    // Spread into array
    const items = [...page];
    assert.strictEqual(items.length, 3);
    assert.deepStrictEqual(
      items.map((i) => i.id),
      ['a', 'b', 'c']
    );
  });

  it('should handle empty results', async () => {
    globalThis.fetch = mockFetch(200, {
      data: { next: null, previous: null, results: [] },
      meta: {},
    });

    const page = await client.paymentLinks.list();
    assert.strictEqual(page.results.length, 0);
    assert.strictEqual(page.hasMore, false);
    assert.deepStrictEqual([...page], []);
  });

  it('should work with transactions resource', async () => {
    globalThis.fetch = mockFetch(200, {
      data: {
        next: null,
        previous: null,
        results: [{ id: 'txn_1' }],
      },
      meta: { request_id: 'req_010' },
    });

    const page = await client.transactions.list({ limit: 5 });
    assert.ok(page instanceof PaginatedResponse);
    assert.strictEqual(page.results[0].id, 'txn_1');
  });

  it('should work with webhookEndpoints resource', async () => {
    globalThis.fetch = mockFetch(200, {
      data: {
        next: null,
        previous: null,
        results: [{ id: 'we_1' }],
      },
      meta: {},
    });

    const page = await client.webhookEndpoints.list();
    assert.ok(page instanceof PaginatedResponse);
    assert.strictEqual(page.results[0].id, 'we_1');
  });

  it('should work with apiKeys resource', async () => {
    globalThis.fetch = mockFetch(200, {
      data: {
        next: null,
        previous: null,
        results: [{ id: 'key_1', name: 'Production' }],
      },
      meta: {},
    });

    const page = await client.apiKeys.list();
    assert.ok(page instanceof PaginatedResponse);
    assert.strictEqual(page.results[0].id, 'key_1');
  });

  it('should support auto-pagination across multiple pages', async () => {
    // Simulate collecting all items across pages
    const page1Response = {
      data: {
        next: 'https://api.test.ezpayments.co/api/v3/payment-links/?cursor=cur_2&limit=2',
        previous: null,
        results: [{ id: 'pl_1' }, { id: 'pl_2' }],
      },
      meta: {},
    };

    globalThis.fetch = mockFetch(200, page1Response);
    let page = await client.paymentLinks.list({ limit: 2 });

    const allItems = [...page.results];

    const page2Response = {
      data: {
        next: null,
        previous: 'https://api.test.ezpayments.co/api/v3/payment-links/?limit=2',
        results: [{ id: 'pl_3' }],
      },
      meta: {},
    };

    globalThis.fetch = mockFetch(200, page2Response);
    page = await page.nextPage();
    allItems.push(...page.results);

    assert.strictEqual(allItems.length, 3);
    assert.deepStrictEqual(
      allItems.map((i) => i.id),
      ['pl_1', 'pl_2', 'pl_3']
    );
    assert.strictEqual(page.hasMore, false);
  });
});
