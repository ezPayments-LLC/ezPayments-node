'use strict';

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
   * Lists all transactions with optional filtering and pagination.
   *
   * @param {object} [params] - Query parameters
   * @param {number} [params.page] - Page number
   * @param {number} [params.page_size] - Number of items per page
   * @param {string} [params.status] - Filter by status
   * @param {string} [params.ordering] - Field to order results by
   * @param {string} [params.created_after] - Filter transactions created after this ISO date
   * @param {string} [params.created_before] - Filter transactions created before this ISO date
   * @returns {Promise<object>} Paginated list of transactions
   *
   * @example
   * const txns = await ezpayments.transactions.list({ page: 1, page_size: 20 });
   */
  async list(params = {}) {
    return this._http.request('GET', this._basePath, { query: params });
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
