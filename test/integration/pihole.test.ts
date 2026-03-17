/**
 * Integration tests for PiHoleService
 * Following nodejs-testing-best-practices:
 * - Use real services via Docker Compose (started globally)
 * - Test actual API interactions
 * - Clean up test data after tests
 */

import { PiHoleService } from '../../src/services/pihole';
import { isDockerAvailable, isDockerInitialized, TEST_PORTS } from './setup';

describe('PiHoleService Integration', () => {
  let piholeService: PiHoleService | null = null;
  let piholeUrl: string;
  const password = 'testpassword';

  beforeAll(() => {
    // Skip all tests if Docker is not available
    if (!isDockerAvailable() || !isDockerInitialized()) {
      return;
    }

    piholeUrl = process.env.PIHOLE_URL || `http://localhost:${TEST_PORTS.pihole}`;
    piholeService = new PiHoleService(piholeUrl, password);
  });

  // Skip all tests if Docker is not available
  beforeEach(async () => {
    if (!isDockerAvailable() || !isDockerInitialized() || !piholeService) {
      return;
    }

    // Clean up any existing test records
    try {
      const records = await piholeService.getAllDnsRecords();
      for (const record of records) {
        if (record.domain.includes('test') || record.domain.includes('example')) {
          await piholeService.removeDnsRecord(record.domain, record.ip);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const skipIfNoDocker = () => {
    if (!isDockerAvailable() || !isDockerInitialized() || !piholeService) {
      return true;
    }
    return false;
  };

  describe('addDnsRecord', () => {
    it('should add a DNS record to Pi-hole', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      await piholeService!.addDnsRecord('test.example.com', '192.168.1.100');

      const records = await piholeService!.getAllDnsRecords();
      const found = records.find(
        r => r.domain === 'test.example.com' && r.ip === '192.168.1.100'
      );

      expect(found).toBeDefined();
    });

    it('should add multiple DNS records', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      await piholeService!.addDnsRecord('test1.example.com', '192.168.1.101');
      await piholeService!.addDnsRecord('test2.example.com', '192.168.1.102');

      const records = await piholeService!.getAllDnsRecords();
      
      expect(records.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('removeDnsRecord', () => {
    it('should remove a DNS record from Pi-hole', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      // First add a record
      await piholeService!.addDnsRecord('remove.test.com', '192.168.1.200');

      // Verify it exists
      let records = await piholeService!.getAllDnsRecords();
      let found = records.find(r => r.domain === 'remove.test.com');
      expect(found).toBeDefined();

      // Remove it
      await piholeService!.removeDnsRecord('remove.test.com', '192.168.1.200');

      // Verify it's gone
      records = await piholeService!.getAllDnsRecords();
      found = records.find(r => r.domain === 'remove.test.com');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllDnsRecords', () => {
    it('should return all DNS records from Pi-hole', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      const records = await piholeService!.getAllDnsRecords();

      expect(Array.isArray(records)).toBe(true);
      // Records should have domain and ip properties
      for (const record of records) {
        expect(record).toHaveProperty('domain');
        expect(record).toHaveProperty('ip');
      }
    });

    it('should return empty array when no records exist', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      // Clean all test records first
      const records = await piholeService!.getAllDnsRecords();
      for (const record of records) {
        if (record.domain.includes('test')) {
          await piholeService!.removeDnsRecord(record.domain, record.ip);
        }
      }

      const result = await piholeService!.getAllDnsRecords();
      // Should have empty or non-test records
      const testRecords = result.filter(r => r.domain.includes('test'));
      expect(testRecords).toHaveLength(0);
    });
  });

  describe('listDnsRecords', () => {
    it('should return raw DNS records from API', async () => {
      if (skipIfNoDocker()) {
        return;
      }

      await piholeService!.addDnsRecord('raw.test.com', '192.168.1.250');

      const rawRecords = await piholeService!.listDnsRecords();

      expect(Array.isArray(rawRecords)).toBe(true);
    });
  });
});
