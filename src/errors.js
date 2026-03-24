'use strict';

/**
 * Base error class for all ezPayments SDK errors.
 * @extends Error
 */
class EzPaymentsError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [type] - Error type from the API
   * @param {string} [code] - Error code from the API
   * @param {string} [param] - Parameter that caused the error
   * @param {number} [statusCode] - HTTP status code
   * @param {string} [requestId] - Request ID from the API response
   */
  constructor(message, { type, code, param, statusCode, requestId } = {}) {
    super(message);
    this.name = 'EzPaymentsError';
    this.type = type || null;
    this.code = code || null;
    this.param = param || null;
    this.statusCode = statusCode || null;
    this.requestId = requestId || null;
  }
}

/**
 * Thrown when the API key is missing or invalid (HTTP 401).
 * @extends EzPaymentsError
 */
class AuthenticationError extends EzPaymentsError {
  constructor(message, details = {}) {
    super(message, { ...details, statusCode: details.statusCode || 401 });
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the request contains invalid parameters (HTTP 400/422).
 * @extends EzPaymentsError
 */
class ValidationError extends EzPaymentsError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when the requested resource is not found (HTTP 404).
 * @extends EzPaymentsError
 */
class NotFoundError extends EzPaymentsError {
  constructor(message, details = {}) {
    super(message, { ...details, statusCode: details.statusCode || 404 });
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when rate limits are exceeded (HTTP 429).
 * @extends EzPaymentsError
 */
class RateLimitError extends EzPaymentsError {
  /**
   * @param {string} message - Error message
   * @param {object} [details] - Error details
   * @param {number} [details.retryAfter] - Seconds to wait before retrying
   */
  constructor(message, details = {}) {
    super(message, { ...details, statusCode: details.statusCode || 429 });
    this.name = 'RateLimitError';
    this.retryAfter = details.retryAfter || null;
  }
}

/**
 * Thrown for general API errors (HTTP 5xx or unexpected status codes).
 * @extends EzPaymentsError
 */
class ApiError extends EzPaymentsError {
  constructor(message, details = {}) {
    super(message, details);
    this.name = 'ApiError';
  }
}

/**
 * Thrown when webhook signature verification fails.
 * @extends EzPaymentsError
 */
class WebhookSignatureError extends EzPaymentsError {
  constructor(message) {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}

/**
 * Creates the appropriate error instance based on the HTTP status code and error body.
 *
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Parsed response body
 * @param {string} [requestId] - Request ID from response headers
 * @returns {EzPaymentsError} The appropriate error instance
 */
function createErrorFromResponse(statusCode, body, requestId) {
  const error = body && body.error ? body.error : {};
  const message = error.message || `Request failed with status ${statusCode}`;
  const details = {
    type: error.type,
    code: error.code,
    param: error.param,
    statusCode,
    requestId,
  };

  switch (statusCode) {
    case 401:
      return new AuthenticationError(message, details);
    case 400:
    case 422:
      return new ValidationError(message, details);
    case 404:
      return new NotFoundError(message, details);
    case 429:
      return new RateLimitError(message, details);
    default:
      return new ApiError(message, details);
  }
}

module.exports = {
  EzPaymentsError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ApiError,
  WebhookSignatureError,
  createErrorFromResponse,
};
