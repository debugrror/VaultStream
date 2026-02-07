# VaultStream

**Secure, scalable video streaming platform with HLS delivery**

VaultStream is a production-grade video streaming platform built with Node.js, TypeScript, MongoDB, and Next.js. It enables users to upload, manage, and securely share videos with advanced features including unlisted videos, passphrase protection, and signed HLS URLs.

## 🏗 Architecture

- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Styling**: Tailwind CSS
- **Video Processing**: FFmpeg (HLS transcoding)
- **Authentication**: JWT (email/password)
- **Storage**: Abstracted layer (local FS with S3/R2 interface)

## 🎯 Key Features

- **Secure Video Delivery**: Time-limited signed URLs for HLS streams
- **Privacy Controls**: Unlisted, private, and passphrase-protected videos
- **User Channels**: Personal video channels for content creators
- **Playlists**: Organize and share video collections
- **HLS Streaming**: Adaptive bitrate streaming with FFmpeg
- **Cloud-Ready**: Storage adapter pattern for easy migration to S3/R2

## 📁 Project Structure

```
VaultStream/
├── backend/               # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Environment & database config
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routes
│   │   ├── controllers/  # Business logic
│   │   ├── middleware/   # Auth, validation, errors
│   │   ├── services/     # Core services
│   │   ├── utils/        # Helpers
│   │   └── types/        # TypeScript types
│   ├── uploads/          # Local video storage
│   └── package.json
├── frontend/             # Next.js application (coming soon)
└── shared/               # Shared types (coming soon)
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or cloud)
- FFmpeg (for video processing)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000` (or your configured PORT).

### Environment Variables

See `backend/.env.example` for all configuration options. Key variables:

- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `HMAC_SECRET`: Secret for signed URL generation (change in production!)
- `STORAGE_TYPE`: Storage backend (`local`, `s3`, or `r2`)
- `ALLOWED_ORIGINS`: CORS allowed origins (frontend URL)

## 🛠 Development

### Available Scripts (Backend)

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Run production build
npm run lint     # Run ESLint
npm run clean    # Remove build artifacts
```

### TypeScript Configuration

The project uses **strict TypeScript** with:
- `strict: true`
- Path aliases (`@config/*`, `@models/*`, etc.)
- ES2022 target
- Full type checking enabled

### Code Style

- Path aliases for clean imports
- Async/await for asynchronous operations
- Singleton pattern for database and services
- Factory pattern for storage adapters
- Middleware-based architecture

## 🔐 Security Features

- **Helmet**: Security headers
- **CORS**: Configurable origin whitelist
- **Rate Limiting**: Request throttling
- **JWT**: Stateless authentication
- **Signed URLs**: Time-limited access to HLS streams
- **Bcrypt**: Password and passphrase hashing
- **HMAC-SHA256**: Secure URL signatures

## 📦 Storage Abstraction

The storage layer is abstracted to support multiple backends:

- **Local FS** (default): Development and small deployments
- **AWS S3**: Scalable cloud storage
- **Cloudflare R2**: S3-compatible with zero egress fees

Switch storage backends via `STORAGE_TYPE` environment variable without code changes.

## 🎬 Video Processing

Videos are transcoded to HLS format using FFmpeg:
- Adaptive bitrate streaming
- Configurable segment duration
- Automatic thumbnail generation
- Multiple quality levels (coming soon)

## 📋 Roadmap

- [x] Backend foundation & architecture
- [x] TypeScript configuration & tooling
- [x] Environment management & validation
- [ ] User authentication system
- [ ] Video upload & processing pipeline
- [ ] Storage adapter implementations
- [ ] Signed URL generation & validation
- [ ] Channel & playlist management
- [ ] Frontend application
- [ ] Testing suite
- [ ] Docker deployment
- [ ] Production optimizations

## 📄 License

MIT

## 🤝 Contributing

This is a production-intent project. Contributions must follow:
- Strict TypeScript typing
- No hard-coded values
- Environment-based configuration
- Security-first approach
- Scalable abstractions

---

Built with ❤️ for secure video streaming
