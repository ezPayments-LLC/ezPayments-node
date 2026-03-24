'use strict';

/**
 * Represents a paginated API response with cursor-based navigation.
 *
 * Wraps list endpoint results and provides helpers for iterating
 * through pages of data.
 *
 * @example
 * const page = await client.paymentLinks.list({ limit: 10 });
 * console.log(page.results);  // first 10 items
 *
 * if (page.hasMore) {
 *   const next = await page.nextPage();
 *   console.log(next.results); // next 10 items
 * }
 */
class PaginatedResponse {
  /**
   * @param {object} data - The `data` envelope from the API response
   * @param {Array} data.results - Array of resource objects
   * @param {string|null} data.next - Full URL for the next page, or null
   * @param {string|null} data.previous - Full URL for the previous page, or null
   * @param {object} meta - The `meta` envelope from the API response
   * @param {import('./http-client')} httpClient - HTTP client for fetching additional pages
   * @param {string} path - The base resource path (e.g. /api/v3/payment-links/)
   */
  constructor(data, meta, httpClient, path) {
    /** @type {Array<object>} */
    this.results = data.results || [];

    /** @type {string|null} */
    this.nextUrl = data.next || null;

    /** @type {string|null} */
    this.previousUrl = data.previous || null;

    /** @type {object} */
    this.meta = meta || {};

    /** @private */
    this._httpClient = httpClient;

    /** @private */
    this._path = path;
  }

  /**
   * Whether there are more pages available after this one.
   * @type {boolean}
   */
  get hasMore() {
    return this.nextUrl !== null;
  }

  /**
   * Fetches the next page of results.
   *
   * @returns {Promise<PaginatedResponse>} The next page
   * @throws {Error} If there is no next page
   *
   * @example
   * let page = await client.paymentLinks.list({ limit: 5 });
   * while (page.hasMore) {
   *   page = await page.nextPage();
   *   console.log(page.results);
   * }
   */
  async nextPage() {
    if (!this.hasMore) {
      throw new Error('No more pages available.');
    }

    const url = new URL(this.nextUrl);
    const query = {};
    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value;
    }

    const response = await this._httpClient.request('GET', this._path, { query });
    return new PaginatedResponse(response.data, response.meta, this._httpClient, this._path);
  }

  /**
   * Fetches the previous page of results.
   *
   * @returns {Promise<PaginatedResponse>} The previous page
   * @throws {Error} If there is no previous page
   */
  async previousPage() {
    if (!this.previousUrl) {
      throw new Error('No previous page available.');
    }

    const url = new URL(this.previousUrl);
    const query = {};
    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value;
    }

    const response = await this._httpClient.request('GET', this._path, { query });
    return new PaginatedResponse(response.data, response.meta, this._httpClient, this._path);
  }

  /**
   * Makes the results iterable with for...of loops.
   *
   * @returns {Iterator<object>}
   *
   * @example
   * const page = await client.paymentLinks.list();
   * for (const link of page) {
   *   console.log(link.id);
   * }
   */
  [Symbol.iterator]() {
    return this.results[Symbol.iterator]();
  }
}

module.exports = PaginatedResponse;
