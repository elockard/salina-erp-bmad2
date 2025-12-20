# Story 15.6: Create API Documentation Portal

Status: done

## Story

**As a** developer,
**I want** interactive API documentation,
**So that** I can understand and test the API.

## Context

Epic 15 (REST API & Webhooks) enables third-party integrations. Stories 15.1-15.5 established OAuth2 authentication, core REST endpoints, rate limiting, webhook subscriptions, and webhook delivery. This story completes Epic 15 by providing comprehensive, interactive API documentation that enables developers to understand, explore, and test the API.

### Dependencies
- **Story 15.1** (COMPLETE): OAuth2 authentication with API keys
- **Story 15.2** (COMPLETE): Core REST API endpoints (titles, contacts, sales, onix/export)
- **Story 15.3** (COMPLETE): Rate limiting with Token Bucket algorithm
- **Story 15.4** (COMPLETE): Webhook subscription system
- **Story 15.5** (COMPLETE): Webhook delivery with HMAC-SHA256 signatures

### What This Story Delivers
- OpenAPI 3.0 specification file documenting all v1 API endpoints
- Interactive API documentation portal using Scalar (modern alternative to Swagger UI)
- Authentication guide with examples
- Webhook payload schemas with signature verification examples
- Rate limit documentation
- API changelog/versioning information
- Integration with existing Next.js app at `/api/docs`

### Architecture Reference
- Location: `src/modules/api/openapi/spec.yaml` (per architecture.md)
- FR150: API documentation portal

## Acceptance Criteria

### AC1: Endpoint Documentation with Schemas
- **Given** I access the API documentation at `/api/docs`
- **When** I view any endpoint
- **Then** I see complete request/response schemas
- **And** schemas include field types, descriptions, and validation rules
- **And** examples are provided for each endpoint

### AC2: Interactive API Testing
- **Given** I am viewing endpoint documentation
- **When** I use the "Try it" feature
- **Then** I can enter test data and see actual API responses
- **And** I can provide authentication tokens for testing
- **And** response timing and headers are visible

### AC3: Authentication Guide
- **Given** I access the authentication section
- **When** I read the documentation
- **Then** I understand how to obtain API keys
- **And** I see how to exchange keys for JWT tokens (15-minute validity)
- **And** I see scope requirements (read/write/admin) for each endpoint
- **And** code examples are provided (curl, JavaScript, Python)

### AC4: Webhook Documentation
- **Given** I access the webhooks section
- **When** I view webhook payload documentation
- **Then** I see JSON schemas for each event type (title.created, sale.created, etc.)
- **And** signature verification examples are provided
- **And** retry behavior and backoff schedule is documented

### AC5: Rate Limit Documentation
- **Given** I access the rate limits section
- **When** I read the documentation
- **Then** I understand rate limit tiers (100/min + 1000/hour default, 1000/min premium)
- **And** I see auth endpoint has stricter limits (10/min IP-based)
- **And** I see rate limit header explanations (X-RateLimit-*)
- **And** I understand burst allowance and recovery behavior

### AC6: API Changelog
- **Given** I access the changelog section
- **When** I view version history
- **Then** I see API version information (v1)
- **And** I see release notes for initial API launch
- **And** breaking changes (if any) are clearly marked

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2): Create OpenAPI 3.0 specification
  - [x] Document all v1 endpoints with request/response schemas
  - [x] Add examples for each endpoint
  - [x] Include error response schemas

- [x] Task 2 (AC: 3): Add authentication documentation
  - [x] Document API key management flow
  - [x] Document token exchange endpoint
  - [x] Add scope requirements table
  - [x] Provide code examples (curl, JS, Python)

- [x] Task 3 (AC: 4): Add webhook documentation
  - [x] Document webhook subscription endpoints
  - [x] Document event payload schemas
  - [x] Add signature verification examples
  - [x] Document retry behavior

- [x] Task 4 (AC: 5): Add rate limit documentation
  - [x] Document rate limit tiers
  - [x] Explain headers and response codes
  - [x] Document burst behavior

