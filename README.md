# MEGA Stream Service

A high-performance Node.js microservice designed to stream media content (videos, images, etc.) directly from MEGA.nz storage. This service acts as a proxy, handling authentication, session management, and byte-range requests to enable seamless video playback with seeking support.

## Features

- **Direct Streaming**: Streams content from MEGA.nz without local storage/caching.
- **Partial Content Support**: Implements HTTP Range headers for efficient video seeking and partial downloads.
- **Session Caching**: Minimizes authentication overhead by maintaining an intelligent session cache for MEGA accounts.
- **Security**: Secured via internal secret validation for inter-service communication.
- **Auto-Recovery**: Automatically evicts stale or failed sessions to ensure high availability.
- **Smart MIME Detection**: Automatically identifies and sets appropriate content types for images and videos.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Storage Client**: [megajs](https://github.com/tony2222/megajs)
- **Testing**: Vitest

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

## Configuration

The service is configured via environment variables. Create a `.env` file in the `application-source` directory:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the service will listen on. | `4000` |
| `INTERNAL_SECRET` | A secret key required in the `x-internal-secret` header for authorization. | `""` (Empty allows all) |

## Getting Started

### Installation

```bash
cd application-source
npm install
```

### Running the Service

```bash
# Start the server (development)
npm run dev

# Start the server (production)
npm start
```

### Running Tests

```bash
npm run test
```

## API Endpoints

### Health Check
`GET /health`
- **Response**: `200 OK`

### Stream Content
`GET /stream`
- **Headers (Required)**:
  - `x-internal-secret`: Must match the `INTERNAL_SECRET` env variable.
  - `x-mega-email`: MEGA account email.
  - `x-mega-password`: MEGA account password.
- **Query Parameters**:
  - `fileId`: The unique identifier of the file in MEGA storage.
- **Optional Headers**:
  - `Range`: Standard HTTP range header (e.g., `bytes=0-1024`) for partial content.

## Architecture

The service follows a domain-driven feature structure within the `application-source/src` directory:

- `index.ts`: Service entry point and route mounting.
- `features/`: Domain-specific logic (e.g., streaming).
- `services/`: Infrastructure services (e.g., API clients).
- `config.ts`: Centralized configuration and environment parsing.
- `utils/`: Shared utility functions.

## License

ISC License
