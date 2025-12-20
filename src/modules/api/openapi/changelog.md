# API Changelog

## Versioning

The Salina API uses URL path versioning (`/api/v1/`).

Breaking changes will result in a new version (e.g., `/api/v2/`).
Previous versions remain available for 12 months after deprecation.

## v1.0.0 (2025-12-18)

**Initial Release**

### Endpoints
- `POST /auth/token` - OAuth2 token exchange
- `GET/POST/PUT /titles` - Title catalog management
- `GET/POST/PUT /contacts` - Contact management
- `GET/POST /sales` - Sales transaction management
- `GET /onix/export` - ONIX 3.1/3.0 metadata export
- `GET/POST/PUT/DELETE /webhooks` - Webhook subscriptions
- `GET /webhooks/:id/deliveries` - Delivery history
- `POST /webhooks/:id/test` - Test delivery
- `POST /webhooks/:id/secret` - Regenerate signing secret
- `GET /webhooks/deliveries/:deliveryId` - Single delivery details

### Features
- JWT authentication with API keys (15-minute token validity)
- Three-tier scopes: read, write, admin (hierarchical)
- Cursor-based pagination (20 default, 100 max)
- Dual-window rate limiting (100/min + 1000/hour default)
- Auth endpoint rate limiting (10/min IP-based)
- Webhook delivery with HMAC-SHA256 signatures
- Automatic retry with exponential backoff (6 attempts)
- Auto-disable after 10 consecutive failures

### Webhook Events
- `title.created`
- `title.updated`
- `sale.created`
- `statement.generated`
- `onix.exported`

### Security
- Bearer token authentication
- Scope-based authorization
- Webhook signature verification
- Replay attack protection (5-minute timestamp window)
