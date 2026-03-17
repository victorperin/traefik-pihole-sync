/**
 * Global teardown for Jest - stops Docker Compose after all tests
 */

import { teardownIntegrationTests } from './setup';

export default async function globalTeardown() {
  console.log('\n=== Global Teardown: Stopping integration tests ===\n');
  
  await teardownIntegrationTests();
  
  console.log('\n=== Global Teardown Complete ===\n');
}
