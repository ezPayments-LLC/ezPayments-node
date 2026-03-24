'use strict';

const HttpClient = require('./http-client');
const PaymentLinks = require('./resources/payment-links');
const Transactions = require('./resources/transactions');
const WebhookEndpoints = require('./resources/webhook-endpoints');
const ApiKeys = require('./resources/api-keys');
const { EzPaymentsError } = require('./errors');

/**
 * Default base URL for the ezPayments API.
 * @type {string}
 */
const DEFAULT_BASE_URL = 'https://app.ezpayments.co';

/**
 * The main ezPayments client. Provides access to all API resources.
 *
 * @example
 * const EzPayments = require('ezpayments');
 *
 * const client = new EzPayments('sk_live_xxx');
 *
 * // Create a payment link
 * const link = await client.paymentLinks.create({
 *   amount: '50.00',
 *   description: 'Invoice #1234',
 * });
 */
class EzPayments {
  /**
   * Creates a new ezPayments client instance.
   *
   * @param {string} apiKey - Your ezPayments API key (e.g., "sk_live_xxx" or "sk_test_xxx")
   * @param {object} [options]
   * @param {string} [options.baseUrl='https://app.ezpayments.co'] - API base URL
   * @param {number} [options.timeout=30000] - Request timeout in milliseconds
   * @throws {EzPaymentsError} If apiKey is not provided
   *
   * @example
   * // Default configuration
   * const client = new EzPayments('sk_live_xxx');
   *
   * // Custom configuration
   * const client = new EzPayments('sk_test_xxx', {
   *   baseUrl: 'https://sandbox.ezpayments.co',
   *   timeout: 60000,
   * });
   */
  constructor(apiKey, { baseUrl = DEFAULT_BASE_URL, timeout = 30000 } = {}) {
    if (!apiKey) {
      throw new EzPaymentsError(
        'API key is required. Pass it as the first argument: new EzPayments("sk_live_xxx")'
      );
    }

    /** @private */
    this._httpClient = new HttpClient({ apiKey, baseUrl, timeout });

    /**
     * Payment links resource.
     * @type {PaymentLinks}
     */
    this.paymentLinks = new PaymentLinks(this._httpClient);

    /**
     * Transactions resource.
     * @type {Transactions}
     */
    this.transactions = new Transactions(this._httpClient);

    /**
     * Webhook endpoints resource.
     * @type {WebhookEndpoints}
     */
    this.webhookEndpoints = new WebhookEndpoints(this._httpClient);

    /**
     * API keys resource.
     * @type {ApiKeys}
     */
    this.apiKeys = new ApiKeys(this._httpClient);
  }
}

module.exports = EzPayments;
