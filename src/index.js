'use strict';

const EzPayments = require('./client');
const Webhook = require('./webhook');
const PaginatedResponse = require('./pagination');
const {
  EzPaymentsError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ApiError,
  WebhookSignatureError,
} = require('./errors');

module.exports = EzPayments;
module.exports.EzPayments = EzPayments;
module.exports.Webhook = Webhook;
module.exports.PaginatedResponse = PaginatedResponse;
module.exports.EzPaymentsError = EzPaymentsError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.ValidationError = ValidationError;
module.exports.NotFoundError = NotFoundError;
module.exports.RateLimitError = RateLimitError;
module.exports.ApiError = ApiError;
module.exports.WebhookSignatureError = WebhookSignatureError;
