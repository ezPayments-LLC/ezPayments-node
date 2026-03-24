'use strict';

const PaginatedResponse = require('../pagination');

/**
 * Resource for managing webhook endpoints.
 *
 * Webhook endpoints define the URLs that ezPayments sends
 * event notifications to when certain actions occur.
 */
class WebhookEndpoints {
  /**
   * @param {import('../http-client')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this._http = httpClient;
    this._basePath = '/api/v3/webhook-endpoints/';
  }

  /**
   * Creates a new webhook endpoint.
   *
   * @param {object} params - Webhook endpoint parameters
   * @param {string} params.url - The URL to send webhook events to
   * @param {string[]} [params.events] - List of event types to subscribe to
   * @param {string} [params.description] - Description of this endpoint
   * @param {object} [options]
   * @param {string} [options.idempotencyKey] - Idempotency key for safe retries
   * @returns {Promise<object>} The created webhook endpoint (includes signing secret)
   *
   * @example
   * const endpoint = await ezpayments.webhookEndpoints.create({
   *   url: 'https://example.com/webhooks',
   *   events: ['payment_link.paid', 'payment_link.expired'],
   * });
   */
  async create(params, { idempotencyKey } = {}) {
    return this._http.request('POST', this._basePath, {
      body: params,
      idempotencyKey,
    });
  }

  /**
   * Lists webhook endpoints with cursor-based pagination.
   *
   * @param {object} [params] - Query parameters
   * @param {number} [params.limit] - Number of items per page (1-100, default 20)
   * @param {string} [params.startingAfter] - Cursor for fetching the next page
   * @returns {Promise<PaginatedResponse>} Paginated list of webhook endpoints
   *
   * @example
   * const page = await client.webhookEndpoints.list({ limit: 10 });
   * console.log(page.results);
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
   * Retrieves a single webhook endpoint by ID.
   *
   * @param {string} id - Webhook endpoint ID
   * @returns {Promise<object>} The webhook endpoint
   *
   * @example
   * const endpoint = await ezpayments.webhookEndpoints.retrieve('we_abc123');
   */
  async retrieve(id) {
    return this._http.request('GET', `${this._basePath}${id}/`);
  }

  /**
   * Updates an existing webhook endpoint.
   *
   * @param {string} id - Webhook endpoint ID
   * @param {object} params - Fields to update
   * @param {string} [params.url] - Updated URL
   * @param {string[]} [params.events] - Updated event types
   * @param {string} [params.description] - Updated description
   * @param {boolean} [params.enabled] - Enable or disable the endpoint
   * @returns {Promise<object>} The updated webhook endpoint
   *
   * @example
   * const updated = await ezpayments.webhookEndpoints.update('we_abc123', {
   *   events: ['payment_link.paid'],
   * });
   */
  async update(id, params) {
    return this._http.request('PATCH', `${this._basePath}${id}/`, {
      body: params,
    });
  }

  /**
   * Deletes a webhook endpoint.
   *
   * @param {string} id - Webhook endpoint ID
   * @returns {Promise<object>} Deletion confirmation
   *
   * @example
   * await ezpayments.webhookEndpoints.del('we_abc123');
   */
  async del(id) {
    return this._http.request('DELETE', `${this._basePath}${id}/`);
  }
}

module.exports = WebhookEndpoints;
