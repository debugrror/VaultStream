# VaultStream Deployment Guide

## 🚀 Deployment Options

### Option 1: Docker Compose (Recommended)

**Prerequisites:**
- Docker & Docker Compose installed
- 2GB+ RAM
- 10GB+ disk space

**Steps:**

1. **Clone and configure**
   ```bash
   git clone <your-repo>
   cd VaultStream
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Generate secrets**
   ```bash
   # JWT_SECRET
   openssl rand -hex 32
   
   # HMAC_SECRET
   openssl rand -hex 32
   ```

3. **Update .env**
   ```env
   NODE_ENV=production
   JWT_SECRET=<generated-above>
   HMAC_SECRET=<generated-above>
   MONGODB_URI=mongodb://admin:your-secure-password@mongodb:27017/vaultstream?authSource=admin
   MONGO_ROOT_PASSWORD=your-secure-password
   CORS_ALLOWED_ORIGINS=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

4. **Build and run**
   ```bash
   docker-compose up -d
   ```

5. **Verify**
   ```bash
   docker-compose ps
   curl http://localhost:5000/health
   curl http://localhost:3000
   ```

6. **Logs**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

---

### Option 2: VPS/Cloud VM

**Prerequisites:**
- Ubuntu 22.04+ or similar
- Node.js 18+
- MongoDB 7+
- FFmpeg
- Nginx (for reverse proxy)

**Installation:**

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y nodejs npm mongodb ffmpeg nginx

# 2. Clone repository
git clone <your-repo>
cd VaultStream

# 3. Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env
npm run build

# 4. Frontend setup
cd ../frontend
npm install
# Update next.config.mjs if needed
npm run build

# 5. Start with PM2
npm install -g pm2
cd ../backend
pm2 start dist/server.js --name vaultstream-backend

cd ../frontend
pm2 start npm --name vaultstream-frontend -- start

pm2 save
pm2 startup
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        
        # Increase for video uploads
        client_max_body_size 500M;
    }
}
```

Enable HTTPS with Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔄 Storage Migration: Local → S3/R2

### Cloudflare R2 (Recommended: S3-compatible, no egress fees)

1. **Create R2 bucket** in Cloudflare dashboard

2. **Generate API token** with R2 permissions

3. **Install S3 client**
   ```bash
   cd backend
   npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
   ```

4. **Update backend/.env**
   ```env
   STORAGE_TYPE=r2
   AWS_ACCESS_KEY_ID=your-r2-access-key
   AWS_SECRET_ACCESS_KEY=your-r2-secret-key
   AWS_REGION=auto
   AWS_S3_BUCKET=vaultstream-videos
   AWS_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   ```

5. **Implement S3StorageAdapter** (currently a stub in `backend/src/services/storage/S3StorageAdapter.ts`)
   - Use `@aws-sdk/client-s3` for operations
   - Implement `upload`, `download`, `delete`, `exists`, `getPath`, `deleteDirectory`

6. **Migrate existing files** (optional)
   ```bash
   # Use rclone or AWS CLI to sync ./uploads to R2
   ```

### AWS S3

Same as R2, but use standard S3 endpoint:
```env
STORAGE_TYPE=s3
AWS_ENDPOINT=https://s3.amazonaws.com
```

---

## 📈 Performance Optimizations

### CDN for HLS Streams

**Why:** Reduce server load, improve global streaming performance

**How:**
1. Configure R2/S3 bucket as CDN origin
2. Use Cloudflare CDN or AWS CloudFront
3. Update signed URL generation to use CDN domain
4. Cache `.m3u8` and `.ts` files (respect signed URL expiry)

**Implementation Notes:**
- Modify `SecurityService.generateSignedUrl()` to use CDN base URL
- Ensure CDN forwards query parameters (for tokens)
- Set cache headers appropriately

### Database Indexing

Already optimized in models:
- `User`: `email`, `username`, `channelId`
- `Video`: `videoId`, `userId`, `status`, `visibility`
- `Playlist`: `playlistId`, `userId`, `visibility`

### Video Transcoding Queue

For high-traffic deployments:
- Use Bull/BullMQ + Redis
- Offload FFmpeg to worker processes
- Implement job retry logic

---

## 🔒 Production Security Checklist

- [ ] Change all default passwords/secrets
- [ ] Use strong `JWT_SECRET` and `HMAC_SECRET`
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Restrict CORS origins
- [ ] Set up firewall (UFW/iptables)
- [ ] Run containers as non-root
- [ ] Enable MongoDB authentication
- [ ] Implement rate limiting (already in place)
- [ ] Set up automated backups (MongoDB + uploads)
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated (`npm audit`)

---

## 📊 Monitoring

### Health Checks

- Backend: `GET /health`
- Frontend: Standard Next.js pages

### Logs

**Docker:**
```bash
docker-compose logs -f --tail=100
```

**PM2:**
```bash
pm2 logs
pm2 monit
```

### Metrics (Optional)

Integrate:
- Prometheus + Grafana for metrics
- Sentry for error tracking
- LogDNA/Datadog for log aggregation

---

## 🛠️ Troubleshooting

### Video processing fails

- Check FFmpeg installation: `ffmpeg -version`
- Check disk space
- Review logs: `docker-compose logs backend`

### Cannot upload large videos

- Increase `VIDEO_MAX_SIZE_MB` in .env
- Update Nginx `client_max_body_size`

### Signed URLs expire too quickly

- Increase `SIGNED_URL_EXPIRY` in .env
- Default is 3600s (1 hour)

### MongoDB connection errors

- Verify `MONGODB_URI` format
- Check MongoDB is running
- Ensure authentication credentials are correct

---

## 📝 Maintenance

### Backup MongoDB

```bash
# Docker
docker exec vaultstream-mongodb mongodump --out /backup

# Native
mongodump --uri="mongodb://localhost:27017/vaultstream" --out ./backup
```

### Backup Videos

```bash
# If using local storage
tar -czf videos-backup.tar.gz ./uploads

# If using S3/R2
# Already backed up, but enable versioning in bucket settings
```

### Update Application

```bash
git pull
docker-compose down
docker-compose build
docker-compose up -d
```
