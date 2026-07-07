# MEGA Stream Service

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-success)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![License](https://img.shields.io/badge/License-ISC-blue)

A high-performance, stateless Node.js microservice designed to stream media content (videos, images, etc.) directly from MEGA.nz storage. This service acts as a streaming proxy, handling authentication, session management, and byte-range requests to enable seamless video playback with seeking support, without requiring intermediate disk storage.

---

## 🚀 Key Features

- **Direct Streaming Pipeline**: Streams content directly from MEGA.nz storage to the client over HTTP without caching to local disk, minimizing I/O bottlenecks.
- **Partial Content & Seeking**: Fully implements HTTP `206 Partial Content` and `Range` headers, enabling efficient video seeking and chunked downloads.
- **Intelligent Session Management**: Maintains an in-memory session cache for MEGA accounts to eliminate repetitive authentication overhead.
- **Resilience & Auto-Recovery**: Automatically evicts stale or failed sessions and implements retry mechanisms to ensure high availability.
- **Smart MIME Detection**: Automatically identifies and sets appropriate `Content-Type` headers for various media formats.
- **Stateless Architecture**: Designed to be horizontally scalable; session cache is local but easily distributable if required.

## 🛠 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express.js](https://expressjs.com/)
- **Storage Client**: [megajs](https://github.com/tony2222/megajs)
- **Testing**: [Vitest](https://vitest.dev/)

## 🏗 Architecture

The service follows a domain-driven architectural pattern within the `application-source/src` directory to ensure maintainability and separation of concerns:

- `index.ts`: Application bootstrap, middleware configuration, and route mounting.
- `features/`: Domain-specific business logic (e.g., streaming coordination).
- `services/`: Infrastructure and external service integrations (e.g., MEGA API client).
- `config.ts`: Centralized environment validation and configuration management.
- `utils/`: Shared utilities, error handlers, and type definitions.

## 🚦 Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Local Development Setup

1. **Navigate to the application directory:**
   ```bash
   cd application-source
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configuration:**
   Create a `.env` file in the `application-source` directory. 
   
   > **Note:** Never commit the `.env` file to version control.
   
   ```env
   # Server Port
   PORT=4000
   
   # Internal API Secret for service-to-service authorization
   INTERNAL_SECRET=your_secure_random_secret_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

### Running Tests

Execute the unit and integration test suite using Vitest:
```bash
npm run test
```

## 🔐 Security Considerations

This service acts as a bridge to secure cloud storage and handles sensitive credentials in memory. **Must-have production practices:**

- **TLS/HTTPS Configuration:** The service must be deployed behind a reverse proxy (e.g., NGINX, HAProxy, AWS ALB) configured with TLS 1.2+ to encrypt all traffic in transit.
- **Credential Handling:** MEGA account credentials passed via HTTP headers must *never* be logged. Ensure request logging middleware (like Morgan) redacts or omits `x-mega-email` and `x-mega-password` headers.
- **Secret Management:** In production, do not use `.env` files for secrets like `INTERNAL_SECRET`. Inject them via a secure secret manager (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets).
- **Network Isolation:** This service should ideally reside in a private subnet, accessible only by trusted internal API gateways or backend services, validated via the `x-internal-secret`.

## 📖 API Reference

### `GET /health`
Liveness probe for container orchestration platforms.
- **Response**: `200 OK`

### `GET /stream`
Streams the requested file from MEGA storage.

**Required Headers:**
- `x-internal-secret`: Service authorization token (Must match `INTERNAL_SECRET` environment variable).
- `x-mega-email`: MEGA account identifier.
- `x-mega-password`: MEGA account credential.

**Query Parameters:**
- `fileId` (string, required): The unique identifier of the file in MEGA storage.

**Optional Headers:**
- `Range`: Standard HTTP range request (e.g., `bytes=0-1024`) to fetch partial content.

**Responses:**
- `200 OK`: Full file stream.
- `206 Partial Content`: Chunked file stream based on `Range` header.
- `401 Unauthorized`: Invalid internal secret or MEGA credentials.
- `404 Not Found`: File ID not found in MEGA account.
- `500 Internal Server Error`: Upstream streaming failure.

## 🚀 Production Deployment

To run the service in a production environment:

```bash
cd application-source
npm install --omit=dev
npm start
```
*Recommendation: Use a process manager like PM2 or run within a Docker container to ensure process restart on failure.*

## 📄 License

This project is licensed under MIT License.
