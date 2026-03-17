/**
 * Unit tests for pihole.ts - generateDiff() function and PiHoleService
 * Following nodejs-testing-best-practices:
 * - Test pure functions in isolation
 * - Use descriptive test names with given-when-then pattern
 * - Test edge cases and boundary conditions
 * - Mock HTTP calls for service tests
 */

import axios from 'axios';
import { PiHoleService, DnsRecord, generateDiff } from './pihole';

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

describe('generateDiff', () => {
  // Test data
  const emptyRecords: DnsRecord[] = [];
  
  const currentRecords: DnsRecord[] = [
    { domain: 'example.com', ip: '192.168.1.10' },
    { domain: 'old.example.com', ip: '192.168.1.20' },
    { domain: 'unchanged.example.com', ip: '192.168.1.30' },
  ];
  
  const desiredRecords: DnsRecord[] = [
    { domain: 'example.com', ip: '192.168.1.10' }, // unchanged
    { domain: 'new.example.com', ip: '192.168.1.40' }, // new
    { domain: 'changed.example.com', ip: '192.168.1.50' }, // changed (was different IP)
  ];

  describe('records to add', () => {
    it('should return records that exist in desired but not in current as toAdd', () => {
      const diff = generateDiff(emptyRecords, desiredRecords);

      expect(diff.toAdd).toHaveLength(3);
      expect(diff.toAdd).toContainEqual({ domain: 'example.com', ip: '192.168.1.10' });
      expect(diff.toAdd).toContainEqual({ domain: 'new.example.com', ip: '192.168.1.40' });
      expect(diff.toAdd).toContainEqual({ domain: 'changed.example.com', ip: '192.168.1.50' });
    });

    it('should return empty array when desired is empty', () => {
      const diff = generateDiff(currentRecords, emptyRecords);

      expect(diff.toAdd).toHaveLength(0);
    });
  });

  describe('records to remove', () => {
    it('should return records that exist in current but not in desired as toRemove', () => {
      const diff = generateDiff(currentRecords, desiredRecords);

      // old.example.com and unchanged.example.com are not in desired
      expect(diff.toRemove.length).toBeGreaterThanOrEqual(1);
      expect(diff.toRemove).toContainEqual({ domain: 'old.example.com', ip: '192.168.1.20' });
    });

    it('should return all current records when desired is empty', () => {
      const diff = generateDiff(currentRecords, emptyRecords);

      expect(diff.toRemove).toHaveLength(3);
      expect(diff.toRemove).toEqual(currentRecords);
    });

    it('should return empty array when current is empty', () => {
      const diff = generateDiff(emptyRecords, desiredRecords);

      expect(diff.toRemove).toHaveLength(0);
    });
  });

  describe('records to change', () => {
    it('should return records with same domain but different IP as toChange', () => {
      const currentWithDifferentIP: DnsRecord[] = [
        { domain: 'example.com', ip: '192.168.1.10' },
        { domain: 'changed.example.com', ip: '192.168.1.99' }, // different IP
      ];
      
      const diff = generateDiff(currentWithDifferentIP, desiredRecords);

      expect(diff.toChange).toHaveLength(1);
      expect(diff.toChange).toContainEqual({ domain: 'changed.example.com', ip: '192.168.1.50' });
    });

    it('should not include unchanged records in toChange', () => {
      const diff = generateDiff(currentRecords, desiredRecords);

      expect(diff.toChange).not.toContainEqual({ domain: 'example.com', ip: '192.168.1.10' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty current and desired arrays', () => {
      const diff = generateDiff(emptyRecords, emptyRecords);

      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
      expect(diff.toChange).toHaveLength(0);
    });

    it('should handle duplicate domains in current records (uses last one)', () => {
      const currentWithDuplicates: DnsRecord[] = [
        { domain: 'example.com', ip: '192.168.1.10' },
        { domain: 'example.com', ip: '192.168.1.99' }, // duplicate
      ];
      
      const diff = generateDiff(currentWithDuplicates, emptyRecords);

      // Only one should be in toRemove (the last one wins in the Map)
      expect(diff.toRemove).toHaveLength(1);
    });

    it('should handle duplicate domains in desired records (uses last one)', () => {
      const desiredWithDuplicates: DnsRecord[] = [
        { domain: 'example.com', ip: '192.168.1.10' },
        { domain: 'example.com', ip: '192.168.1.99' }, // duplicate
      ];
      
      const diff = generateDiff(emptyRecords, desiredWithDuplicates);

      // Only one should be in toAdd (the last one wins in the Map)
      expect(diff.toAdd).toHaveLength(1);
    });

    it('should handle records with same domain and IP as unchanged', () => {
      const identicalRecords: DnsRecord[] = [
        { domain: 'example.com', ip: '192.168.1.10' },
      ];
      
      const diff = generateDiff(identicalRecords, identicalRecords);

      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
      expect(diff.toChange).toHaveLength(0);
    });

    it('should handle single record add, remove, and change simultaneously', () => {
      const currentSingle: DnsRecord[] = [
        { domain: 'old.com', ip: '1.1.1.1' },
      ];
      
      const desiredSingle: DnsRecord[] = [
        { domain: 'new.com', ip: '2.2.2.2' },
      ];
      
      const diff = generateDiff(currentSingle, desiredSingle);

      expect(diff.toAdd).toContainEqual({ domain: 'new.com', ip: '2.2.2.2' });
      expect(diff.toRemove).toContainEqual({ domain: 'old.com', ip: '1.1.1.1' });
      expect(diff.toChange).toHaveLength(0);
    });
  });
});

describe('PiHoleService', () => {
  let service: PiHoleService;
  const baseUrl = 'http://pihole:80';
  const password = 'testpassword';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PiHoleService(baseUrl, password);
  });

  describe('addDnsRecord', () => {
    it('should make correct PUT request to add DNS record', async () => {
      mockedAxios.put.mockResolvedValueOnce({ data: {} });

      await service.addDnsRecord('example.com', '192.168.1.10');

      expect(mockedAxios.put).toHaveBeenCalledTimes(1);
      expect(mockedAxios.put).toHaveBeenCalledWith(
        'http://pihole:80/api/config/dns/hosts/192.168.1.10 example.com',
        {
          params: { auth: password },
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    it('should not throw when axios request fails', async () => {
      mockedAxios.put.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(service.addDnsRecord('example.com', '192.168.1.10')).resolves.not.toThrow();
    });
  });

  describe('removeDnsRecord', () => {
    it('should make correct DELETE request to remove DNS record', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });

      await service.removeDnsRecord('example.com', '192.168.1.10');

      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://pihole:80/api/config/dns/hosts/192.168.1.10 example.com',
        { params: { auth: password } }
      );
    });

    it('should not throw when axios request fails', async () => {
      mockedAxios.delete.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(service.removeDnsRecord('example.com', '192.168.1.10')).resolves.not.toThrow();
    });
  });

  describe('listDnsRecords', () => {
    it('should return parsed DNS records from Pi-hole API response', async () => {
      const mockResponse = {
        data: {
          config: {
            dns: {
              hosts: ['192.168.1.10 example.com', '192.168.1.20 old.example.com'],
            },
          },
        },
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.listDnsRecords();

      expect(result).toEqual(['192.168.1.10 example.com', '192.168.1.20 old.example.com']);
    });

    it('should return empty array when response data is empty', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { config: { dns: { hosts: [] } } } });

      const result = await service.listDnsRecords();

      expect(result).toEqual([]);
    });

    it('should return empty array when axios request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.listDnsRecords();

      expect(result).toEqual([]);
    });

    it('should fallback to response data when config structure is missing', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: ['192.168.1.10 example.com'] });

      const result = await service.listDnsRecords();

      expect(result).toEqual(['192.168.1.10 example.com']);
    });
  });

  describe('getAllDnsRecords', () => {
    it('should parse raw DNS records into DnsRecord objects', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          config: {
            dns: {
              hosts: ['192.168.1.10 example.com', '192.168.1.20 sub.domain.com'],
            },
          },
        },
      });

      const result = await service.getAllDnsRecords();

      expect(result).toEqual([
        { domain: 'example.com', ip: '192.168.1.10' },
        { domain: 'sub.domain.com', ip: '192.168.1.20' },
      ]);
    });

    it('should handle IP and domain with spaces in domain name', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          config: {
            dns: {
              hosts: ['192.168.1.10 sub domain with spaces.com'],
            },
          },
        },
      });

      const result = await service.getAllDnsRecords();

      expect(result).toEqual([
        { domain: 'sub domain with spaces.com', ip: '192.168.1.10' },
      ]);
    });

    it('should skip malformed entries that do not have IP and domain', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          config: {
            dns: {
              hosts: ['192.168.1.10 example.com', 'invalid-entry', '192.168.1.20'],
            },
          },
        },
      });

      const result = await service.getAllDnsRecords();

      expect(result).toEqual([
        { domain: 'example.com', ip: '192.168.1.10' },
      ]);
    });

    it('should return empty array when no DNS records exist', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { config: { dns: { hosts: [] } } },
      });

      const result = await service.getAllDnsRecords();

      expect(result).toEqual([]);
    });
  });
});
