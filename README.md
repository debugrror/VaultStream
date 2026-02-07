# VaultStream

VaultStream is a starter scaffold for a private video-sharing platform. It includes a Node.js API
skeleton, an HLS delivery placeholder, and a React UI shell you can expand into a full product.

## Step-by-step guide

### 1. Project structure

```
VaultStream/
  backend/         # Node.js API (auth, uploads, playlists, HLS signing)
  frontend/        # React client (player, channels, playlists)
  docs/            # Design notes and architecture references
```

### 2. Backend setup (Node.js)

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```
2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Update `JWT_SECRET`, `CORS_ORIGIN`, and `HLS_BASE_URL`.
3. **Run the API**
   ```bash
   npm run dev
   ```

### 3. Authentication flow (email/password)

The current API uses an in-memory user store as a placeholder. Replace this with a database
(Postgres, SQLite, etc.) and add refresh tokens.

* `POST /api/auth/register` → create an account.
* `POST /api/auth/login` → return a JWT for future requests.

### 4. Video upload + storage

The upload endpoint accepts a multipart form and stores the file locally for now.

* `POST /api/videos/upload`
  * `video` file field
  * `title`, `visibility`, and optional `passphrase`

Next steps:

* Replace local storage with S3 or Cloudflare R2.
* Trigger an async transcoding pipeline (FFmpeg + worker queue).
* Save metadata (duration, thumbnail, playlist tags) in a database.

### 5. HLS delivery + signed URLs

The API returns a signed playback URL placeholder from `POST /api/videos/:id/playback`.

* Swap in a signing service (e.g., CloudFront signed URLs, Cloudflare Stream tokens).
* Keep segments private in the bucket and only grant temporary access.
* Add passphrase verification and rate limiting in middleware.

### 6. Frontend (React)

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```
2. **Run the app**
   ```bash
   npm run dev
   ```

The current UI includes:

* A responsive layout with navigation and upload CTA.
* Placeholder pages for video playback, playlists, and creator channels.
* Slots for integrating an HLS player (`hls.js` or `video.js`).

### 7. Next milestones

* Database schema for users, channels, videos, playlists, and share links.
* Background workers for encoding + thumbnail generation.
* A player page that fetches the signed URL and streams HLS.
* Permissions (unlisted, passphrase, signed URL expiry).
* Google OAuth integration.

## API reference (starter)

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| POST | `/api/auth/register` | Create a user |
| POST | `/api/auth/login` | Obtain JWT |
| POST | `/api/videos/upload` | Upload a video |
| GET | `/api/videos/:id` | Fetch video metadata |
| POST | `/api/videos/:id/playback` | Get signed HLS URL |
| POST | `/api/playlists` | Create playlist |
| GET | `/api/playlists/:id` | Fetch playlist |

## Notes

This scaffold is intentionally minimal. Replace the in-memory stores with a proper database and
storage adapters before deploying.