- [x] Task 5 (AC: 6): Add changelog and versioning
  - [x] Create initial changelog entry
  - [x] Document versioning strategy

- [x] Task 6 (AC: 2): Set up Scalar documentation UI
  - [x] Install @scalar/api-reference-react
  - [x] Create /api-docs route
  - [x] Configure theme and branding
  - [x] Enable "Try it" functionality

- [x] Task 7: Write tests
  - [x] Verify OpenAPI spec is valid (10 unit tests)
  - [x] Test API docs components and files (17 integration tests)

## Dev Notes

### Task 1: OpenAPI 3.0 Specification

**Create `src/modules/api/openapi/spec.yaml`:**

```yaml
openapi: 3.0.3
info:
  title: Salina ERP API
  version: "1.0.0"
  description: |
    REST API for Salina ERP - Publisher Royalty Management Platform.

    ## Authentication
    All API requests require authentication via Bearer tokens. See the Authentication section for details.

    ## Rate Limits
    - Default: 100 requests/minute
    - Premium: 1000 requests/minute

    Rate limit headers are included in all responses.
  contact:
    name: Salina Support
    email: support@salina.app
  license:
    name: Proprietary
    url: https://salina.app/terms

servers:
  - url: https://{tenant}.salina.app/api/v1
    description: Production API
    variables:
      tenant:
        default: demo
        description: Your tenant subdomain

tags:
  - name: Authentication
    description: API key exchange and token management
  - name: Titles
    description: Book title catalog management
  - name: Contacts
    description: Author and contact management
  - name: Sales
    description: Sales transaction management
  - name: ONIX
    description: ONIX metadata export
  - name: Webhooks
    description: Webhook subscription and delivery management

security:
  - bearerAuth: []

paths:
  /auth/token:
    post:
      tags: [Authentication]
      summary: Exchange API key for access token
      description: |
        Exchange your API key credentials for a JWT access token.
        Tokens are valid for 15 minutes and must be included in the
        Authorization header of subsequent requests.
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [client_id, client_secret, grant_type]
              properties:
                client_id:
                  type: string
                  description: Your API key ID
                  example: "sk_live_abc123..."
                client_secret:
                  type: string
                  description: Your API key secret
                  example: "secret_xyz789..."
                grant_type:
                  type: string
                  enum: [client_credentials]
                  default: client_credentials
      responses:
        "200":
          description: Token issued successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TokenResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"

  /titles:
    get:
      tags: [Titles]
      summary: List titles
      description: Returns a paginated list of titles for your tenant.
      parameters:
        - $ref: "#/components/parameters/cursor"
        - $ref: "#/components/parameters/limit"
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, pending, published, out_of_print]
        - name: search
          in: query
          description: Search by title or ISBN
          schema:
            type: string
        - name: author_id
          in: query
          description: Filter by author contact ID
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Paginated list of titles
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TitleListResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "429":
          $ref: "#/components/responses/RateLimited"
    post:
      tags: [Titles]
      summary: Create a title
      description: Create a new title in your catalog. Requires `write` scope.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TitleCreate"
      responses:
        "201":
          description: Title created successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TitleResponse"
        "400":
          $ref: "#/components/responses/ValidationError"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /titles/{id}:
    get:
      tags: [Titles]
      summary: Get a title
      description: Retrieve a single title by ID.
      parameters:
        - $ref: "#/components/parameters/resourceId"
      responses:
        "200":
          description: Title details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TitleResponse"
        "404":
          $ref: "#/components/responses/NotFound"
    put:
      tags: [Titles]
      summary: Update a title
      description: Update an existing title. Partial updates supported. Requires `write` scope.
      parameters:
        - $ref: "#/components/parameters/resourceId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TitleUpdate"
      responses:
        "200":
          description: Title updated successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TitleResponse"
        "400":
          $ref: "#/components/responses/ValidationError"
        "404":
          $ref: "#/components/responses/NotFound"

  /contacts:
    get:
      tags: [Contacts]
      summary: List contacts
      description: Returns a paginated list of contacts (authors, vendors, etc.).
      parameters:
        - $ref: "#/components/parameters/cursor"
        - $ref: "#/components/parameters/limit"
        - name: role
          in: query
          description: Filter by contact role
          schema:
            type: string
            enum: [author, vendor, editor, illustrator]
        - name: search
          in: query
          description: Search by name or email
          schema:
            type: string
      responses:
        "200":
          description: Paginated list of contacts
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ContactListResponse"
    post:
      tags: [Contacts]
      summary: Create a contact
      description: Create a new contact. Requires `write` scope.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ContactCreate"
      responses:
        "201":
          description: Contact created successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ContactResponse"

  /contacts/{id}:
    get:
      tags: [Contacts]
      summary: Get a contact
      parameters:
        - $ref: "#/components/parameters/resourceId"
      responses:
        "200":
          description: Contact details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ContactResponse"
        "404":
          $ref: "#/components/responses/NotFound"
    put:
      tags: [Contacts]
      summary: Update a contact
      parameters:
        - $ref: "#/components/parameters/resourceId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ContactUpdate"
      responses:
        "200":
          description: Contact updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ContactResponse"

  /sales:
    get:
      tags: [Sales]
      summary: List sales transactions
      description: Returns a paginated list of sales transactions.
      parameters:
        - $ref: "#/components/parameters/cursor"
        - $ref: "#/components/parameters/limit"
        - name: title_id
          in: query
          schema:
            type: string
            format: uuid
        - name: start_date
          in: query
          schema:
            type: string
            format: date
        - name: end_date
          in: query
          schema:
            type: string
            format: date
        - name: channel
          in: query
          schema:
            type: string
            enum: [amazon, ingram, direct, other]
        - name: format
          in: query
          schema:
            type: string
            enum: [paperback, hardcover, ebook, audiobook]
      responses:
        "200":
          description: Paginated list of sales
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SalesListResponse"
    post:
      tags: [Sales]
      summary: Record sales transactions
      description: |
        Record one or more sales transactions. Requires `write` scope.
        Supports bulk creation (max 100 per request).
        Sales are immutable - they cannot be updated or deleted via API.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: "#/components/schemas/SaleCreate"
                - type: array
                  items:
                    $ref: "#/components/schemas/SaleCreate"
                  maxItems: 100
      responses:
        "201":
          description: Sales recorded successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SalesCreateResponse"

  /sales/{id}:
    get:
      tags: [Sales]
      summary: Get a sale transaction
      parameters:
        - $ref: "#/components/parameters/resourceId"
      responses:
        "200":
          description: Sale details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SaleResponse"
        "404":
          $ref: "#/components/responses/NotFound"

  /onix/export:
    get:
      tags: [ONIX]
      summary: Export ONIX metadata
      description: |
        Export title metadata in ONIX 3.1 (default) or 3.0 XML format.
        Use this endpoint to sync your catalog with distribution channels.
      parameters:
        - name: title_ids
          in: query
          description: Comma-separated list of title IDs to export
          schema:
            type: string
        - name: version
          in: query
          description: ONIX version
          schema:
            type: string
            enum: ["3.1", "3.0"]
            default: "3.1"
        - name: since
          in: query
          description: Only export titles updated after this timestamp
          schema:
            type: string
            format: date-time
      responses:
        "200":
          description: ONIX XML document
          content:
            application/xml:
              schema:
                type: string
                example: '<?xml version="1.0"?>...'

  /webhooks:
    get:
      tags: [Webhooks]
      summary: List webhook subscriptions
      responses:
        "200":
          description: List of webhook subscriptions
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookListResponse"
    post:
      tags: [Webhooks]
      summary: Create webhook subscription
      description: |
        Subscribe to receive webhook notifications for specified events.
        Requires `admin` scope. The signing secret is returned only once
        in the creation response - store it securely for signature verification.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/WebhookCreate"
      responses:
        "201":
          description: Webhook subscription created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookResponse"

  /webhooks/{id}:
    get:
      tags: [Webhooks]
      summary: Get webhook subscription
      parameters:
        - $ref: "#/components/parameters/resourceId"
      responses:
        "200":
          description: Webhook subscription details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookResponse"
    put:
      tags: [Webhooks]
      summary: Update webhook subscription
      description: Update webhook subscription settings. Requires `admin` scope.
      parameters:
        - $ref: "#/components/parameters/resourceId"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/WebhookUpdate"
      responses:
        "200":
          description: Webhook updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookResponse"
        "403":
          $ref: "#/components/responses/Forbidden"
    delete:
      tags: [Webhooks]
      summary: Delete webhook subscription
      description: Delete a webhook subscription. Requires `admin` scope.
      parameters:
        - $ref: "#/components/parameters/resourceId"
      responses:
        "204":
          description: Webhook deleted
        "403":
          $ref: "#/components/responses/Forbidden"

  /webhooks/{id}/test:
    post:
      tags: [Webhooks]
      summary: Send test webhook
      description: Send a test payload to verify your webhook endpoint.
      parameters:
        - $ref: "#/components/parameters/resourceId"
      responses:
        "200":
          description: Test delivery result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookTestResponse"

  /webhooks/{id}/deliveries:
    get:
      tags: [Webhooks]
      summary: List webhook deliveries
      description: View delivery history for a webhook subscription.
      parameters:
        - $ref: "#/components/parameters/resourceId"
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, delivered, failed]
        - $ref: "#/components/parameters/limit"
      responses:
        "200":
          description: Delivery history
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookDeliveryListResponse"

  /webhooks/{id}/secret:
    post:
      tags: [Webhooks]
      summary: Regenerate webhook secret
      description: |
        Generate a new signing secret for this webhook subscription.
        The old secret is immediately invalidated. Requires `admin` scope.
        **Important:** The new secret is only shown once in the response.
      parameters:
        - $ref: "#/components/parameters/resourceId"
      responses:
        "200":
          description: New secret generated
          content:
            application/json:
              schema:
                type: object
                properties:
                  secret:
                    type: string
                    description: New signing secret (shown once only)
                    example: "whsec_abc123xyz..."
        "401":
          $ref: "#/components/responses/Unauthorized"
        "403":
          $ref: "#/components/responses/Forbidden"

  /webhooks/deliveries/{deliveryId}:
    get:
      tags: [Webhooks]
      summary: Get delivery details
      description: Retrieve details of a specific webhook delivery attempt.
      parameters:
        - name: deliveryId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Delivery details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/WebhookDelivery"
        "404":
          $ref: "#/components/responses/NotFound"

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT access token obtained via /auth/token endpoint.
        Include in Authorization header: `Bearer <token>`

  parameters:
    cursor:
      name: cursor
      in: query
      description: Pagination cursor from previous response
      schema:
        type: string
    limit:
      name: limit
      in: query
      description: Number of results per page (default 20, max 100)
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
    resourceId:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid

  responses:
    Unauthorized:
      description: Authentication required or invalid token
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error:
              code: unauthorized
              message: Invalid or expired access token
    Forbidden:
      description: Insufficient permissions (scope)
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error:
              code: forbidden
              message: This endpoint requires write scope
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error:
              code: not_found
              message: Resource not found
    ValidationError:
      description: Request validation failed
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error:
              code: validation_error
              message: Validation failed
              details:
                title: Title is required
                isbn: Invalid ISBN-13 format
    RateLimited:
      description: Rate limit exceeded
      headers:
        X-RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per window
        X-RateLimit-Remaining:
          schema:
            type: integer
          description: Remaining requests in window
        X-RateLimit-Reset:
          schema:
            type: integer
          description: Unix timestamp when limit resets
        Retry-After:
          schema:
            type: integer
          description: Seconds until requests allowed
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error:
              code: rate_limited
              message: Rate limit exceeded. Retry after 30 seconds.

  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              enum: [validation_error, not_found, unauthorized, forbidden, rate_limited, server_error]
            message:
              type: string
            details:
              type: object
              additionalProperties:
                type: string

    Pagination:
      type: object
      properties:
        cursor:
          type: string
          nullable: true
          description: Cursor for next page (null if no more results)
        has_more:
          type: boolean
        total_count:
          type: integer

    TokenResponse:
      type: object
      properties:
        access_token:
          type: string
          description: JWT access token
        token_type:
          type: string
          enum: [Bearer]
        expires_in:
          type: integer
          description: Token lifetime in seconds (900 = 15 minutes)
        scope:
          type: string
          description: Granted scopes (read, write, admin, or combinations)
      example:
        access_token: eyJhbGciOiJIUzI1NiIs...
        token_type: Bearer
        expires_in: 900
        scope: read write admin

    Title:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        subtitle:
          type: string
        isbn:
          type: string
          description: ISBN-13
        asin:
          type: string
          description: Amazon Standard Identification Number
        format:
          type: string
          enum: [paperback, hardcover, ebook, audiobook]
        publication_status:
          type: string
          enum: [draft, pending, published, out_of_print]
        list_price:
          type: number
          format: decimal
        publication_date:
          type: string
          format: date
        authors:
          type: array
          items:
            type: object
            properties:
              contactId:
                type: string
                format: uuid
              name:
                type: string
              isPrimary:
                type: boolean
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    TitleCreate:
      type: object
      required: [title]
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 500
        subtitle:
          type: string
          maxLength: 500
        isbn:
          type: string
          pattern: "^97[89]\\d{10}$"
          description: ISBN-13 (must start with 978 or 979)
        asin:
          type: string
          pattern: "^[A-Z0-9]{10}$"
        format:
          type: string
          enum: [paperback, hardcover, ebook, audiobook]
        publication_status:
          type: string
          enum: [draft, pending, published, out_of_print]
          default: draft
        list_price:
          type: number
        publication_date:
          type: string
          format: date
        contact_id:
          type: string
          format: uuid
          description: Primary author contact ID

    TitleUpdate:
      type: object
      properties:
        title:
          type: string
        subtitle:
          type: string
        publication_status:
          type: string
          enum: [draft, pending, published, out_of_print]
        list_price:
          type: number
        publication_date:
          type: string
          format: date
        asin:
          type: string

    TitleResponse:
      type: object
      properties:
        data:
          $ref: "#/components/schemas/Title"

    TitleListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Title"
        pagination:
          $ref: "#/components/schemas/Pagination"

    Contact:
      type: object
      description: |
        Contact resource. Note: Sensitive fields (tax_id, payment_info, etc.)
        are never exposed via API.
      properties:
        id:
          type: string
          format: uuid
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
          format: email
        company:
          type: string
        phone:
          type: string
        address:
          type: object
          properties:
            street:
              type: string
            city:
              type: string
            state:
              type: string
            postal_code:
              type: string
            country:
              type: string
        roles:
          type: array
          items:
            type: object
            properties:
              role:
                type: string
                enum: [author, vendor, editor, illustrator]
              assigned_at:
                type: string
                format: date-time
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    ContactCreate:
      type: object
      required: [first_name, last_name]
      properties:
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
          format: email
        company:
          type: string
        phone:
          type: string
        roles:
          type: array
          items:
            type: string
            enum: [author, vendor, editor, illustrator]

    ContactUpdate:
      type: object
      properties:
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
          format: email
        company:
          type: string
        phone:
          type: string

    ContactResponse:
      type: object
      properties:
        data:
          $ref: "#/components/schemas/Contact"

    ContactListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Contact"
        pagination:
          $ref: "#/components/schemas/Pagination"

    Sale:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title_id:
          type: string
          format: uuid
        quantity:
          type: integer
        unit_price:
          type: number
        total_amount:
          type: number
        channel:
          type: string
          enum: [amazon, ingram, direct, other]
        format:
          type: string
          enum: [paperback, hardcover, ebook, audiobook]
        sale_date:
          type: string
          format: date
        created_at:
          type: string
          format: date-time

    SaleCreate:
      type: object
      required: [title_id, quantity, unit_price, sale_date]
      properties:
        title_id:
          type: string
          format: uuid
        quantity:
          type: integer
          minimum: 1
        unit_price:
          type: number
          minimum: 0
        channel:
          type: string
          enum: [amazon, ingram, direct, other]
        format:
          type: string
          enum: [paperback, hardcover, ebook, audiobook]
        sale_date:
          type: string
          format: date

    SaleResponse:
      type: object
      properties:
        data:
          $ref: "#/components/schemas/Sale"

    SalesListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Sale"
        pagination:
          $ref: "#/components/schemas/Pagination"

    SalesCreateResponse:
      type: object
      properties:
        data:
          oneOf:
            - $ref: "#/components/schemas/Sale"
            - type: array
              items:
                $ref: "#/components/schemas/Sale"
        created_count:
          type: integer

    Webhook:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        url:
          type: string
          format: uri
        events:
          type: array
          items:
            type: string
            enum: [title.created, title.updated, sale.created, statement.generated, onix.exported]
        is_active:
          type: boolean
        last_delivery_at:
          type: string
          format: date-time
        last_delivery_status:
          type: string
          enum: [success, failed]
        consecutive_failures:
          type: integer
        created_at:
          type: string
          format: date-time

    WebhookCreate:
      type: object
      required: [name, url, events]
      properties:
        name:
          type: string
          maxLength: 100
        url:
          type: string
          format: uri
          description: HTTPS URL to receive webhook payloads
        events:
          type: array
          minItems: 1
          items:
            type: string
            enum: [title.created, title.updated, sale.created, statement.generated, onix.exported]

    WebhookUpdate:
      type: object
      properties:
        name:
          type: string
        url:
          type: string
          format: uri
        events:
          type: array
          items:
            type: string
            enum: [title.created, title.updated, sale.created, statement.generated, onix.exported]
        is_active:
          type: boolean

    WebhookResponse:
      type: object
      properties:
        data:
          $ref: "#/components/schemas/Webhook"

    WebhookListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Webhook"

    WebhookTestResponse:
      type: object
      properties:
        success:
          type: boolean
        status_code:
          type: integer
        response_time_ms:
          type: integer
        error:
          type: string

    WebhookDelivery:
      type: object
      properties:
        id:
          type: string
          format: uuid
        event_id:
          type: string
          format: uuid
        event_type:
          type: string
        status:
          type: string
          enum: [pending, delivered, failed]
        response_status_code:
          type: integer
        error_message:
          type: string
        attempt_count:
          type: integer
        max_attempts:
          type: integer
        duration_ms:
          type: integer
        delivered_at:
          type: string
          format: date-time
        created_at:
          type: string
          format: date-time

    WebhookDeliveryListResponse:
      type: object
      properties:
        deliveries:
          type: array
          items:
            $ref: "#/components/schemas/WebhookDelivery"

    WebhookPayload:
      type: object
      description: |
        Webhook payload format. All webhooks include these standard fields.
      properties:
        id:
          type: string
          format: uuid
          description: Unique event ID (same across retries for idempotency)
        type:
          type: string
          enum: [title.created, title.updated, sale.created, statement.generated, onix.exported]
        created_at:
          type: string
          format: date-time
        data:
          type: object
          description: Event-specific payload
      example:
        id: "550e8400-e29b-41d4-a716-446655440000"
        type: "title.created"
        created_at: "2024-01-15T10:30:00Z"
        data:
          title_id: "123e4567-e89b-12d3-a456-426614174000"
          title: "The Great Novel"
          isbn: "9781234567890"
```

