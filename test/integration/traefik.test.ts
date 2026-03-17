/**
 * Integration tests for TraefikService
 * Following nodejs-testing-best-practices:
 * - Use real services via Docker Compose (started globally)
 * - Test actual API interactions
 */

import { TraefikService } from '../../src/services/traefik';
import { isDockerAvailable, isDockerInitialized, TEST_PORTS } from './setup';

describe('TraefikService Integration', () => {
  let traefikService: TraefikService | null = null;
  let traefikUrl: string;

  beforeAll(() => {
    // Skip all tests if Docker is not available
    if (!isDockerAvailable() || !isDockerInitialized()) {
      return;
    }

    traefikUrl = process.env.TRAEFIK_API_URL || `http://localhost:${TEST_PORTS.traefik}`;
    traefikService = new TraefikService(traefikUrl);
  });

  const skipIfNoDocker = () => {
    if (!isDockerAvailable() || !isDockerInitialized() || !traefikService) {
      return true;
    }
    return false;
  };

  describe('getRouters', () => {
    it('should fetch routers from Traefik API', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      const routers = await traefikService!.getRouters();
      expect(Array.isArray(routers)).toBe(true);
    });

    it('should return routers with name and hosts properties', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      const routers = await traefikService!.getRouters();

      for (const router of routers) {
        expect(router).toHaveProperty('name');
        expect(router).toHaveProperty('hosts');
        expect(Array.isArray(router.hosts)).toBe(true);
      }
    });

    it('should handle empty routers response', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      const routers = await traefikService!.getRouters();
      expect(routers).toBeDefined();
    });
  });
});
