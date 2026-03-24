'use strict';

/**
 * Resource for managing API keys.
 *
 * API keys are used to authenticate requests to the ezPayments API.
 * You can create multiple keys for different environments or services.
 */
class ApiKeys {
  /**
   * @param {import('../http-client')} httpClient - HTTP client instance
   */
  constructor(httpClient) {
    this._http = httpClient;
    this._basePath = '/api/v3/api-keys/';
  }

  /**
   * Creates a new API key.
   *
   * @param {object} params - API key parameters
   * @param {string} [params.name] - Display name for the key
   * @param {object} [options]
   * @param {string} [options.idempotencyKey] - Idempotency key for safe retries
   * @returns {Promise<object>} The created API key (secret is only shown once)
   *
   * @example
   * const key = await ezpayments.apiKeys.create({ name: 'Production' });
   * console.log(key.data.secret); // Save this -- it won't be shown again
   */
  async create(params = {}, { idempotencyKey } = {}) {
    return this._http.request('POST', this._basePath, {
      body: params,
      idempotencyKey,
    });
  }

  /**
   * Lists all API keys. Secrets are not included in list responses.
   *
   * @param {object} [params] - Query parameters
   * @param {number} [params.page] - Page number
   * @param {number} [params.page_size] - Number of items per page
   * @returns {Promise<object>} Paginated list of API keys
   *
   * @example
   * const keys = await ezpayments.apiKeys.list();
   */
  async list(params = {}) {
    return this._http.request('GET', this._basePath, { query: params });
  }

  /**
   * Deletes (revokes) an API key. This action is irreversible.
   *
   * @param {string} id - API key ID
   * @returns {Promise<object>} Deletion confirmation
   *
   * @example
   * await ezpayments.apiKeys.del('key_abc123');
   */
  async del(id) {
    return this._http.request('DELETE', `${this._basePath}${id}/`);
  }
}

module.exports = ApiKeys;
