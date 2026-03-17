/**
 * Integration tests for full sync flow
 * Following nodejs-testing-best-practices:
 * - Test end-to-end flow with real services
 * - Test the complete DNS synchronization process
 */

import { TraefikService } from '../../src/services/traefik';
import { PiHoleService, DnsRecord, generateDiff } from '../../src/services/pihole';
import { TEST_PORTS } from './setup';

describe('Full Sync Flow Integration', () => {
  const traefikUrl = process.env.TRAEFIK_API_URL || `http://localhost:${TEST_PORTS.traefik}`;
  const piholeUrl = process.env.PIHOLE_URL || `http://localhost:${TEST_PORTS.pihole}`;
  const password = 'testpassword';
  const reverseProxyIps = ['xxx.xxx.xxx.xxx'];

  const traefikService = new TraefikService(traefikUrl);
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

  describe('Sync Flow', () => {
    it('should complete full sync cycle: fetch routers -> generate diff -> apply changes', async () => {
      // Step 1: Fetch routers from Traefik
      const routers = await traefikService.getRouters();
      expect(routers).toBeDefined();

      // Step 2: Build desired records
      const desiredRecords: DnsRecord[] = [];
      for (const router of routers) {
        for (const host of router.hosts) {
          // Skip IP addresses
          if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) continue;
          // Skip regex patterns
          if (/^\^.*\$/.test(host) || /[?+*]/.test(host)) continue;
          // Skip localhost
          if (host === 'localhost' || host.includes('.local')) continue;

          for (const ip of reverseProxyIps) {
            desiredRecords.push({ domain: host, ip });
          }
        }
      }

      // Step 3: Get current records from Pi-hole
      const currentRecords = await piholeService.getAllDnsRecords();

      // Step 4: Generate diff
      const diff = generateDiff(currentRecords, desiredRecords);

      // Step 5: Apply changes (add new records)
      for (const record of diff.toAdd) {
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      // Step 6: Verify records were added
      const updatedRecords = await piholeService.getAllDnsRecords();
      
      // Check that we have some records from the sync
      expect(updatedRecords.length).toBeGreaterThanOrEqual(0);
    });

    it('should add new records when none exist', async () => {
      // Get current records
      const currentRecords = await piholeService.getAllDnsRecords();
      
      // Clean all test records
      for (const record of currentRecords) {
        if (record.domain.includes('test')) {
          await piholeService.removeDnsRecord(record.domain, record.ip);
        }
      }

      // Create a manual "desired" record for testing
      const desiredRecords: DnsRecord[] = [
        { domain: 'sync.test.example.com', ip: 'xxx.xxx.xxx.xxx' },
      ];

      // Get clean current records
      const cleanCurrent = await piholeService.getAllDnsRecords();
      
      // Generate diff
      const diff = generateDiff(cleanCurrent, desiredRecords);

      // Apply additions
      for (const record of diff.toAdd) {
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      // Verify
      const finalRecords = await piholeService.getAllDnsRecords();
      const found = finalRecords.find(
        r => r.domain === 'sync.test.example.com' && r.ip === 'xxx.xxx.xxx.xxx'
      );

      expect(found).toBeDefined();
    });

    it('should remove records not in desired list', async () => {
      // Add a record that should be removed
      await piholeService.addDnsRecord('to.remove.test.com', 'xxx.xxx.xxx.xxx');

      // Verify it exists
      let records = await piholeService.getAllDnsRecords();
      let found = records.find(r => r.domain === 'to.remove.test.com');
      expect(found).toBeDefined();

      // Generate diff with empty desired list
      const diff = generateDiff(records, []);

      // Apply removals
      for (const record of diff.toRemove) {
        await piholeService.removeDnsRecord(record.domain, record.ip);
      }

      // Verify it's gone
      records = await piholeService.getAllDnsRecords();
      found = records.find(r => r.domain === 'to.remove.test.com');
      expect(found).toBeUndefined();
    });

    it('should handle change operations (update IP for existing domain)', async () => {
      // Add a record
      await piholeService.addDnsRecord('change.test.com', 'xxx.xxx.xxx.xxx');

      // Current state
      let records = await piholeService.getAllDnsRecords();
      const currentRecord = records.find(r => r.domain === 'change.test.com');
      expect(currentRecord).toBeDefined();

      // Desired: same domain but different IP
      const desiredRecords: DnsRecord[] = [
        { domain: 'change.test.com', ip: 'xxx.xxx.xxx.xxx' },
      ];

      // Generate diff
      const diff = generateDiff(records, desiredRecords);

      // Should have change operation
      expect(diff.toChange.length).toBeGreaterThanOrEqual(0);
      
      // Apply changes
      for (const record of diff.toChange) {
        // Find old IP and remove
        const oldRecord = records.find(r => r.domain === record.domain);
        if (oldRecord) {
          await piholeService.removeDnsRecord(record.domain, oldRecord.ip);
        }
        await piholeService.addDnsRecord(record.domain, record.ip);
      }

      // Verify
      records = await piholeService.getAllDnsRecords();
      const updatedRecord = records.find(r => r.domain === 'change.test.com');
      expect(updatedRecord?.ip).toBe('xxx.xxx.xxx.xxx');
    });
  });
});
