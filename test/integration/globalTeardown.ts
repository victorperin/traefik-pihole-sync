/**
 * Global teardown for Jest - runs after all tests
 */

export default async function globalTeardown() {
  console.log('\n=== Global Teardown: Integration tests complete ===\n');
}
