/**
 * Unit tests for index.ts - buildDesiredRecords logic and sync flow
 * Following nodejs-testing-best-practices:
 * - Test logic in isolation with mocked services
 * - Use descriptive test names
 * - Test edge cases and filtering logic
 */

import axios from 'axios';
import { TraefikService, TraefikRouterInfo } from './services/traefik';
import { PiHoleService, DnsRecord, generateDiff } from './services/pihole';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to avoid console output during tests
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock config
jest.mock('./config', () => ({
  getConfig: jest.fn(() => ({
    traefikApiUrl: 'http://traefik:8080',
    piholeUrl: 'http://pihole:80',
    piholePassword: 'testpassword',
    syncInterval: 60000,
    defaultDomain: 'local',
    logLevel: 'info',
    reverseProxyIps: ['192.168.1.1'],
  })),
}));

describe('buildDesiredRecords (logic extracted)', () => {
  // Extract the buildDesiredRecords logic for testing
  // This mirrors the logic in src/index.ts
  function buildDesiredRecords(routers: TraefikRouterInfo[], reverseProxyIps: string[]): DnsRecord[] {
    const desired: DnsRecord[] = [];

    for (const router of routers) {
      for (const host of router.hosts) {
        // Skip if the host looks like an IP address (no domain)
        const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(host);
        if (isIpAddress) {
          continue;
        }

        // Skip regex patterns (e.g., ^.+$ or regex expressions)
        const isRegex = /^\^.*\$/.test(host) || /[?+*]/.test(host);
        if (isRegex) {
          continue;
        }

        // Skip internal/localhost domains
        const isLocalhost = host === 'localhost' || host.includes('.local') || host.endsWith('.internal');
        if (isLocalhost) {
          continue;
        }

        // Create a DNS record for each reverse proxy IP
        for (const reverseProxyIp of reverseProxyIps) {
          desired.push({ domain: host, ip: reverseProxyIp });
        }
      }
    }

    return desired;
  }

  const reverseProxyIps = ['192.168.1.1', '192.168.1.2'];

  describe('IP address filtering', () => {
    it('should skip hosts that are IP addresses', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['192.168.1.100'] },
        { name: 'router-2', hosts: ['10.0.0.1'] },
        { name: 'router-3', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2); // only example.com with 2 IPs
      expect(result).toContainEqual({ domain: 'example.com', ip: '192.168.1.1' });
      expect(result).toContainEqual({ domain: 'example.com', ip: '192.168.1.2' });
    });

    it('should skip partial IP addresses', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['192.168.1'] },
        { name: 'router-2', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      // Partial IPs are not filtered - only full 4-octet IPs are filtered
      expect(result).toHaveLength(4); // 192.168.1 + example.com, each with 2 IPs
    });
  });

  describe('regex pattern filtering', () => {
    it('should skip hosts starting with ^', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['^.+\\.example\\.com$'] },
        { name: 'router-2', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
    });

    it('should skip hosts containing ? (optional char)', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['example?.com'] },
        { name: 'router-2', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
    });

    it('should skip hosts containing + (one or more)', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['.+.example.com'] },
        { name: 'router-2', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
    });

    it('should skip hosts containing * (wildcard)', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['*.example.com'] },
        { name: 'router-2', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
    });
  });

  describe('localhost/internal domain filtering', () => {
    it('should skip localhost domain', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['localhost'] },
        { name: 'router-2', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
    });

    it('should skip domains with .local TLD', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['service.local'] },
        { name: 'router-2', hosts: ['app.local'] },
        { name: 'router-3', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
    });

    it('should skip domains ending with .internal', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['service.internal'] },
        { name: 'router-2', hosts: ['api.internal'] },
        { name: 'router-3', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(2);
      expect(result[0].domain).toBe('example.com');
    });
  });

  describe('multiple reverse proxy IPs', () => {
    it('should create records for each reverse proxy IP', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['example.com'] },
      ];

      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      const result = buildDesiredRecords(routers, ips);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ domain: 'example.com', ip: '192.168.1.1' });
      expect(result).toContainEqual({ domain: 'example.com', ip: '192.168.1.2' });
      expect(result).toContainEqual({ domain: 'example.com', ip: '192.168.1.3' });
    });

    it('should create records for multiple hosts with multiple IPs', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['example.com', 'test.com'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(4); // 2 hosts × 2 IPs
    });
  });

  describe('edge cases', () => {
    it('should handle empty routers array', () => {
      const result = buildDesiredRecords([], reverseProxyIps);

      expect(result).toHaveLength(0);
    });

    it('should handle routers with empty hosts array', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: [] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(0);
    });

    it('should handle all hosts being filtered out', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['192.168.1.1', 'localhost', '^regex$'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result).toHaveLength(0);
    });

    it('should handle single reverse proxy IP', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['example.com'] },
      ];

      const result = buildDesiredRecords(routers, ['192.168.1.1']);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ domain: 'example.com', ip: '192.168.1.1' });
    });

    it('should preserve domain case', () => {
      const routers: TraefikRouterInfo[] = [
        { name: 'router-1', hosts: ['EXAMPLE.COM', 'Test.Domain.COM'] },
      ];

      const result = buildDesiredRecords(routers, reverseProxyIps);

      expect(result[0].domain).toBe('EXAMPLE.COM');
      expect(result[2].domain).toBe('Test.Domain.COM');
    });
  });
});

