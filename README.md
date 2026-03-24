# ezPayments Node.js SDK

Official Node.js SDK for the [ezPayments](https://ezpayments.co) Merchant API v3.

- [x] Zero production dependencies
- [x] Uses native `fetch` (Node.js 18+)
- [x] Full TypeScript-compatible JSDoc annotations
- [x] Webhook signature verification
- [x] Idempotency key support
- [x] Comprehensive error handling

## Installation

```bash
npm install ezpayments
```

## Quick Start

```js
const EzPayments = require('ezpayments');

const client = new EzPayments('sk_live_xxx');

// Create a payment link
const { data: link } = await client.paymentLinks.create({
  amount: '50.00',
  description: 'Invoice #1234',
  currency: 'USD',
});

console.log(link.url); // https://pay.ezpayments.co/pl_xxx
```

## Configuration

```js
const client = new EzPayments('sk_live_xxx', {
  baseUrl: 'https://app.ezpayments.co', // default
  timeout: 30000,                         // 30s default
});
```

| Option    | Default                         | Description                  |
| --------- | ------------------------------- | ---------------------------- |
| `baseUrl` | `https://app.ezpayments.co`    | API base URL                 |
| `timeout` | `30000`                         | Request timeout (ms)         |

---

## API Reference

### Payment Links

```js
// Create
const { data: link } = await client.paymentLinks.create({
  amount: '50.00',
  description: 'Premium plan',
  currency: 'USD',
  redirect_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
  metadata: { customer_id: 'cust_123' },
}, { idempotencyKey: 'unique-key' });

// List
const { data: links } = await client.paymentLinks.list({
  page: 1,
  page_size: 20,
  status: 'active',
});

// Retrieve
const { data: link } = await client.paymentLinks.retrieve('pl_abc123');

// Update
const { data: updated } = await client.paymentLinks.update('pl_abc123', {
  description: 'Updated description',
});

// Delete
await client.paymentLinks.del('pl_abc123');

// Get fees
const { data: fees } = await client.paymentLinks.getFees('pl_abc123');
```

### Transactions

```js
// List
const { data: transactions } = await client.transactions.list({
  page: 1,
  page_size: 20,
});

// Retrieve
const { data: txn } = await client.transactions.retrieve('txn_abc123');
```

### Webhook Endpoints

```js
// Create
const { data: endpoint } = await client.webhookEndpoints.create({
  url: 'https://example.com/webhooks',
  events: ['payment_link.paid', 'payment_link.expired'],
});

// List
const { data: endpoints } = await client.webhookEndpoints.list();

// Retrieve
const { data: endpoint } = await client.webhookEndpoints.retrieve('we_abc123');

// Update
const { data: updated } = await client.webhookEndpoints.update('we_abc123', {
  events: ['payment_link.paid'],
  enabled: true,
});

// Delete
await client.webhookEndpoints.del('we_abc123');
```

### API Keys

```js
// Create
const { data: key } = await client.apiKeys.create({ name: 'Production' });
console.log(key.secret); // Save this -- it won't be shown again

// List
const { data: keys } = await client.apiKeys.list();

// Delete (revoke)
await client.apiKeys.del('key_abc123');
```

---

## Webhook Verification

Verify that incoming webhooks are authentic using the `Webhook` utility:

```js
const { Webhook } = require('ezpayments');

// Express example
app.post('/webhooks', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const event = Webhook.verify(
      process.env.WEBHOOK_SECRET,
      req.headers['x-ezpayments-signature'],
      req.body, // must be the raw body
    );

    switch (event.type) {
      case 'payment_link.paid':
        console.log('Payment received:', event.data.id);
        break;
      case 'payment_link.expired':
        console.log('Payment link expired:', event.data.id);
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    res.status(400).send('Invalid signature');
  }
});
```

### Signature format

The `X-EzPayments-Signature` header contains:

```
t=<unix_timestamp>,v1=<hmac_hex>
```

The HMAC is computed as:

```
HMAC-SHA256(secret, "<timestamp>.<raw_body>")
```

### Options

```js
Webhook.verify(secret, header, body, {
  tolerance: 300, // max age in seconds (default: 300 = 5 min)
});
```

### Test helper

Generate signature headers for testing:

```js
const header = Webhook.generateTestHeader('whsec_xxx', '{"type":"test"}');
```

---

## Error Handling

All API errors throw typed exceptions that extend `EzPaymentsError`:

```js
const EzPayments = require('ezpayments');

try {
  await client.paymentLinks.retrieve('pl_invalid');
} catch (err) {
  if (err instanceof EzPayments.NotFoundError) {
    console.log('Not found:', err.message);
  } else if (err instanceof EzPayments.AuthenticationError) {
    console.log('Auth failed:', err.message);
  } else if (err instanceof EzPayments.ValidationError) {
    console.log('Validation:', err.message, 'param:', err.param);
  } else if (err instanceof EzPayments.RateLimitError) {
    console.log('Rate limited, retry after:', err.retryAfter);
  } else if (err instanceof EzPayments.ApiError) {
    console.log('Server error:', err.message);
  }
}
```

### Error types

| Class                   | HTTP Status | Description                      |
| ----------------------- | ----------- | -------------------------------- |
| `AuthenticationError`   | 401         | Invalid or missing API key       |
| `ValidationError`       | 400, 422    | Invalid request parameters       |
| `NotFoundError`         | 404         | Resource not found               |
| `RateLimitError`        | 429         | Too many requests                |
| `ApiError`              | 5xx         | Server-side error                |
| `WebhookSignatureError` | --          | Webhook signature mismatch       |

### Error properties

All errors include:

| Property    | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `message`   | `string` | Human-readable error message         |
| `type`      | `string` | API error type                       |
| `code`      | `string` | Machine-readable error code          |
| `param`     | `string` | Parameter that caused the error      |
| `statusCode`| `number` | HTTP status code                     |
| `requestId` | `string` | Request ID for support reference     |

---

## Idempotency

All `create` methods accept an optional `idempotencyKey` to safely retry requests:

```js
const { data: link } = await client.paymentLinks.create(
  { amount: '50.00', description: 'Order #456' },
  { idempotencyKey: 'order-456-payment-link' },
);
```

---

## Requirements

- Node.js 18.0.0 or later (uses native `fetch`)
- An ezPayments account and API key

## License

MIT -- see [LICENSE](./LICENSE) for details.
