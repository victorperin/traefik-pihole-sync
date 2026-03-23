# Contributing to Traefik Pi-hole DNS Sync

Thank you for your interest in contributing to this project!

## Development Setup

### Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/traefik-pihole-dns-sync.git
cd traefik-pihole-dns-sync

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Build

```bash
# Compile TypeScript
npm run build
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

### Run Locally with Docker

```bash
# Start the application with Docker
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop the application
docker-compose down
```

### Development Mode

```bash
# Run in development mode (with hot reload)
npm run dev
```

## Code Style

- This project uses ESLint and Prettier for code formatting
- Run linting before committing:
  ```bash
  npm run lint
  ```
- Format code before committing:
  ```bash
  npm run format
  ```

## Testing

- All new features should include unit tests
- Tests are located alongside source files with `.test.ts` extension
- Run tests before submitting a pull request

## Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -m 'Add new feature'`
7. Push to your fork: `git push origin feature/my-feature`
8. Submit a pull request

## Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Environment details (Node version, OS, etc.)
- Any relevant logs

## License

By contributing to this project, you agree that your contributions will be licensed under the GNU General Public License v3.0.