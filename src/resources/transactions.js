'use strict';

const PaginatedResponse = require('../pagination');

/**
 * Resource for viewing transactions.
 *
 * Transactions represent individual payment events within
 * your ezPayments account.
 */
class Transactions {
  /**
   * @param {import('../http-client')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this._http = httpClient;
    this._basePath = '/api/v3/transactions/';
  }

  /**
   * Lists transactions with cursor-based pagination and optional filtering.
   *
   * @param {object} [params] - Query parameters
   * @param {number} [params.limit] - Number of items per page (1-100, default 20)
   * @param {string} [params.startingAfter] - Cursor for fetching the next page
   * @param {string} [params.status] - Filter by status
   * @param {string} [params.ordering] - Field to order results by
   * @param {string} [params.created_after] - Filter transactions created after this ISO date
   * @param {string} [params.created_before] - Filter transactions created before this ISO date
   * @returns {Promise<PaginatedResponse>} Paginated list of transactions
   *
   * @example
   * const page = await client.transactions.list({ limit: 20 });
   * for (const txn of page) {
   *   console.log(txn.id);
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
   * Retrieves a single transaction by ID.
   *
   * @param {string} id - Transaction ID
   * @returns {Promise<object>} The transaction
   *
   * @example
   * const txn = await ezpayments.transactions.retrieve('txn_abc123');
   */
  async retrieve(id) {
    return this._http.request('GET', `${this._basePath}${id}/`);
  }
}

module.exports = Transactions;
