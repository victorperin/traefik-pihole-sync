# Traefik Pi-hole DNS Sync

A Node.js application that synchronizes DNS records from Traefik to Pi-hole. When new services are registered in Traefik, this tool automatically creates DNS entries in Pi-hole.

## Features

- Automatic DNS synchronization from Traefik to Pi-hole
- Configurable sync interval
- Docker-native deployment
- TypeScript support
- Health monitoring

## Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose
- Traefik v2/v3
- Pi-hole

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
| `SYNC_INTERVAL` | Sync interval in ms | `60000` |
| `DEFAULT_DOMAIN` | Default domain suffix | `local` |

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

## Docker

```bash
# Build the image
docker build -t traefik-pihole-dns-sync .

# Run the container
docker run -d \
  -e TRAEFIK_API_URL=http://traefik:8080 \
  -e PIHOLE_URL=http://pihole:80 \
  -e PIHOLE_PASSWORD=your_password \
  traefik-pihole-dns-sync
```

## License

MIT
