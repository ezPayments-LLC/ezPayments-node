'use strict';

const PaginatedResponse = require('../pagination');

/**
 * Resource for managing payment links.
 *
 * Payment links allow you to create shareable URLs that accept payments
 * from your customers without building a custom checkout flow.
 */
class PaymentLinks {
  /**
   * @param {import('../http-client')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this._http = httpClient;
    this._basePath = '/api/v3/payment-links/';
  }

  /**
   * Creates a new payment link.
   *
   * @param {object} params - Payment link parameters
   * @param {string} params.amount - Payment amount as a decimal string (e.g., "50.00")
   * @param {string} params.description - Description of the payment
   * @param {string} [params.currency] - Three-letter ISO currency code (default: account currency)
   * @param {string} [params.redirect_url] - URL to redirect after successful payment
   * @param {string} [params.cancel_url] - URL to redirect after cancelled payment
   * @param {object} [params.metadata] - Arbitrary key-value metadata
   * @param {object} [options]
   * @param {string} [options.idempotencyKey] - Idempotency key for safe retries
   * @returns {Promise<object>} The created payment link
   *
   * @example
   * const link = await ezpayments.paymentLinks.create({
   *   amount: '50.00',
   *   description: 'Premium subscription',
   *   currency: 'USD',
   * });
   */
  async create(params, { idempotencyKey } = {}) {
    return this._http.request('POST', this._basePath, {
      body: params,
      idempotencyKey,
    });
  }

  /**
   * Lists payment links with cursor-based pagination and optional filtering.
   *
   * @param {object} [params] - Query parameters
   * @param {number} [params.limit] - Number of items per page (1-100, default 20)
   * @param {string} [params.startingAfter] - Cursor for fetching the next page
   * @param {string} [params.status] - Filter by status
   * @param {string} [params.ordering] - Field to order results by
   * @returns {Promise<PaginatedResponse>} Paginated list of payment links
   *
   * @example
   * const page = await client.paymentLinks.list({ limit: 10, status: 'active' });
   * console.log(page.results);
   *
   * if (page.hasMore) {
   *   const nextPage = await page.nextPage();
   * }
   */
  async list(params = {}) {
    const { startingAfter, ...rest } = params;
    const query = { ...rest };
    if (startingAfter) {
      query.starting_after = startingAfter;
    }
    const response = await this._http.request('GET', this._basePath, { query });
    return new PaginatedResponse(response.data, response.meta, this._http, this._basePath);
  }

  /**
   * Retrieves a single payment link by ID.
   *
   * @param {string} id - Payment link ID
   * @returns {Promise<object>} The payment link
   *
   * @example
   * const link = await ezpayments.paymentLinks.retrieve('pl_abc123');
   */
  async retrieve(id) {
    return this._http.request('GET', `${this._basePath}${id}/`);
  }

  /**
   * Updates an existing payment link.
   *
   * @param {string} id - Payment link ID
   * @param {object} params - Fields to update
   * @param {string} [params.description] - Updated description
   * @param {string} [params.redirect_url] - Updated redirect URL
   * @param {string} [params.cancel_url] - Updated cancel URL
   * @param {object} [params.metadata] - Updated metadata
   * @returns {Promise<object>} The updated payment link
   *
   * @example
   * const updated = await ezpayments.paymentLinks.update('pl_abc123', {
   *   description: 'Updated description',
   * });
   */
  async update(id, params) {
    return this._http.request('PATCH', `${this._basePath}${id}/`, {
      body: params,
    });
  }

  /**
   * Deletes a payment link.
   *
   * @param {string} id - Payment link ID
   * @returns {Promise<object>} Deletion confirmation
   *
   * @example
   * await ezpayments.paymentLinks.del('pl_abc123');
   */
  async del(id) {
    return this._http.request('DELETE', `${this._basePath}${id}/`);
  }

  /**
   * Retrieves the fee breakdown for a payment link.
   *
   * @param {string} id - Payment link ID
   * @returns {Promise<object>} Fee breakdown for the payment link
   *
   * @example
   * const fees = await ezpayments.paymentLinks.getFees('pl_abc123');
   */
  async getFees(id) {
    return this._http.request('GET', `${this._basePath}${id}/fees/`);
  }
}

module.exports = PaymentLinks;
