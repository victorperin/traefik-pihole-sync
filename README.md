# Traefik Pi-hole DNS Sync

A Node.js application that synchronizes DNS records from Traefik to Pi-hole. When new services are registered in Traefik, this tool automatically creates DNS entries in Pi-hole.

## Features

- Automatic DNS synchronization from Traefik to Pi-hole
- Fetches Host rules from Traefik routers (not services)
- Supports multiple reverse proxy IPs
- Configurable sync interval
- Docker-native deployment
- TypeScript support

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
| `REVERSE_PROXY_IPS` | Reverse proxy IPs (comma-separated, required) | - |

## How It Works

1. Fetches all routers from Traefik's `/api/http/routers` endpoint
2. Filters to only routers that contain a Host rule
3. Extracts all Host values from the router rules
4. Creates DNS records in Pi-hole for each host × reverse proxy IP combination

### REVERSE_PROXY_IPS

This is a **required** environment variable that specifies the IP address(es) of your reverse proxy server(s). This is typically the IP of your Traefik instance.

Examples:
```bash
# Single IP
REVERSE_PROXY_IPS=xxx.xxx.xxx.xxx

# Multiple IPs (will create DNS records for each)
REVERSE_PROXY_IPS=xxx.xxx.xxx.xxx,xxx.xxx.xxx.xxx
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

## License

MIT

---

## GitHub Actions CI/CD

This project includes automated CI/CD workflows using GitHub Actions.

### Workflows

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`, `master`, and `develop` branches:

- **Lint**: Runs ESLint and Prettier format check
- **Build**: Compiles TypeScript and verifies build output
- **Test**: Runs Jest test suite and uploads coverage to Codecov

#### 2. Docker Build & Publish (`.github/workflows/docker-publish.yml`)

Runs on:
- Push to `main` or `master` branch
- New version tags (e.g., `v1.0.0`)
- Manual trigger via `workflow_dispatch`

Builds and pushes Docker image to GitHub Container Registry (ghcr.io).

### Deployment Commands

#### Build and push Docker image manually

```bash
# Login to GitHub Container Registry
echo "$GH_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

# Build and tag the image
docker build -t ghcr.io/$GITHUB_REPOSITORY:latest .

# Push to ghcr.io
docker push ghcr.io/$GITHUB_REPOSITORY:latest

# Push with specific version tag
docker build -t ghcr.io/$GITHUB_REPOSITORY:v1.0.0 .
docker push ghcr.io/$GITHUB_REPOSITORY:v1.0.0
```

#### Using GitHub CLI

```bash
# Set variables
REPO="ghcr.io/OWNER/repo"
TAG="latest"

# Build and push
docker build -t $REPO:$TAG .
echo "$GH_TOKEN" | docker login $REPO -u "$GITHUB_ACTOR" --password-stdin
docker push $REPO:$TAG
```

#### Pull the image

```bash
# Login first (if private repository)
echo "$GH_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

# Pull the latest image
docker pull ghcr.io/$GITHUB_REPOSITORY:latest

# Pull specific version
docker pull ghcr.io/$GITHUB_REPOSITORY:v1.0.0
```

#### Run the deployed image

```bash
docker run -d \
  --name traefik-pihole-dns-sync \
  -e TRAEFIK_API_URL=http://traefik:8080 \
  -e PIHOLE_URL=http://pihole:80 \
  -e PIHOLE_PASSWORD=your_password \
  -e REVERSE_PROXY_IPS=xxx.xxx.xxx.xxx \
  ghcr.io/$GITHUB_REPOSITORY:latest
```

### Image Tags

The Docker image is tagged as:
- `latest` - Latest version from main/master branch
- `v1.0.0`, `v1.0`, `v1` - Version tags
- `sha-xxxxx` - Git SHA based tags
