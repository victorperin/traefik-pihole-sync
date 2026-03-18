/**
 * Integration test setup using Jest mocks
 * Following nodejs-testing-best-practices:
 * - Mock HTTP responses at the axios level
 * - No external dependencies (no Docker containers)
 * - Provide helper functions for common operations
 */

import { resetMockData, setDnsRecords, setRouters } from './handlers';

// Override environment variables for testing
process.env.TRAEFIK_API_URL = 'http://localhost:1081';
process.env.PIHOLE_URL = 'http://localhost:1080';
process.env.PIHOLE_PASSWORD = 'testpassword';
process.env.REVERSE_PROXY_IPS = 'xxx.xxx.xxx.xxx';
process.env.SYNC_INTERVAL = '60000';
process.env.DEFAULT_DOMAIN = 'local';
process.env.LOG_LEVEL = 'info';

/**
 * Setup function to run before all integration tests
 * Note: axios mocks are setup in test files via jest.mock
 */
export async function setupIntegrationTests(): Promise<void> {
  console.log('Integration tests setup complete');
}

/**
 * Teardown function to run after all integration tests
 */
export async function teardownIntegrationTests(): Promise<void> {
  console.log('Integration tests teardown complete');
}

/**
 * Reset all mock data between tests
 */
export function resetTestData(): void {
  resetMockData();
}

/**
 * Helper to configure initial DNS records (for test setup)
 */
export function setupDnsRecords(records: string[]): void {
  setDnsRecords(records);
}

/**
 * Helper to configure initial routers (for test setup)
 */
export function setupRouters(
  routers: Record<string, { rule?: string; service?: string; entryPoints?: string[] }>
): void {
  setRouters(routers);
}
