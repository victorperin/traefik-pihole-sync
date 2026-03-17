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

// Global state to track Docker Compose lifecycle
let dockerCompose: any = null;
let dockerAvailable = false;
let dockerInitialized = false;

// Test ports (mapped from docker-compose.yml)
export const TEST_PORTS = {
  traefik: 1081,
  traefikApi: 8080,
  pihole: 1080,
  piholeHttp: 80,
  piholeDns: 8053,
};

/**
 * Checks if Docker is available
 */
export async function checkDockerAvailable(): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts the Docker Compose services for integration testing
 * Uses the existing docker-compose.yml file
 * Only starts once - subsequent calls return the same instance
 */
export async function startDockerCompose(): Promise<any> {
  // Return existing instance if already started
  if (dockerCompose) {
    return dockerCompose;
  }

  // Check Docker availability first
  dockerAvailable = await checkDockerAvailable();
  if (!dockerAvailable) {
    throw new Error('Docker is not available');
  }

  console.log('Starting Docker Compose for integration tests...');
  
  // Dynamic import to avoid issues with testcontainers types
  const { DockerComposeEnvironment } = await import('testcontainers');
  
  dockerCompose = await new DockerComposeEnvironment(
    process.cwd(),
    'docker-compose.yml'
  ).up();

  console.log('Docker Compose started successfully');
  dockerInitialized = true;
  return dockerCompose;
}

/**
 * Stops and removes Docker Compose services
 */
export async function stopDockerCompose(): Promise<void> {
  if (dockerCompose) {
    console.log('Stopping Docker Compose...');
    try {
      await dockerCompose.down();
    } catch (error) {
      console.warn('Error stopping Docker Compose:', error);
    }
    dockerCompose = null;
    dockerInitialized = false;
    console.log('Docker Compose stopped');
  }
}

/**
 * Returns whether Docker is available
 */
export function isDockerAvailable(): boolean {
  return dockerAvailable;
}

/**
 * Returns whether Docker has been initialized
 */
export function isDockerInitialized(): boolean {
  return dockerInitialized;
}

/**
 * Enhanced wait function with better error handling and logging
 */
export async function waitForService(
  url: string,
  maxAttempts: number = 60,
  delayMs: number = 2000
): Promise<boolean> {
  console.log(`Waiting for service at ${url}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Accept 200 (OK), 401 (auth required - good!), or other 2xx/3xx
      if (response.ok || response.status === 401 || (response.status >= 200 && response.status < 400)) {
        console.log(`Service at ${url} is ready (status: ${response.status})`);
        return true;
      }
      
      console.log(`Attempt ${attempt}/${maxAttempts}: Service returned status ${response.status}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`Attempt ${attempt}/${maxAttempts}: Connection timeout`);
      } else {
        console.log(`Attempt ${attempt}/${maxAttempts}: ${error.message}`);
      }
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.warn(`Service at ${url} did not become ready after ${maxAttempts} attempts`);
  return false;
}

/**
 * Setup function to run before all integration tests
 */
export async function setupIntegrationTests(): Promise<boolean> {
  try {
    await startDockerCompose();
    return true;
  } catch (error) {
    console.warn('Docker not available, skipping integration tests');
    return false;
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
