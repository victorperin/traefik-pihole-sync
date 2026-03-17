/**
 * Integration tests for TraefikService
 * Following nodejs-testing-best-practices:
 * - Use real services via Docker Compose
 * - Test actual API interactions
 */

import { TraefikService } from '../../src/services/traefik';
import { startDockerCompose, stopDockerCompose, waitForService } from './setup';

describe('TraefikService Integration', () => {
  let traefikService: TraefikService;
  let traefikUrl: string;

  beforeAll(async () => {
    // Check if Docker is available
    try {
      await startDockerCompose();
    } catch (error) {
      console.warn('Docker not available, skipping integration tests');
      return;
    }

    // Get Traefik URL from docker-compose
    traefikUrl = process.env.TRAEFIK_API_URL || 'http://localhost:1081';

    // Wait for Traefik to be ready
    const ready = await waitForService(`${traefikUrl}/api/http/routers`, 60, 2000);
    if (!ready) {
      throw new Error('Traefik service not ready');
    }

    traefikService = new TraefikService(traefikUrl);
  }, 120000);

  afterAll(async () => {
    await stopDockerCompose();
  });

  describe('getRouters', () => {
    it('should fetch routers from Traefik API', async () => {
      if (!traefikService) {
        pending('Docker not available');
        return;
      }

      const routers = await traefikService.getRouters();

      expect(Array.isArray(routers)).toBe(true);
    });

    it('should return routers with name and hosts properties', async () => {
      if (!traefikService) {
        pending('Docker not available');
        return;
      }

      const routers = await traefikService.getRouters();

      for (const router of routers) {
        expect(router).toHaveProperty('name');
        expect(router).toHaveProperty('hosts');
        expect(Array.isArray(router.hosts)).toBe(true);
      }
    });

    it('should handle empty routers response', async () => {
      if (!traefikService) {
        pending('Docker not available');
        return;
      }

      const routers = await traefikService.getRouters();

      // Traefik should have some routers configured via docker-compose
      // This test ensures we handle the response correctly
      expect(routers).toBeDefined();
    });
  });
});
