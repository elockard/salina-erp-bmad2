# Webhooks Guide

## Overview

Webhooks allow you to receive real-time notifications when events occur in Salina.
Instead of polling the API, your server receives HTTP POST requests with event data.

## Supported Events

| Event | Trigger |
|-------|---------|
| `title.created` | New title added to catalog |
| `title.updated` | Title metadata modified |
| `sale.created` | Sales transaction recorded |
| `statement.generated` | Royalty statement PDF created |
| `onix.exported` | ONIX feed exported to channel |

## Payload Format

All webhooks use this standard envelope:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "title.created",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    // Event-specific payload
  }
}
```

### Event Payloads

**title.created / title.updated**
```json
{
  "title_id": "uuid",
  "title": "Book Title",
  "isbn": "9781234567890",
  "changed_fields": ["title", "publication_status"]  // only for title.updated
}
```

**sale.created**
```json
{
  "sale_id": "uuid",
  "title_id": "uuid",
  "quantity": 5,
  "amount": "49.95"
}
```

**statement.generated**
```json
{
  "statement_id": "uuid",
  "author_id": "uuid",
  "period_start": "2024-01-01",
  "period_end": "2024-03-31"
}
```

**onix.exported**
```json
{
  "export_id": "uuid",
  "channel": "ingram",
  "format": "3.1",
  "title_count": 150,
  "file_name": "onix-export-2024-01-15.xml"
}
```

## Signing Secret

When you create a webhook subscription, the API returns a `secret` field.
**This is your signing key** - store it securely, as it's only shown once.

If compromised, use `POST /webhooks/{id}/secret` to regenerate (requires `admin` scope).

## Signature Verification

All webhooks are signed using HMAC-SHA256. **Always verify signatures** to ensure
payloads are authentic.

### Headers

| Header | Description |
|--------|-------------|
| `X-Webhook-Id` | Unique delivery ID |
| `X-Webhook-Timestamp` | Unix timestamp (seconds) |
| `X-Webhook-Signature` | `t={timestamp},v1={signature}` |

### Verification Algorithm

1. Extract timestamp and signature from header
2. Concatenate: `{timestamp}.{raw_body}`
3. Compute HMAC-SHA256 using your signing key
4. Compare signatures (timing-safe)
5. Reject if timestamp > 5 minutes old (replay protection)

### Node.js Example

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, signingKey) {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const receivedSig = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !receivedSig) return false;

  // Check timestamp (5 min tolerance)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) return false;

  // Compute expected signature
  const expected = crypto
    .createHmac('sha256', signingKey)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expected)
  );
}

// Express middleware
app.post('/webhooks/salina', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, process.env.SALINA_SIGNING_KEY)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(payload);
  // Handle event...
  res.status(200).send('OK');
});
```

### Python Example

```python
import hmac
import hashlib
import time

def verify_webhook_signature(payload: str, signature: str, signing_key: str) -> bool:
    parts = dict(p.split('=') for p in signature.split(','))
    timestamp = parts.get('t')
    received_sig = parts.get('v1')

    if not timestamp or not received_sig:
        return False

    # Check timestamp (5 min tolerance)
    if abs(time.time() - int(timestamp)) > 300:
        return False

    # Compute expected signature
    message = f"{timestamp}.{payload}"
    expected = hmac.new(
        signing_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(received_sig, expected)
```

## Retry Behavior

Failed deliveries (non-2xx response or timeout) are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 30 seconds |
| 3 | 1 minute |
| 4 | 2 minutes |
| 5 | 4 minutes |
| 6 | 8 minutes |

Total retry window: ~15 minutes.

After all retries exhausted, the delivery is marked as `failed`.

### Auto-Disable

Subscriptions are automatically disabled after **10 consecutive failures**.
Re-enable manually after fixing your endpoint.

## Best Practices

1. **Return 200 quickly** - Process events asynchronously
2. **Implement idempotency** - Use `payload.id` to deduplicate
3. **Verify signatures** - Never trust unsigned payloads
4. **Handle retries** - Events may be delivered multiple times
5. **Use HTTPS** - Webhook URLs must use TLS
