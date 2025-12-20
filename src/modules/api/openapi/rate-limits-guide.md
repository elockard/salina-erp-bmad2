# Rate Limits

## Overview

API requests are rate limited to ensure fair usage and platform stability.
Limits are applied per API key (tenant-scoped).

## Tiers

| Tier | Per-Minute | Per-Hour | Burst |
|------|------------|----------|-------|
| Default | 100 requests | 1000 requests | 20 requests |
| Premium | 1000 requests | 10000 requests | 100 requests |

**Dual-Window:** Both minute and hour limits apply simultaneously.

Contact support to upgrade to Premium tier.

## Auth Endpoint Limit

The `/auth/token` endpoint has stricter, IP-based limits:
- **10 requests per minute per IP address**
- Prevents credential stuffing attacks

## Algorithm

We use a Token Bucket algorithm:
- Bucket fills at the rate limit (e.g., ~1.67 tokens/second for 100/min)
- Burst allows temporary spikes up to burst capacity
- Once depleted, requests are rejected until bucket refills

## Response Headers

All API responses include rate limit headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests per window |
| `X-RateLimit-Remaining` | Requests remaining |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

### 429 Response

When rate limited, you'll receive:

```json
{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded. Retry after 30 seconds."
  }
}
```

Headers include `Retry-After` with seconds to wait.

## Best Practices

1. **Check headers** - Monitor `X-RateLimit-Remaining`
2. **Implement backoff** - Respect `Retry-After` header
3. **Batch requests** - Use bulk endpoints where available
4. **Cache responses** - Reduce unnecessary calls
5. **Use webhooks** - Instead of polling for changes
