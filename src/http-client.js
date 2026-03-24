'use strict';

const { createErrorFromResponse, EzPaymentsError } = require('./errors');

const SDK_VERSION = require('../package.json').version;

/**
 * Low-level HTTP client that wraps native fetch with authentication,
 * error handling, and response parsing for the ezPayments API.
 */
class HttpClient {
  /**
   * @param {object} options
   * @param {string} options.apiKey - API key for authentication
   * @param {string} options.baseUrl - Base URL for the API
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   */
  constructor({ apiKey, baseUrl, timeout = 30000 }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeout = timeout;
  }

  /**
   * Performs an HTTP request to the ezPayments API.
   *
   * @param {string} method - HTTP method (GET, POST, PATCH, DELETE)
   * @param {string} path - API path (e.g., /api/v3/payment-links/)
   * @param {object} [options]
   * @param {object} [options.body] - Request body (will be JSON-serialized)
   * @param {object} [options.query] - Query string parameters
   * @param {string} [options.idempotencyKey] - Idempotency key for safe retries
   * @returns {Promise<object>} Parsed response body
   * @throws {EzPaymentsError} On API errors or network failures
   */
  async request(method, path, { body, query, idempotencyKey } = {}) {
    const url = this._buildUrl(path, query);
    const headers = this._buildHeaders(idempotencyKey);

    const fetchOptions = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        throw new EzPaymentsError(`Request timed out after ${this.timeout}ms`);
      }
      throw new EzPaymentsError(`Network error: ${err.message}`);
    }

    const requestId = response.headers.get('x-request-id') || null;

    if (response.status === 204) {
      return { data: null, meta: { request_id: requestId } };
    }

    let responseBody;
    try {
      responseBody = await response.json();
    } catch {
      throw new EzPaymentsError(
        `Invalid JSON response from API (status ${response.status})`,
        { statusCode: response.status, requestId }
      );
    }

    if (!response.ok) {
      throw createErrorFromResponse(response.status, responseBody, requestId);
    }

    return responseBody;
  }

  /**
   * Builds the full URL with query parameters.
   *
   * @param {string} path - API path
   * @param {object} [query] - Query parameters
   * @returns {string} Full URL
   * @private
   */
  _buildUrl(path, query) {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /**
   * Builds request headers including authentication.
   *
   * @param {string} [idempotencyKey] - Optional idempotency key
   * @returns {object} Headers object
   * @private
   */
  _buildHeaders(idempotencyKey) {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': `ezpayments-node/${SDK_VERSION}`,
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return headers;
  }
}

module.exports = HttpClient;
