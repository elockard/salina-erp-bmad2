# Authentication Guide

## Overview

The Salina API uses OAuth 2.0 Client Credentials flow for authentication.
All API requests (except `/auth/token`) require a valid JWT access token.

## Getting Started

### 1. Create an API Key

1. Log in to your Salina dashboard
2. Navigate to **Settings > API Keys**
3. Click **Create API Key**
4. Select scopes:
   - **read**: View titles, contacts, sales, webhooks
   - **write**: Create/update titles, contacts, sales
   - **admin**: Webhook management, rate limit overrides
5. Copy your `client_id` and `client_secret` (shown only once!)

### 2. Exchange for Access Token

```bash
curl -X POST https://yourtenant.salina.app/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "sk_live_abc123...",
    "client_secret": "secret_xyz789...",
    "grant_type": "client_credentials"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "read write"
}
```

### 3. Use the Token

Include the token in the `Authorization` header:

```bash
curl https://yourtenant.salina.app/api/v1/titles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Token Lifecycle

- **Validity**: Tokens expire after 15 minutes (900 seconds)
- **Refresh**: Exchange credentials again before expiry
- **Revocation**: Revoking the API key invalidates all tokens

## Scopes

Scopes are hierarchical: `admin` includes `write`, which includes `read`.

| Scope | Permissions |
|-------|-------------|
| `read` | GET endpoints (list, view) |
| `write` | POST, PUT for titles, contacts, sales |
| `admin` | Webhook management, rate limit overrides |

Most integration keys need `read` and `write`. Add `admin` for webhook subscriptions.

## Code Examples

### JavaScript (fetch)

```javascript
async function getAccessToken(clientId, clientSecret) {
  const response = await fetch('https://yourtenant.salina.app/api/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });
  const data = await response.json();
  return data.access_token;
}

async function getTitles(token) {
  const response = await fetch('https://yourtenant.salina.app/api/v1/titles', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

### Python (requests)

```python
import requests

def get_access_token(client_id, client_secret):
    response = requests.post(
        'https://yourtenant.salina.app/api/v1/auth/token',
        json={
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'client_credentials'
        }
    )
    return response.json()['access_token']

def get_titles(token):
    response = requests.get(
        'https://yourtenant.salina.app/api/v1/titles',
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()
```

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 401 | `unauthorized` | Missing or invalid token |
| 403 | `forbidden` | Token lacks required scope |
| 429 | `rate_limited` | Too many requests |