---

### Task 2: Authentication Documentation

Add the following to the OpenAPI spec under `info.description` or as a separate markdown file served alongside:

**Create `src/modules/api/openapi/authentication-guide.md`:**

```markdown
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
   - **write**: Create/update titles, contacts, sales, webhooks
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
```

---

### Task 3: Webhook Documentation

**Create `src/modules/api/openapi/webhooks-guide.md`:**

```markdown
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
```

---

### Task 4: Rate Limit Documentation

**Create `src/modules/api/openapi/rate-limits-guide.md`:**

```markdown
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
```

---

### Task 5: Changelog

**Create `src/modules/api/openapi/changelog.md`:**

```markdown
# API Changelog

## Versioning

The Salina API uses URL path versioning (`/api/v1/`).

Breaking changes will result in a new version (e.g., `/api/v2/`).
Previous versions remain available for 12 months after deprecation.

## v1.0.0 (2024-01-15)

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

### Features
- JWT authentication with API keys
- Cursor-based pagination
- Rate limiting (100 req/min default)
- Webhook delivery with HMAC-SHA256 signatures
- Automatic retry with exponential backoff

### Webhook Events
- `title.created`
- `title.updated`
- `sale.created`
- `statement.generated`
- `onix.exported`
```

---

### Task 6: Scalar Documentation UI

