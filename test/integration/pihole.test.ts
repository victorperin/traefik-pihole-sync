/**
 * Integration tests for PiHoleService
 * Following nodejs-testing-best-practices:
 * - Use real services via Docker Compose (started globally)
 * - Test actual API interactions
 * - Clean up test data after tests
 */

import { PiHoleService } from '../../src/services/pihole';
import { TEST_PORTS } from './setup';

describe('PiHoleService Integration', () => {
  const piholeUrl = process.env.PIHOLE_URL || `http://localhost:${TEST_PORTS.pihole}`;
  const password = 'testpassword';
  const piholeService = new PiHoleService(piholeUrl, password);

  // Clean up test records before each test
  beforeEach(async () => {
    const records = await piholeService.getAllDnsRecords();
    for (const record of records) {
      if (record.domain.includes('test') || record.domain.includes('example')) {
        await piholeService.removeDnsRecord(record.domain, record.ip);
      }
    }
  });

  describe('addDnsRecord', () => {
    it('should add a DNS record to Pi-hole', async () => {
      await piholeService.addDnsRecord('test.example.com', '192.168.1.100');

      const records = await piholeService.getAllDnsRecords();
      const found = records.find(
        r => r.domain === 'test.example.com' && r.ip === '192.168.1.100'
      );

      expect(found).toBeDefined();
    });

    it('should add multiple DNS records', async () => {
      await piholeService.addDnsRecord('test1.example.com', '192.168.1.101');
      await piholeService.addDnsRecord('test2.example.com', '192.168.1.102');

      const records = await piholeService.getAllDnsRecords();
      
      expect(records.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('removeDnsRecord', () => {
    it('should remove a DNS record from Pi-hole', async () => {
      // First add a record
      await piholeService.addDnsRecord('remove.test.com', '192.168.1.200');

      // Verify it exists
      let records = await piholeService.getAllDnsRecords();
      let found = records.find(r => r.domain === 'remove.test.com');
      expect(found).toBeDefined();

      // Remove it
      await piholeService.removeDnsRecord('remove.test.com', '192.168.1.200');

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
      // Clean all test records first
      const records = await piholeService.getAllDnsRecords();
      for (const record of records) {
        if (record.domain.includes('test')) {
          await piholeService.removeDnsRecord(record.domain, record.ip);
        }
      }

      const result = await piholeService.getAllDnsRecords();
      // Should have empty or non-test records
      const testRecords = result.filter(r => r.domain.includes('test'));
      expect(testRecords).toHaveLength(0);
    });
  });

  describe('listDnsRecords', () => {
    it('should return raw DNS records from API', async () => {
      await piholeService.addDnsRecord('raw.test.com', '192.168.1.250');

      const rawRecords = await piholeService.listDnsRecords();

      expect(Array.isArray(rawRecords)).toBe(true);
    });
  });
});
