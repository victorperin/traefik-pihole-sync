/**
 * Global setup for Jest - starts MSW server once before all tests
 */

import { setupIntegrationTests } from './setup';

export default async function globalSetup() {
  console.log('\n=== Global Setup: Starting integration tests (MSW) ===\n');

  await setupIntegrationTests();

  console.log('MSW server is ready!');
  console.log('\n=== Global Setup Complete ===\n');
}
