# Traefik Pi-hole DNS Sync

A Node.js application that synchronizes DNS records from Traefik to Pi-hole. When new services are registered in Traefik, this tool automatically creates DNS entries in Pi-hole.

## Features

- Automatic DNS synchronization from Traefik to Pi-hole
- Fetches Host rules from Traefik routers
- Supports multiple reverse proxy IPs
- Configurable sync interval
- Retry logic for transient network errors
- Docker-native deployment
- TypeScript support

## Prerequisites

- Docker & Docker Compose
- Traefik v3
- Pi-hole v6

## Quick Start

1. Clone the repository
2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
3. Configure your environment variables in `.env`
4. Start the application:
   ```bash
   docker-compose up -d
   ```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TRAEFIK_API_URL` | Traefik API endpoint | `http://traefik:8080` |
| `PIHOLE_URL` | Pi-hole URL | `http://pihole:80` |
| `PIHOLE_PASSWORD` | Pi-hole admin password | - |
| `SYNC_INTERVAL` | Sync interval in milliseconds | `60000` |
| `REVERSE_PROXY_IPS` | Reverse proxy IPs (comma-separated, required) | - |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |

## How It Works

1. Fetches all routers from Traefik's `/api/http/routers` endpoint
2. Filters to only routers that contain a Host rule
3. Extracts all Host values from the router rules
4. Creates DNS records in Pi-hole for each host × reverse proxy IP combination
5. Continues to sync at the configured interval

### REVERSE_PROXY_IPS

This is a **required** environment variable that specifies the IP address(es) of your reverse proxy server(s). This is typically the IP of your Traefik instance.

Examples:
```bash
# Single IP
REVERSE_PROXY_IPS=xxx.xxx.xxx.xxx

# Multiple IPs (will create DNS records for each)
REVERSE_PROXY_IPS=xxx.xxx.xxx.xxx,xxx.xxx.xxx.xxx
```

## Docker

```bash
# Build the image
docker build -t traefik-pihole-dns-sync .

# Run the container
docker run -d \
  -e TRAEFIK_API_URL=http://traefik:8080 \
  -e PIHOLE_URL=http://pihole:80 \
  -e PIHOLE_PASSWORD=your_password \
  -e REVERSE_PROXY_IPS=xxx.xxx.xxx.xxx \
  traefik-pihole-dns-sync
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

---

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
