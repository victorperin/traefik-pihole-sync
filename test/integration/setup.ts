/**
 * Integration test setup using Jest mocks
 * Following nodejs-testing-best-practices:
 * - Mock HTTP responses at the axios level
 * - No external dependencies (no Docker containers)
 * - Provide helper functions for common operations
 */

// Override environment variables for testing
process.env.TRAEFIK_API_URL = 'http://localhost:1081';
process.env.PIHOLE_URL = 'http://localhost:1080';
process.env.PIHOLE_PASSWORD = 'testpassword';
process.env.REVERSE_PROXY_IPS = '192.168.1.1';
process.env.SYNC_INTERVAL = '60000';
process.env.DEFAULT_DOMAIN = 'local';
process.env.LOG_LEVEL = 'info';
