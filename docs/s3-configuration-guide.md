# AWS S3 Configuration Guide for Salina ERP

**Purpose:** Store generated PDF royalty statements
**Created:** 2025-11-30
**Epic:** 5 - Royalty Statements & Author Portal

---

## 1. Bucket Creation

### Bucket Name

```
salina-erp-statements-{environment}
```

Examples:

- `salina-erp-statements-dev`
- `salina-erp-statements-staging`
- `salina-erp-statements-prod`

### Region

Select region closest to your primary user base:

- **US East (N. Virginia)**: `us-west-2` - recommended for US-based publishers
- **EU (Ireland)**: `eu-west-1` - for EU-based publishers

### Bucket Settings

- **Object Ownership**: ACLs disabled (recommended)
- **Block Public Access**: **ALL ENABLED** (critical for security)
  - ✅ Block all public access
  - ✅ Block public access to buckets and objects granted through new ACLs
  - ✅ Block public access to buckets and objects granted through any ACLs
  - ✅ Block public and cross-account access to buckets and objects through any public bucket or access point policies
- **Bucket Versioning**: Disabled (PDFs are immutable, regenerate if needed)
- **Default Encryption**: SSE-S3 (Amazon S3 managed keys)

---

## 2. Folder Structure

```
salina-erp-statements-{env}/
├── statements/
│   └── {tenant_id}/
│       └── {statement_id}.pdf
└── temp/
    └── {processing files - auto-deleted}
```

**Object Key Pattern:**

```
statements/{tenant_id}/{statement_id}.pdf
```

Example:

```
statements/a1b2c3d4-e5f6-7890-abcd-ef1234567890/stmt-2025-q4-author123.pdf
```

---

## 3. IAM User Setup

**Create an IAM User** (not role) for the Fly.io application:

1. Go to AWS IAM Console → Users → Create User
2. User name: `salina-erp-s3-access`
3. Select "Attach policies directly"
4. Create custom policy with the JSON below
5. After creation: Security credentials → Create access key → Application running outside AWS

Attach this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SalinaERPStatementAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::salina-erp-statements-{environment}",
        "arn:aws:s3:::salina-erp-statements-{environment}/*"
      ]
    }
  ]
}
```

**Permissions Explained:**

- `PutObject`: Upload generated PDFs
- `GetObject`: Retrieve PDFs for download (via signed URLs)
- `DeleteObject`: Remove PDFs if statement is voided (rare)
- `ListBucket`: List statements for a tenant (admin functions)

---

## 4. CORS Configuration

Required for signed URL downloads from browser:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://*.salina.media", "http://localhost:3000"],
    "ExposeHeaders": ["Content-Disposition", "Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

**For Production:** Remove `localhost:3000` from AllowedOrigins.

---

## 5. Lifecycle Rules

Create lifecycle rule for cost optimization:

### Rule: Clean Temp Files

- **Name**: `cleanup-temp-files`
- **Prefix**: `temp/`
- **Action**: Expire current versions after 1 day

### Rule: Transition Old Statements (Optional)

- **Name**: `archive-old-statements`
- **Prefix**: `statements/`
- **Action**: Transition to S3 Glacier after 365 days
- **Note**: Only if you want to reduce storage costs for old statements

---

## 6. Environment Variables

Add these to your `.env` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_STATEMENTS_BUCKET=salina-erp-statements-dev
```

**For Production (Fly.io):**

Set secrets via Fly CLI:

```bash
fly secrets set AWS_REGION=us-west-2
fly secrets set AWS_ACCESS_KEY_ID=your_access_key_here
fly secrets set AWS_SECRET_ACCESS_KEY=your_secret_key_here
fly secrets set S3_STATEMENTS_BUCKET=salina-erp-statements-prod
```

Or use `fly.toml` for non-sensitive values:

```toml
[env]
  AWS_REGION = "us-west-2"
  S3_STATEMENTS_BUCKET = "salina-erp-statements-prod"
```

**Note:** Fly.io runs Docker containers. For enhanced security, consider AWS OIDC federation in the future (eliminates long-lived credentials).

---

## 7. Verification Checklist

After setup, verify:

- [ ] Bucket created with correct name
- [ ] All public access blocked
- [ ] Default encryption enabled (SSE-S3)
- [ ] IAM user/role created with policy attached
- [ ] Access key generated and stored securely
- [ ] CORS configuration applied
- [ ] Lifecycle rules created
- [ ] Environment variables set in `.env.local`
- [ ] Test upload/download works from application

---

## 8. Security Notes

1. **Never commit AWS credentials** to git - use environment variables
2. **Use IAM roles** in production (EC2/Lambda) instead of access keys when possible
3. **Enable CloudTrail** logging for audit trail of S3 access
4. **Signed URLs** expire after 1 hour by default - adjust in code if needed
5. **Tenant isolation** enforced by object key pattern - always include `tenant_id` in path

---

## 9. Code Integration

The application will use AWS SDK v3:

```typescript
// src/lib/s3.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Upload PDF
export async function uploadStatement(
  tenantId: string,
  statementId: string,
  pdfBuffer: Buffer
): Promise<string> {
  const key = `statements/${tenantId}/${statementId}.pdf`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_STATEMENTS_BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    })
  );

  return key;
}

// Generate signed download URL (1 hour expiry)
export async function getStatementDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_STATEMENTS_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
```

---

## 10. Cost Estimate

For a small-to-medium publisher (~100 authors, quarterly statements):

| Item         | Calculation                          | Monthly Cost   |
| ------------ | ------------------------------------ | -------------- |
| Storage      | 400 PDFs × 500KB × $0.023/GB         | ~$0.01         |
| PUT requests | 100/quarter = 34/month × $0.005/1000 | ~$0.01         |
| GET requests | 500/month × $0.0004/1000             | ~$0.01         |
| **Total**    |                                      | **< $1/month** |

S3 costs are minimal for this use case.

---

## Questions?

Contact the development team or refer to [AWS S3 Documentation](https://docs.aws.amazon.com/s3/).
