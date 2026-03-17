/**
 * Unit tests for traefik.ts - TraefikService
 * Following nodejs-testing-best-practices:
 * - Test service methods with mocked HTTP calls
 * - Test edge cases for host extraction patterns
 * - Use descriptive test names
 */

import axios from 'axios';
import { TraefikService } from './traefik';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to avoid console output during tests
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('TraefikService', () => {
  let service: TraefikService;
  const baseUrl = 'http://traefik:8080';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TraefikService(baseUrl);
  });

  describe('getRouters', () => {
    it('should return empty array when no routers exist', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      const result = await service.getRouters();

      expect(result).toEqual([]);
    });

    it('should extract hosts from routers with Host() rule', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'Host(`example.com`)',
            service: 'service-1',
            entryPoints: ['web'],
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'router-1',
        hosts: ['example.com'],
      });
    });

    it('should extract multiple hosts from Host() rule', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'Host(`example.com`)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].hosts).toEqual(['example.com']);
    });

    it('should extract hosts from HostIn() rule', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'HostIn(`example.com`)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].hosts).toContain('example.com');
    });

    it('should extract hosts from HostIs() rule', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'HostIs(`example.com`)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result[0].hosts).toEqual(['example.com']);
    });

    it('should extract hosts from HostSplit() rule', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'HostSplit(`example.com`)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].hosts).toContain('example.com');
    });

    it('should extract regex pattern from HostRegexp() rule', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'HostRegexp(`^.+\\.example\\.com$`)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result[0].hosts).toEqual(['^.+\\.example\\.com$']);
    });

    it('should skip routers without rules', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            service: 'service-1',
            entryPoints: ['web'],
          },
          'router-2': {
            rule: 'Host(`example.com`)',
            service: 'service-2',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('router-2');
    });

    it('should extract hosts from routers with complex rules', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'api-router': {
            rule: 'Host(`api.example.com`) && PathPrefix(`/api`)',
            service: 'api-service',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].hosts).toEqual(['api.example.com']);
    });

    it('should handle multiple routers with different rules', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'Host(`example.com`)',
            service: 'service-1',
          },
          'router-2': {
            rule: 'HostIn(`test.com`, `www.test.com`)',
            service: 'service-2',
          },
          'router-3': {
            rule: 'HostRegexp(`.*\\.local`)',
            service: 'service-3',
          },
        },
      });

      const result = await service.getRouters();

      // Only router-1 and router-3 have valid Host patterns
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'router-1', hosts: ['example.com'] });
      expect(result[1]).toEqual({ name: 'router-3', hosts: ['.*\\.local'] });
    });

    it('should handle axios error and throw', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getRouters()).rejects.toThrow('Network error');
    });

    it('should return routers with empty hosts array when no Host rule exists', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'path-router': {
            rule: 'PathPrefix(`/api`)',
            service: 'api-service',
          },
        },
      });

      const result = await service.getRouters();

      // Should not include routers without Host rules
      expect(result).toHaveLength(0);
    });

    it('should handle routers with TLS configuration', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'secure-router': {
            rule: 'Host(`secure.example.com`)',
            service: 'secure-service',
            tls: {
              certResolver: 'letsencrypt',
            },
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].hosts).toEqual(['secure.example.com']);
    });

    it('should handle numeric router names', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          '123': {
            rule: 'Host(`numeric.example.com`)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('123');
    });
  });

  describe('extractHostsFromRule (via getRouters)', () => {
    it('should trim whitespace from extracted hosts', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'Host(` example.com `)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].hosts).toContain('example.com');
    });

    it('should handle multiple Host functions in one rule', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'Host(`primary.com`) && Host(`secondary.com`)',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result[0].hosts).toEqual(['primary.com', 'secondary.com']);
    });

    it('should handle empty rule string', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: '',
            service: 'service-1',
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(0);
    });

    it('should handle routers with nested objects in response', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          'router-1': {
            rule: 'Host(`test.com`)',
            service: {
              name: 'my-service',
              scheme: 'http',
            },
          },
        },
      });

      const result = await service.getRouters();

      expect(result).toHaveLength(1);
      expect(result[0].hosts).toEqual(['test.com']);
    });
  });
});
