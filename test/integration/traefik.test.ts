/**
 * Integration tests for TraefikService
 * Following nodejs-testing-best-practices:
 * - Use real services via Docker Compose (started globally)
 * - Test actual API interactions
 */

import { TraefikService } from '../../src/services/traefik';
import { TEST_PORTS } from './setup';

describe('TraefikService Integration', () => {
  const traefikUrl = process.env.TRAEFIK_API_URL || `http://localhost:${TEST_PORTS.traefik}`;
  const traefikService = new TraefikService(traefikUrl);

  describe('getRouters', () => {
    it('should fetch routers from Traefik API', async () => {
      const routers = await traefikService.getRouters();
      expect(Array.isArray(routers)).toBe(true);
    });

    it('should return routers with name and hosts properties', async () => {
      const routers = await traefikService.getRouters();

      for (const router of routers) {
        expect(router).toHaveProperty('name');
        expect(router).toHaveProperty('hosts');
        expect(Array.isArray(router.hosts)).toBe(true);
      }
    });

    it('should handle empty routers response', async () => {
      const routers = await traefikService.getRouters();
      expect(routers).toBeDefined();
    });
  });
});
