/**
 * Integration test setup using testcontainers
 * Following nodejs-testing-best-practices:
 * - Use testcontainers for realistic testing environment
 * - Setup/teardown containers properly
 * - Provide helper functions for common operations
 */

import { GenericContainer, DockerComposeEnvironment } from 'testcontainers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let dockerCompose: DockerComposeEnvironment | null = null;

/**
 * Starts the Docker Compose services for integration testing
 * Uses the existing docker-compose.yml file
 */
export async function startDockerCompose(): Promise<DockerComposeEnvironment> {
  if (dockerCompose) {
    return dockerCompose;
  }

  console.log('Starting Docker Compose for integration tests...');
  
  dockerCompose = await new DockerComposeEnvironment(
    process.cwd(),
    'docker-compose.yml'
  ).up();

  console.log('Docker Compose started successfully');
  return dockerCompose;
}

/**
 * Stops and removes Docker Compose services
 */
export async function stopDockerCompose(): Promise<void> {
  if (dockerCompose) {
    console.log('Stopping Docker Compose...');
    await dockerCompose.down();
    dockerCompose = null;
    console.log('Docker Compose stopped');
  }
}

/**
 * Gets the mapped port for a service
 */
export function getServicePort(container: GenericContainer, port: number): number | undefined {
  const ports = container.getMappedPort(port);
  return ports ? ports.get() : undefined;
}

/**
 * Waits for a service to be ready
 */
export async function waitForService(
  url: string,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status === 401) { // 401 is OK for auth-required endpoints
        return true;
      }
    } catch {
      // Service not ready yet
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

/**
 * Setup function to run before all integration tests
 */
export async function setupIntegrationTests(): Promise<void> {
  // Check if Docker is available
  try {
    await execAsync('docker --version');
  } catch (error) {
    console.warn('Docker not available, skipping integration tests');
  }
}

/**
 * Teardown function to run after all integration tests
 */
export async function teardownIntegrationTests(): Promise<void> {
  await stopDockerCompose();
}

// Export container configurations for direct use if needed
export const testContainerConfigs = {
  pihole: {
    image: 'pihole/pihole:v6.0',
    ports: {
      http: 80,
      dns: 53,
    },
    environment: {
      PIHOLE_UID: '1000',
      PIHOLE_GID: '1000',
      WEBPASSWORD: 'testpassword',
    },
  },
  traefik: {
    image: 'traefik:v3.0',
    ports: {
      http: 80,
      dashboard: 8080,
    },
  },
};