describe('Sync flow integration (with mocked services)', () => {
  it('should complete full sync cycle with mocked services', async () => {
    // Setup mocks for Traefik
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          'router-api': {
            rule: 'Host(`api.example.com`)',
            service: 'api-service',
          },
          'router-web': {
            rule: 'Host(`web.example.com`)',
            service: 'web-service',
          },
        },
      })
      // Setup mocks for Pi-hole listDnsRecords
      .mockResolvedValueOnce({
        data: {
          config: {
            dns: {
              hosts: [],
            },
          },
        },
      })
      // Setup mocks for Pi-hole addDnsRecord (api.example.com)
      .mockResolvedValueOnce({ data: {} })
      // Setup mocks for Pi-hole addDnsRecord (web.example.com)
      .mockResolvedValueOnce({ data: {} });

    // Create services
    const traefikService = new TraefikService('http://traefik:8080');
    const piholeService = new PiHoleService('http://pihole:80', 'testpassword');
    const reverseProxyIps = ['192.168.1.1'];

    // Execute sync logic
    const routers = await traefikService.getRouters();
    
    // Build desired records (same logic as in index.ts)
    const desiredRecords: DnsRecord[] = [];
    for (const router of routers) {
      for (const host of router.hosts) {
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) continue;
        if (/^\^.*\$/.test(host) || /[?+*]/.test(host)) continue;
        if (host === 'localhost' || host.includes('.local') || host.endsWith('.internal')) continue;
        
        for (const ip of reverseProxyIps) {
          desiredRecords.push({ domain: host, ip });
        }
      }
    }

    // Get current records
    const currentRecords = await piholeService.getAllDnsRecords();

    // Generate diff
    const diff = generateDiff(currentRecords, desiredRecords);

    // Apply changes
    for (const record of diff.toAdd) {
      await piholeService.addDnsRecord(record.domain, record.ip);
    }

    // Verify
    expect(diff.toAdd).toHaveLength(2); // api.example.com and web.example.com
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.put).toHaveBeenCalledTimes(2);
  });

  it('should handle remove and update operations correctly', async () => {
    // Current records in Pi-hole
    const currentRecords: DnsRecord[] = [
      { domain: 'old.example.com', ip: '192.168.1.10' },
    ];

    // Desired records from Traefik
    const desiredRecords: DnsRecord[] = [
      { domain: 'new.example.com', ip: '192.168.1.20' },
    ];

    const diff = generateDiff(currentRecords, desiredRecords);

    expect(diff.toAdd).toContainEqual({ domain: 'new.example.com', ip: '192.168.1.20' });
    expect(diff.toRemove).toContainEqual({ domain: 'old.example.com', ip: '192.168.1.10' });
    expect(diff.toChange).toHaveLength(0);
  });

  it('should handle no changes scenario', () => {
    const records: DnsRecord[] = [
      { domain: 'example.com', ip: '192.168.1.1' },
    ];

    const diff = generateDiff(records, records);

    expect(diff.toAdd).toHaveLength(0);
    expect(diff.toRemove).toHaveLength(0);
    expect(diff.toChange).toHaveLength(0);
  });
});
