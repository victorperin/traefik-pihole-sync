/**
 * Integration tests for PiHoleService using Jest mocks
 * Following nodejs-testing-best-practices:
 * - Use mocked HTTP responses via jest.mock
 * - Test API interactions with mock data
 * - Clean up test data after tests
 */

import axios from 'axios';
import { PiHoleService } from '../../src/services/pihole';
import { resetTestData } from './setup';

// Module-level state for mock
let dnsRecords: string[] = [];

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PiHoleService Integration', () => {
  const piholeUrl = process.env.PIHOLE_URL || 'http://localhost:1080';
  const password = 'testpassword';
  const piholeService = new PiHoleService(piholeUrl, password);

  beforeEach(() => {
    // Reset test data
    dnsRecords = [];
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();

    // Setup default mock responses
    mockedAxios.get.mockImplementation(async (url: unknown) => {
      const urlStr = url as string;

      // Pi-hole: GET /api/config/dns/hosts
      if (urlStr.includes('/api/config/dns/hosts')) {
        return Promise.resolve({
          data: {
            config: {
              dns: {
                hosts: [...dnsRecords],
              },
            },
          },
        });
      }

      // Pi-hole: GET /api/status
      if (urlStr.includes('/api/status')) {
        return Promise.resolve({
          data: {
            status: 'enabled',
            gravity: {
              last_update: 1234567890,
            },
          },
        });
      }

      return Promise.reject(new Error(`Unhandled mock URL: ${urlStr}`));
    });

    mockedAxios.put.mockImplementation(async (url: unknown) => {
      const urlStr = url as string;

      if (urlStr.includes('/api/config/dns/hosts/')) {
        const match = urlStr.match(/\/api\/config\/dns\/hosts\/([^/]+)$/);
        if (match) {
          const ipParam = decodeURIComponent(match[1]);
          const [ip, ...domainParts] = ipParam.split(' ');
          const domain = domainParts.join(' ');

          if (ip && domain) {
            const record = `${ip} ${domain}`;
            if (!dnsRecords.includes(record)) {
              dnsRecords.push(record);
            }
          }
        }
        return Promise.resolve({ data: { status: 'success' } });
      }

      return Promise.reject(new Error(`Unhandled mock URL: ${urlStr}`));
    });

    mockedAxios.delete.mockImplementation(async (url: unknown) => {
      const urlStr = url as string;

      if (urlStr.includes('/api/config/dns/hosts/')) {
        // Remove query string for matching
        const urlWithoutQuery = urlStr.split('?')[0];
        
        // Try matching with space (either encoded or literal)
        // Pattern 1: encoded space %20
        let match = urlWithoutQuery.match(/\/api\/config\/dns\/hosts\/([^/]+)%20([^/]+)$/);
        // Pattern 2: literal space
        if (!match) {
          match = urlWithoutQuery.match(/\/api\/config\/dns\/hosts\/([^/]+)\s([^/]+)$/);
        }
        // Pattern 3: forward slash separator
        if (!match) {
          match = urlWithoutQuery.match(/\/api\/config\/dns\/hosts\/([^/]+)\/([^/]+)$/);
        }

        if (match) {
          const ip = decodeURIComponent(match[1]);
          const domain = decodeURIComponent(match[2]);

          dnsRecords = dnsRecords.filter(
            (record) => record !== `${ip} ${domain}`
          );
        }
        return Promise.resolve({ data: { status: 'success' } });
      }

      return Promise.reject(new Error(`Unhandled mock URL: ${urlStr}`));
    });
  });

  describe('addDnsRecord', () => {
    it('should add a DNS record to Pi-hole', async () => {
      await piholeService.addDnsRecord('test.example.com', 'xxx.xxx.xxx.xxx');

      const records = await piholeService.getAllDnsRecords();
      const found = records.find(
        r => r.domain === 'test.example.com' && r.ip === 'xxx.xxx.xxx.xxx'
      );

      expect(found).toBeDefined();
    });

    it('should add multiple DNS records', async () => {
      await piholeService.addDnsRecord('test1.example.com', 'xxx.xxx.xxx.xxx');
      await piholeService.addDnsRecord('test2.example.com', 'xxx.xxx.xxx.xxx');

      const records = await piholeService.getAllDnsRecords();

      expect(records.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('removeDnsRecord', () => {
    it('should remove a DNS record from Pi-hole', async () => {
      // First add a record
      await piholeService.addDnsRecord('remove.test.com', 'xxx.xxx.xxx.xxx');

      // Verify it exists
      let records = await piholeService.getAllDnsRecords();
      let found = records.find(r => r.domain === 'remove.test.com');
      expect(found).toBeDefined();

      // Remove it
      await piholeService.removeDnsRecord('remove.test.com', 'xxx.xxx.xxx.xxx');

      // Verify it's gone
      records = await piholeService.getAllDnsRecords();
      found = records.find(r => r.domain === 'remove.test.com');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllDnsRecords', () => {
    it('should return all DNS records from Pi-hole', async () => {
      const records = await piholeService.getAllDnsRecords();

      expect(Array.isArray(records)).toBe(true);
      // Records should have domain and ip properties
      for (const record of records) {
        expect(record).toHaveProperty('domain');
        expect(record).toHaveProperty('ip');
      }
    });

    it('should return empty array when no records exist', async () => {
      const result = await piholeService.getAllDnsRecords();
      expect(result).toEqual([]);
    });
  });

  describe('listDnsRecords', () => {
    it('should return raw DNS records from API', async () => {
      await piholeService.addDnsRecord('raw.test.com', 'xxx.xxx.xxx.xxx');

      const rawRecords = await piholeService.listDnsRecords();

      expect(Array.isArray(rawRecords)).toBe(true);
      expect(rawRecords.length).toBeGreaterThan(0);
    });
  });
});