**Install dependencies:**

```bash
npm install @scalar/api-reference-react
```

**CRITICAL: Next.js YAML Import Configuration**

Add to `next.config.ts` to support YAML imports:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.ya?ml$/,
      use: "yaml-loader",
    });
    return config;
  },
};

export default nextConfig;
```

Also install: `npm install yaml-loader`

**Create `src/app/api-docs/page.tsx`:**

```typescript
"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

// Fetch spec from API route to avoid build-time file reading
const SPEC_URL = "/api/openapi.yaml";

export default function ApiDocsPage() {
  return (
    <div className="h-screen">
      <ApiReferenceReact
        configuration={{
          spec: {
            url: SPEC_URL,
          },
          theme: "purple",
          darkMode: true,
          authentication: {
            preferredSecurityScheme: "bearerAuth",
          },
          hideModels: false,
          showSidebar: true,
        }}
      />
    </div>
  );
}
```

**Create spec serving route `src/app/api/openapi.yaml/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// NOTE: readFileSync works in Node.js runtime but NOT in Edge runtime.
// If deploying to serverless/edge, embed spec at build time or use static export.
export const runtime = "nodejs"; // Force Node.js runtime

export async function GET() {
  const specPath = join(process.cwd(), "src/modules/api/openapi/spec.yaml");
  const spec = readFileSync(specPath, "utf-8");

  return new NextResponse(spec, {
    headers: {
      "Content-Type": "application/yaml",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
```

---

### Task 7: Tests

**Create `tests/unit/openapi-spec.test.ts`:**

```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

describe("OpenAPI Specification", () => {
  const specPath = join(process.cwd(), "src/modules/api/openapi/spec.yaml");
  const specContent = readFileSync(specPath, "utf-8");
  const spec = parse(specContent);

  it("has valid OpenAPI version", () => {
    expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
  });

  it("has required info fields", () => {
    expect(spec.info.title).toBeDefined();
    expect(spec.info.version).toBeDefined();
    expect(spec.info.description).toBeDefined();
  });

  it("documents all v1 endpoints", () => {
    const paths = Object.keys(spec.paths);
    expect(paths).toContain("/auth/token");
    expect(paths).toContain("/titles");
    expect(paths).toContain("/titles/{id}");
    expect(paths).toContain("/contacts");
    expect(paths).toContain("/sales");
    expect(paths).toContain("/onix/export");
    expect(paths).toContain("/webhooks");
    expect(paths).toContain("/webhooks/{id}/secret");
    expect(paths).toContain("/webhooks/deliveries/{deliveryId}");
  });

  it("defines security scheme", () => {
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  });

  it("defines error response schemas", () => {
    expect(spec.components.schemas.Error).toBeDefined();
    expect(spec.components.responses.Unauthorized).toBeDefined();
    expect(spec.components.responses.ValidationError).toBeDefined();
    expect(spec.components.responses.RateLimited).toBeDefined();
  });
});
```

**Create `tests/integration/api-docs.test.ts`:**

```typescript
import { describe, it, expect } from "vitest";

describe("API Documentation Route", () => {
  it("serves OpenAPI spec at /api/openapi.yaml", async () => {
    const response = await fetch("http://localhost:3000/api/openapi.yaml");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("yaml");
  });

  it("renders documentation UI at /api-docs", async () => {
    const response = await fetch("http://localhost:3000/api-docs");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });
});
```

---

### Project Structure Notes

**New files:**
```
src/
├── modules/api/openapi/
│   ├── spec.yaml                  # OpenAPI 3.0 specification
│   ├── authentication-guide.md   # Auth documentation
│   ├── webhooks-guide.md         # Webhook documentation
│   ├── rate-limits-guide.md      # Rate limit documentation
│   └── changelog.md              # Version history
├── app/
│   ├── api/openapi.yaml/
│   │   └── route.ts              # Serve spec file
│   └── api-docs/
│       └── page.tsx              # Scalar documentation UI

tests/
├── unit/openapi-spec.test.ts     # Spec validation tests
└── integration/api-docs.test.ts  # Route tests
```

**Dependencies to add:**
```json
{
  "dependencies": {
    "@scalar/api-reference-react": "^1.24.0"
  },
  "devDependencies": {
    "yaml-loader": "^0.8.1"
  }
}
```

### References

- [Source: docs/epics.md - Story 15.6: Create API Documentation Portal]
- [Source: docs/architecture.md - src/modules/api/openapi/ folder structure]
- [Source: docs/sprint-artifacts/15-2-build-core-rest-api-endpoints.md - Endpoint patterns]
- [Source: docs/sprint-artifacts/15-5-implement-webhook-delivery-with-signatures.md - Webhook signature format]
- [Source: FR150 - API documentation portal requirement]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Created:**
- `src/modules/api/openapi/spec.yaml` - OpenAPI 3.0 specification
- `src/modules/api/openapi/authentication-guide.md` - Auth documentation
- `src/modules/api/openapi/webhooks-guide.md` - Webhook documentation
- `src/modules/api/openapi/rate-limits-guide.md` - Rate limit documentation
- `src/modules/api/openapi/changelog.md` - Version history
- `src/app/api/openapi.yaml/route.ts` - API route serving the spec
- `src/app/api-docs/page.tsx` - Scalar documentation UI page
- `tests/unit/openapi-spec.test.ts` - OpenAPI spec validation tests
- `tests/integration/api-docs.test.ts` - API docs integration tests

**Modified:**
- `package.json` - Added @scalar/api-reference-react and yaml dependencies

### Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-18 | Dev Agent | Code review: Fixed 1 HIGH, 3 MED, 1 LOW issues. Added error handling to OpenAPI route, cache headers, Scalar theme/sidebar config, fixed changelog date. Added 2 new tests (error handling, cache headers). All 29 tests pass.

## Senior Developer Review (AI)

**Review Date:** 2025-12-18
**Reviewer:** Dev Agent (Amelia)
**Outcome:** ✅ APPROVED

### Issues Found and Fixed

| Severity | Issue | Resolution |
|----------|-------|------------|
| HIGH | OpenAPI route had no error handling | Added existsSync check, try/catch with 404/500 responses |
| MEDIUM | Missing cache headers on spec route | Added Cache-Control with 1h max-age |
| MEDIUM | Scalar configuration incomplete | Added theme: "purple", showSidebar: true |
| LOW | Changelog showed 2024 date | Updated to 2025-12-18 |

### AC Validation

All 6 acceptance criteria validated:
- AC1 ✅ Endpoint documentation with schemas
- AC2 ✅ Interactive API testing (Scalar UI)
- AC3 ✅ Authentication guide with code examples
- AC4 ✅ Webhook documentation with signature verification
- AC5 ✅ Rate limit documentation
- AC6 ✅ API changelog

### Test Coverage

- 10 unit tests (OpenAPI spec validation)
- 19 integration tests (API docs, routes, guides)
- All 29 tests passing
