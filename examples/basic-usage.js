'use strict';

/**
 * Basic usage example for the ezPayments Node.js SDK.
 *
 * Before running, set the EZPAYMENTS_API_KEY environment variable:
 *   export EZPAYMENTS_API_KEY=sk_test_xxx
 *   node examples/basic-usage.js
 */

const EzPayments = require('ezpayments');
const { Webhook } = require('ezpayments');

const API_KEY = process.env.EZPAYMENTS_API_KEY;

if (!API_KEY) {
  console.error('[!] Set EZPAYMENTS_API_KEY environment variable first.');
  process.exit(1);
}

const client = new EzPayments(API_KEY);

async function main() {
  // ----------------------------------------------------------------
  // Payment Links
  // ----------------------------------------------------------------

  // Create a payment link
  console.log('--- Creating a payment link ---');
  const { data: link } = await client.paymentLinks.create({
    amount: '25.00',
    description: 'Monthly subscription - March 2025',
    currency: 'USD',
    metadata: { customer_id: 'cust_123' },
  });
  console.log(`Created: ${link.id} -> ${link.url}`);

  // List payment links
  console.log('\n--- Listing payment links ---');
  const { data: links } = await client.paymentLinks.list({ page: 1, page_size: 5 });
  console.log(`Found ${links.length} payment link(s)`);

  // Retrieve a payment link
  console.log('\n--- Retrieving payment link ---');
  const { data: retrieved } = await client.paymentLinks.retrieve(link.id);
  console.log(`Retrieved: ${retrieved.id}, status: ${retrieved.status}`);

  // Get fees for the payment link
  console.log('\n--- Getting fees ---');
  const { data: fees } = await client.paymentLinks.getFees(link.id);
  console.log(`Total fee: ${fees.total_fee}`);

  // Update the payment link
  console.log('\n--- Updating payment link ---');
  const { data: updated } = await client.paymentLinks.update(link.id, {
    description: 'Monthly subscription - updated',
  });
  console.log(`Updated description: ${updated.description}`);

  // ----------------------------------------------------------------
  // Transactions
  // ----------------------------------------------------------------

  console.log('\n--- Listing transactions ---');
  const { data: transactions } = await client.transactions.list({ page_size: 5 });
  console.log(`Found ${transactions.length} transaction(s)`);

  // ----------------------------------------------------------------
  // Webhook Endpoints
  // ----------------------------------------------------------------

  console.log('\n--- Creating webhook endpoint ---');
  const { data: endpoint } = await client.webhookEndpoints.create({
    url: 'https://example.com/webhooks/ezpayments',
    events: ['payment_link.paid', 'payment_link.expired'],
  });
  console.log(`Created endpoint: ${endpoint.id}`);

  // ----------------------------------------------------------------
  // API Keys
  // ----------------------------------------------------------------

  console.log('\n--- Listing API keys ---');
  const { data: keys } = await client.apiKeys.list();
  console.log(`Found ${keys.length} API key(s)`);

  // ----------------------------------------------------------------
  // Webhook Verification (demonstration)
  // ----------------------------------------------------------------

  console.log('\n--- Webhook signature verification ---');
  const webhookSecret = 'whsec_demo_secret';
  const eventBody = JSON.stringify({ type: 'payment_link.paid', data: { id: link.id } });
  const header = Webhook.generateTestHeader(webhookSecret, eventBody);

  const event = Webhook.verify(webhookSecret, header, eventBody);
  console.log(`Verified webhook event: ${event.type}`);

  // ----------------------------------------------------------------
  // Error handling
  // ----------------------------------------------------------------

  console.log('\n--- Error handling example ---');
  try {
    await client.paymentLinks.retrieve('pl_nonexistent');
  } catch (err) {
    if (err instanceof EzPayments.NotFoundError) {
      console.log(`[Expected] NotFoundError: ${err.message}`);
    } else if (err instanceof EzPayments.AuthenticationError) {
      console.log(`[Expected] AuthenticationError: ${err.message}`);
    } else {
      console.log(`[Expected] ${err.name}: ${err.message}`);
    }
  }

  console.log('\n[OK] All examples completed successfully.');
}

main().catch((err) => {
  console.error(`[!] Error: ${err.message}`);
  process.exit(1);
});
