# Security Hardening Checklist

## ✅ Environment Configuration

### Required Environment Variables (Production)
```env
# Generate with: openssl rand -hex 32
JWT_SECRET=<32-byte-hex-string>
HMAC_SECRET=<32-byte-hex-string>

# Secure MongoDB credentials
MONGODB_URI=mongodb://user:password@host:port/vaultstream
MONGO_ROOT_PASSWORD=<strong-password>

# Strict CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Production mode
NODE_ENV=production
```

### Validation
- ✅ All required variables checked on startup (`env.ts`)
- ✅ Secrets not committed to Git (`.env` in `.gitignore`)
- ✅ `.env.example` provided for reference

---

## ✅ Security Headers (Helmet.js)

Configured in `server.ts`:

```typescript
app.use(helmet());
```

**Default protections:**
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Strict-Transport-Security` (HTTPS)
- ✅ `Content-Security-Policy` (restrictive)

**Note:** For HLS streaming, you may need to adjust CSP:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"], // For video playback
    },
  },
}));
```

---

## ✅ CORS Configuration

In `server.ts`:

```typescript
app.use(cors({
  origin: config.cors.allowedOrigins.split(','),
  credentials: true,
}));
```

**Production:**
- ✅ Restrict to specific domains (not `*`)
- ✅ Credentials enabled for cookies/tokens

---

## ✅ Rate Limiting

In `server.ts`:

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: 'Too many requests from this IP',
});

app.use(limiter);
```

**Adjust for production:**
- Video upload: May need higher limits or separate endpoint limiter
- Streaming: Exclude from rate limiting (static content)

---

## ✅ Authentication & Authorization

### JWT
- ✅ Strong secret (`JWT_SECRET`)
- ✅ Expiration enforced (`JWT_EXPIRES_IN`)
- ✅ HTTP-only cookies (frontend implementation)
- ✅ Token validation on all protected routes

### Passphrase Protection
- ✅ bcrypt hashing (10 rounds)
- ✅ Constant-time comparison
- ✅ No passphrase leakage in metadata

---

## ✅ Signed URLs (HMAC-SHA256)

**Purpose:** Time-limited, tamper-proof streaming access

**Implementation:**
- ✅ Strong secret (`HMAC_SECRET`)
- ✅ Resource binding (prevents URL reuse across files)
- ✅ Expiration enforcement
- ✅ Constant-time signature comparison

**Token format:**
```
<base64-payload>.<hex-signature>
```

**Expiry:**
- Default: 3600s (1 hour)
- Configurable via `SIGNED_URL_EXPIRY`

---

## ✅ Input Validation

### File Uploads
- ✅ Max size enforced (`VIDEO_MAX_SIZE_MB`)
- ✅ File type validation (mimetype + extension)
- ✅ Filename sanitization (prevent path traversal)

### API Inputs
- ✅ `express-validator` used in routes
- ✅ Email format validation
- ✅ Password complexity (min 8 chars)
- ✅ Passphrase complexity (min 4 chars)

---

## ✅ MongoDB Security

### Authentication
- ✅ Username/password required in connection string
- ✅ Non-root user recommended for app access

### Network
- ✅ Docker: Internal network (not exposed to host)
- ✅ VPS: Bind to localhost or private IP
- ✅ Firewall: Block external access to 27017

---

## ✅ Docker Security

### Non-Root User
All containers run as non-root:

**Backend Dockerfile:**
```dockerfile
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
```

**Frontend Dockerfile:**
```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs
```

### Health Checks
- ✅ Backend: `GET /health`
- ✅ MongoDB: `mongosh ping`

---

## ✅ Secrets Management

### Development
- `.env` file (gitignored)

### Production
- Use environment variables (Docker, systemd)
- Consider: AWS Secrets Manager, HashiCorp Vault, or similar

**Never:**
- Hardcode secrets in code
- Commit `.env` to Git
- Log secrets

---

## 🔒 Additional Recommendations

### SSL/TLS
- Use Let's Encrypt (free)
- Redirect HTTP → HTTPS
- Enable HSTS

### Monitoring
- Log authentication failures
- Alert on repeated failed attempts
- Monitor disk usage (video uploads)

### Backups
- Automated MongoDB backups (daily)
- Offsite storage for videos (S3/R2)
- Test restore procedures

### Dependency Security
```bash
npm audit
npm audit fix
```

Run regularly and keep dependencies updated.

---

## 📋 Pre-Deployment Checklist

- [ ] All secrets generated and stored securely
- [ ] CORS restricted to production domain
- [ ] MongoDB authentication enabled
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] SSL certificate installed
- [ ] Rate limiting tuned for expected traffic
- [ ] Health checks tested
- [ ] Backup procedures documented
- [ ] Monitoring configured
- [ ] Log rotation configured
- [ ] Docker containers running as non-root
- [ ] All environment variables validated
- [ ] Security headers verified
- [ ] npm audit clean

---

## 🚨 Incident Response

If compromised:

1. **Immediately:**
   - Rotate all secrets (`JWT_SECRET`, `HMAC_SECRET`)
   - Change database credentials
   - Revoke all active tokens (clear Redis sessions if using)

2. **Investigate:**
   - Check logs for suspicious activity
   - Identify attack vector
   - Assess data breach scope

3. **Remediate:**
   - Patch vulnerability
   - Notify affected users (if data leaked)
   - Update security policies
