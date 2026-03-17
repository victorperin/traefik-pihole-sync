/**
 * Unit tests for config.ts - getConfig() function
 * Following nodejs-testing-best-practices:
 * - Test pure functions in isolation
 * - Use descriptive test names
 * - Test edge cases and error conditions
 */

import { getConfig } from './config';

// Store original env to restore after tests
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('getConfig', () => {
  describe('successful configuration', () => {
    it('should return default values when env vars are not set', () => {
      // Clear all relevant env vars
      delete process.env.TRAEFIK_API_URL;
      delete process.env.PIHOLE_URL;
      delete process.env.PIHOLE_PASSWORD;
      delete process.env.SYNC_INTERVAL;
      delete process.env.DEFAULT_DOMAIN;
      delete process.env.LOG_LEVEL;
      delete process.env.REVERSE_PROXY_IPS;

      // Require fresh module
      jest.doMock('./logger', () => ({
        logger: {
          info: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
        },
      }));

      expect(() => getConfig()).toThrow('REVERSE_PROXY_IPS environment variable is required');
    });

    it('should use provided REVERSE_PROXY_IPS and apply defaults', () => {
      process.env.REVERSE_PROXY_IPS = '192.168.1.1';
      delete process.env.TRAEFIK_API_URL;
      delete process.env.PIHOLE_URL;
      delete process.env.PIHOLE_PASSWORD;
      delete process.env.SYNC_INTERVAL;
      delete process.env.DEFAULT_DOMAIN;
      delete process.env.LOG_LEVEL;

      const config = getConfig();

      expect(config.reverseProxyIps).toEqual(['192.168.1.1']);
      expect(config.traefikApiUrl).toBe('http://traefik:8080');
      expect(config.piholeUrl).toBe('http://pihole:80');
      expect(config.piholePassword).toBe('');
      expect(config.syncInterval).toBe(60000);
      expect(config.defaultDomain).toBe('local');
      expect(config.logLevel).toBe('info');
    });

    it('should parse multiple reverse proxy IPs from comma-separated string', () => {
      process.env.REVERSE_PROXY_IPS = '192.168.1.1, 192.168.1.2, 192.168.1.3';

      const config = getConfig();

      expect(config.reverseProxyIps).toEqual(['192.168.1.1', '192.168.1.2', '192.168.1.3']);
    });

    it('should trim whitespace from reverse proxy IPs', () => {
      process.env.REVERSE_PROXY_IPS = '  192.168.1.1  ,  192.168.1.2  ';

      const config = getConfig();

      expect(config.reverseProxyIps).toEqual(['192.168.1.1', '192.168.1.2']);
    });

    it('should filter out empty strings from reverse proxy IPs', () => {
      process.env.REVERSE_PROXY_IPS = '192.168.1.1,,192.168.1.2, ,192.168.1.3';

      const config = getConfig();

      expect(config.reverseProxyIps).toEqual(['192.168.1.1', '192.168.1.2', '192.168.1.3']);
    });

    it('should use custom values from environment variables', () => {
      process.env.REVERSE_PROXY_IPS = '10.0.0.1';
      process.env.TRAEFIK_API_URL = 'http://custom-traefik:9000';
      process.env.PIHOLE_URL = 'http://custom-pihole:8080';
      process.env.PIHOLE_PASSWORD = 'testpassword123';
      process.env.SYNC_INTERVAL = '30000';
      process.env.DEFAULT_DOMAIN = 'custom.domain';
      process.env.LOG_LEVEL = 'debug';

      const config = getConfig();

      expect(config.traefikApiUrl).toBe('http://custom-traefik:9000');
      expect(config.piholeUrl).toBe('http://custom-pihole:8080');
      expect(config.piholePassword).toBe('testpassword123');
      expect(config.syncInterval).toBe(30000);
      expect(config.defaultDomain).toBe('custom.domain');
      expect(config.logLevel).toBe('debug');
    });

    it('should parse SYNC_INTERVAL as integer in milliseconds', () => {
      process.env.REVERSE_PROXY_IPS = '192.168.1.1';
      process.env.SYNC_INTERVAL = '120000';

      const config = getConfig();

      expect(config.syncInterval).toBe(120000);
      expect(typeof config.syncInterval).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should throw error when REVERSE_PROXY_IPS is empty', () => {
      process.env.REVERSE_PROXY_IPS = '';

      expect(() => getConfig()).toThrow('REVERSE_PROXY_IPS environment variable is required');
    });

    it('should throw error when REVERSE_PROXY_IPS contains only whitespace', () => {
      process.env.REVERSE_PROXY_IPS = '   ';

      expect(() => getConfig()).toThrow('REVERSE_PROXY_IPS environment variable is required');
    });

    it('should throw error when REVERSE_PROXY_IPS is not set', () => {
      delete process.env.REVERSE_PROXY_IPS;

      expect(() => getConfig()).toThrow('REVERSE_PROXY_IPS environment variable is required');
    });
  });

  describe('edge cases', () => {
    it('should handle SYNC_INTERVAL of 0', () => {
      process.env.REVERSE_PROXY_IPS = '192.168.1.1';
      process.env.SYNC_INTERVAL = '0';

      const config = getConfig();

      expect(config.syncInterval).toBe(0);
    });

    it('should handle very large SYNC_INTERVAL', () => {
      process.env.REVERSE_PROXY_IPS = '192.168.1.1';
      process.env.SYNC_INTERVAL = '86400000'; // 24 hours in ms

      const config = getConfig();

      expect(config.syncInterval).toBe(86400000);
    });

    it('should return correct Config interface shape', () => {
      process.env.REVERSE_PROXY_IPS = '192.168.1.1';
      process.env.TRAEFIK_API_URL = 'http://traefik:8080';
      process.env.PIHOLE_URL = 'http://pihole:80';
      process.env.PIHOLE_PASSWORD = 'password';
      process.env.SYNC_INTERVAL = '60000';
      process.env.DEFAULT_DOMAIN = 'local';
      process.env.LOG_LEVEL = 'info';

      const config = getConfig();

      // Verify interface shape
      expect(config).toHaveProperty('traefikApiUrl');
      expect(config).toHaveProperty('piholeUrl');
      expect(config).toHaveProperty('piholePassword');
      expect(config).toHaveProperty('syncInterval');
      expect(config).toHaveProperty('defaultDomain');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('reverseProxyIps');
      expect(Array.isArray(config.reverseProxyIps)).toBe(true);
    });
  });
});
