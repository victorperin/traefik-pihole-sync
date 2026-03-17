/**
 * Integration test setup using testcontainers
 * Following nodejs-testing-best-practices:
 * - Use testcontainers for realistic testing environment
 * - Setup/teardown containers properly
 * - Provide helper functions for common operations
 */

// Set required environment variables BEFORE importing any modules that use logger/config
process.env.REVERSE_PROXY_IPS = process.env.REVERSE_PROXY_IPS || 'xxx.xxx.xxx.xxx';
process.env.PIHOLE_PASSWORD = process.env.PIHOLE_PASSWORD || 'testpassword';
process.env.TRAEFIK_API_URL = process.env.TRAEFIK_API_URL || 'http://traefik:8080';
process.env.PIHOLE_URL = process.env.PIHOLE_URL || 'http://pihole:80';
process.env.SYNC_INTERVAL = process.env.SYNC_INTERVAL || '60000';
process.env.DEFAULT_DOMAIN = process.env.DEFAULT_DOMAIN || 'local';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';

let dockerCompose: any = null;

/**
 * Starts the Docker Compose services for integration testing
 * Uses the existing docker-compose.yml file
 */
export async function startDockerCompose(): Promise<any> {
  if (dockerCompose) {
    return dockerCompose;
  }

  console.log('Starting Docker Compose for integration tests...');
  
  // Dynamic import to avoid issues with testcontainers types
  const { DockerComposeEnvironment } = await import('testcontainers');
  
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
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
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
