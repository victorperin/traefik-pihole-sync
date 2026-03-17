/**
 * Global setup for Jest - starts Docker Compose once before all tests
 */

import { setupIntegrationTests, waitForService } from './setup';

// Default ports from docker-compose.yml
const TRAEFIK_API_URL = process.env.TRAEFIK_API_URL || 'http://localhost:1081';
const PIHOLE_URL = process.env.PIHOLE_URL || 'http://localhost:1080';

export default async function globalSetup() {
  console.log('\n=== Global Setup: Starting integration tests ===\n');

  const dockerAvailable = await setupIntegrationTests();
  
  if (!dockerAvailable) {
    throw new Error('Docker is required for integration tests but is not available');
  }

  // Wait for both services to be ready with retries
  console.log('Waiting for services to be ready...');
  
  const traefikReady = await waitForService(`${TRAEFIK_API_URL}/api/http/routers`, 60, 2000);
  const piholeReady = await waitForService(`${PIHOLE_URL}/api/status`, 60, 2000);
  
  if (!traefikReady) {
    throw new Error('Traefik service failed to start');
  }
  
  if (!piholeReady) {
    throw new Error('Pi-hole service failed to start');
  }
  
  console.log('All services are ready!');
  console.log('\n=== Global Setup Complete ===\n');
}
